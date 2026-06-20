import { describe, expect, test, vi } from "vitest";
import { createOpenAICompatibleProvider } from "@ronr/providers";

const providerConfig = {
  providerProfileId: "ppio-default",
  displayName: "PPIO",
  protocol: "openai-compatible" as const,
  baseURL: "https://api.ppio.com/openai/v1",
  apiKey: "secret-key",
  timeoutMs: 30000,
  temperatureDefault: 0.2,
  maxTokensDefault: 1200
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function completionBody(body: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "raw-1",
    model: "model-a",
    choices: [
      {
        finish_reason: "stop",
        index: 0,
        message: { role: "assistant", content: "{\"ok\":true}" }
      }
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    ...body
  };
}

describe("provider chat completion", () => {
  test("uses json_object response_format and disables GLM thinking for structured output", async () => {
    let observedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      observedBody = JSON.parse(String(init?.body));
      return jsonResponse(completionBody({ model: observedBody?.model }));
    });
    const provider = createOpenAICompatibleProvider(providerConfig, fetchMock);

    await provider.complete({
      requestId: "req-1",
      providerProfileId: "ppio-default",
      model: "zai-org/glm-5.2",
      messages: [{ role: "user", content: "请输出 JSON。" }],
      responseSchema: {
        type: "object",
        properties: {
          ok: { type: "boolean" }
        },
        required: ["ok"]
      }
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(observedBody).toMatchObject({
      response_format: {
        type: "json_object"
      },
      enable_thinking: false
    });
    expect(observedBody?.response_format).not.toHaveProperty("json_schema");
  });

  test("uses json_schema response_format when the provider profile requests it", async () => {
    let observedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      observedBody = JSON.parse(String(init?.body));
      return jsonResponse(completionBody({ model: observedBody?.model }));
    });
    const provider = createOpenAICompatibleProvider({
      ...providerConfig,
      structuredOutputMode: "json_schema" as const
    }, fetchMock);

    await provider.complete({
      requestId: "req-1",
      providerProfileId: "ppio-default",
      model: "model-a",
      messages: [{ role: "user", content: "请输出 JSON。" }],
      responseSchema: {
        type: "object",
        properties: {
          ok: { type: "boolean" }
        },
        required: ["ok"]
      }
    });

    expect(observedBody?.response_format).toMatchObject({
      type: "json_schema",
      json_schema: {
        name: "ronr_agent_output",
        strict: true,
        schema: {
          type: "object",
          properties: {
            ok: { type: "boolean" }
          },
          required: ["ok"]
        }
      }
    });
  });

  test("does not force response_format when no responseSchema is provided", async () => {
    let observedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      observedBody = JSON.parse(String(init?.body));
      return jsonResponse(completionBody({ model: observedBody?.model }));
    });
    const provider = createOpenAICompatibleProvider(providerConfig, fetchMock);

    const response = await provider.complete({
      requestId: "req-1",
      providerProfileId: "ppio-default",
      model: "deepseek/deepseek-v4-flash",
      messages: [{ role: "user", content: "请输出 JSON。" }]
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(observedBody).not.toHaveProperty("response_format");
    expect(observedBody).toMatchObject({
      separate_reasoning: true,
      enable_thinking: true
    });
    expect(response.thinkingMeta).toMatchObject({
      enabled: true
    });
  });

  test("passes explicit tools, tool choice, and PPIO thinking budget without leaking apiKey", async () => {
    let observedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      observedBody = JSON.parse(String(init?.body));
      return jsonResponse(completionBody({
        model: observedBody?.model,
        search_results: [
          {
            title: "PPIO Docs",
            url: "https://ppio.com/docs/models",
            snippet: "Reference"
          }
        ],
        usage: {
          prompt_tokens: 1,
          completion_tokens: 2,
          total_tokens: 3,
          completion_tokens_details: { reasoning_tokens: 4 }
        }
      }));
    });
    const provider = createOpenAICompatibleProvider(providerConfig, fetchMock);

    const response = await provider.complete({
      requestId: "req-1",
      providerProfileId: "ppio-default",
      model: "deepseek/deepseek-v4-flash",
      messages: [{ role: "user", content: "请输出 JSON。" }],
      tools: [{ type: "web_search", search_context_size: "low" }],
      toolChoice: "auto",
      webSearchEnabled: true,
      thinkingEnabled: true,
      thinkingBudget: { effort: "medium" },
      sourcePolicy: "required"
    });

    expect(observedBody).toMatchObject({
      tools: [{ type: "web_search", search_context_size: "low" }],
      tool_choice: "auto",
      separate_reasoning: true,
      enable_thinking: true,
      thinking_budget: { effort: "medium" }
    });
    expect(JSON.stringify(observedBody)).not.toContain("secret-key");
    expect(response.searchResults).toEqual([
      {
        title: "PPIO Docs",
        url: "https://ppio.com/docs/models",
        snippet: "Reference",
        source: "search_results"
      }
    ]);
    expect(response.thinkingMeta).toMatchObject({
      enabled: true,
      budget: { effort: "medium" },
      reasoningTokens: 4
    });
    expect(response.providerMeta).toMatchObject({
      searchResultCount: 1,
      thinkingEnabled: true
    });
  });

  test("returns search_failed when sourcePolicy requires search results but none are returned", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(completionBody()));
    const provider = createOpenAICompatibleProvider(providerConfig, fetchMock);

    await expect(provider.complete({
      requestId: "req-1",
      providerProfileId: "ppio-default",
      model: "model-a",
      messages: [{ role: "user", content: "请输出 JSON。" }],
      webSearchEnabled: true,
      sourcePolicy: "required"
    })).rejects.toMatchObject({
      code: "search_failed",
      retryable: true
    });
  });

  test("drops raw chain-of-thought from content and exposes only safe thinking metadata", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(completionBody({
      choices: [
        {
          finish_reason: "stop",
          index: 0,
          message: {
            role: "assistant",
            reasoning_content: "internal hidden reasoning",
            content: "<think>private chain of thought</think>{\"ok\":true}"
          }
        }
      ],
      thinking: { raw: "private provider thinking" }
    })));
    const provider = createOpenAICompatibleProvider(providerConfig, fetchMock);

    const response = await provider.complete({
      requestId: "req-1",
      providerProfileId: "ppio-default",
      model: "model-a",
      messages: [{ role: "user", content: "请输出 JSON。" }]
    });

    expect(response.contentText).toBe("{\"ok\":true}");
    expect(JSON.stringify(response)).not.toContain("private chain of thought");
    expect(JSON.stringify(response)).not.toContain("internal hidden reasoning");
    expect(JSON.stringify(response)).not.toContain("private provider thinking");
    expect(response.thinkingMeta).toMatchObject({
      rawChainOfThoughtDropped: true
    });
    expect(response.providerMeta.rawChainOfThoughtDropped).toBe(true);
  });

  test("maps provider search errors to search_failed", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      error: {
        code: "SEARCH_FAILED",
        message: "search failed with secret-key"
      }
    }, 502));
    const provider = createOpenAICompatibleProvider(providerConfig, fetchMock);

    await expect(provider.complete({
      requestId: "req-1",
      providerProfileId: "ppio-default",
      model: "model-a",
      messages: [{ role: "user", content: "请输出 JSON。" }]
    })).rejects.toMatchObject({
      code: "search_failed",
      message: expect.not.stringContaining("secret-key")
    });
  });

  test("throws schema_parse_failed when provider response has no assistant content", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(completionBody({
      choices: [
        {
          finish_reason: "stop",
          index: 0,
          message: {
            role: "assistant",
            reasoning_content: "hidden only",
            content: null
          }
        }
      ]
    })));
    const provider = createOpenAICompatibleProvider(providerConfig, fetchMock);

    await expect(provider.complete({
      requestId: "req-2",
      providerProfileId: "ppio-default",
      model: "model-a",
      messages: [{ role: "user", content: "请输出 JSON。" }]
    })).rejects.toMatchObject({ code: "schema_parse_failed" });
  });

  test("calls the PPIO web search endpoint and maps search summaries", async () => {
    let observedUrl = "";
    let observedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      observedUrl = url;
      observedBody = JSON.parse(String(init?.body));
      return jsonResponse({
        data: {
          results: [
            {
              title: "Market report",
              url: "https://example.com/report",
              snippet: "Current market facts"
            }
          ]
        }
      });
    });
    const provider = createOpenAICompatibleProvider(providerConfig, fetchMock);

    const response = await provider.search?.({
      requestId: "search-1",
      providerProfileId: "ppio-default",
      query: "上海房价",
      count: 3
    });

    expect(observedUrl).toBe("https://api.ppio.com/v3/web-search");
    expect(observedBody).toMatchObject({
      query: "上海房价",
      summary: true,
      count: 3
    });
    expect(response?.results).toEqual([
      {
        title: "Market report",
        url: "https://example.com/report",
        snippet: "Current market facts",
        source: "web_search"
      }
    ]);
  });

  test("maps PPIO webPages.value search responses", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      code: 200,
      data: {
        _type: "SearchResponse",
        webPages: {
          value: [
            {
              name: "上海现在适合买房吗_齐家问问",
              url: "https://www.jia.com/wenda/a-629027.html",
              summary: "长期自住且现金流允许时，买房时机需要结合个人实际情况判断。"
            }
          ],
          webSearchUrl: "https://bochaai.com/search?q=上海买房"
        }
      }
    }));
    const provider = createOpenAICompatibleProvider(providerConfig, fetchMock);

    const response = await provider.search?.({
      requestId: "search-1",
      providerProfileId: "ppio-default",
      query: "目前上海适合买房吗？"
    });

    expect(response?.results).toEqual([
      {
        title: "上海现在适合买房吗_齐家问问",
        url: "https://www.jia.com/wenda/a-629027.html",
        snippet: "长期自住且现金流允许时，买房时机需要结合个人实际情况判断。",
        source: "web_search"
      }
    ]);
  });
});
