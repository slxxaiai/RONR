import { describe, expect, test } from "vitest";
import { createSessionRequestSchema, validateAgentConfig } from "@ronr/contracts";

const availableModels = ["model-a", "model-b"];

describe("agent configuration", () => {
  test("accepts Chair, Secretary, and at least two Members with known models", () => {
    const result = validateAgentConfig(
      {
        chair: { model: "model-a" },
        secretary: { model: "model-a" },
        members: [
          { id: "member-product", model: "model-a", mandate: "domain-expert", domainFocus: "product" },
          { id: "member-red", model: "model-b", mandate: "red-team" }
        ]
      },
      availableModels
    );

    expect(result.success).toBe(true);
  });

  test("accepts Domain Expert domainFocus and rejects domainFocus on other mandates", () => {
    const valid = validateAgentConfig(
      {
        chair: { model: "model-a" },
        secretary: { model: "model-a" },
        members: [
          { id: "member-technical", model: "model-a", mandate: "domain-expert", domainFocus: "technical" },
          { id: "member-market", model: "model-b", mandate: "domain-expert", domainFocus: "market" }
        ]
      },
      availableModels
    );
    expect(valid.success).toBe(true);

    const invalid = validateAgentConfig(
      {
        chair: { model: "model-a" },
        secretary: { model: "model-a" },
        members: [
          { id: "member-general", model: "model-a", mandate: "general", domainFocus: "product" },
          { id: "member-red", model: "model-b", mandate: "red-team" }
        ]
      },
      availableModels
    );
    expect(invalid).toEqual({
      success: false,
      errors: ["members[0].domainFocus 仅支持 domain-expert mandate"]
    });
  });

  test("defaults missing Domain Expert domainFocus to product in create session requests", () => {
    const result = createSessionRequestSchema.safeParse({
      userQuestion: "我应该先做个人版还是团队版？",
      locale: "zh-CN",
      agentConfig: {
        chair: { model: "model-a" },
        secretary: { model: "model-a" },
        members: [
          { id: "member-domain", model: "model-a", mandate: "domain-expert" },
          { id: "member-red", model: "model-b", mandate: "red-team" }
        ]
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agentConfig.members[0]).toMatchObject({
        mandate: "domain-expert",
        domainFocus: "product"
      });
    }
  });

  test("accepts optional positive Max Deliberation Rounds and rejects invalid values", () => {
    const agentConfig = {
      chair: { model: "model-a" },
      secretary: { model: "model-a" },
      members: [
        { id: "member-domain", model: "model-a", mandate: "domain-expert", domainFocus: "product" },
        { id: "member-red", model: "model-b", mandate: "red-team" }
      ]
    };

    expect(validateAgentConfig(agentConfig, availableModels, 3).success).toBe(true);
    expect(validateAgentConfig(agentConfig, availableModels).success).toBe(true);
    expect(validateAgentConfig(agentConfig, availableModels, 0)).toEqual({
      success: false,
      errors: ["maxDeliberationRounds 必须是正整数"]
    });
    expect(validateAgentConfig(agentConfig, availableModels, 1.5)).toEqual({
      success: false,
      errors: ["maxDeliberationRounds 必须是正整数"]
    });
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

describe("user input attachments contract", () => {
  const baseRequest = {
    userQuestion: "我应该现在买房吗？",
    locale: "zh-CN",
    agentConfig: {
      chair: { model: "model-a" },
      secretary: { model: "model-a" },
      members: [
        { id: "member-user", model: "model-a", mandate: "user-advocate" },
        { id: "member-red", model: "model-b", mandate: "red-team" }
      ]
    }
  };

  test("accepts confirmed file and link attachment summaries", () => {
    const result = createSessionRequestSchema.safeParse({
      ...baseRequest,
      attachments: [
        {
          id: "att-file-1",
          type: "file",
          title: "预算说明",
          summary: "首付预算 200 万。",
          fileName: "budget.txt",
          mimeType: "text/plain",
          sizeBytes: 120,
          confirmedByUser: true,
          readAt: "2026-06-18T00:00:00.000Z"
        },
        {
          id: "att-link-1",
          type: "link",
          title: "政策链接",
          summary: "限购政策摘要。",
          url: "https://example.com/policy",
          confirmedByUser: true,
          readAt: "2026-06-18T00:00:00.000Z"
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  test("rejects unconfirmed or malformed attachment summaries", () => {
    const result = createSessionRequestSchema.safeParse({
      ...baseRequest,
      attachments: [
        {
          id: "att-link-1",
          type: "link",
          title: "坏链接",
          summary: "摘要",
          url: "not-a-url",
          confirmedByUser: false,
          readAt: "2026-06-18T00:00:00.000Z"
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
