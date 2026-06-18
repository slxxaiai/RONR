import { describe, expect, test, vi } from "vitest";
import { runDeliberation } from "@ronr/agents";
import type { ModelProvider } from "@ronr/providers";

describe("agent runtime", () => {
  test("returns schema_parse_failed when an agent output is not valid JSON", async () => {
    const provider: ModelProvider = {
      listModels: vi.fn(),
      complete: vi.fn(async () => ({
        requestId: "req-1",
        provider: "ppio-default",
        model: "model-a",
        contentText: "not json",
        finishReason: "stop",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        rawResponseId: "raw-1",
        providerMeta: { latencyMs: 1, httpStatus: 200 }
      }))
    };

    await expect(
      runDeliberation(
        {
          userQuestion: "我应该选择 A 方案还是 B 方案？",
          locale: "zh-CN",
          agentConfig: {
            chair: { model: "model-a" },
            secretary: { model: "model-a" },
            members: [
              { id: "member-user", model: "model-a", mandate: "user-advocate" },
              { id: "member-red", model: "model-a", mandate: "red-team" }
            ]
          }
        },
        provider
      )
    ).rejects.toMatchObject({ code: "schema_parse_failed" });
  });
});
