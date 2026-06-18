import { describe, expect, test } from "vitest";
import { getTranslation, locales } from "@ronr/web/i18n";

describe("i18n", () => {
  test("provides localized labels for supported UI enum values", () => {
    expect(getTranslation("zh-CN", "mandate.user-advocate")).toBe("用户代表");
    expect(getTranslation("zh-TW", "mandate.user-advocate")).toBe("使用者代表");
    expect(getTranslation("en", "mandate.user-advocate")).toBe("User Advocate");
    expect(getTranslation("ja", "phase.action_resolution")).toBe("行動計画");
    expect(getTranslation("ko", "vote.qualified_support")).toBe("조건부 지지");
    expect(getTranslation("en", "motionStatus.adopted")).toBe("Adopted");
    expect(getTranslation("ja", "objectionType.cost")).toBe("コスト");
    expect(getTranslation("ko", "resolutionStatus.converted_to_condition")).toBe("조건으로 전환됨");
  });

  test("provides localized labels for result sections and provider errors", () => {
    expect(getTranslation("en", "result.sourceReferences")).toBe("Source References");
    expect(getTranslation("ja", "result.validationStep")).toBe("検証ステップ");
    expect(getTranslation("ko", "result.rationale")).toBe("근거");
    expect(getTranslation("zh-TW", "error.permissionDenied")).toBe("模型提供方拒絕訪問。");
    expect(getTranslation("en", "error.insufficientBalance")).toBe("The model provider account has insufficient balance.");
    expect(getTranslation("ko", "error.tokenLimitExceeded")).toBe("이번 요청이 모델 컨텍스트 또는 token 한도를 초과했습니다.");
  });

  test("keeps every supported locale wired into the app", () => {
    expect(locales).toEqual(["zh-CN", "zh-TW", "en", "ja", "ko"]);
  });

  test("falls back when a translation key is missing from all resources", () => {
    expect(getTranslation("en", "unknown.key" as Parameters<typeof getTranslation>[1])).toBe("unknown.key");
  });
});
