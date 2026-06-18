// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import HomePage from "../../apps/web/app/page";

describe("RONR web app", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

    expect(screen.getByLabelText("Locale")).toBeInTheDocument();
    expect(screen.getByText("Provider 配置")).toBeInTheDocument();
    expect(screen.getByText("角色配置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "启动议事" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("1 个模型已加载")).toBeInTheDocument());
    expect(screen.getAllByText("Model A").length).toBeGreaterThan(0);
  });
});
