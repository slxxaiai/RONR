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

  test("POST sessions accepts confirmed attachment summaries and returns source references", async () => {
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
        speech: "链接摘要提示需要复核资格。",
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
            rationale: "附件提供了首付和政策约束。",
            conditions: ["保留现金流", "复核资格"],
            firstValidation: "完成预算表",
            sourceRefs: ["att-file-1", "att-link-1"]
          }
        ]
      }
    ];
    const chatBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
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
        userQuestion: "我应该现在买房吗？",
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
          },
          {
            id: "att-link-1",
            type: "link",
            title: "政策链接",
            summary: "购房资格需要复核。",
            url: "https://example.com/policy",
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
      expect.objectContaining({ id: "att-link-1", type: "link_input", url: "https://example.com/policy" })
    ]);
    expect(JSON.stringify(chatBodies[0])).toContain("Source Reference: att-file-1");
    expect(JSON.stringify(chatBodies[0])).toContain("Source Reference: att-link-1");
    expect(JSON.stringify(payload.providerMeta)).not.toContain("local-api-key-value");
  });

  test("POST sessions rejects malformed attachments before provider calls", async () => {
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
