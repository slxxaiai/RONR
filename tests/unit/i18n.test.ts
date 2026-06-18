import { describe, expect, test } from "vitest";
import { getTranslation } from "@ronr/web/i18n";

describe("i18n", () => {
  test("falls back to zh-CN for missing translation keys in target locale", () => {
    expect(getTranslation("ko", "app.title")).toBe("RONR AI 议事");
  });
});
