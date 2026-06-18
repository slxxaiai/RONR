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
  test("uses json_object response_format and disables GLM thinking for structured output", async () => {
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
      messages: [{ role: "user", content: "请输出 JSON。" }],
      responseSchema: {
        type: "object",
        properties: {
          ok: { type: "boolean" }
        },
        required: ["ok"]
      }
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(observedBody).toMatchObject({
      response_format: {
        type: "json_object"
      },
      thinking: {
        type: "disabled"
      }
    });
    expect(observedBody?.response_format).not.toHaveProperty("json_schema");
  });

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
      model: "deepseek/deepseek-v4-flash",
      messages: [{ role: "user", content: "请输出 JSON。" }]
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(observedBody).not.toHaveProperty("response_format");
    expect(observedBody).not.toHaveProperty("thinking");
  });
});
