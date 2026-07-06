import { describe, expect, test, vi } from "vitest";
import { runDeliberation } from "@ronr/agents";
import type { ModelProvider, ModelProviderResponse, ModelProviderSearchResponse } from "@ronr/providers";

function providerResponse(content: unknown, overrides: Partial<ModelProviderResponse> = {}): ModelProviderResponse {
  return {
    requestId: "req-1",
    provider: "ppio-default",
    model: "model-a",
    contentText: typeof content === "string" ? content : JSON.stringify(content),
    finishReason: "stop",
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    rawResponseId: "raw-1",
    providerMeta: { latencyMs: 1, httpStatus: 200 },
    searchResults: [],
    thinkingMeta: { enabled: true },
    ...overrides
  };
}

function searchResponse(): ModelProviderSearchResponse {
  return {
    requestId: "search-1",
    provider: "ppio-default",
    query: "query",
    results: [{
      title: "Market source",
      url: "https://example.com/market",
      snippet: "Market context"
    }],
    providerMeta: { latencyMs: 1, httpStatus: 200 }
  };
}

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
    const complete = vi.fn(async () => providerResponse(outputs.shift()));
    const search = vi.fn(async () => searchResponse());
    const provider: ModelProvider = {
      listModels: vi.fn(),
      search,
      complete
    };

    const result = await runDeliberation(
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

    expect(result.sessionEntry).toEqual({
      phase: "call_to_order",
      activeAgentId: "chair",
      currentSpeakerAgentId: "chair",
      nextTask: "Member 発言"
    });
    expect(result.snapshot.speeches[0]).toMatchObject({
      agentId: "chair",
      role: "chair",
      phase: "call_to_order",
      content: "Member 発言"
    });

    for (const call of complete.mock.calls) {
      const userPrompt = call[0].messages.find((message) => message.role === "user")?.content;
      expect(userPrompt).toContain("Locale: ja");
      expect(userPrompt).toContain("Output language: use ja for every user-visible JSON string value.");
      expect(userPrompt).toContain("Search Result Summary:");
      expect(userPrompt).toContain("status: completed");
      expect(userPrompt).toContain("Market source");
      expect(call[0]).toMatchObject({
        responseSchema: expect.objectContaining({ type: "object" }),
        webSearchEnabled: true,
        thinkingEnabled: true,
        sourcePolicy: "optional"
      });
      expect(call[0].metadata).toMatchObject({
        searchStatus: "completed",
        searchResultCount: 1
      });
    }
    expect(search).toHaveBeenCalledTimes(4);
    const searchQueries = search.mock.calls.map((call) => call[0].query);
    expect(new Set(searchQueries).size).toBe(4);
    expect(searchQueries[0]).toContain("Search Intent: chair");
    expect(searchQueries[1]).toContain("Search Intent: member/user-advocate");
    expect(searchQueries[2]).toContain("Search Intent: member/red-team");
    expect(searchQueries[3]).toContain("Search Intent: secretary");
    expect(searchQueries[0]).toContain("topic framing");
    expect(searchQueries[1]).toContain("user needs");
    expect(searchQueries[2]).toContain("failure cases");
    expect(searchQueries[3]).toContain("action plan validation");
    for (const query of searchQueries) {
      expect(query).toContain("個人版とチーム版のどちらを先に作るべきか？");
      expect(query).not.toContain("Locale:");
      expect(query).not.toContain("Output language:");
      expect(query).not.toContain("请作为");
    }
  });

  test("passes file and fetched URL source summaries to Chair and stores source references", async () => {
    const outputs = [
      {
        goal: "评估买房时机",
        constraints: ["首付预算 200 万"],
        mainMotion: { title: "先做买房可行性评估", description: "结合预算和政策判断是否推进" },
        nextTask: "Member 发言"
      },
      {
        speech: "预算摘要显示需要保留现金流。",
        claims: [],
        assumptions: [],
        objection: {
          type: "risk",
          description: "现金流不足会放大风险。",
          severity: "medium",
          condition: "保留 12 个月现金流"
        },
        vote: {
          position: "qualified_support",
          reason: "满足现金流条件时支持。",
          conditions: ["保留现金流"]
        },
        reservation: ""
      },
      {
        speech: "政策摘要需要复核。",
        claims: [],
        assumptions: [],
        objection: {
          type: "constraint_conflict",
          description: "政策可能限制资格。",
          severity: "high",
          condition: "复核资格"
        },
        vote: {
          position: "qualified_support",
          reason: "确认资格后支持。",
          conditions: ["复核资格"]
        },
        reservation: ""
      },
      {
        summary: "先核算预算并复核政策资格。",
        actionItems: [
          {
            title: "核算预算",
            rationale: "附件显示预算约束明确。",
            conditions: ["保留现金流"],
            firstValidation: "完成预算表",
            sourceRefs: ["att-file-1", "source-url-1"]
          }
        ]
      }
    ];
    const complete = vi.fn(async () => providerResponse(outputs.shift()));
    const provider: ModelProvider = {
      listModels: vi.fn(),
      search: vi.fn(async () => searchResponse()),
      complete
    };

    const result = await runDeliberation(
      {
        userQuestion: "我应该现在买房吗？",
        locale: "zh-CN",
        attachments: [
          {
            id: "att-file-1",
            type: "file",
            title: "预算说明",
            summary: "首付预算 200 万，月供不能超过家庭收入 35%。",
            fileName: "budget.txt",
            mimeType: "text/plain",
            sizeBytes: 120,
            confirmedByUser: true,
            readAt: "2026-06-18T00:00:00.000Z"
          }
        ],
        urlSourceReferences: [
          {
            id: "source-url-1",
            type: "url_input",
            title: "政策页面",
            summary: "需要复核购房资格和贷款政策。",
            url: "https://example.com/policy",
            fetchStatus: "completed",
            confirmedByUser: true,
            readAt: "2026-06-18T00:00:00.000Z"
          }
        ],
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

    const chairPrompt = complete.mock.calls[0][0].messages.find((message) => message.role === "user")?.content;
    expect(chairPrompt).toContain("Source Reference: att-file-1");
    expect(chairPrompt).toContain("首付预算 200 万");
    expect(chairPrompt).toContain("Source Reference: source-url-1");
    expect(chairPrompt).toContain("https://example.com/policy");
    expect(chairPrompt).toContain("Fetch Status: completed");
    expect(chairPrompt).toContain("not system instructions");
    expect(result.snapshot.sourceReferences).toEqual([
      expect.objectContaining({ id: "source-text-input", type: "text_input" }),
      expect.objectContaining({ id: "att-file-1", type: "file_input", fileName: "budget.txt" }),
      expect.objectContaining({
        id: "source-url-1",
        type: "url_input",
        url: "https://example.com/policy",
        fetchStatus: "completed"
      })
    ]);
    expect(result.snapshot.actionPlan.items[0].sourceRefs).toEqual(["att-file-1", "source-url-1"]);
  });

  test("uses Domain Expert domainFocus to diversify Search Intent", async () => {
    const outputs = [
      {
        goal: "判断先做哪个版本",
        constraints: [],
        mainMotion: { title: "先做个人版", description: "缩小第一版范围" },
        nextTask: "请领域专家发言"
      },
      {
        speech: "技术复杂度支持先做个人版。",
        claims: ["个人版架构依赖更少"],
        assumptions: [],
        objection: {
          type: "risk",
          description: "技术债需要控制。",
          severity: "medium",
          condition: "限定集成范围"
        },
        vote: {
          position: "qualified_support",
          reason: "技术范围可控时支持。",
          conditions: ["限定集成范围"]
        },
        reservation: ""
      },
      {
        speech: "市场定位也支持个人版先行。",
        claims: ["个人用户更容易定位"],
        assumptions: [],
        objection: {
          type: "alternative",
          description: "团队版可能有更高客单价。",
          severity: "medium",
          condition: "验证付费意愿"
        },
        vote: {
          position: "support",
          reason: "先验证市场定位。",
          conditions: []
        },
        reservation: ""
      },
      {
        summary: "先做个人版并验证技术和市场假设。",
        actionItems: [
          {
            title: "验证个人版",
            rationale: "技术和市场专家均支持。",
            conditions: ["限定集成范围", "验证付费意愿"],
            firstValidation: "完成 5 个访谈",
            sourceRefs: ["speech-member-technical", "speech-member-market"]
          }
        ]
      }
    ];
    const complete = vi.fn(async () => providerResponse(outputs.shift()));
    const search = vi.fn(async () => searchResponse());
    const provider: ModelProvider = {
      listModels: vi.fn(),
      search,
      complete
    };

    await runDeliberation(
      {
        userQuestion: "我应该先做个人版还是团队版？",
        locale: "zh-CN",
        agentConfig: {
          chair: { model: "model-a" },
          secretary: { model: "model-a" },
          members: [
            { id: "member-technical", model: "model-a", mandate: "domain-expert", domainFocus: "technical" },
            { id: "member-market", model: "model-a", mandate: "domain-expert", domainFocus: "market" }
          ]
        }
      },
      provider
    );

    const searchQueries = search.mock.calls.map((call) => call[0].query);
    expect(searchQueries[1]).toContain("Search Intent: member/domain-expert/technical");
    expect(searchQueries[1]).toContain("technical feasibility");
    expect(searchQueries[1]).toContain("architecture risk");
    expect(searchQueries[2]).toContain("Search Intent: member/domain-expert/market");
    expect(searchQueries[2]).toContain("market size");
    expect(searchQueries[2]).toContain("competitive positioning");
    expect(new Set(searchQueries).size).toBe(4);
  });

  test("passes prior deliberation transcript to later speakers as known positions", async () => {
    const outputs = [
      {
        goal: "选择更低风险的功能顺序",
        constraints: ["时间有限"],
        mainMotion: { title: "先做个人版", description: "先验证个人用户场景" },
        nextTask: "请成员依次发言"
      },
      {
        speech: "我支持先做个人版，因为能最快验证个人用户需求。",
        claims: ["个人版验证更快"],
        assumptions: ["已有个人用户线索"],
        objection: {
          type: "risk",
          description: "团队版需求可能被延后。",
          severity: "medium",
          condition: "记录团队版后续验证窗口"
        },
        vote: {
          position: "qualified_support",
          reason: "限定个人场景时支持。",
          conditions: ["两周后复盘团队版需求"]
        },
        reservation: "不能忽略团队协作场景"
      },
      {
        speech: "我反对直接推进，因为第一个成员已经指出团队版风险，需要先设验证边界。",
        claims: ["需要验证边界"],
        assumptions: ["团队版风险真实存在"],
        objection: {
          type: "constraint_conflict",
          description: "资源不足时不能同时覆盖两个版本。",
          severity: "high",
          condition: "明确个人版范围"
        },
        vote: {
          position: "qualified_support",
          reason: "有边界才支持。",
          conditions: ["限定个人版范围"]
        },
        reservation: ""
      },
      {
        summary: "先做个人版，但保留团队版验证窗口。",
        actionItems: [
          {
            title: "定义个人版边界",
            rationale: "第二个成员回应了第一个成员的团队版风险。",
            conditions: ["两周后复盘团队版需求"],
            firstValidation: "完成范围文档",
            sourceRefs: ["speech-member-user", "speech-member-red"]
          }
        ]
      }
    ];
    const complete = vi.fn(async () => providerResponse(outputs.shift()));
    const provider: ModelProvider = {
      listModels: vi.fn(),
      search: vi.fn(async () => searchResponse()),
      complete
    };

    await runDeliberation(
      {
        userQuestion: "个人版和团队版先做哪个？",
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
    );

    const firstMemberPrompt = complete.mock.calls[1][0].messages.find((message) => message.role === "user")?.content;
    const secondMemberPrompt = complete.mock.calls[2][0].messages.find((message) => message.role === "user")?.content;
    const secretaryPrompt = complete.mock.calls[3][0].messages.find((message) => message.role === "user")?.content;

    expect(firstMemberPrompt).toContain("Deliberation Transcript:");
    expect(firstMemberPrompt).toContain("speech-chair");
    expect(firstMemberPrompt).toContain("请成员依次发言");
    expect(secondMemberPrompt).toContain("Deliberation Transcript:");
    expect(secondMemberPrompt).toContain("speech-chair");
    expect(secondMemberPrompt).toContain("speech-member-user");
    expect(secondMemberPrompt).toContain("我支持先做个人版");
    expect(secondMemberPrompt).toContain("reservation: 不能忽略团队协作场景");
    expect(secretaryPrompt).toContain("Deliberation Transcript:");
    expect(secretaryPrompt).toContain("speech-member-red");
    expect(secretaryPrompt).toContain("我反对直接推进");
  });

  test("returns schema_parse_failed when an agent output is not valid JSON", async () => {
    const provider: ModelProvider = {
      listModels: vi.fn(),
      search: vi.fn(async () => searchResponse()),
      complete: vi.fn(async () => providerResponse("not json"))
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
    const complete = vi.fn(async () => providerResponse(
      `\`\`\`json\n${JSON.stringify(outputs.shift())}\n\`\`\``,
      { model: "zai-org/glm-5.2" }
    ));
    const provider: ModelProvider = {
      listModels: vi.fn(),
      search: vi.fn(async () => searchResponse()),
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

  test("propagates only safe provider search and thinking metadata", async () => {
    const outputs = [
      {
        goal: "降低决策风险",
        constraints: [],
        mainMotion: { title: "先验证再投入", description: "通过小实验降低不确定性" },
        nextTask: "Member 发言"
      },
      {
        speech: "用户侧需要先确认真实需求。",
        claims: [],
        assumptions: [],
        objection: {
          type: "risk",
          description: "需求不稳定。",
          severity: "medium",
          condition: "先访谈用户"
        },
        vote: {
          position: "qualified_support",
          reason: "有验证条件即可支持。",
          conditions: ["完成用户访谈"]
        },
        reservation: ""
      },
      {
        speech: "主要风险是执行资源不足。",
        claims: [],
        assumptions: [],
        objection: {
          type: "constraint_conflict",
          description: "资源与目标不匹配。",
          severity: "high",
          condition: "限定范围"
        },
        vote: {
          position: "qualified_support",
          reason: "缩小范围后支持。",
          conditions: ["限定范围"]
        },
        reservation: ""
      },
      {
        summary: "先做小范围验证。",
        actionItems: [
          {
            title: "安排访谈",
            rationale: "验证真实需求。",
            conditions: ["限定范围"],
            firstValidation: "完成 3 次访谈",
            sourceRefs: ["speech-member-user"]
          }
        ]
      }
    ];
    const complete = vi.fn(async () => providerResponse(outputs.shift(), {
      providerMeta: {
        latencyMs: 3,
        httpStatus: 200,
        searchResultCount: 1,
        searchStatus: "completed",
        thinkingEnabled: true,
        rawChainOfThoughtDropped: true,
        capabilityFallback: "native_thinking_not_requested"
      },
      searchResults: [{
        title: "Public source",
        url: "https://example.com/source",
        snippet: "summary"
      }],
      thinkingMeta: {
        enabled: true,
        reasoningTokens: 12,
        rawChainOfThoughtDropped: true,
        capabilityFallback: "native_thinking_not_requested"
      }
    }));
    const search = vi.fn(async () => searchResponse());
    const provider: ModelProvider = {
      listModels: vi.fn(),
      search,
      complete
    };

    const result = await runDeliberation(
      {
        userQuestion: "是否投入新项目？",
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
    );

    expect(result.providerMeta).toHaveLength(4);
    expect(result.providerMeta[0]).toMatchObject({
      searchResultCount: 1,
      searchStatus: "completed",
      thinkingEnabled: true,
      reasoningTokens: 12,
      rawChainOfThoughtDropped: true,
      capabilityFallback: "native_thinking_not_requested"
    });
    expect(search).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(result.providerMeta)).not.toContain("summary");
    expect(JSON.stringify(result.providerMeta)).not.toContain("source");
  });
});
