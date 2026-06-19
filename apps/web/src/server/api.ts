import { createSessionRequestSchema, validateAgentConfig } from "@ronr/contracts";
import type { ProviderLocalConfig } from "@ronr/providers";
import {
  createOpenAICompatibleProvider,
  loadProviderConfig,
  ProviderConfigError,
  ProviderRuntimeError
} from "@ronr/providers";
import { runDeliberation, runDeliberationStream } from "@ronr/agents";

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
  availableModelIds?: string[]
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

    const { snapshot, providerMeta, sessionEntry } = await runDeliberation(parsed.data, provider);
    return Response.json(
      {
        sessionId: snapshot.id,
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
  availableModelIds?: string[]
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

        for await (const event of runDeliberationStream(parsed.data, provider)) {
          write(event);
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
