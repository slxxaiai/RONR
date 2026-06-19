import { describe, expect, test, vi } from "vitest";
import { createOpenAICompatibleProvider, mapProviderError } from "@ronr/providers";

describe("provider model list", () => {
  test("maps PPIO model list fields and sends Bearer auth without leaking apiKey", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: "deepseek/deepseek-v3.1",
              title: "DeepSeek V3.1",
              description: "general model",
              context_size: 128000,
              input_token_price_per_m: 2,
              output_token_price_per_m: 8,
              created: 1,
              object: "model"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const provider = createOpenAICompatibleProvider({
      providerProfileId: "ppio-default",
      displayName: "PPIO",
      protocol: "openai-compatible",
      baseURL: "https://api.ppio.com/openai/v1",
      apiKey: "secret-key",
      timeoutMs: 30000,
      temperatureDefault: 0.2,
      maxTokensDefault: 1200
    }, fetchMock);

    const models = await provider.listModels();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ppio.com/openai/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer secret-key" })
      })
    );
    expect(models).toEqual([
      {
        id: "deepseek/deepseek-v3.1",
        title: "DeepSeek V3.1",
        description: "general model",
        contextSize: 128000,
        inputTokenPricePerM: 2,
        outputTokenPricePerM: 8
      }
    ]);
    expect(JSON.stringify(models)).not.toContain("secret-key");
  });

  test("maps provider errors to stable internal codes", () => {
    expect(mapProviderError(401, "FAILED_TO_AUTH")).toBe("auth_failed");
    expect(mapProviderError(403, "ACCESS_DENY")).toBe("permission_denied");
    expect(mapProviderError(404, "MODEL_NOT_FOUND")).toBe("model_not_found");
    expect(mapProviderError(400, "INVALID_REQUEST_BODY")).toBe("invalid_request");
    expect(mapProviderError(429, "RATE_LIMIT_EXCEEDED")).toBe("rate_limited");
    expect(mapProviderError(429, "TOKEN_LIMIT_EXCEEDED")).toBe("token_limit_exceeded");
    expect(mapProviderError(403, "NOT_ENOUGH_BALANCE")).toBe("insufficient_balance");
    expect(mapProviderError(503, "SERVICE_NOT_AVAILABLE")).toBe("provider_unavailable");
    expect(mapProviderError(502, "SEARCH_FAILED")).toBe("search_failed");
  });

  test("maps model list network failures to network_failed without exposing apiKey", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed with secret-key");
    });
    const provider = createOpenAICompatibleProvider({
      providerProfileId: "ppio-default",
      displayName: "PPIO",
      protocol: "openai-compatible",
      baseURL: "https://api.ppio.com/openai/v1",
      apiKey: "secret-key",
      timeoutMs: 30000,
      temperatureDefault: 0.2,
      maxTokensDefault: 1200
    }, fetchMock);

    await expect(provider.listModels()).rejects.toMatchObject({
      code: "network_failed",
      message: expect.not.stringContaining("secret-key")
    });
  });
});
