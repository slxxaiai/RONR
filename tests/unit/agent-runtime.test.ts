import { describe, expect, test, vi } from "vitest";
import { runDeliberation } from "@ronr/agents";
import type { ModelProvider } from "@ronr/providers";

describe("agent runtime", () => {
  test("passes the requested locale as output language guidance to every agent prompt", async () => {
    const outputs = [
      {
        goal: "個人版を先に検証する",
        constraints: [],
        mainMotion: { title: "個人版を先に作る", description: "最初の検証範囲を狭くする" },
        nextTask: "Member 発言"
      },
      {
        speech: "個人版のほうが初期ユーザーを定義しやすい。",
        claims: [],
        assumptions: [],
        objection: {
          type: "risk",
          description: "チーム利用の要件が遅れる可能性がある。",
          severity: "medium",
          condition: "後続ロードマップで扱う"
        },
        vote: {
          position: "qualified_support",
          reason: "範囲が狭いなら支持する。",
          conditions: ["個人利用に限定する"]
        },
        reservation: ""
      },
      {
        speech: "価格検証を先に行うべき。",
        claims: [],
        assumptions: [],
        objection: {
          type: "cost",
          description: "支払い意思の検証が必要。",
          severity: "medium",
          condition: "事前インタビューを行う"
        },
        vote: {
          position: "support",
          reason: "検証条件が明確。",
          conditions: []
        },
        reservation: ""
      },
      {
        summary: "個人版を小さく検証する。",
        actionItems: [
          {
            title: "5人に検証する",
            rationale: "初期範囲を確認するため。",
            conditions: ["個人利用に限定する"],
            firstValidation: "5人にインタビューする",
            sourceRefs: ["speech-member-user", "vote-member-user"]
          }
        ]
      }
    ];
    const complete = vi.fn(async () => ({
      requestId: "req-1",
      provider: "ppio-default",
      model: "model-a",
      contentText: JSON.stringify(outputs.shift()),
      finishReason: "stop",
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      rawResponseId: "raw-1",
      providerMeta: { latencyMs: 1, httpStatus: 200 }
    }));
    const provider: ModelProvider = {
      listModels: vi.fn(),
      complete
    };

    await runDeliberation(
      {
        userQuestion: "個人版とチーム版のどちらを先に作るべきか？",
        locale: "ja",
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
    );

    for (const call of complete.mock.calls) {
      const userPrompt = call[0].messages.find((message) => message.role === "user")?.content;
      expect(userPrompt).toContain("Locale: ja");
      expect(userPrompt).toContain("Output language: use ja for every user-visible JSON string value.");
    }
  });

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

  test("parses JSON wrapped in markdown fences", async () => {
    const outputs = [
      {
        goal: "评估买房时机",
        constraints: [],
        mainMotion: { title: "先做买房可行性评估", description: "围绕预算、利率和家庭现金流判断" },
        nextTask: "进入成员讨论"
      },
      {
        speech: "需要先核算现金流和首付安全垫。",
        claims: [],
        assumptions: [],
        objection: {
          type: "risk",
          description: "房价和收入变化可能影响承受能力。",
          severity: "medium",
          condition: "保留 12 个月现金流"
        },
        vote: {
          position: "qualified_support",
          reason: "满足现金流条件时可以推进。",
          conditions: ["保留现金流安全垫"]
        },
        reservation: ""
      },
      {
        speech: "应考虑下半年政策和利率变化。",
        claims: [],
        assumptions: [],
        objection: {
          type: "alternative",
          description: "可以先观察政策窗口。",
          severity: "medium",
          condition: "设置观察期限"
        },
        vote: {
          position: "support",
          reason: "观察窗口可降低决策风险。",
          conditions: []
        },
        reservation: ""
      },
      {
        summary: "先完成预算和政策窗口验证。",
        actionItems: [
          {
            title: "建立买房预算表",
            rationale: "确认首付、月供和现金流安全垫。",
            conditions: ["保留现金流安全垫"],
            firstValidation: "核算月供占收入比例",
            sourceRefs: ["speech-member-user"]
          }
        ]
      }
    ];
    const complete = vi.fn(async () => ({
      requestId: "req-1",
      provider: "ppio-default",
      model: "zai-org/glm-5.2",
      contentText: `\`\`\`json\n${JSON.stringify(outputs.shift())}\n\`\`\``,
      finishReason: "stop",
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      rawResponseId: "raw-1",
      providerMeta: { latencyMs: 1, httpStatus: 200 }
    }));
    const provider: ModelProvider = {
      listModels: vi.fn(),
      complete
    };

    const result = await runDeliberation(
      {
        userQuestion: "今年下半年适合买房吗？",
        locale: "zh-CN",
        agentConfig: {
          chair: { model: "zai-org/glm-5.2" },
          secretary: { model: "zai-org/glm-5.2" },
          members: [
            { id: "member-user", model: "zai-org/glm-5.2", mandate: "user-advocate" },
            { id: "member-red", model: "zai-org/glm-5.2", mandate: "red-team" }
          ]
        }
      },
      provider
    );

    expect(result.snapshot.status).toBe("completed");
    expect(result.snapshot.actionPlan.items[0].title).toBe("建立买房预算表");
  });
});
