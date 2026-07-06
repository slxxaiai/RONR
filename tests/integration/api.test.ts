import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import {
  handleCreateSession,
  handleCreateSessionStream,
  handleGetRecordDetail,
  handleListModels,
  handleListRecords,
  handleProviderConnectionTest
} from "@ronr/web/server/api";
import { createSqliteDeliberationRecordRepository } from "@ronr/db";

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

  test("GET provider connection test returns sanitized status", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: "model-a",
              title: "Model A",
              description: "A"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const response = await handleProviderConnectionTest(fetchMock, {
      providerProfileId: "ppio-default",
      displayName: "PPIO",
      protocol: "openai-compatible",
      baseURL: "https://api.ppio.com/openai/v1",
      apiKey: "local-api-key-value",
      timeoutMs: 30000,
      temperatureDefault: 0.2,
      maxTokensDefault: 1200
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      status: "ok",
      providerProfileId: "ppio-default",
      displayName: "PPIO",
      protocol: "openai-compatible",
      modelCount: 1
    });
    expect(payload).not.toHaveProperty("models");
    expect(JSON.stringify(payload)).not.toContain("local-api-key-value");
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
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://api.ppio.com/v3/web-search") {
        return new Response(
          JSON.stringify({
            data: {
              results: [
                {
                  title: "Decision source",
                  url: "https://example.com/source",
                  snippet: "外部信息摘要"
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

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
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a", "model-b"]
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.phase).toBe("action_resolution");
    expect(payload.initialPhase).toBe("call_to_order");
    expect(payload.activeAgentId).toBe("chair");
    expect(payload.currentSpeakerAgentId).toBe("chair");
    expect(payload.nextTask).toBe("Member 发言");
    expect(payload.sessionEntry).toEqual({
      phase: "call_to_order",
      activeAgentId: "chair",
      currentSpeakerAgentId: "chair",
      nextTask: "Member 发言"
    });
    expect(payload.sessionSnapshot.actionPlan.items[0].title).toBe("运行小规模验证");
    expect(payload.providerMeta[0]).toMatchObject({
      searchResultCount: 1,
      searchStatus: "completed",
      thinkingEnabled: true
    });
    expect(payload.providerMeta[0].capabilityFallback ?? "").not.toContain("native_search_not_requested");
    expect(JSON.stringify(payload.providerMeta)).not.toContain("local-api-key-value");
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  test("POST session stream returns incremental thinking, speech, and completion events", async () => {
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
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://api.ppio.com/v3/web-search") {
        return new Response(
          JSON.stringify({
            code: 200,
            data: {
              _type: "SearchResponse",
              webPages: {
                value: [{
                  name: "Decision source",
                  url: "https://example.com/source",
                  summary: "外部信息摘要"
                }]
              }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          id: `raw-${outputs.length}`,
          model: body.model,
          choices: [
            {
              finish_reason: "stop",
              index: 0,
              message: { role: "assistant", content: JSON.stringify(outputs.shift()) }
            }
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const response = await handleCreateSessionStream(
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
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a", "model-b"]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/x-ndjson");
    const events = await readNdjsonResponse(response);
    expect(events.map((event) => event.type)).toEqual([
      "session_started",
      "search_sources",
      "thinking",
      "speech",
      "search_sources",
      "thinking",
      "speech",
      "search_sources",
      "thinking",
      "speech",
      "search_sources",
      "thinking",
      "speech",
      "completed"
    ]);
    expect(events[1]).toMatchObject({
      type: "search_sources",
      agentId: "chair",
      status: "completed",
      sources: [{ title: "Decision source", url: "https://example.com/source", snippet: "外部信息摘要" }]
    });
    expect(events[1]).not.toHaveProperty("errorCode");
    expect(events[2]).toMatchObject({
      type: "thinking",
      agentId: "chair"
    });
    expect(events[2].summary).toContain("检索来源");
    expect(events[2].summary).toContain("确认用户问题");
    expect(events[2].summary).toContain("形成主议题");
    const memberThinking = events.find((event) => event.type === "thinking" && event.agentId === "member-red");
    expect(memberThinking?.summary).toContain("前序发言");
    expect(memberThinking?.summary).toContain("风险");
    expect(memberThinking?.summary).toContain("表决立场");
    expect(events[3]).toMatchObject({
      type: "speech",
      speech: { agentId: "chair", phase: "call_to_order", content: "Member 发言" }
    });
    const chatCompletionPrompts = fetchMock.mock.calls
      .filter(([url]) => url === "https://api.ppio.com/openai/v1/chat/completions")
      .map(([, init]) => JSON.parse(String(init?.body)).messages[1].content as string);
    expect(chatCompletionPrompts[1]).toContain("Deliberation Transcript:");
    expect(chatCompletionPrompts[1]).toContain("speech-chair");
    expect(chatCompletionPrompts[2]).toContain("speech-member-user");
    expect(chatCompletionPrompts[2]).toContain("A 方案对用户目标更直接。");
    expect(chatCompletionPrompts[3]).toContain("speech-member-red");
    expect(chatCompletionPrompts[3]).toContain("主要失败路径是供应商锁定。");
    expect(events[13].sessionSnapshot.actionPlan.items[0].title).toBe("运行小规模验证");
    expect(JSON.stringify(events)).not.toContain("local-api-key-value");
    expect(JSON.stringify(events)).not.toContain("rawChainOfThought");
  });

  test("POST session stream persists replayable record for a local user", async () => {
    const repository = createSqliteDeliberationRecordRepository({
      databasePath: join(mkdtempSync(join(tmpdir(), "ronr-api-records-")), "records.sqlite")
    });
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
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://api.ppio.com/v3/web-search") {
        return new Response(
          JSON.stringify({
            data: {
              results: [
                {
                  title: "Decision source",
                  url: "https://example.com/source",
                  snippet: "外部信息摘要"
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          id: `raw-${outputs.length}`,
          model: body.model,
          choices: [
            {
              finish_reason: "stop",
              index: 0,
              message: { role: "assistant", content: JSON.stringify(outputs.shift()) }
            }
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const response = await handleCreateSessionStream(
      {
        userQuestion: "我应该选择 A 还是 B？",
        locale: "zh-CN",
        userReferenceId: "user-local-test",
        meetingRuleType: "robert_rules",
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
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a", "model-b"],
      { recordRepository: repository }
    );

    const events = await readNdjsonResponse(response);
    const startedEvent = events[0];
    const completedEvent = events.at(-1);
    expect(startedEvent).toMatchObject({
      type: "session_started",
      recordId: expect.stringMatching(/^record-/),
      meetingRuleType: "robert_rules"
    });
    expect(completedEvent).toMatchObject({
      type: "completed",
      recordId: startedEvent.recordId
    });

    const listResponse = await handleListRecords(new URLSearchParams({ userReferenceId: "user-local-test" }), repository);
    expect(listResponse.status).toBe(200);
    const listPayload = await listResponse.json();
    expect(listPayload.records).toEqual([
      expect.objectContaining({
        id: startedEvent.recordId,
        userReferenceId: "user-local-test",
        meetingRuleType: "robert_rules",
        title: "我应该选择 A 还是 B？",
        status: "completed",
        eventCount: 14
      })
    ]);

    const detailResponse = await handleGetRecordDetail(
      String(startedEvent.recordId),
      new URLSearchParams({ userReferenceId: "user-local-test" }),
      repository
    );
    expect(detailResponse.status).toBe(200);
    const detailPayload = await detailResponse.json();
    expect(detailPayload.record.id).toBe(startedEvent.recordId);
    expect(detailPayload.snapshot.actionPlan.items[0].title).toBe("运行小规模验证");
    expect(detailPayload.events.map((event: { sequence: number }) => event.sequence)).toEqual(
      Array.from({ length: 14 }, (_, index) => index + 1)
    );
    expect(detailPayload.events.at(-1).payload.type).toBe("completed");
    await expect(
      handleGetRecordDetail(
        String(startedEvent.recordId),
        new URLSearchParams({ userReferenceId: "other-local-user" }),
        repository
      ).then((unauthorizedResponse) => unauthorizedResponse.status)
    ).resolves.toBe(404);
  });

  test("POST sessions fetches URLs from the question and returns source references", async () => {
    const outputs = [
      {
        goal: "评估买房时机",
        constraints: ["首付预算 200 万"],
        mainMotion: { title: "先做买房可行性评估", description: "结合预算和政策判断是否推进" },
        nextTask: "Member 发言"
      },
      {
        speech: "预算附件显示现金流约束明确。",
        claims: [],
        assumptions: [],
        objection: {
          type: "risk",
          description: "现金流不足。",
          severity: "medium",
          condition: "保留现金流"
        },
        vote: {
          position: "qualified_support",
          reason: "满足现金流条件时支持。",
          conditions: ["保留现金流"]
        },
        reservation: ""
      },
      {
        speech: "URL 来源提示需要复核资格。",
        claims: [],
        assumptions: [],
        objection: {
          type: "constraint_conflict",
          description: "资格可能受限。",
          severity: "high",
          condition: "复核资格"
        },
        vote: {
          position: "qualified_support",
          reason: "复核后支持。",
          conditions: ["复核资格"]
        },
        reservation: ""
      },
      {
        summary: "先核算预算并复核资格。",
        actionItems: [
          {
            title: "核算预算",
            rationale: "附件和 URL 来源提供了首付和政策约束。",
            conditions: ["保留现金流", "复核资格"],
            firstValidation: "完成预算表",
            sourceRefs: ["att-file-1", "source-url-1"]
          }
        ]
      }
    ];
    const chatBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://example.com/policy") {
        return new Response(
          "<html><head><title>政策页面</title></head><body><main>购房资格需要复核，贷款政策也需要检查。</main></body></html>",
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      if (url === "https://api.ppio.com/v3/web-search") {
        return new Response(
          JSON.stringify({ data: { results: [{ title: "Source", url: "https://example.com/source" }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      const body = JSON.parse(String(init?.body));
      chatBodies.push(body);
      return new Response(
        JSON.stringify({
          id: `raw-${outputs.length}`,
          model: body.model,
          choices: [{ finish_reason: "stop", index: 0, message: { role: "assistant", content: JSON.stringify(outputs.shift()) } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const response = await handleCreateSession(
      {
        userQuestion: "我应该现在买房吗？请参考 https://example.com/policy",
        locale: "zh-CN",
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
      fetchMock,
      {
        providerProfileId: "ppio-default",
        displayName: "PPIO",
        protocol: "openai-compatible",
        baseURL: "https://api.ppio.com/openai/v1",
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a"]
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.sessionSnapshot.sourceReferences).toEqual([
      expect.objectContaining({ id: "source-text-input", type: "text_input" }),
      expect.objectContaining({ id: "att-file-1", type: "file_input", fileName: "budget.txt" }),
      expect.objectContaining({
        id: "source-url-1",
        type: "url_input",
        title: "政策页面",
        url: "https://example.com/policy",
        fetchStatus: "completed"
      })
    ]);
    expect(JSON.stringify(chatBodies[0])).toContain("Source Reference: att-file-1");
    expect(JSON.stringify(chatBodies[0])).toContain("Source Reference: source-url-1");
    expect(JSON.stringify(chatBodies[0])).toContain("Fetch Status: completed");
    expect(fetchMock.mock.calls.find(([url]) => url === "https://example.com/policy")?.[1]?.headers).toMatchObject({
      "Accept-Language": expect.stringMatching(/^zh-CN,zh;q=0\.9/)
    });
    expect(JSON.stringify(payload.providerMeta)).not.toContain("local-api-key-value");
  });

  test("POST sessions keeps running when URL fetch fails and records failed source reference", async () => {
    const outputs = [
      {
        goal: "评估买房时机",
        constraints: [],
        mainMotion: { title: "先做买房可行性评估", description: "在来源不可用时先基于已知约束讨论" },
        nextTask: "Member 发言"
      },
      {
        speech: "即使 URL 不可读，也可以先明确预算和风险。",
        claims: [],
        assumptions: [],
        objection: {
          type: "risk",
          description: "缺少页面正文会降低政策判断置信度。",
          severity: "medium",
          condition: "后续人工复核 URL"
        },
        vote: {
          position: "qualified_support",
          reason: "先讨论框架，后复核来源。",
          conditions: ["人工复核 URL"]
        },
        reservation: ""
      },
      {
        speech: "失败来源不能作为事实依据。",
        claims: [],
        assumptions: [],
        objection: {
          type: "constraint_conflict",
          description: "来源不可用时不能确认资格。",
          severity: "high",
          condition: "补充可读来源"
        },
        vote: {
          position: "qualified_support",
          reason: "补充来源后支持。",
          conditions: ["补充可读来源"]
        },
        reservation: ""
      },
      {
        summary: "先形成问题清单，随后复核 URL。",
        actionItems: [
          {
            title: "复核 URL",
            rationale: "自动读取失败，需要保留来源追溯。",
            conditions: ["人工复核 URL"],
            firstValidation: "打开来源并记录政策摘要",
            sourceRefs: ["source-url-1"]
          }
        ]
      }
    ];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://example.com/unavailable") {
        throw new Error("network failed");
      }
      if (url === "https://api.ppio.com/v3/web-search") {
        return new Response(
          JSON.stringify({ data: { results: [{ title: "Source", url: "https://example.com/source" }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      const body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          id: `raw-${outputs.length}`,
          model: body.model,
          choices: [{ finish_reason: "stop", index: 0, message: { role: "assistant", content: JSON.stringify(outputs.shift()) } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const response = await handleCreateSession(
      {
        userQuestion: "我应该现在买房吗？https://example.com/unavailable",
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
      fetchMock,
      {
        providerProfileId: "ppio-default",
        displayName: "PPIO",
        protocol: "openai-compatible",
        baseURL: "https://api.ppio.com/openai/v1",
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a"]
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.sessionSnapshot.sourceReferences).toEqual([
      expect.objectContaining({ id: "source-text-input", type: "text_input" }),
      expect.objectContaining({
        id: "source-url-1",
        type: "url_input",
        url: "https://example.com/unavailable",
        fetchStatus: "failed",
        fetchErrorCode: "url_fetch_failed"
      })
    ]);
  });

  test("POST sessions runs full deliberation for a mixed WeChat URL and stock question input", async () => {
    const wechatUrl = "https://mp.weixin.qq.com/s/F3KD4cEmwisijZcbyRYAIw";
    const outputs = [
      {
        goal: "判断智谱股票是否值得加仓",
        constraints: ["参考微信文章中的估值反转背景", "涉及投资风险，需要条件化输出"],
        mainMotion: {
          title: "审慎评估智谱股票加仓",
          description: "结合文章背景、估值和仓位约束判断是否加仓"
        },
        nextTask: "Member 发言"
      },
      {
        speech: "文章提供估值分化背景，但是否加仓还需要当前价格和仓位信息。",
        claims: [],
        assumptions: ["用户已经持有智谱股票"],
        objection: {
          type: "risk",
          description: "单一文章不足以支持直接加仓。",
          severity: "high",
          condition: "补充实时行情和仓位上限"
        },
        vote: {
          position: "qualified_support",
          reason: "满足估值和仓位条件时才支持小幅加仓。",
          conditions: ["补充实时行情", "设置止损"]
        },
        reservation: "不要把文章叙事直接等同于投资结论。"
      },
      {
        speech: "文章提到估值已脱离传统框架，这本身是风险信号。",
        claims: [],
        assumptions: [],
        objection: {
          type: "counterexample",
          description: "叙事驱动上涨可能快速反转。",
          severity: "blocking",
          condition: "交叉验证基本面和政策窗口"
        },
        vote: {
          position: "oppose",
          reason: "缺少实时估值和仓位信息前，不建议直接加仓。",
          conditions: []
        },
        reservation: "可以先做观察清单。"
      },
      {
        summary: "暂不直接加仓，先核验行情、估值和仓位约束。",
        actionItems: [
          {
            title: "核验智谱当前价格与估值",
            rationale: "微信文章提供背景，但需要最新市场数据确认安全边际。",
            conditions: ["获取当前股价和市值", "确认个人仓位比例"],
            firstValidation: "记录当前价格、市值、仓位占比和止损点",
            sourceRefs: ["source-url-1"]
          }
        ]
      }
    ];
    const chatBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === wechatUrl) {
        return new Response(
          `
            <html>
              <head><meta property="og:title" content="大模型估值大反转" /></head>
              <body>
                <div id="js_content">
                  <p>1月8日，智谱在港交所挂牌，发行价116.2港元。</p>
                  <p>MiniMax跟着上市，后来两家公司估值出现明显分化。</p>
                </div>
              </body>
            </html>
          `,
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      if (url === "https://api.ppio.com/v3/web-search") {
        return new Response(
          JSON.stringify({ data: { results: [{ title: "Market source", url: "https://example.com/market" }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      const body = JSON.parse(String(init?.body));
      chatBodies.push(body);
      return new Response(
        JSON.stringify({
          id: `raw-${outputs.length}`,
          model: body.model,
          choices: [{ finish_reason: "stop", index: 0, message: { role: "assistant", content: JSON.stringify(outputs.shift()) } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const response = await handleCreateSession(
      {
        userQuestion: "参考https://mp.weixin.qq.com/s/F3KD4cEmwisijZcbyRYAIw，目前智谱股票是否值得加仓",
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
      fetchMock,
      {
        providerProfileId: "ppio-default",
        displayName: "PPIO",
        protocol: "openai-compatible",
        baseURL: "https://api.ppio.com/openai/v1",
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a"]
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.status).toBe("completed");
    expect(payload.phase).toBe("action_resolution");
    expect(fetchMock.mock.calls.some(([url]) => url === wechatUrl)).toBe(true);
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes("，目前智谱"))).toBe(true);
    expect(payload.sessionSnapshot.sourceReferences).toEqual([
      expect.objectContaining({
        id: "source-text-input",
        type: "text_input",
        summary: expect.stringContaining("目前智谱股票是否值得加仓")
      }),
      expect.objectContaining({
        id: "source-url-1",
        type: "url_input",
        title: "大模型估值大反转",
        url: wechatUrl,
        fetchStatus: "completed",
        summary: expect.stringContaining("智谱在港交所挂牌")
      })
    ]);
    expect(JSON.stringify(chatBodies[0])).toContain("目前智谱股票是否值得加仓");
    expect(JSON.stringify(chatBodies[0])).toContain("Source Reference: source-url-1");
    expect(payload.sessionSnapshot.actionPlan.items[0]?.sourceRefs).toContain("source-url-1");
  });

  test("POST sessions terminates before provider calls when URL-only input cannot be read", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://mp.weixin.qq.com/s/example") {
        return new Response(
          "<html><head><title>访问环境异常</title></head><body>请在微信客户端打开链接后继续访问。</body></html>",
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      throw new Error(`unexpected provider call: ${url}`);
    });

    const response = await handleCreateSession(
      {
        userQuestion: "https://mp.weixin.qq.com/s/example",
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
      fetchMock,
      {
        providerProfileId: "ppio-default",
        displayName: "PPIO",
        protocol: "openai-compatible",
        baseURL: "https://api.ppio.com/openai/v1",
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a"]
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      code: "insufficient_source_context",
      message: expect.stringContaining("议事已终止"),
      recoveryHint: expect.stringContaining("url_access_restricted")
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("POST sessions terminates with access-restricted reason for URL-only Zhihu input", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://zhuanlan.zhihu.com/p/359677510") {
        return new Response(
          "<html><head><meta id=\"zh-zse-ck\" charset=\"UTF-8\" content=\"mock\"></head><body><script src=\"https://static.zhihu.com/zse-ck/v4/mock.js\"></script></body></html>",
          { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      throw new Error(`unexpected provider call: ${url}`);
    });

    const response = await handleCreateSession(
      {
        userQuestion: "https://zhuanlan.zhihu.com/p/359677510",
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
      fetchMock,
      {
        providerProfileId: "ppio-default",
        displayName: "PPIO",
        protocol: "openai-compatible",
        baseURL: "https://api.ppio.com/openai/v1",
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a"]
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      code: "insufficient_source_context",
      message: expect.stringContaining("议事已终止"),
      recoveryHint: expect.stringContaining("站点拒绝服务端读取")
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("POST sessions treats URL workflow wording as insufficient context when the URL cannot be read", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://zhuanlan.zhihu.com/p/359677510") {
        return new Response(
          "<html><head><meta id=\"zh-zse-ck\" charset=\"UTF-8\" content=\"mock\"></head><body><script src=\"https://static.zhihu.com/zse-ck/v4/mock.js\"></script></body></html>",
          { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      throw new Error(`unexpected provider call: ${url}`);
    });

    const response = await handleCreateSession(
      {
        userQuestion: "用'https://zhuanlan.zhihu.com/p/359677510'创建议题",
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
      fetchMock,
      {
        providerProfileId: "ppio-default",
        displayName: "PPIO",
        protocol: "openai-compatible",
        baseURL: "https://api.ppio.com/openai/v1",
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a"]
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      code: "insufficient_source_context",
      message: expect.stringContaining("议事已终止"),
      recoveryHint: expect.stringContaining("站点拒绝服务端读取")
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("POST session stream emits a termination error for unreadable URL-only input", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://example.com/unavailable") {
        throw new Error("network failed");
      }
      throw new Error(`unexpected provider call: ${url}`);
    });

    const response = await handleCreateSessionStream(
      {
        userQuestion: "https://example.com/unavailable",
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
      fetchMock,
      {
        providerProfileId: "ppio-default",
        displayName: "PPIO",
        protocol: "openai-compatible",
        baseURL: "https://api.ppio.com/openai/v1",
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a"]
    );

    const events = await readNdjsonResponse(response);
    expect(events).toEqual([
      expect.objectContaining({
        type: "error",
        code: "insufficient_source_context",
        message: expect.stringContaining("议事已终止"),
        recoveryHint: expect.stringContaining("url_fetch_failed")
      })
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("POST session stream includes fetched URL sources in the completed snapshot", async () => {
    const outputs = [
      {
        goal: "评估买房时机",
        constraints: ["需要复核政策 URL"],
        mainMotion: { title: "先做买房可行性评估", description: "结合 URL 来源判断是否推进" },
        nextTask: "Member 发言"
      },
      {
        speech: "URL 来源显示需要复核购房资格。",
        claims: [],
        assumptions: [],
        objection: {
          type: "constraint_conflict",
          description: "政策资格可能限制推进。",
          severity: "high",
          condition: "复核资格"
        },
        vote: {
          position: "qualified_support",
          reason: "复核后支持。",
          conditions: ["复核资格"]
        },
        reservation: ""
      },
      {
        speech: "还需要现金流安全垫。",
        claims: [],
        assumptions: [],
        objection: {
          type: "risk",
          description: "现金流不足。",
          severity: "medium",
          condition: "保留现金流"
        },
        vote: {
          position: "qualified_support",
          reason: "满足现金流条件时支持。",
          conditions: ["保留现金流"]
        },
        reservation: ""
      },
      {
        summary: "先复核 URL 来源和预算。",
        actionItems: [
          {
            title: "复核政策 URL",
            rationale: "URL 来源进入 Chair 上下文。",
            conditions: ["复核资格"],
            firstValidation: "记录政策摘要",
            sourceRefs: ["source-url-1"]
          }
        ]
      }
    ];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://example.com/policy") {
        return new Response("购房资格需要复核。", {
          status: 200,
          headers: { "Content-Type": "text/plain" }
        });
      }
      if (url === "https://api.ppio.com/v3/web-search") {
        return new Response(
          JSON.stringify({ data: { results: [{ title: "Source", url: "https://example.com/source" }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      const body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          id: `raw-${outputs.length}`,
          model: body.model,
          choices: [{ finish_reason: "stop", index: 0, message: { role: "assistant", content: JSON.stringify(outputs.shift()) } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const response = await handleCreateSessionStream(
      {
        userQuestion: "我应该现在买房吗？参考 https://example.com/policy",
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
      fetchMock,
      {
        providerProfileId: "ppio-default",
        displayName: "PPIO",
        protocol: "openai-compatible",
        baseURL: "https://api.ppio.com/openai/v1",
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a"]
    );

    const events = await readNdjsonResponse(response);
    expect(events.at(-1)?.sessionSnapshot.sourceReferences).toEqual([
      expect.objectContaining({ id: "source-text-input", type: "text_input" }),
      expect.objectContaining({
        id: "source-url-1",
        type: "url_input",
        url: "https://example.com/policy",
        fetchStatus: "completed"
      })
    ]);
  });

  test("POST sessions rejects legacy link attachments before provider calls", async () => {
    const fetchMock = vi.fn();

    const response = await handleCreateSession(
      {
        userQuestion: "我应该现在买房吗？",
        locale: "zh-CN",
        attachments: [
          {
            id: "att-link-1",
            type: "link",
            title: "坏链接",
            summary: "摘要",
            url: "not-a-url",
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
      fetchMock,
      {
        providerProfileId: "ppio-default",
        displayName: "PPIO",
        protocol: "openai-compatible",
        baseURL: "https://api.ppio.com/openai/v1",
        apiKey: "local-api-key-value",
        timeoutMs: 30000,
        temperatureDefault: 0.2,
        maxTokensDefault: 1200
      },
      ["model-a"]
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "invalid_request" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

async function readNdjsonResponse(response: Response): Promise<Array<Record<string, unknown>>> {
  const text = await response.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
