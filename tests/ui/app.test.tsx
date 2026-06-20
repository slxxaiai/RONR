// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomePage from "../../apps/web/app/page";
import type { DeliberationSessionSnapshot } from "@ronr/contracts";

describe("RONR web app", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  test("renders model loading, role configuration, language switcher, and submit controls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            models: [
              {
                id: "model-a",
                title: "Model A",
                description: "A",
                contextSize: 32000,
                inputTokenPricePerM: 1,
                outputTokenPricePerM: 2
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    render(<HomePage />);

    expect(screen.getByLabelText("语言区域")).toBeInTheDocument();
    expect(screen.getByText("Provider 配置")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "角色配置区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "启动议事" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    expect(screen.getAllByText("Model A").length).toBeGreaterThan(0);
  });

  test("shows a clear validation message when the personal decision question is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            models: [
              {
                id: "model-a",
                title: "Model A",
                description: "A",
                contextSize: 32000,
                inputTokenPricePerM: 1,
                outputTokenPricePerM: 2
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "启动议事" }));

    expect(screen.getByRole("alert")).toHaveTextContent("请先输入一个个人决策问题。");
    expect(screen.getByLabelText("个人决策问题")).toHaveAttribute("aria-invalid", "true");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("lets users add, remove, and configure Member agents before starting a session", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === "/api/providers/ppio/models") {
        return new Response(
          JSON.stringify({
            models: [
              {
                id: "model-a",
                title: "Model A",
                description: "A",
                contextSize: 32000,
                inputTokenPricePerM: 1,
                outputTokenPricePerM: 2
              },
              {
                id: "model-b",
                title: "Model B",
                description: "B",
                contextSize: 128000,
                inputTokenPricePerM: 1,
                outputTokenPricePerM: 2
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          sessionId: sessionSnapshot.id,
          status: "completed",
          phase: "action_resolution",
          initialPhase: "call_to_order",
          activeAgentId: "chair",
          currentSpeakerAgentId: "chair",
          nextTask: "Member discussion starts.",
          sessionEntry: {
            phase: "call_to_order",
            activeAgentId: "chair",
            currentSpeakerAgentId: "chair",
            nextTask: "Member discussion starts."
          },
          sessionSnapshot,
          providerMeta: []
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("2 个模型已加载")).toBeInTheDocument());
    expect(screen.queryByLabelText("删除 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "添加议员" }));
    expect(screen.getByRole("combobox", { name: "议员 3 模型" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "议员 3 模型" }), { target: { value: "model-b" } });
    const mandateSelects = screen.getAllByRole("combobox", { name: "职责授权" });
    fireEvent.change(mandateSelects[2], { target: { value: "domain-expert" } });

    fireEvent.click(screen.getByRole("button", { name: "删除 2" }));
    expect(screen.queryByRole("combobox", { name: "议员 3 模型" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "议员 2 模型" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "添加议员" }));
    fireEvent.change(screen.getByRole("combobox", { name: "议员 3 模型" }), { target: { value: "model-b" } });
    fireEvent.change(screen.getAllByRole("combobox", { name: "职责授权" })[2], { target: { value: "action-planner" } });
    fireEvent.change(screen.getByLabelText("最大讨论轮次"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("个人决策问题"), {
      target: { value: "我应该现在买房吗？" }
    });
    fireEvent.click(screen.getByRole("button", { name: "启动议事" }));

    await waitFor(() => expect(screen.getByText("The personal version has a clearer first user.")).toBeInTheDocument());
    const sessionCall = fetchMock.mock.calls.find(([input]) => input.toString() === "/api/sessions/stream");
    expect(sessionCall).toBeDefined();
    const requestBody = JSON.parse(String(sessionCall?.[1]?.body));
    expect(requestBody.maxDeliberationRounds).toBe(3);
    expect(requestBody.agentConfig.members).toEqual([
      { id: "member-user", model: "model-a", mandate: "user-advocate" },
      { id: "member-1", model: "model-b", mandate: "domain-expert" },
      { id: "member-2", model: "model-b", mandate: "action-planner" }
    ]);
  });

  test("lets users add file and link attachment summaries before starting a session", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === "/api/providers/ppio/models") {
        return new Response(
          JSON.stringify({
            models: [
              {
                id: "model-a",
                title: "Model A",
                description: "A",
                contextSize: 32000,
                inputTokenPricePerM: 1,
                outputTokenPricePerM: 2
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          sessionId: sessionSnapshot.id,
          status: "completed",
          phase: "action_resolution",
          initialPhase: "call_to_order",
          activeAgentId: "chair",
          currentSpeakerAgentId: "chair",
          nextTask: "Member discussion starts.",
          sessionEntry: {
            phase: "call_to_order",
            activeAgentId: "chair",
            currentSpeakerAgentId: "chair",
            nextTask: "Member discussion starts."
          },
          sessionSnapshot: {
            ...sessionSnapshot,
            sourceReferences: [
              ...sessionSnapshot.sourceReferences,
              {
                id: "att-file-1",
                type: "file_input",
                title: "budget.txt",
                summary: "Edited budget summary",
                fileName: "budget.txt",
                readAt: "2026-06-18T00:00:00.000Z",
                confirmedByUser: true
              },
              {
                id: "att-link-1",
                type: "link_input",
                title: "Policy note",
                summary: "Policy summary",
                url: "https://example.com/policy",
                readAt: "2026-06-18T00:00:00.000Z",
                confirmedByUser: true
              }
            ]
          },
          providerMeta: []
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    expect(screen.getByText("补充背景")).toBeInTheDocument();
    expect(screen.queryByText("语音")).not.toBeInTheDocument();
    expect(screen.queryByText("麦克风")).not.toBeInTheDocument();
    expect(screen.queryByText("音频")).not.toBeInTheDocument();

    const fileInput = screen.getByLabelText("文件输入") as HTMLInputElement;
    const file = new File(["首付预算 200 万，月供不能超过收入 35%。"], "budget.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getAllByText("budget.txt").length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText("链接 URL"), { target: { value: "https://example.com/policy" } });
    fireEvent.change(screen.getByLabelText("链接标题"), { target: { value: "Policy note" } });
    fireEvent.change(screen.getByLabelText("链接摘要"), { target: { value: "Policy summary" } });
    fireEvent.click(screen.getByRole("button", { name: "添加链接摘要" }));
    expect(screen.getByText("Policy note")).toBeInTheDocument();

    const summaries = screen.getAllByLabelText("输入摘要");
    fireEvent.change(summaries[0], { target: { value: "Edited budget summary" } });
    fireEvent.change(screen.getByLabelText("个人决策问题"), {
      target: { value: "我应该现在买房吗？" }
    });
    fireEvent.click(screen.getByRole("button", { name: "启动议事" }));

    await waitFor(() => expect(screen.getByText("The personal version has a clearer first user.")).toBeInTheDocument());
    const sessionCall = fetchMock.mock.calls.find(([input]) => input.toString() === "/api/sessions/stream");
    const requestBody = JSON.parse(String(sessionCall?.[1]?.body));
    expect(requestBody.attachments).toEqual([
      expect.objectContaining({
        type: "file",
        title: "budget.txt",
        summary: "Edited budget summary",
        fileName: "budget.txt",
        confirmedByUser: true
      }),
      expect.objectContaining({
        type: "link",
        title: "Policy note",
        summary: "Policy summary",
        url: "https://example.com/policy",
        confirmedByUser: true
      })
    ]);
    expect(screen.queryByRole("region", { name: "来源引用" })).not.toBeInTheDocument();
  });

  test("blocks session start when an attachment summary is cleared", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === "/api/providers/ppio/models") {
        return new Response(
          JSON.stringify({
            models: [
              {
                id: "model-a",
                title: "Model A",
                description: "A",
                contextSize: 32000,
                inputTokenPricePerM: 1,
                outputTokenPricePerM: 2
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({}), { status: 500, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    const fileInput = screen.getByLabelText("文件输入") as HTMLInputElement;
    const file = new File(["首付预算 200 万。"], "budget.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getAllByText("budget.txt").length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText("个人决策问题"), {
      target: { value: "我应该现在买房吗？" }
    });
    fireEvent.change(screen.getByLabelText("输入摘要"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "启动议事" }));

    expect(screen.getByRole("alert")).toHaveTextContent("请确认每条补充背景都有摘要。");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("uses the shadcn-inspired neutral UI shell and status styling hooks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            models: [
              {
                id: "model-a",
                title: "Model A",
                description: "A",
                contextSize: 32000,
                inputTokenPricePerM: 1,
                outputTokenPricePerM: 2
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const { container } = render(<HomePage />);

    expect(container.querySelector(".app-shell")).toBeInTheDocument();
    expect(container.querySelector(".topbar")).toBeInTheDocument();
    expect(container.querySelector(".brand-block")).toBeInTheDocument();
    expect(container.querySelector(".topic-panel")).toBeInTheDocument();
    expect(container.querySelector(".meeting-panel")).toBeInTheDocument();
    expect(container.querySelector(".meeting-status-bar")).toBeInTheDocument();
    expect(container.querySelector(".role-panel")).toBeInTheDocument();
    expect(container.querySelector(".meeting-chat")).toBeInTheDocument();
    expect(container.querySelector(".chat-thread")).toBeInTheDocument();
    expect(container.querySelector(".panel-collapse-action")).toBeInTheDocument();
    expect(container.querySelector(".panel-section-inline")).toBeInTheDocument();
    expect(container.querySelector(".member-fields")).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector(".status-pill.status-ok")).toHaveTextContent("1 个模型已加载"));

    fireEvent.click(screen.getByRole("button", { name: "隐藏话题区" }));
    expect(container.querySelector(".topic-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "显示话题区" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "显示话题区" }));
    expect(container.querySelector(".topic-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "隐藏角色配置区" }));
    expect(container.querySelector(".role-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "显示角色配置区" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "显示角色配置区" }));
    expect(container.querySelector(".role-panel")).toBeInTheDocument();

    const css = readFileSync("apps/web/app/styles.css", "utf8");
    expect(css).toContain("--background: #ffffff");
    expect(css).toContain("--primary: #09090b");
    expect(css).toContain("--ring: #a1a1aa");
    expect(css).toContain(".meeting-chat");
    expect(css).toContain(".meeting-status-bar");
    expect(css).toContain(".chat-bubble");
    expect(css).toContain(".panel-collapse-action");
    expect(css).toContain(".member-fields");
    expect(css).not.toContain(".meeting-table");
    expect(css).not.toContain(".agent-ring");
    expect(css).not.toContain("#1c7c54");
    expect(css).not.toContain("#135f40");
  });

  test("shows muted meeting progress status in the Meeting Area header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url === "/api/providers/ppio/models") {
          return new Response(
            JSON.stringify({
              models: [
                {
                  id: "model-a",
                  title: "Model A",
                  description: "A",
                  contextSize: 32000,
                  inputTokenPricePerM: 1,
                  outputTokenPricePerM: 2
                }
              ]
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            sessionId: sessionSnapshot.id,
            status: "completed",
            phase: "action_resolution",
            initialPhase: "call_to_order",
            activeAgentId: "chair",
            currentSpeakerAgentId: "member-user",
            nextTask: "Ask Members to test the first product wedge.",
            sessionEntry: {
              phase: "call_to_order",
              activeAgentId: "chair",
              currentSpeakerAgentId: "member-user",
              nextTask: "Ask Members to test the first product wedge."
            },
            sessionSnapshot,
            providerMeta: []
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );

    const { container } = render(<HomePage />);

    const statusBar = container.querySelector(".meeting-status-bar");
    expect(statusBar).toBeInTheDocument();
    expect(statusBar).toHaveTextContent("当前阶段");
    expect(statusBar).toHaveTextContent("议题确认");
    expect(statusBar).toHaveTextContent("正在发言");
    expect(statusBar).toHaveTextContent("chair");
    expect(statusBar).toHaveTextContent("等待启动");

    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("个人决策问题"), {
      target: { value: "我应该现在买房吗？" }
    });
    fireEvent.click(screen.getByRole("button", { name: "启动议事" }));

    await waitFor(() => expect(screen.getByText("The personal version has a clearer first user.")).toBeInTheDocument());
    expect(statusBar).toHaveTextContent("行动清单");
    expect(statusBar).toHaveTextContent("member-user");
    expect(statusBar).toHaveTextContent("已完成");

    const css = readFileSync("apps/web/app/styles.css", "utf8");
    expect(css).toContain(".meeting-status-label");
    expect(css).toMatch(/\.meeting-status-bar\s*\{[^}]*font-size: 11px/s);
    expect(css).toContain("var(--muted-foreground)");
  });

  test("streams thinking and speeches into the central Meeting Output before completion", async () => {
    let enqueueEvent: ((event: unknown) => void) | null = null;
    let closeStream: (() => void) | null = null;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        enqueueEvent = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        closeStream = () => controller.close();
      }
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === "/api/providers/ppio/models") {
        return new Response(
          JSON.stringify({
            models: [
              {
                id: "model-a",
                title: "Model A",
                description: "A",
                contextSize: 32000,
                inputTokenPricePerM: 1,
                outputTokenPricePerM: 2
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "application/x-ndjson" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<HomePage />);
    const emitStreamEvent = async (event: unknown) => {
      await act(async () => {
        enqueueEvent?.(event);
        await Promise.resolve();
      });
    };

    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("个人决策问题"), {
      target: { value: "我应该现在买房吗？" }
    });
    fireEvent.click(screen.getByRole("button", { name: "启动议事" }));

    await emitStreamEvent({
      type: "session_started",
      sessionId: "session-stream",
      phase: "call_to_order",
      activeAgentId: "chair",
      currentSpeakerAgentId: "chair",
      nextTask: "Chair is confirming the topic."
    });
    await waitFor(() => expect(container.querySelector(".meeting-status-bar")).toHaveTextContent("议题确认"));
    expect(container.querySelector(".meeting-status-bar")).toHaveTextContent("chair");
    expect(container.querySelector(".meeting-status-bar")).toHaveTextContent("进行中");

    await emitStreamEvent({
      type: "search_sources",
      id: "sources-chair",
      agentId: "chair",
      role: "chair",
      phase: "call_to_order",
      sources: [
        {
          title: "上海购房政策摘要",
          url: "https://example.com/shanghai-policy",
          snippet: "限购和贷款政策需要在决策前复核。"
        }
      ]
    });
    await emitStreamEvent({
      type: "thinking",
      id: "thinking-chair",
      agentId: "chair",
      role: "chair",
      phase: "call_to_order",
      summary: "正在检索信息并整理议题确认。"
    });
    await waitFor(() => expect(screen.getByText("搜索来源")).toBeInTheDocument());
    expect(container.querySelector(".chat-thinking")).not.toBeInTheDocument();
    expect(container.querySelector(".chat-sources")).not.toBeInTheDocument();
    const chairMessage = container.querySelector("[data-turn-id='chair-call_to_order']");
    expect(chairMessage).toBeInTheDocument();
    expect(chairMessage?.querySelectorAll(".turn-disclosure")).toHaveLength(2);
    expect(chairMessage).toHaveTextContent("思考过程");
    const disclosures = chairMessage?.querySelectorAll("details.turn-disclosure");
    expect(disclosures?.[0]).not.toHaveAttribute("open");
    expect(disclosures?.[1]).not.toHaveAttribute("open");
    expect(chairMessage).toHaveTextContent("上海购房政策摘要");
    expect(chairMessage?.querySelector("a")).toHaveAttribute("href", "https://example.com/shanghai-policy");

    await emitStreamEvent({
      type: "speech",
      speech: {
        id: "speech-chair",
        agentId: "chair",
        role: "chair",
        phase: "call_to_order",
        content: "我会先确认这个个人决策问题的范围。",
        claims: [],
        assumptions: []
      }
    });
    await waitFor(() => expect(chairMessage).toHaveTextContent("我"));
    expect(chairMessage).not.toHaveTextContent("我会先确认这个个人决策问题的范围。");
    await waitFor(() => expect(chairMessage).toHaveTextContent("我会先确认这个个人决策问题的范围。"));
    expect(container.querySelectorAll("[data-turn-id='chair-call_to_order']")).toHaveLength(1);

    await emitStreamEvent({
      type: "search_sources",
      id: "sources-chair-followup",
      agentId: "chair",
      role: "chair",
      phase: "call_to_order",
      sources: [
        {
          title: "追加约束摘要",
          url: "https://example.com/followup",
          snippet: "第二轮同阶段搜索不能覆盖第一轮消息。"
        }
      ]
    });
    await emitStreamEvent({
      type: "thinking",
      id: "thinking-chair-followup",
      agentId: "chair",
      role: "chair",
      phase: "call_to_order",
      summary: "正在处理同一阶段的第二个完整回合。"
    });
    await emitStreamEvent({
      type: "speech",
      speech: {
        id: "speech-chair-followup",
        agentId: "chair",
        role: "chair",
        phase: "call_to_order",
        content: "我会把追加约束作为第二个回合处理。",
        claims: [],
        assumptions: []
      }
    });
    const chairFollowupMessage = container.querySelector("[data-turn-id='chair-call_to_order-2']");
    await waitFor(() => expect(chairFollowupMessage).toHaveTextContent("我会把追加约束作为第二个回合处理。"));
    expect(container.querySelectorAll(".chat-turn")).toHaveLength(2);
    expect(chairMessage).toHaveTextContent("我会先确认这个个人决策问题的范围。");
    expect(chairFollowupMessage).toHaveTextContent("追加约束摘要");
    expect(chairFollowupMessage?.querySelectorAll("details.turn-disclosure")).toHaveLength(2);

    await emitStreamEvent({
      type: "search_sources",
      id: "sources-chair-failed",
      agentId: "chair",
      role: "chair",
      phase: "call_to_order",
      status: "failed",
      errorCode: "search_failed",
      sources: []
    });
    await emitStreamEvent({
      type: "thinking",
      id: "thinking-chair-failed",
      agentId: "chair",
      role: "chair",
      phase: "call_to_order",
      summary: "正在说明搜索来源不可用。"
    });
    const chairFailedSearchMessage = container.querySelector("[data-turn-id='chair-call_to_order-3']");
    await waitFor(() => expect(chairFailedSearchMessage).toHaveTextContent("搜索未返回可用来源"));
    expect(chairFailedSearchMessage?.querySelector("details.turn-sources")).not.toHaveAttribute("open");
    expect(chairFailedSearchMessage).toHaveTextContent("search_failed");

    await emitStreamEvent({
      type: "speech",
      speech: {
        id: "speech-member-user-stream",
        agentId: "member-user",
        role: "member",
        mandate: "user-advocate",
        phase: "opening_statements",
        content: "我会代表用户收益先发言。",
        claims: [],
        assumptions: []
      }
    });
    await waitFor(() => expect(screen.getByText("我会代表用户收益先发言。")).toBeInTheDocument());
    expect(container.querySelectorAll("[data-turn-id='member-user-opening_statements']")).toHaveLength(1);
    expect(container.querySelector(".meeting-status-bar")).toHaveTextContent("开场陈述");
    expect(container.querySelector(".meeting-status-bar")).toHaveTextContent("member-user");
    expect(container.querySelector(".meeting-status-bar")).toHaveTextContent("进行中");

    await emitStreamEvent({
      type: "completed",
      sessionId: sessionSnapshot.id,
      status: "completed",
      phase: "action_resolution",
      sessionSnapshot: {
        ...sessionSnapshot,
        speeches: [
          {
            id: "snapshot-speech-chair",
            agentId: "chair",
            role: "chair",
            phase: "call_to_order",
            content: "我会先确认这个个人决策问题的范围。",
            claims: [],
            assumptions: []
          },
          {
            id: "snapshot-speech-member-user-stream",
            agentId: "member-user",
            role: "member",
            mandate: "user-advocate",
            phase: "opening_statements",
            content: "我会代表用户收益先发言。",
            claims: [],
            assumptions: []
          },
          {
            id: "snapshot-speech-secretary-final",
            agentId: "secretary",
            role: "secretary",
            phase: "action_resolution",
            content: "我会补充最终行动清单摘要。",
            claims: [],
            assumptions: []
          }
        ]
      },
      providerMeta: []
    });
    closeStream?.();
    await waitFor(() => expect(container.querySelector(".meeting-status-bar")).toHaveTextContent("已完成"));
    const memberTurnAfterCompletion = container.querySelector("[data-turn-id='member-user-opening_statements']");
    expect(memberTurnAfterCompletion).toHaveTextContent("我会代表用户收益先发言。");
    expect(memberTurnAfterCompletion?.querySelector(".streaming-caret")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("我会补充最终行动清单摘要。")).toBeInTheDocument());
    expect(container.querySelectorAll(".chat-turn")).toHaveLength(5);
    expect(screen.queryByText("The personal version has a clearer first user.")).not.toBeInTheDocument();
    expect(container.querySelector(".meeting-status-bar")).toHaveTextContent("行动清单");
    expect(container.querySelector(".meeting-status-bar")).toHaveTextContent("已完成");
    expect(fetchMock).toHaveBeenCalledWith("/api/sessions/stream", expect.any(Object));

    const css = readFileSync("apps/web/app/styles.css", "utf8");
    expect(css).toContain(".turn-disclosure");
    expect(css).toContain(".streaming-caret");
    expect(css).toContain("var(--muted-foreground)");
  });

  test("formats long Chinese speech content into readable paragraphs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url === "/api/providers/ppio/models") {
          return new Response(
            JSON.stringify({
              models: [
                {
                  id: "model-a",
                  title: "Model A",
                  description: "A",
                  contextSize: 32000,
                  inputTokenPricePerM: 1,
                  outputTokenPricePerM: 2
                }
              ]
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            sessionId: sessionSnapshot.id,
            status: "completed",
            phase: "action_resolution",
            initialPhase: "call_to_order",
            activeAgentId: "member-red",
            currentSpeakerAgentId: "member-red",
            nextTask: "Review risks.",
            sessionEntry: {
              phase: "call_to_order",
              activeAgentId: "member-red",
              currentSpeakerAgentId: "member-red",
              nextTask: "Review risks."
            },
            sessionSnapshot: {
              ...sessionSnapshot,
              speeches: [
                {
                  id: "speech-long-red-team",
                  agentId: "member-red",
                  role: "member",
                  mandate: "red-team",
                  phase: "opening_statements",
                  content:
                    "作为红队成员，我针对英伟达投资价值评估动议发表反方意见，重点揭示多方论据中的风险盲点。第一，基本面方面，虽然2026财年营收2160亿美元，自由现金流490亿美元看似强劲，但需追问：营收增速是否在边际放缓？第二，技术面方面，6月19日涨6.04美元至210.69美元，但6月17日跌5.04美元，说明多空分歧剧烈。第三，行业竞争方面，CUDA护城河的深度正在被侵蚀：AMD的ROCm生态持续迭代，谷歌TPU、亚马逊Trainium等自研芯片已在大客户内部部署。综上，我反对在当前价位无条件下单买入，建议投资者至少等待回调至190美元以下或下一季度财报验证营收增速后再做决策。",
                  claims: [],
                  assumptions: []
                }
              ]
            },
            providerMeta: []
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );

    const { container } = render(<HomePage />);

    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("个人决策问题"), {
      target: { value: "英伟达现在能买吗？" }
    });
    fireEvent.click(screen.getByRole("button", { name: "启动议事" }));

    await waitFor(
      () => expect(screen.getByText("综上，我反对在当前价位无条件下单买入，建议投资者至少等待回调至190美元以下或下一季度财报验证营收增速后再做决策。")).toBeInTheDocument(),
      { timeout: 4000 }
    );
    const speechParagraphs = container.querySelectorAll("[data-turn-id='member-red-opening_statements'] .speech-content p");
    expect(speechParagraphs).toHaveLength(5);
    expect(speechParagraphs[1]).toHaveTextContent("第一，基本面方面");
    expect(speechParagraphs[2]).toHaveTextContent("第二，技术面方面");
    expect(speechParagraphs[3]).toHaveTextContent("第三，行业竞争方面");
    expect(speechParagraphs[4]).toHaveTextContent("综上，我反对");
  });

  test("lets speech content fill the Meeting Area width when sidebars are collapsed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            models: [
              {
                id: "model-a",
                title: "Model A",
                description: "A",
                contextSize: 32000,
                inputTokenPricePerM: 1,
                outputTokenPricePerM: 2
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const { container } = render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "隐藏话题区" }));
    fireEvent.click(screen.getByRole("button", { name: "隐藏角色配置区" }));

    expect(container.querySelector(".workspace-grid")).toHaveClass("topic-collapsed", "role-collapsed");
    const css = readFileSync("apps/web/app/styles.css", "utf8");
    expect(css).toMatch(/\.workspace-grid\.topic-collapsed\s+\.speech-content,\s*\.workspace-grid\.role-collapsed\s+\.speech-content\s*\{[^}]*max-width:\s*none;/s);
  });

  test("updates controls and result enum labels when the locale changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url === "/api/providers/ppio/models") {
          return new Response(
            JSON.stringify({
              models: [
                {
                  id: "model-a",
                  title: "Model A",
                  description: "A",
                  contextSize: 32000,
                  inputTokenPricePerM: 1,
                  outputTokenPricePerM: 2
                }
              ]
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            sessionId: sessionSnapshot.id,
            status: "completed",
            phase: "action_resolution",
            initialPhase: "call_to_order",
            activeAgentId: "chair",
            currentSpeakerAgentId: "chair",
            nextTask: "Ask Members to test the first product wedge.",
            sessionEntry: {
              phase: "call_to_order",
              activeAgentId: "chair",
              currentSpeakerAgentId: "chair",
              nextTask: "Ask Members to test the first product wedge."
            },
            sessionSnapshot,
            providerMeta: []
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("语言区域"), { target: { value: "en" } });

    expect(screen.getByLabelText("Locale")).toHaveValue("en");
    expect(window.localStorage.getItem("ronr.locale")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toBe("RONR AI Deliberation");
    expect(screen.getByText("Provider Configuration")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Role Configuration Panel" })).toBeInTheDocument();
    expect(screen.getAllByText("User Advocate").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Red Team Member").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Topic Panel")).toBeInTheDocument();
    expect(screen.getByText("Meeting Area")).toBeInTheDocument();
    expect(screen.getByText("Role Configuration Panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose file" })).toBeInTheDocument();
    expect(screen.getByText("No file selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide Topic Panel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide Role Configuration" })).toBeInTheDocument();
    expect(screen.queryByText("user-advocate")).not.toBeInTheDocument();
    expect(screen.queryByText("red-team")).not.toBeInTheDocument();

    const i18nSource = readFileSync("apps/web/src/i18n.ts", "utf8");
    expect(i18nSource).not.toContain("layout.meetingTable");

    fireEvent.change(screen.getByLabelText("Personal decision question"), {
      target: { value: "Should I build the personal version first?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Start Deliberation" }));

    await waitFor(() => expect(screen.getByText("The personal version has a clearer first user.")).toBeInTheDocument());
    expect(screen.getByText("Deliberation Session created")).toBeInTheDocument();
    expect(screen.getAllByText("chair").length).toBeGreaterThan(0);
    expect(screen.getByText("ME")).toBeInTheDocument();
    expect(screen.getByText("Next deliberation task")).toBeInTheDocument();
    expect(screen.getByText("Ask Members to test the first product wedge.")).toBeInTheDocument();
    expect(screen.queryByText("Deliberation result")).not.toBeInTheDocument();
    expect(screen.queryByText("Votes")).not.toBeInTheDocument();
    expect(screen.queryByText("Objections")).not.toBeInTheDocument();
    expect(screen.queryByText("Reservations")).not.toBeInTheDocument();
    expect(screen.queryByText("action_resolution")).not.toBeInTheDocument();
    expect(screen.queryByText("opening_statements")).not.toBeInTheDocument();
    expect(screen.queryByText("qualified_support")).not.toBeInTheDocument();
    expect(screen.queryByText("cost")).not.toBeInTheDocument();
    expect(screen.queryByText("converted_to_condition")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Locale"), { target: { value: "ko" } });

    expect(screen.getByLabelText("로케일")).toHaveValue("ko");
    expect(document.documentElement.lang).toBe("ko");
    expect(document.title).toBe("RONR AI 숙의");
    expect(screen.getByRole("button", { name: "파일 선택" })).toBeInTheDocument();
    expect(screen.getByText("선택된 파일 없음")).toBeInTheDocument();
    expect(screen.getByText("의원")).toBeInTheDocument();
    expect(screen.getAllByText("사용자 대변인").length).toBeGreaterThan(0);
    expect(screen.queryByText("숙의 결과")).not.toBeInTheDocument();
    expect(screen.queryByText("Cost")).not.toBeInTheDocument();
    expect(screen.queryByText("Converted to Condition")).not.toBeInTheDocument();
  });

  test("reuses the saved locale preference on the next page load", async () => {
    window.localStorage.setItem("ronr.locale", "ja");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            models: [
              {
                id: "model-a",
                title: "Model A",
                description: "A",
                contextSize: 32000,
                inputTokenPricePerM: 1,
                outputTokenPricePerM: 2
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    render(<HomePage />);

    await waitFor(() => expect(screen.getByLabelText("ロケール")).toHaveValue("ja"));
    expect(screen.getByText("Provider 設定")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("1 件のモデルを読み込み済み")).toBeInTheDocument());
  });

  test("localizes structured API errors instead of rendering server payload text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url === "/api/providers/ppio/models") {
          return new Response(
            JSON.stringify({
              models: [
                {
                  id: "model-a",
                  title: "Model A",
                  description: "A",
                  contextSize: 32000,
                  inputTokenPricePerM: 1,
                  outputTokenPricePerM: 2
                }
              ]
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            code: "invalid_agent_config",
            message: "members[0].mandate 不受支持",
            recoveryHint: "请重新选择 Chair、Secretary 和至少两个 Member 的模型与 mandate。"
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      })
    );

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("语言区域"), { target: { value: "en" } });
    fireEvent.change(screen.getByLabelText("Personal decision question"), {
      target: { value: "Should I build the personal version first?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Start Deliberation" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("Agent configuration is invalid.")).toBeInTheDocument();
    expect(screen.getByText("Select supported models and mandates for Chair, Secretary, and at least two Members.")).toBeInTheDocument();
    expect(screen.queryByText("members[0].mandate 不受支持")).not.toBeInTheDocument();
  });

  test("localizes provider load errors after restoring a saved locale", async () => {
    window.localStorage.setItem("ronr.locale", "en");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            code: "provider_config_error",
            message: "缺少本地 provider 配置文件 config/provider.local.json。",
            recoveryHint: "复制 config/provider.example.json 为 config/provider.local.json，并填写本地 API key。"
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    render(<HomePage />);

    await waitFor(() => expect(screen.getByLabelText("Locale")).toHaveValue("en"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("Model provider configuration is unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Check the local provider config file and API key.")).toBeInTheDocument();
    expect(screen.queryByText("缺少本地 provider 配置文件 config/provider.local.json。")).not.toBeInTheDocument();
  });
});

const sessionSnapshot: DeliberationSessionSnapshot = {
  id: "session-1",
  userQuestion: "Should I build the personal version first?",
  sourceReferences: [
    {
      id: "source-text-input",
      type: "text_input",
      title: "User question",
      summary: "Should I build the personal version first?",
      readAt: "2026-06-18T00:00:00.000Z",
      confirmedByUser: true
    }
  ],
  goal: "Decide the first product wedge",
  constraints: [],
  locale: "en",
  status: "completed",
  phase: "action_resolution",
  agents: [
    { id: "chair", role: "chair", model: "model-a" },
    { id: "secretary", role: "secretary", model: "model-a" },
    { id: "member-user", role: "member", mandate: "user-advocate", model: "model-a" },
    { id: "member-red", role: "member", mandate: "red-team", model: "model-a" }
  ],
  motions: [
    {
      id: "motion-1",
      title: "Build personal version first",
      description: "Start with personal decision support.",
      status: "adopted"
    }
  ],
  speeches: [
    {
      id: "speech-1",
      agentId: "member-user",
      role: "member",
      mandate: "user-advocate",
      phase: "opening_statements",
      content: "The personal version has a clearer first user.",
      claims: [],
      assumptions: []
    }
  ],
  objections: [
    {
      id: "objection-1",
      motionId: "motion-1",
      raisedBy: "member-user",
      type: "cost",
      description: "The personal workflow still needs pricing validation.",
      severity: "medium",
      condition: "Validate willingness to pay before launch.",
      sourceSpeechId: "speech-1",
      resolutionStatus: "converted_to_condition"
    }
  ],
  votes: [
    {
      id: "vote-1",
      motionId: "motion-1",
      agentId: "member-user",
      position: "qualified_support",
      reason: "Support if the scope stays narrow.",
      conditions: ["Keep the first release personal-only."],
      sourceSpeechId: "speech-1",
      reservationIds: ["reservation-1"]
    }
  ],
  reservations: [
    {
      id: "reservation-1",
      agentId: "member-user",
      description: "Team workflows may need a separate later track.",
      sourceVoteId: "vote-1"
    }
  ],
  actionPlan: {
    summary: "Start with a personal wedge.",
    items: [
      {
        id: "action-1",
        title: "Validate the personal workflow",
        rationale: "It reduces first-release scope.",
        conditions: ["Keep the first release personal-only."],
        firstValidation: "Run five interviews.",
        sourceRefs: ["speech-1", "vote-1"]
      }
    ]
  },
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
};
