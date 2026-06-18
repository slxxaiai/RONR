import { describe, expect, test } from "vitest";
import { validateAgentConfig } from "@ronr/contracts";

const availableModels = ["model-a", "model-b"];

describe("agent configuration", () => {
  test("accepts Chair, Secretary, and at least two Members with known models", () => {
    const result = validateAgentConfig(
      {
        chair: { model: "model-a" },
        secretary: { model: "model-a" },
        members: [
          { id: "member-user", model: "model-a", mandate: "user-advocate" },
          { id: "member-red", model: "model-b", mandate: "red-team" }
        ]
      },
      availableModels
    );

    expect(result.success).toBe(true);
  });

  test("rejects missing Chair, missing Secretary, too few Members, unknown mandate, and unknown model", () => {
    const result = validateAgentConfig(
      {
        chair: { model: "" },
        secretary: { model: "" },
        members: [
          { id: "member-one", model: "unknown-model", mandate: "unknown" }
        ]
      },
      availableModels
    );

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "chair.model 必须选择支持的模型",
        "secretary.model 必须选择支持的模型",
        "members 至少需要两个 Member Agent",
        "members[0].model 必须选择支持的模型",
        "members[0].mandate 不受支持"
      ])
    );
  });
});
