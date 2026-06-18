"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  AgentConfig,
  CreateSessionResponse,
  DeliberationSessionSnapshot,
  Locale,
  Mandate,
  ProviderModel
} from "@ronr/contracts";
import { createTranslator, locales } from "../src/i18n";

type ApiError = {
  code: string;
  message: string;
  recoveryHint?: string;
};

const mandates: Mandate[] = ["user-advocate", "domain-expert", "red-team", "general", "action-planner"];

const defaultAgentConfig: AgentConfig = {
  chair: { model: "" },
  secretary: { model: "" },
  members: [
    { id: "member-user", model: "", mandate: "user-advocate" },
    { id: "member-red", model: "", mandate: "red-team" }
  ]
};

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("zh-CN");
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(defaultAgentConfig);
  const [question, setQuestion] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [snapshot, setSnapshot] = useState<DeliberationSessionSnapshot | null>(null);
  const t = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      setLoadingModels(true);
      setError(null);
      try {
        const response = await fetch("/api/providers/ppio/models");
        const payload = await response.json();
        if (!response.ok) throw payload;
        if (cancelled) return;
        setModels(payload.models);
        const firstModel = payload.models[0]?.id ?? "";
        setAgentConfig({
          chair: { model: firstModel },
          secretary: { model: firstModel },
          members: [
            { id: "member-user", model: firstModel, mandate: "user-advocate" },
            { id: "member-red", model: firstModel, mandate: "red-team" }
          ]
        });
      } catch (caught) {
        if (!cancelled) setError(normalizeError(caught, t("error.unknownRequest")));
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    }
    void loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startSession() {
    setRunning(true);
    setError(null);
    setSnapshot(null);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuestion: question, locale, agentConfig })
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    setSnapshot((payload as CreateSessionResponse).sessionSnapshot);
  } catch (caught) {
      setError(normalizeError(caught, t("error.unknownRequest")));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">RONR</p>
          <h1>{t("app.title")}</h1>
        </div>
        <label className="locale-control">
          <span>{t("language.label")}</span>
          <select
            aria-label="Locale"
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            {locales.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </header>

      <section className="workspace-grid">
        <aside className="setup-panel">
          <section>
            <h2>{t("provider.config")}</h2>
            <p className={models.length > 0 ? "status-ok" : "status-warn"}>
              {loadingModels ? t("provider.loading") : `${models.length} ${t("provider.loaded")}`}
            </p>
          </section>

          <section>
            <h2>{t("roles.title")}</h2>
            <RoleModelSelect
              label={t("roles.chair")}
              value={agentConfig.chair.model}
              models={models}
              noModelLabel={t("session.noModel")}
              onChange={(model) => setAgentConfig({ ...agentConfig, chair: { model } })}
            />
            <RoleModelSelect
              label={t("roles.secretary")}
              value={agentConfig.secretary.model}
              models={models}
              noModelLabel={t("session.noModel")}
              onChange={(model) => setAgentConfig({ ...agentConfig, secretary: { model } })}
            />
            {agentConfig.members.map((member, index) => (
              <div className="member-config" key={member.id}>
                <RoleModelSelect
                  label={`${t("roles.member")} ${index + 1}`}
                  value={member.model}
                  models={models}
                  noModelLabel={t("session.noModel")}
                  onChange={(model) => updateMember(index, { ...member, model })}
                />
                <label>
                  <span>{t("roles.mandate")}</span>
                  <select
                    value={member.mandate}
                    onChange={(event) => updateMember(index, { ...member, mandate: event.target.value as Mandate })}
                  >
                    {mandates.map((mandate) => (
                      <option key={mandate} value={mandate}>{mandate}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </section>
        </aside>

        <section className="main-panel">
          <label className="question-box">
            <span>{t("session.question")}</span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={t("session.question.placeholder")}
            />
          </label>
          <button
            className="primary-action"
            disabled={running || loadingModels || !question.trim() || models.length === 0}
            onClick={startSession}
          >
            {running ? t("session.running") : t("session.start")}
          </button>

          {error && (
            <div className="error-panel" role="alert">
              <strong>{error.code}</strong>
              <p>{error.message}</p>
              {error.recoveryHint && <small>{error.recoveryHint}</small>}
            </div>
          )}

          {snapshot && (
            <SessionResult
              snapshot={snapshot}
              title={t("session.result")}
              actionPlanTraceTitle={t("result.actionPlanTrace")}
            />
          )}
        </section>
      </section>
    </main>
  );

  function updateMember(index: number, member: AgentConfig["members"][number]) {
    setAgentConfig({
      ...agentConfig,
      members: agentConfig.members.map((item, itemIndex) => itemIndex === index ? member : item)
    });
  }
}

function RoleModelSelect({
  label,
  value,
  models,
  noModelLabel,
  onChange
}: {
  label: string;
  value: string;
  models: ProviderModel[];
  noModelLabel: string;
  onChange: (model: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {models.length === 0 && <option value="">{noModelLabel}</option>}
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.title || model.id}
          </option>
        ))}
      </select>
    </label>
  );
}

function SessionResult({
  snapshot,
  title,
  actionPlanTraceTitle
}: {
  snapshot: DeliberationSessionSnapshot;
  title: string;
  actionPlanTraceTitle: string;
}) {
  return (
    <section className="result-panel">
      <h2>{title}</h2>
      <div className="phase-list">
        {["call_to_order", "main_motion", "opening_statements", "objections_and_risks", "vote_or_consensus", "action_resolution"].map((phase) => (
          <span key={phase} className={phase === snapshot.phase ? "phase-active" : ""}>{phase}</span>
        ))}
      </div>
      <h3>{snapshot.goal}</h3>
      {snapshot.speeches.map((speech) => (
        <article className="speech" key={speech.id}>
          <strong>{speech.agentId}</strong>
          <span>{speech.phase}</span>
          <p>{speech.content}</p>
        </article>
      ))}
      <div className="vote-grid">
        {snapshot.votes.map((vote) => (
          <article key={vote.id}>
            <strong>{vote.agentId}</strong>
            <span>{vote.position}</span>
            <p>{vote.reason}</p>
          </article>
        ))}
      </div>
      <section>
        <h3>{actionPlanTraceTitle}</h3>
        {snapshot.actionPlan.items.map((item) => (
          <article className="action-item" key={item.id}>
            <h4>{item.title}</h4>
            <p>{item.rationale}</p>
            <small>{item.sourceRefs.join(", ")}</small>
          </article>
        ))}
      </section>
    </section>
  );
}

function normalizeError(caught: unknown, fallbackMessage: string): ApiError {
  if (caught && typeof caught === "object" && "code" in caught && "message" in caught) {
    return caught as ApiError;
  }
  return {
    code: "unknown_error",
    message: fallbackMessage
  };
}
