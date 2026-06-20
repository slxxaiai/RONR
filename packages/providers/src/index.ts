import { readFileSync } from "node:fs";
import { z } from "zod";
import type { ProviderModel } from "@ronr/contracts";

const thinkingBudgetSchema = z.union([
  z.number().int().positive(),
  z.string().min(1),
  z.record(z.unknown())
]);

const structuredOutputModeSchema = z.enum(["json_schema", "json_object", "text"]);

const providerLocalConfigSchema = z.object({
  providerProfileId: z.string().min(1),
  displayName: z.string().min(1),
  protocol: z.literal("openai-compatible"),
  baseURL: z.string().url(),
  chatCompletionPath: z.string().min(1).default("/chat/completions"),
  webSearchPath: z.string().min(1).default("/v3/web-search"),
  apiKey: z.string().min(1),
  apiKeySecretRef: z.string().min(1).optional(),
  auth: z.object({
    type: z.literal("bearer")
  }).default({ type: "bearer" }),
  defaultModel: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive(),
  temperatureDefault: z.number(),
  maxTokensDefault: z.number().int().positive(),
  structuredOutputMode: structuredOutputModeSchema.default("json_object"),
  webSearchEnabledDefault: z.boolean().default(true),
  thinkingEnabledDefault: z.boolean().default(true),
  thinkingBudgetDefault: thinkingBudgetSchema.optional()
});

export type ProviderLocalConfig = z.output<typeof providerLocalConfigSchema>;
export type ProviderLocalConfigInput = z.input<typeof providerLocalConfigSchema>;
export type StructuredOutputMode = z.infer<typeof structuredOutputModeSchema>;
export type SourcePolicy = "required" | "optional" | "disabled";
export type ThinkingBudget = z.infer<typeof thinkingBudgetSchema>;

export class ProviderConfigError extends Error {
  code = "provider_config_error" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

export class ProviderRuntimeError extends Error {
  constructor(
    public code: ProviderErrorCode,
    message: string,
    public retryable = false
  ) {
    super(message);
    this.name = "ProviderRuntimeError";
  }
}

export type ProviderErrorCode =
  | "auth_failed"
  | "permission_denied"
  | "insufficient_balance"
  | "model_not_found"
  | "invalid_request"
  | "rate_limited"
  | "token_limit_exceeded"
  | "provider_unavailable"
  | "timeout"
  | "network_failed"
  | "schema_parse_failed"
  | "search_failed"
  | "unknown_provider_error";

export interface SearchResultSummary {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

export interface ThinkingMeta {
  enabled: boolean;
  budget?: ThinkingBudget;
  reasoningTokens?: number;
  rawChainOfThoughtDropped?: boolean;
  capabilityFallback?: string;
}

export interface ModelProviderSearchRequest {
  requestId: string;
  providerProfileId: string;
  query: string;
  freshness?: "noLimit" | "oneDay" | "oneWeek" | "oneMonth" | "oneYear" | string;
  count?: number;
  timeoutMs?: number;
}

export interface ModelProviderSearchResponse {
  requestId: string;
  provider: string;
  query: string;
  results: SearchResultSummary[];
  providerMeta: {
    latencyMs: number;
    httpStatus?: number;
    providerErrorName?: string;
  };
}

export interface ModelProviderRequest {
  requestId: string;
  providerProfileId: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  tools?: Array<Record<string, unknown>>;
  toolChoice?: "auto" | "none" | "required" | Record<string, unknown>;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;
  thinkingBudget?: ThinkingBudget;
  sourcePolicy?: SourcePolicy;
  metadata?: Record<string, unknown>;
}

export interface ModelProviderResponse {
  requestId: string;
  provider: string;
  model: string;
  contentText: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  rawResponseId?: string;
  providerMeta: {
    latencyMs: number;
    httpStatus?: number;
    providerErrorName?: string;
    capabilityFallback?: string;
    searchResultCount?: number;
    searchStatus?: "completed" | "failed" | "unavailable";
    searchErrorCode?: ProviderErrorCode;
    thinkingEnabled?: boolean;
    rawChainOfThoughtDropped?: boolean;
  };
  searchResults: SearchResultSummary[];
  thinkingMeta?: ThinkingMeta;
}

export interface ModelProvider {
  listModels(): Promise<ProviderModel[]>;
  search?(request: ModelProviderSearchRequest): Promise<ModelProviderSearchResponse>;
  complete(request: ModelProviderRequest): Promise<ModelProviderResponse>;
}

export function loadProviderConfig(path = "config/provider.local.json"): ProviderLocalConfig {
  try {
    return loadProviderConfigFromText(readFileSync(path, "utf8"));
  } catch (error) {
    if (error instanceof ProviderConfigError) throw error;
    return loadProviderConfigFromText(null);
  }
}

export function loadProviderConfigFromText(text: string | null): ProviderLocalConfig {
  if (text === null) {
    throw new ProviderConfigError(
      "缺少本地 provider 配置文件 config/provider.local.json。请复制 config/provider.example.json 后填写 apiKey。"
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ProviderConfigError("provider.local.json 不是合法 JSON，请检查逗号、引号和括号。");
  }

  const parsed = providerLocalConfigSchema.safeParse(json);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new ProviderConfigError(`provider.local.json 配置不完整或无效：${fields}`);
  }

  return parsed.data;
}

export function createOpenAICompatibleProvider(
  configInput: ProviderLocalConfigInput,
  fetchImpl: typeof fetch = fetch
): ModelProvider {
  const config = providerLocalConfigSchema.parse(configInput);

  return {
    async listModels(): Promise<ProviderModel[]> {
      let response: Response;
      try {
        response = await fetchImpl(`${trimSlash(config.baseURL)}/models`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`
          },
          signal: AbortSignal.timeout(config.timeoutMs)
        });
      } catch (error) {
        throw mapFetchError(error);
      }

      if (!response.ok) {
        throw await createProviderRuntimeError(response);
      }

      const body = await response.json() as {
        data?: Array<Record<string, unknown>>;
      };
      return (body.data ?? []).map(mapProviderModel);
    },

    async complete(request: ModelProviderRequest): Promise<ModelProviderResponse> {
      const startedAt = Date.now();
      let response: Response;
      const effectiveWebSearchEnabled = request.webSearchEnabled ?? config.webSearchEnabledDefault;
      const effectiveSourcePolicy = request.sourcePolicy ?? "optional";
      const effectiveThinkingEnabled = request.thinkingEnabled ?? config.thinkingEnabledDefault;
      const effectiveThinkingBudget = request.thinkingBudget ?? config.thinkingBudgetDefault;
      const requestMetadata = extractRequestMetadata(request.metadata);
      const requestTools = buildTools({
        tools: request.tools
      });
      const thinkingBody = buildThinkingBody({
        model: request.model,
        thinkingEnabled: effectiveThinkingEnabled,
        thinkingBudget: effectiveThinkingBudget,
        forceNativeThinking: request.thinkingEnabled !== undefined
          || config.thinkingEnabledDefault !== undefined
          || effectiveThinkingBudget !== undefined
      });
      const capabilityFallback = buildCapabilityFallback({
        webSearchEnabled: effectiveWebSearchEnabled,
        sourcePolicy: effectiveSourcePolicy,
        searchStatus: requestMetadata.searchStatus,
        tools: requestTools,
        thinkingEnabled: effectiveThinkingEnabled,
        thinkingBody
      });

      try {
        const body = {
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxTokens ?? config.maxTokensDefault,
          temperature: request.temperature ?? config.temperatureDefault,
          ...buildResponseFormat(request.responseSchema, config.structuredOutputMode),
          ...(requestTools.length > 0 ? { tools: requestTools } : {}),
          ...(requestTools.length > 0 && request.toolChoice !== undefined
            ? { tool_choice: request.toolChoice }
            : {}),
          ...thinkingBody
        };

        response = await fetchImpl(`${trimSlash(config.baseURL)}${normalizePath(config.chatCompletionPath)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(request.timeoutMs ?? config.timeoutMs)
        });
      } catch (error) {
        throw mapFetchError(error);
      }

      if (!response.ok) {
        throw await createProviderRuntimeError(response);
      }

      const body = await response.json() as {
        id?: string;
        model?: string;
        search_results?: unknown;
        citations?: unknown;
        choices?: Array<{
          finish_reason?: string;
          message?: {
            content?: string | null;
            reasoning_content?: unknown;
            reasoning?: unknown;
            thinking?: unknown;
            chain_of_thought?: unknown;
            tool_calls?: unknown;
            annotations?: unknown;
          };
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          completion_tokens_details?: {
            reasoning_tokens?: number;
          };
          reasoning_tokens?: number;
        };
        reasoning?: unknown;
        thinking?: unknown;
        chain_of_thought?: unknown;
      };
      const message = body.choices?.[0]?.message;
      const sanitizedContent = sanitizeContentText(message?.content);
      if (!sanitizedContent.contentText) {
        throw new ProviderRuntimeError("schema_parse_failed", "模型返回缺少 message.content。");
      }

      const searchResults = extractSearchResults(body, message);
      if (effectiveSourcePolicy === "required" && effectiveWebSearchEnabled && searchResults.length === 0) {
        throw new ProviderRuntimeError("search_failed", "模型调用没有返回可用搜索来源摘要。", true);
      }

      const rawChainOfThoughtDropped = sanitizedContent.rawChainOfThoughtDropped || hasRawReasoning(body, message);
      const thinkingMeta = buildThinkingMeta({
        enabled: effectiveThinkingEnabled,
        budget: effectiveThinkingBudget,
        usage: body.usage,
        rawChainOfThoughtDropped,
        capabilityFallback
      });

      return {
        requestId: request.requestId,
        provider: config.providerProfileId,
        model: body.model ?? request.model,
        contentText: sanitizedContent.contentText,
        finishReason: body.choices?.[0]?.finish_reason ?? "unknown",
        usage: {
          promptTokens: body.usage?.prompt_tokens ?? 0,
          completionTokens: body.usage?.completion_tokens ?? 0,
          totalTokens: body.usage?.total_tokens ?? 0
        },
        rawResponseId: body.id,
        providerMeta: {
          latencyMs: Date.now() - startedAt,
          httpStatus: response.status,
          capabilityFallback,
          searchResultCount: requestMetadata.searchResultCount ?? searchResults.length,
          searchStatus: requestMetadata.searchStatus ?? (searchResults.length > 0 ? "completed" : undefined),
          searchErrorCode: requestMetadata.searchErrorCode,
          thinkingEnabled: thinkingMeta.enabled,
          rawChainOfThoughtDropped
        },
        searchResults,
        thinkingMeta
      };
    },

    async search(request: ModelProviderSearchRequest): Promise<ModelProviderSearchResponse> {
      const startedAt = Date.now();
      let response: Response;
      try {
        response = await fetchImpl(buildWebSearchUrl(config.baseURL, config.webSearchPath), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            query: request.query,
            freshness: request.freshness ?? "noLimit",
            summary: true,
            count: request.count ?? 5
          }),
          signal: AbortSignal.timeout(request.timeoutMs ?? config.timeoutMs)
        });
      } catch (error) {
        throw mapFetchError(error, "search");
      }

      if (!response.ok) {
        throw await createProviderRuntimeError(response, "search");
      }

      const body = await response.json() as Record<string, unknown>;
      const results = extractPpioWebSearchResults(body);
      if (results.length === 0) {
        throw new ProviderRuntimeError("search_failed", "搜索 provider 没有返回可用来源摘要。", true);
      }

      return {
        requestId: request.requestId,
        provider: config.providerProfileId,
        query: request.query,
        results,
        providerMeta: {
          latencyMs: Date.now() - startedAt,
          httpStatus: response.status
        }
      };
    }
  };
}

function mapFetchError(error: unknown, operation: "chat" | "search" = "chat"): ProviderRuntimeError {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new ProviderRuntimeError(
      operation === "search" ? "search_failed" : "timeout",
      operation === "search" ? "搜索 provider 调用超时，请稍后重试。" : "模型调用超时，请稍后重试。",
      true
    );
  }
  return new ProviderRuntimeError(
    operation === "search" ? "search_failed" : "network_failed",
    operation === "search" ? "无法连接搜索 provider，请检查网络或代理。" : "无法连接模型提供方，请检查网络或代理。",
    true
  );
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizePath(value: string): string {
  return value.startsWith("/") ? value : `/${value}`;
}

function buildWebSearchUrl(baseURL: string, webSearchPath: string): string {
  const parsed = new URL(baseURL);
  return `${parsed.origin}${normalizePath(webSearchPath)}`;
}

function extractRequestMetadata(metadata: Record<string, unknown> | undefined): {
  searchStatus?: "completed" | "failed" | "unavailable";
  searchResultCount?: number;
  searchErrorCode?: ProviderErrorCode;
} {
  const searchStatus = metadata?.searchStatus;
  const searchResultCount = metadata?.searchResultCount;
  const searchErrorCode = metadata?.searchErrorCode;
  return {
    ...(searchStatus === "completed" || searchStatus === "failed" || searchStatus === "unavailable"
      ? { searchStatus }
      : {}),
    ...(typeof searchResultCount === "number" ? { searchResultCount } : {}),
    ...(typeof searchErrorCode === "string" && isProviderErrorCode(searchErrorCode)
      ? { searchErrorCode }
      : {})
  };
}

function isProviderErrorCode(value: string): value is ProviderErrorCode {
  return [
    "auth_failed",
    "permission_denied",
    "insufficient_balance",
    "model_not_found",
    "invalid_request",
    "rate_limited",
    "token_limit_exceeded",
    "provider_unavailable",
    "timeout",
    "network_failed",
    "schema_parse_failed",
    "search_failed",
    "unknown_provider_error"
  ].includes(value);
}

function buildResponseFormat(
  responseSchema: Record<string, unknown> | undefined,
  structuredOutputMode: StructuredOutputMode
): Record<string, unknown> {
  if (!responseSchema || structuredOutputMode === "text") return {};
  if (structuredOutputMode === "json_schema") {
    return {
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ronr_agent_output",
          strict: true,
          schema: responseSchema
        }
      }
    };
  }

  return {
    response_format: {
      type: "json_object"
    }
  };
}

function buildTools(input: { tools?: Array<Record<string, unknown>> }): Array<Record<string, unknown>> {
  return input.tools && input.tools.length > 0 ? input.tools : [];
}

function buildThinkingBody(input: {
  model: string;
  thinkingEnabled: boolean;
  thinkingBudget?: ThinkingBudget;
  forceNativeThinking: boolean;
}): Record<string, unknown> | undefined {
  if (input.model.trim().toLowerCase() !== "zai-org/glm-5.2") {
    if (!input.forceNativeThinking) return undefined;
    return {
      separate_reasoning: true,
      enable_thinking: input.thinkingEnabled,
      ...(input.thinkingBudget !== undefined ? { thinking_budget: input.thinkingBudget } : {})
    };
  }

  return {
    enable_thinking: false
  };
}

function buildCapabilityFallback(input: {
  webSearchEnabled: boolean;
  sourcePolicy: SourcePolicy;
  searchStatus?: "completed" | "failed" | "unavailable";
  tools: Array<Record<string, unknown>>;
  thinkingEnabled: boolean;
  thinkingBody?: Record<string, unknown>;
}): string | undefined {
  const fallbacks: string[] = [];
  if (
    input.webSearchEnabled
    && input.sourcePolicy !== "disabled"
    && input.searchStatus !== "completed"
    && input.tools.length === 0
  ) {
    fallbacks.push("native_search_not_requested");
  }
  if (input.thinkingEnabled && !input.thinkingBody) {
    fallbacks.push("native_thinking_not_requested");
  }
  if (input.thinkingBody?.enable_thinking === false) {
    fallbacks.push("native_thinking_disabled_for_model_compatibility");
  }
  return fallbacks.length > 0 ? fallbacks.join(",") : undefined;
}

function sanitizeContentText(content: string | null | undefined): {
  contentText: string;
  rawChainOfThoughtDropped: boolean;
} {
  if (!content) return { contentText: "", rawChainOfThoughtDropped: false };
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  return {
    contentText: cleaned,
    rawChainOfThoughtDropped: cleaned !== content.trim()
  };
}

function extractSearchResults(
  body: {
    search_results?: unknown;
    citations?: unknown;
  },
  message?: {
    annotations?: unknown;
    tool_calls?: unknown;
  }
): SearchResultSummary[] {
  const candidates = [
    ...extractSearchResultList(body.search_results, "search_results"),
    ...extractSearchResultList(body.citations, "citations"),
    ...extractAnnotationSearchResults(message?.annotations),
    ...extractSearchResultList(message?.tool_calls, "tool_calls")
  ];
  const seen = new Set<string>();
  return candidates.filter((result) => {
    const key = result.url || `${result.title}:${result.snippet ?? ""}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractSearchResultList(value: unknown, source: string): SearchResultSummary[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") {
      return isLikelyUrl(item)
        ? [{ title: item, url: item, source }]
        : [];
    }
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const nested = typeof raw.url_citation === "object" && raw.url_citation
      ? raw.url_citation as Record<string, unknown>
      : raw;
    const url = firstString(nested.url, nested.uri, nested.link);
    if (!url) return [];
    return [{
      title: truncateForMeta(firstString(nested.title, nested.name, url) ?? url),
      url: truncateForMeta(url),
      snippet: optionalTruncated(firstString(nested.snippet, nested.summary, nested.content, nested.text)),
      source
    }];
  });
}

function extractPpioWebSearchResults(body: Record<string, unknown>): SearchResultSummary[] {
  const nestedData = body.data && typeof body.data === "object" ? body.data as Record<string, unknown> : undefined;
  const nestedWebPages = nestedData?.webPages && typeof nestedData.webPages === "object"
    ? nestedData.webPages as Record<string, unknown>
    : undefined;
  return [
    ...extractSearchResultList(body.results, "web_search"),
    ...extractSearchResultList(body.web_pages, "web_search"),
    ...extractSearchResultList(body.organic, "web_search"),
    ...extractSearchResultList(nestedData?.results, "web_search"),
    ...extractSearchResultList(nestedData?.web_pages, "web_search"),
    ...extractSearchResultList(nestedData?.organic, "web_search"),
    ...extractSearchResultList(nestedWebPages?.value, "web_search")
  ];
}

function extractAnnotationSearchResults(value: unknown): SearchResultSummary[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((annotation) => {
    if (!annotation || typeof annotation !== "object") return [];
    const raw = annotation as Record<string, unknown>;
    const citation = raw.url_citation;
    if (!citation || typeof citation !== "object") return [];
    return extractSearchResultList([citation], "annotations");
  });
}

function hasRawReasoning(
  body: {
    reasoning?: unknown;
    thinking?: unknown;
    chain_of_thought?: unknown;
  },
  message?: {
    reasoning_content?: unknown;
    reasoning?: unknown;
    thinking?: unknown;
    chain_of_thought?: unknown;
  }
): boolean {
  return [
    body.reasoning,
    body.thinking,
    body.chain_of_thought,
    message?.reasoning_content,
    message?.reasoning,
    message?.thinking,
    message?.chain_of_thought
  ].some(hasMeaningfulValue);
}

function buildThinkingMeta(input: {
  enabled: boolean;
  budget?: ThinkingBudget;
  usage?: {
    completion_tokens_details?: {
      reasoning_tokens?: number;
    };
    reasoning_tokens?: number;
  };
  rawChainOfThoughtDropped: boolean;
  capabilityFallback?: string;
}): ThinkingMeta {
  const reasoningTokens = input.usage?.completion_tokens_details?.reasoning_tokens
    ?? input.usage?.reasoning_tokens;
  return {
    enabled: input.enabled,
    ...(input.budget !== undefined ? { budget: input.budget } : {}),
    ...(typeof reasoningTokens === "number" ? { reasoningTokens } : {}),
    ...(input.rawChainOfThoughtDropped ? { rawChainOfThoughtDropped: true } : {}),
    ...(input.capabilityFallback ? { capabilityFallback: input.capabilityFallback } : {})
  };
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function optionalTruncated(value: string | undefined): string | undefined {
  return value ? truncateForMeta(value) : undefined;
}

function truncateForMeta(value: string): string {
  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}

function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
}

function mapProviderModel(raw: Record<string, unknown>): ProviderModel {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? raw.id ?? ""),
    description: String(raw.description ?? ""),
    contextSize: Number(raw.context_size ?? 0),
    inputTokenPricePerM: Number(raw.input_token_price_per_m ?? 0),
    outputTokenPricePerM: Number(raw.output_token_price_per_m ?? 0)
  };
}

export function mapProviderError(status: number, providerErrorName?: string): ProviderErrorCode {
  if (providerErrorName === "FAILED_TO_AUTH" || providerErrorName === "INVALID_API_KEY") {
    return "auth_failed";
  }
  if (providerErrorName === "ACCESS_DENY") return "permission_denied";
  if (providerErrorName === "NOT_ENOUGH_BALANCE") return "insufficient_balance";
  if (providerErrorName === "MODEL_NOT_FOUND" || status === 404) return "model_not_found";
  if (providerErrorName === "INVALID_REQUEST_BODY" || status === 400) return "invalid_request";
  if (providerErrorName === "RATE_LIMIT_EXCEEDED") return "rate_limited";
  if (providerErrorName === "TOKEN_LIMIT_EXCEEDED") return "token_limit_exceeded";
  if (providerErrorName === "SERVICE_NOT_AVAILABLE" || status === 503) return "provider_unavailable";
  if (providerErrorName === "SEARCH_FAILED" || providerErrorName === "NO_SEARCH_RESULT") return "search_failed";
  if ((status === 401 || status === 403) && !providerErrorName) return "auth_failed";
  return "unknown_provider_error";
}

async function createProviderRuntimeError(
  response: Response,
  operation: "chat" | "search" = "chat"
): Promise<ProviderRuntimeError> {
  const body = await safeJson(response);
  const providerErrorName = extractProviderErrorName(body);
  const code = operation === "search"
    ? "search_failed"
    : mapProviderError(response.status, providerErrorName);
  return new ProviderRuntimeError(
    code,
    providerErrorName
      ? `模型提供方返回错误：${providerErrorName}`
      : `模型提供方返回 HTTP ${response.status}`,
    ["rate_limited", "provider_unavailable", "timeout", "network_failed", "search_failed"].includes(code)
  );
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function extractProviderErrorName(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const maybe = body as {
    error?: { code?: unknown; type?: unknown; message?: unknown };
    code?: unknown;
  };
  return typeof maybe.error?.code === "string"
    ? maybe.error.code
    : typeof maybe.error?.type === "string"
      ? maybe.error.type
      : typeof maybe.code === "string"
        ? maybe.code
        : undefined;
}
