// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByText("角色配置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "启动议事" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    expect(screen.getAllByText("Model A").length).toBeGreaterThan(0);
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
    await waitFor(() => expect(container.querySelector(".status-pill.status-ok")).toHaveTextContent("1 个模型已加载"));

    const css = readFileSync("apps/web/app/styles.css", "utf8");
    expect(css).toContain("--background: #ffffff");
    expect(css).toContain("--primary: #09090b");
    expect(css).toContain("--ring: #a1a1aa");
    expect(css).not.toContain("#1c7c54");
    expect(css).not.toContain("#135f40");
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
    expect(screen.getByText("Role Configuration")).toBeInTheDocument();
    expect(screen.getAllByText("User Advocate")).toHaveLength(2);
    expect(screen.getAllByText("Red Team Member")).toHaveLength(2);
    expect(screen.queryByText("user-advocate")).not.toBeInTheDocument();
    expect(screen.queryByText("red-team")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Personal decision question"), {
      target: { value: "Should I build the personal version first?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Start Deliberation" }));

    await waitFor(() => expect(screen.getByText("Deliberation result")).toBeInTheDocument());
    expect(screen.getByText("Action Resolution")).toBeInTheDocument();
    expect(screen.getAllByText("Opening Statements")).toHaveLength(2);
    expect(screen.getByText("Qualified Support")).toBeInTheDocument();
    expect(screen.getAllByText("Main Motion").length).toBeGreaterThan(0);
    expect(screen.getByText("Adopted")).toBeInTheDocument();
    expect(screen.getByText("Speeches")).toBeInTheDocument();
    expect(screen.getByText("Votes")).toBeInTheDocument();
    expect(screen.getByText("Objections")).toBeInTheDocument();
    expect(screen.getByText("Cost")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Converted to Condition")).toBeInTheDocument();
    expect(screen.getByText("Reservations")).toBeInTheDocument();
    expect(screen.getByText("Rationale")).toBeInTheDocument();
    expect(screen.getAllByText("Conditions").length).toBeGreaterThan(0);
    expect(screen.getByText("First Validation")).toBeInTheDocument();
    expect(screen.getAllByText("Source References").length).toBeGreaterThan(0);
    expect(screen.queryByText("action_resolution")).not.toBeInTheDocument();
    expect(screen.queryByText("opening_statements")).not.toBeInTheDocument();
    expect(screen.queryByText("qualified_support")).not.toBeInTheDocument();
    expect(screen.queryByText("cost")).not.toBeInTheDocument();
    expect(screen.queryByText("converted_to_condition")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Locale"), { target: { value: "ko" } });

    expect(screen.getByLabelText("로케일")).toHaveValue("ko");
    expect(document.documentElement.lang).toBe("ko");
    expect(document.title).toBe("RONR AI 숙의");
    expect(screen.getByText("숙의 결과")).toBeInTheDocument();
    expect(screen.getAllByText("주 동의안").length).toBeGreaterThan(0);
    expect(screen.getByText("채택됨")).toBeInTheDocument();
    expect(screen.getAllByText("개회 발언").length).toBeGreaterThan(0);
    expect(screen.getByText("조건부 지지")).toBeInTheDocument();
    expect(screen.getByText("비용")).toBeInTheDocument();
    expect(screen.getByText("보통")).toBeInTheDocument();
    expect(screen.getByText("조건으로 전환됨")).toBeInTheDocument();
    expect(screen.getByText("실행 계획 추적")).toBeInTheDocument();
    expect(screen.getByText("근거")).toBeInTheDocument();
    expect(screen.getAllByText("조건").length).toBeGreaterThan(0);
    expect(screen.getByText("첫 검증")).toBeInTheDocument();
    expect(screen.getAllByText("출처 참조").length).toBeGreaterThan(0);
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
