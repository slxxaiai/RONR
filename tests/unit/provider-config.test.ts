import { describe, expect, test } from "vitest";
import { loadProviderConfigFromText, ProviderConfigError } from "@ronr/providers";

describe("provider local config", () => {
  test("rejects a missing local config with a clear error", () => {
    expect(() => loadProviderConfigFromText(null)).toThrow(ProviderConfigError);
    expect(() => loadProviderConfigFromText(null)).toThrow("config/provider.local.json");
  });

  test("rejects invalid JSON with a clear error", () => {
    expect(() => loadProviderConfigFromText("{")).toThrow("provider.local.json 不是合法 JSON");
  });

  test("rejects config without apiKey", () => {
    const configText = JSON.stringify({
      providerProfileId: "ppio-default",
      displayName: "PPIO",
      protocol: "openai-compatible",
      baseURL: "https://api.ppio.com/openai/v1",
      apiKey: "",
      timeoutMs: 30000,
      temperatureDefault: 0.2,
      maxTokensDefault: 1200
    });

    expect(() => loadProviderConfigFromText(configText)).toThrow("apiKey");
  });
});
