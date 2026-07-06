import { join } from "node:path";
import { createSessionRequestSchema, validateAgentConfig } from "@ronr/contracts";
import type {
  AgentRuntimeSessionRequest,
  CreateSessionRequest,
  DeliberationSessionSnapshot,
  DeliberationStreamEvent
} from "@ronr/contracts";
import {
  createSqliteDeliberationRecordRepository
} from "@ronr/db";
import type {
  DeliberationRecordRepository,
  DeliberationRecordSummary
} from "@ronr/db";
import type { ProviderLocalConfig } from "@ronr/providers";
import {
  createOpenAICompatibleProvider,
  loadProviderConfig,
  ProviderConfigError,
  ProviderRuntimeError
} from "@ronr/providers";
import { runDeliberation, runDeliberationStream } from "@ronr/agents";
import { buildUrlSourceReferences, stripExtractedUrls } from "./url-sources";

export interface ApiHandlerOptions {
  recordRepository?: DeliberationRecordRepository;
}

export async function handleListModels(
  fetchImpl: typeof fetch = fetch,
  config?: ProviderLocalConfig
): Promise<Response> {
  try {
    config ??= loadProviderConfig();
    const provider = createOpenAICompatibleProvider(config, fetchImpl);
    const models = await provider.listModels();
    return Response.json({ models }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleProviderConnectionTest(
  fetchImpl: typeof fetch = fetch,
  config?: ProviderLocalConfig
): Promise<Response> {
  try {
    config ??= loadProviderConfig();
    const provider = createOpenAICompatibleProvider(config, fetchImpl);
    const startedAt = Date.now();
    const models = await provider.listModels();
    return Response.json(
      {
        status: "ok",
        providerProfileId: config.providerProfileId,
        displayName: config.displayName,
        protocol: config.protocol,
        latencyMs: Date.now() - startedAt,
        modelCount: models.length
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleCreateSession(
  requestBody: unknown,
  fetchImpl: typeof fetch = fetch,
  config?: ProviderLocalConfig,
  availableModelIds?: string[],
  options: ApiHandlerOptions = {}
): Promise<Response> {
  try {
    config ??= loadProviderConfig();
    const parsed = createSessionRequestSchema.safeParse(requestBody);
    if (!parsed.success) {
      return Response.json(
        {
          code: "invalid_request",
          message: "创建会话请求不完整，请填写问题、语言和 Agent 配置。",
          recoveryHint: "确认 userQuestion、locale、agentConfig 均已传入。"
        },
        { status: 400 }
      );
    }

    const provider = createOpenAICompatibleProvider(config, fetchImpl);
    const modelIds = availableModelIds ?? (await provider.listModels()).map((model) => model.id);
    const agentConfigResult = validateAgentConfig(parsed.data.agentConfig, modelIds, parsed.data.maxDeliberationRounds);
    if (!agentConfigResult.success) {
      return Response.json(
        {
          code: "invalid_agent_config",
          message: agentConfigResult.errors.join("；"),
          recoveryHint: "请重新选择 Chair、Secretary 和至少两个 Member 的模型与 mandate。"
        },
        { status: 400 }
      );
    }

    const preparedRequest = await prepareSessionRequest(parsed.data, fetchImpl);
    const termination = evaluatePreDeliberationTermination(preparedRequest);
    if (termination) {
      return Response.json(termination, { status: 422 });
    }
    const recordRepository = preparedRequest.userReferenceId
      ? options.recordRepository ?? getDefaultRecordRepository()
      : undefined;
    const { snapshot, providerMeta, sessionEntry } = await runDeliberation(preparedRequest, provider);
    const record = preparedRequest.userReferenceId && recordRepository
      ? await persistCompletedRecord({
          repository: recordRepository,
          request: preparedRequest,
          sessionId: snapshot.id,
          events: [
            {
              type: "session_started",
              sessionId: snapshot.id,
              phase: sessionEntry.phase,
              activeAgentId: sessionEntry.activeAgentId,
              currentSpeakerAgentId: sessionEntry.currentSpeakerAgentId,
              nextTask: sessionEntry.nextTask
            },
            {
              type: "completed",
              sessionId: snapshot.id,
              status: snapshot.status,
              phase: snapshot.phase,
              sessionSnapshot: snapshot,
              providerMeta
            }
          ],
          snapshot
        })
      : null;
    return Response.json(
      {
        sessionId: snapshot.id,
        ...(record ? { recordId: record.id, meetingRuleType: record.meetingRuleType } : {}),
        status: snapshot.status,
        phase: snapshot.phase,
        initialPhase: sessionEntry.phase,
        activeAgentId: sessionEntry.activeAgentId,
        currentSpeakerAgentId: sessionEntry.currentSpeakerAgentId,
        nextTask: sessionEntry.nextTask,
        sessionEntry,
        sessionSnapshot: snapshot,
        providerMeta
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleCreateSessionStream(
  requestBody: unknown,
  fetchImpl: typeof fetch = fetch,
  config?: ProviderLocalConfig,
  availableModelIds?: string[],
  options: ApiHandlerOptions = {}
): Promise<Response> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function write(event: unknown) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }

      try {
        config ??= loadProviderConfig();
        const parsed = createSessionRequestSchema.safeParse(requestBody);
        if (!parsed.success) {
          write({
            type: "error",
            code: "invalid_request",
            message: "创建会话请求不完整，请填写问题、语言和 Agent 配置。",
            recoveryHint: "确认 userQuestion、locale、agentConfig 均已传入。"
          });
          return;
        }

        const provider = createOpenAICompatibleProvider(config, fetchImpl);
        const modelIds = availableModelIds ?? (await provider.listModels()).map((model) => model.id);
        const agentConfigResult = validateAgentConfig(parsed.data.agentConfig, modelIds, parsed.data.maxDeliberationRounds);
        if (!agentConfigResult.success) {
          write({
            type: "error",
            code: "invalid_agent_config",
            message: agentConfigResult.errors.join("；"),
            recoveryHint: "请重新选择 Chair、Secretary 和至少两个 Member 的模型与 mandate。"
          });
          return;
        }

        const preparedRequest = await prepareSessionRequest(parsed.data, fetchImpl);
        const termination = evaluatePreDeliberationTermination(preparedRequest);
        if (termination) {
          write({
            type: "error",
            code: termination.code,
            message: termination.message,
            recoveryHint: termination.recoveryHint
          });
          return;
        }
        const repository = preparedRequest.userReferenceId
          ? options.recordRepository ?? getDefaultRecordRepository()
          : undefined;
        let record: DeliberationRecordSummary | null = null;
        let sequence = 0;
        for await (const event of runDeliberationStream(preparedRequest, provider)) {
          if (event.type === "session_started" && preparedRequest.userReferenceId && repository) {
            await repository.ensureUserReference({
              id: preparedRequest.userReferenceId,
              type: "local_anonymous"
            });
            record = await repository.createRecord({
              userReferenceId: preparedRequest.userReferenceId,
              sessionId: event.sessionId,
              meetingRuleType: preparedRequest.meetingRuleType,
              title: buildRecordTitle(preparedRequest.userQuestion),
              question: preparedRequest.userQuestion,
              locale: preparedRequest.locale,
              status: "active",
              phase: event.phase
            });
          }
          const outputEvent = record ? attachRecordToStreamEvent(event, record) : event;
          if (record && preparedRequest.userReferenceId) {
            sequence += 1;
            await repository?.appendEvent({
              recordId: record.id,
              sessionId: record.sessionId,
              userReferenceId: preparedRequest.userReferenceId,
              sequence,
              type: outputEvent.type,
              payload: outputEvent
            });
            if (outputEvent.type === "completed") {
              await repository?.saveSnapshot({
                recordId: record.id,
                sessionId: record.sessionId,
                snapshot: outputEvent.sessionSnapshot,
                version: 1
              });
              await repository?.completeRecord({
                recordId: record.id,
                status: "completed",
                phase: outputEvent.phase,
                actionPlanSummary: outputEvent.sessionSnapshot.actionPlan.summary
              });
            }
          }
          write(outputEvent);
        }
      } catch (error) {
        write(toStreamError(error));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform"
    }
  });
}

export async function handleListRecords(
  searchParams: URLSearchParams,
  repository: DeliberationRecordRepository = getDefaultRecordRepository()
): Promise<Response> {
  const userReferenceId = searchParams.get("userReferenceId")?.trim();
  if (!userReferenceId) {
    return Response.json(
      {
        code: "invalid_request",
        message: "缺少 userReferenceId。",
        recoveryHint: "请传入本地用户引用后再读取历史记录。"
      },
      { status: 400 }
    );
  }
  const records = await repository.listRecordsByUser(userReferenceId);
  return Response.json({ records }, { status: 200 });
}

export async function handleGetRecordDetail(
  recordId: string,
  searchParams: URLSearchParams,
  repository: DeliberationRecordRepository = getDefaultRecordRepository()
): Promise<Response> {
  const userReferenceId = searchParams.get("userReferenceId")?.trim();
  if (!recordId || !userReferenceId) {
    return Response.json(
      {
        code: "invalid_request",
        message: "缺少 recordId 或 userReferenceId。",
        recoveryHint: "请传入记录 ID 和本地用户引用后再读取历史记录。"
      },
      { status: 400 }
    );
  }
  const detail = await repository.getRecordDetail(recordId, userReferenceId);
  if (!detail) {
    return Response.json(
      {
        code: "record_not_found",
        message: "未找到该议事记录。",
        recoveryHint: "确认记录属于当前本地用户引用。"
      },
      { status: 404 }
    );
  }
  return Response.json(detail, { status: 200 });
}

function errorResponse(error: unknown): Response {
  if (error instanceof ProviderConfigError) {
    return Response.json(
      {
        code: error.code,
        message: error.message,
        recoveryHint: "复制 config/provider.example.json 为 config/provider.local.json，并填写本地 API key。"
      },
      { status: 500 }
    );
  }

  if (error instanceof ProviderRuntimeError) {
    return Response.json(
      {
        code: error.code,
        message: error.message,
        recoveryHint: runtimeRecoveryHint(error.code)
      },
      { status: providerStatus(error.code) }
    );
  }

  return Response.json(
    {
      code: "unknown_error",
      message: "RONR 运行时发生未知错误。",
      recoveryHint: "请检查服务端日志。"
    },
    { status: 500 }
  );
}

async function prepareSessionRequest(
  request: CreateSessionRequest,
  fetchImpl: typeof fetch
): Promise<AgentRuntimeSessionRequest> {
  const { sourceReferences } = await buildUrlSourceReferences(request.userQuestion, fetchImpl, request.locale);
  return {
    ...request,
    urlSourceReferences: sourceReferences
  };
}

function evaluatePreDeliberationTermination(request: AgentRuntimeSessionRequest) {
  const urlSources = request.urlSourceReferences ?? [];
  if (urlSources.length === 0) return null;
  if (urlSources.some((source) => source.fetchStatus === "completed")) return null;
  if ((request.attachments ?? []).some((attachment) => attachment.summary.trim().length > 0)) return null;
  const questionWithoutUrls = stripExtractedUrls(request.userQuestion);
  if (hasEnoughQuestionContext(questionWithoutUrls)) return null;

  const errorCodes = [...new Set(urlSources.map((source) => source.fetchErrorCode).filter(Boolean))];
  return {
    code: "insufficient_source_context",
    message: "议事已终止：问题中主要内容是 URL，但系统未能读取这些 URL 的正文，无法形成可讨论的议题上下文。",
    recoveryHint: [
      errorCodes.includes("url_access_restricted")
        ? "部分链接所在站点拒绝服务端读取、需要登录/验证，或只允许特定客户端访问；"
        : undefined,
      "请打开链接并把关键正文、摘要或截图中的文字粘贴到个人决策问题中；",
      "也可以上传文本文件作为补充背景后重新启动议事。",
      errorCodes.length > 0 ? `URL 读取错误：${errorCodes.join(", ")}。` : undefined
    ].filter(Boolean).join("")
  };
}

function hasEnoughQuestionContext(value: string): boolean {
  const normalized = normalizeSubstantiveQuestionContext(value);
  return normalized.length >= 4;
}

// URL workflow wording is not enough deliberation context when every URL failed.
function normalizeSubstantiveQuestionContext(value: string): string {
  let normalized = value;
  for (const pattern of urlWorkflowInstructionPatterns) {
    normalized = normalized.replace(pattern, " ");
  }
  for (const token of cjkUrlWorkflowFillerTokens) {
    normalized = normalized.replace(new RegExp(escapeRegExp(token), "giu"), " ");
  }
  normalized = normalized.replace(asciiUrlWorkflowFillerPattern, " ");
  return normalized
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .trim();
}

const urlWorkflowInstructionPatterns = [
  /(?:请|麻烦)?(?:帮我|帮忙)?(?:根据|基于|参考|用|把|将|读取|抓取|打开|访问)?(?:这个|这条|这篇|该|上面|下面)?(?:url|链接|网址|网页|页面)(?:的)?(?:内容)?/giu,
  /(?:请|麻烦)?(?:帮我|帮忙)?(?:根据|基于|参考|用|把|将|读取|抓取|打开|访问)(?:这个|这条|这篇|该|上面|下面)?(?:文章|内容|材料|资料|来源)(?:的)?(?:内容)?/gu,
  /(?:创建|生成|建立|完善|发起|启动)(?:一个|本次|这次|新的)?(?:议题|议事|会议|会话)/gu,
  /\b(?:please\s+)?(?:use|using|from|based\s+on|based\s+upon|refer\s+to|read|fetch|open|visit)?\s*(?:this|that|the)?\s*(?:url|link|website|webpage|page)\b/giu,
  /\b(?:create|start|generate|make|build)\s+(?:a\s+|the\s+)?(?:topic|session|meeting|agenda)\b/giu
];

const cjkUrlWorkflowFillerTokens = [
  "请",
  "麻烦",
  "帮我",
  "帮忙",
  "根据",
  "基于",
  "参考",
  "用",
  "把",
  "将",
  "这个",
  "这条",
  "这篇",
  "该",
  "上面",
  "下面",
  "链接",
  "网址",
  "网页",
  "页面",
  "内容",
  "材料",
  "资料",
  "来源",
  "创建",
  "生成",
  "建立",
  "完善",
  "发起",
  "启动",
  "议题",
  "议事",
  "会议",
  "会话",
  "看一下",
  "看看",
  "看下",
  "一下",
  "一个",
  "本次",
  "这次",
  "新的",
  "打开",
  "访问",
  "读取",
  "抓取",
  "总结",
  "摘要"
];

const asciiUrlWorkflowFillerPattern = /\b(?:please|use|using|from|based|upon|refer|to|read|fetch|open|visit|this|that|the|url|link|website|webpage|page|content|source|create|start|generate|make|build|topic|session|meeting|agenda|summary|summarize)\b/giu;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function persistCompletedRecord(input: {
  repository: DeliberationRecordRepository;
  request: AgentRuntimeSessionRequest;
  sessionId: string;
  events: DeliberationStreamEvent[];
  snapshot: DeliberationSessionSnapshot;
}): Promise<DeliberationRecordSummary | null> {
  if (!input.request.userReferenceId) return null;
  await input.repository.ensureUserReference({
    id: input.request.userReferenceId,
    type: "local_anonymous"
  });
  const record = await input.repository.createRecord({
    userReferenceId: input.request.userReferenceId,
    sessionId: input.sessionId,
    meetingRuleType: input.request.meetingRuleType,
    title: buildRecordTitle(input.request.userQuestion),
    question: input.request.userQuestion,
    locale: input.request.locale,
    status: "active",
    phase: "call_to_order"
  });
  for (const [index, event] of input.events.entries()) {
    const outputEvent = attachRecordToStreamEvent(event, record);
    await input.repository.appendEvent({
      recordId: record.id,
      sessionId: record.sessionId,
      userReferenceId: input.request.userReferenceId,
      sequence: index + 1,
      type: outputEvent.type,
      payload: outputEvent
    });
  }
  await input.repository.saveSnapshot({
    recordId: record.id,
    sessionId: record.sessionId,
    snapshot: input.snapshot,
    version: 1
  });
  return input.repository.completeRecord({
    recordId: record.id,
    status: "completed",
    phase: input.snapshot.phase,
    actionPlanSummary: input.snapshot.actionPlan.summary
  });
}

function attachRecordToStreamEvent(
  event: DeliberationStreamEvent,
  record: DeliberationRecordSummary
): DeliberationStreamEvent {
  if (event.type === "session_started" || event.type === "completed") {
    return {
      ...event,
      recordId: record.id,
      meetingRuleType: record.meetingRuleType
    };
  }
  return event;
}

function buildRecordTitle(question: string): string {
  const normalized = question.replace(/\s+/g, " ").trim();
  return normalized.length > 48 ? `${normalized.slice(0, 48)}...` : normalized;
}

let defaultRecordRepository: DeliberationRecordRepository | null = null;

function getDefaultRecordRepository(): DeliberationRecordRepository {
  if (!defaultRecordRepository) {
    const databasePath = process.env.RONR_DB_PATH ?? join(process.cwd(), "data", "ronr.sqlite");
    defaultRecordRepository = createSqliteDeliberationRecordRepository({ databasePath });
  }
  return defaultRecordRepository;
}

function toStreamError(error: unknown) {
  if (error instanceof ProviderConfigError) {
    return {
      type: "error",
      code: error.code,
      message: error.message,
      recoveryHint: "复制 config/provider.example.json 为 config/provider.local.json，并填写本地 API key。"
    };
  }

  if (error instanceof ProviderRuntimeError) {
    return {
      type: "error",
      code: error.code,
      message: error.message,
      recoveryHint: runtimeRecoveryHint(error.code)
    };
  }

  return {
    type: "error",
    code: "unknown_error",
    message: "RONR 运行时发生未知错误。",
    recoveryHint: "请检查服务端日志。"
  };
}

function providerStatus(code: string): number {
  if (code === "auth_failed" || code === "permission_denied") return 401;
  if (code === "model_not_found") return 404;
  if (code === "rate_limited") return 429;
  if (code === "provider_unavailable" || code === "network_failed" || code === "timeout") return 503;
  if (code === "search_failed") return 502;
  return 502;
}

function runtimeRecoveryHint(code: string): string {
  if (code === "auth_failed") return "检查 config/provider.local.json 中的 apiKey。";
  if (code === "model_not_found") return "刷新模型列表并重新选择可用模型。";
  if (code === "schema_parse_failed") return "重试本次议事，或调整 prompt / 模型。";
  if (code === "search_failed") return "重试搜索、调整来源策略，或降级为无外部依据讨论。";
  if (code === "network_failed") return "确认网络代理和 PPIO 服务可用。";
  return "稍后重试或调整 provider 配置。";
}
