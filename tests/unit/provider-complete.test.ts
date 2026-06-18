import { describe, expect, test, vi } from "vitest";
import { createOpenAICompatibleProvider } from "@ronr/providers";

const providerConfig = {
  providerProfileId: "ppio-default",
  displayName: "PPIO",
  protocol: "openai-compatible" as const,
  baseURL: "https://api.ppio.com/openai/v1",
  apiKey: "secret-key",
  timeoutMs: 30000,
  temperatureDefault: 0.2,
  maxTokensDefault: 1200
};

describe("provider chat completion", () => {
  test("does not force response_format when no responseSchema is provided", async () => {
    let observedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      observedBody = body;

      return new Response(
        JSON.stringify({
          id: "raw-1",
          model: body.model,
          choices: [
            {
              finish_reason: "stop",
              index: 0,
              message: { role: "assistant", content: "{\"ok\":true}" }
            }
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    const provider = createOpenAICompatibleProvider(providerConfig, fetchMock);

    await provider.complete({
      requestId: "req-1",
      providerProfileId: "ppio-default",
      model: "zai-org/glm-5.2",
      messages: [{ role: "user", content: "请输出 JSON。" }]
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(observedBody).not.toHaveProperty("response_format");
  });
});
