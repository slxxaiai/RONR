import { readFileSync } from "node:fs";
import { z } from "zod";
import type { ProviderModel } from "@ronr/contracts";

const providerLocalConfigSchema = z.object({
  providerProfileId: z.string().min(1),
  displayName: z.string().min(1),
  protocol: z.literal("openai-compatible"),
  baseURL: z.string().url(),
  apiKey: z.string().min(1),
  timeoutMs: z.number().int().positive(),
  temperatureDefault: z.number(),
  maxTokensDefault: z.number().int().positive()
});

export type ProviderLocalConfig = z.infer<typeof providerLocalConfigSchema>;

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
  | "unknown_provider_error";

export interface ModelProviderRequest {
  requestId: string;
  providerProfileId: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
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
  };
}

export interface ModelProvider {
  listModels(): Promise<ProviderModel[]>;
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
  config: ProviderLocalConfig,
  fetchImpl: typeof fetch = fetch
): ModelProvider {
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
      try {
        const body = {
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxTokens ?? config.maxTokensDefault,
          temperature: request.temperature ?? config.temperatureDefault,
          ...(request.responseSchema
            ? {
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "ronr_agent_output",
                    strict: true,
                    schema: request.responseSchema
                  }
                }
              }
            : {})
        };

        response = await fetchImpl(`${trimSlash(config.baseURL)}/chat/completions`, {
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
        choices?: Array<{
          finish_reason?: string;
          message?: { content?: string | null };
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };
      const contentText = body.choices?.[0]?.message?.content;
      if (!contentText) {
        throw new ProviderRuntimeError("schema_parse_failed", "模型返回缺少 message.content。");
      }

      return {
        requestId: request.requestId,
        provider: config.providerProfileId,
        model: body.model ?? request.model,
        contentText,
        finishReason: body.choices?.[0]?.finish_reason ?? "unknown",
        usage: {
          promptTokens: body.usage?.prompt_tokens ?? 0,
          completionTokens: body.usage?.completion_tokens ?? 0,
          totalTokens: body.usage?.total_tokens ?? 0
        },
        rawResponseId: body.id,
        providerMeta: {
          latencyMs: Date.now() - startedAt,
          httpStatus: response.status
        }
      };
    }
  };
}

function mapFetchError(error: unknown): ProviderRuntimeError {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new ProviderRuntimeError("timeout", "模型调用超时，请稍后重试。", true);
  }
  return new ProviderRuntimeError("network_failed", "无法连接模型提供方，请检查网络或代理。", true);
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
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
  if ((status === 401 || status === 403) && !providerErrorName) return "auth_failed";
  return "unknown_provider_error";
}

async function createProviderRuntimeError(response: Response): Promise<ProviderRuntimeError> {
  const body = await safeJson(response);
  const providerErrorName = extractProviderErrorName(body);
  const code = mapProviderError(response.status, providerErrorName);
  return new ProviderRuntimeError(
    code,
    providerErrorName
      ? `模型提供方返回错误：${providerErrorName}`
      : `模型提供方返回 HTTP ${response.status}`,
    ["rate_limited", "provider_unavailable", "timeout", "network_failed"].includes(code)
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
