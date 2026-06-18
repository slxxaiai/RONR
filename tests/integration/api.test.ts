import { describe, expect, test, vi } from "vitest";
import { handleListModels, handleCreateSession } from "@ronr/web/server/api";

describe("API handlers", () => {
  test("GET provider models returns mapped model list with mocked fetch", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: "model-a",
              title: "Model A",
              description: "A",
              context_size: 32000,
              input_token_price_per_m: 1,
              output_token_price_per_m: 2,
              created: 1,
              object: "model"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const response = await handleListModels(fetchMock, {
      providerProfileId: "ppio-default",
      displayName: "PPIO",
      protocol: "openai-compatible",
      baseURL: "https://api.ppio.com/openai/v1",
      apiKey: "secret",
      timeoutMs: 30000,
      temperatureDefault: 0.2,
      maxTokensDefault: 1200
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      models: [{ id: "model-a", title: "Model A" }]
    });
  });

  test("POST sessions uses role models and returns action resolution snapshot", async () => {
    const outputs = [
      {
        goal: "选择更适合当前约束的方案",
        constraints: ["预算有限"],
        mainMotion: { title: "选择 A 方案", description: "A 方案更符合预算约束" },
        nextTask: "Member 发言"
      },
      {
        speech: "A 方案对用户目标更直接。",
        claims: ["A 更快"],
        assumptions: ["资源可用"],
        objection: {
          type: "cost",
          description: "仍需验证隐性成本",
          severity: "medium",
          condition: "先做小规模验证"
        },
        vote: {
          position: "qualified_support",
          reason: "有条件支持",
          conditions: ["完成验证"]
        },
        reservation: "需要关注时间成本"
      },
      {
        speech: "主要失败路径是供应商锁定。",
        claims: ["存在锁定风险"],
        assumptions: ["迁移成本较高"],
        objection: {
          type: "risk",
          description: "供应商锁定风险",
          severity: "high",
          condition: "保留替代方案"
        },
        vote: {
          position: "qualified_support",
          reason: "风险可控时支持",
          conditions: ["定义退出条件"]
        },
        reservation: "需要复盘"
      },
      {
        summary: "建议先选择 A 方案并设置验证门槛。",
        actionItems: [
          {
            title: "运行小规模验证",
            rationale: "降低成本和锁定风险",
            conditions: ["完成验证", "定义退出条件"],
            firstValidation: "一周内比较结果",
            sourceRefs: ["speech-member-user", "speech-member-red"]
          }
        ]
      }
    ];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          id: `raw-${outputs.length}`,
          model: body.model,
          choices: [
            {
              finish_reason: "stop",
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify(outputs.shift())
              }
            }
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const response = await handleCreateSession(
      {
        userQuestion: "我应该选择 A 还是 B？",
        locale: "zh-CN",
        agentConfig: {
          chair: { model: "model-a" },
          secretary: { model: "model-b" },
          members: [
            { id: "member-user", model: "model-a", mandate: "user-advocate" },
            { id: "member-red", model: "model-b", mandate: "red-team" }
          ]
        }
      },
      fetchMock,
      {
        providerProfileId: "ppio-default",
        displayName: "PPIO",
        protocol: "openai-compatible",
        baseURL: "https://api.ppio.com/openai/v1",
        apiKey: "secret",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a", "model-b"]
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.phase).toBe("action_resolution");
    expect(payload.sessionSnapshot.actionPlan.items[0].title).toBe("运行小规模验证");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
