"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  AgentConfig,
  CreateSessionResponse,
  DeliberationSessionSnapshot,
  Locale,
  Mandate,
  ObjectionSeverity,
  ObjectionType,
  ProviderModel,
  Speech,
  VotePosition
} from "@ronr/contracts";
import { createTranslator, locales, type TranslationKey } from "../src/i18n";

type Translator = ReturnType<typeof createTranslator>;

type ApiError = {
  code: string;
  message: string;
  recoveryHint?: string;
};

type RawApiError = {
  code: string;
  message?: string;
  recoveryHint?: string;
};

const mandates: Mandate[] = ["user-advocate", "domain-expert", "red-team", "general", "action-planner"];

const phases = [
  "call_to_order",
  "main_motion",
  "opening_statements",
  "objections_and_risks",
  "vote_or_consensus",
  "action_resolution"
] as const;

type Phase = (typeof phases)[number];

type MotionStatus = DeliberationSessionSnapshot["motions"][number]["status"];
type ResolutionStatus = DeliberationSessionSnapshot["objections"][number]["resolutionStatus"];

type Formatter = {
  phase: (phase: string) => string;
  votePosition: (position: VotePosition) => string;
  role: (role: Speech["role"]) => string;
  mandate: (mandate: Mandate) => string;
  motionStatus: (status: MotionStatus) => string;
  objectionType: (type: ObjectionType) => string;
  objectionSeverity: (severity: ObjectionSeverity) => string;
  resolutionStatus: (status: ResolutionStatus) => string;
};

const roleTranslationKeys: Record<Speech["role"], TranslationKey> = {
  chair: "roles.chair",
  secretary: "roles.secretary",
  member: "roles.member"
};

const motionStatusTranslationKeys: Record<MotionStatus, TranslationKey> = {
  adopted: "motionStatus.adopted"
};

const objectionTypeTranslationKeys: Record<ObjectionType, TranslationKey> = {
  risk: "objectionType.risk",
  counterexample: "objectionType.counterexample",
  cost: "objectionType.cost",
  constraint_conflict: "objectionType.constraint_conflict",
  alternative: "objectionType.alternative"
};

const objectionSeverityTranslationKeys: Record<ObjectionSeverity, TranslationKey> = {
  low: "objectionSeverity.low",
  medium: "objectionSeverity.medium",
  high: "objectionSeverity.high",
  blocking: "objectionSeverity.blocking"
};

const resolutionStatusTranslationKeys: Record<ResolutionStatus, TranslationKey> = {
  converted_to_condition: "resolutionStatus.converted_to_condition"
};

const defaultAgentConfig: AgentConfig = {
  chair: { model: "" },
  secretary: { model: "" },
  members: [
    { id: "member-user", model: "", mandate: "user-advocate" },
    { id: "member-red", model: "", mandate: "red-team" }
  ]
};

const localePreferenceKey = "ronr.locale";

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("zh-CN");
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(defaultAgentConfig);
  const [question, setQuestion] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<RawApiError | null>(null);
  const [snapshot, setSnapshot] = useState<DeliberationSessionSnapshot | null>(null);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const localizedError = useMemo(() => error ? localizeError(error, t) : null, [error, t]);

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    window.localStorage.setItem(localePreferenceKey, nextLocale);
  }

  useEffect(() => {
    setLocale(getSavedLocale());
  }, []);

  useEffect(() => {
    const syncDocumentLocale = () => {
      document.documentElement.lang = locale;
      document.title = t("app.title");
      syncDescriptionMeta(t("app.description"));
    };
    syncDocumentLocale();
    const timeout = window.setTimeout(syncDocumentLocale, 0);
    return () => window.clearTimeout(timeout);
  }, [locale, t]);

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
        if (!cancelled) setError(normalizeError(caught));
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
      setError(normalizeError(caught));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="app-shell">
      <title>{t("app.title")}</title>
      <meta name="description" content={t("app.description")} />
      <header className="topbar">
        <div className="brand-block">
          <p className="eyebrow">RONR</p>
          <h1>{t("app.title")}</h1>
        </div>
        <label className="locale-control">
          <span>{t("language.label")}</span>
          <select
            aria-label={t("language.label")}
            value={locale}
            onChange={(event) => changeLocale(event.target.value as Locale)}
          >
            {locales.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </header>

      <section className="workspace-grid">
        <aside className="setup-panel">
          <section className="panel-section">
            <h2>{t("provider.config")}</h2>
            <p className={`status-pill ${models.length > 0 ? "status-ok" : "status-warn"}`}>
              {loadingModels ? t("provider.loading") : `${models.length} ${t("provider.loaded")}`}
            </p>
          </section>

          <section className="panel-section">
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
                      <option key={mandate} value={mandate}>{t(`mandate.${mandate}`)}</option>
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

          {localizedError && (
            <div className="error-panel" role="alert">
              <strong className="error-code">{localizedError.code}</strong>
              <p>{localizedError.message}</p>
              {localizedError.recoveryHint && <small>{localizedError.recoveryHint}</small>}
            </div>
          )}

          {snapshot && (
            <SessionResult
              snapshot={snapshot}
              t={t}
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
  t
}: {
  snapshot: DeliberationSessionSnapshot;
  t: Translator;
}) {
  const formatters: Formatter = {
    phase: (phase) => isKnownPhase(phase) ? t(`phase.${phase}`) : phase,
    votePosition: (position) => t(`vote.${position}`),
    role: (role) => t(roleTranslationKeys[role]),
    mandate: (mandate) => t(`mandate.${mandate}`),
    motionStatus: (status) => t(motionStatusTranslationKeys[status]),
    objectionType: (type) => t(objectionTypeTranslationKeys[type]),
    objectionSeverity: (severity) => t(objectionSeverityTranslationKeys[severity]),
    resolutionStatus: (status) => t(resolutionStatusTranslationKeys[status])
  };

  return (
    <section className="result-panel">
      <h2>{t("session.result")}</h2>
      <section className="result-section" aria-label={t("result.currentStage")}>
        <h3>{t("result.currentStage")}</h3>
        <div className="phase-list">
          {phases.map((phase) => (
            <span key={phase} className={phase === snapshot.phase ? "phase-active" : ""}>{formatters.phase(phase)}</span>
          ))}
        </div>
      </section>
      <h3>{snapshot.goal}</h3>

      <section className="result-section" aria-label={t("result.mainMotion")}>
        <h3>{t("result.mainMotion")}</h3>
        {snapshot.motions.map((motion) => (
          <article className="trace-card" key={motion.id}>
            <div className="trace-card-header">
              <strong>{motion.title}</strong>
              <span>{formatters.motionStatus(motion.status)}</span>
            </div>
            <p>{motion.description}</p>
          </article>
        ))}
      </section>

      <section className="result-section" aria-label={t("result.speeches")}>
        <h3>{t("result.speeches")}</h3>
        {snapshot.speeches.map((speech) => (
          <article className="speech" key={speech.id}>
            <strong>{speech.agentId}</strong>
            <div className="tag-row">
              <span>{formatters.role(speech.role)}</span>
              {speech.mandate && <span>{formatters.mandate(speech.mandate)}</span>}
              <span>{formatters.phase(speech.phase)}</span>
            </div>
            <p>{speech.content}</p>
          </article>
        ))}
      </section>

      <section className="result-section" aria-label={t("result.objections")}>
        <h3>{t("result.objections")}</h3>
        {snapshot.objections.length === 0 && <p className="empty-state">{t("result.noItems")}</p>}
        {snapshot.objections.map((objection) => (
          <article className="trace-card" key={objection.id}>
            <div className="trace-card-header">
              <strong>{objection.raisedBy}</strong>
              <span>{formatters.resolutionStatus(objection.resolutionStatus)}</span>
            </div>
            <div className="tag-row">
              <span>{formatters.objectionType(objection.type)}</span>
              <span>{formatters.objectionSeverity(objection.severity)}</span>
            </div>
            <p>{objection.description}</p>
            <dl className="field-list">
              <div>
                <dt>{t("result.conditions")}</dt>
                <dd>{objection.condition}</dd>
              </div>
              <div>
                <dt>{t("result.sourceReferences")}</dt>
                <dd>{objection.sourceSpeechId}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <section className="result-section" aria-label={t("result.votes")}>
        <h3>{t("result.votes")}</h3>
        <div className="vote-grid">
          {snapshot.votes.map((vote) => (
            <article key={vote.id}>
              <strong>{vote.agentId}</strong>
              <span>{formatters.votePosition(vote.position)}</span>
              <p>{vote.reason}</p>
              {vote.conditions.length > 0 && (
                <dl className="field-list">
                  <div>
                    <dt>{t("result.conditions")}</dt>
                    <dd>{vote.conditions.join(", ")}</dd>
                  </div>
                </dl>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="result-section" aria-label={t("result.reservations")}>
        <h3>{t("result.reservations")}</h3>
        {snapshot.reservations.length === 0 && <p className="empty-state">{t("result.noItems")}</p>}
        {snapshot.reservations.map((reservation) => (
          <article className="trace-card" key={reservation.id}>
            <div className="trace-card-header">
              <strong>{reservation.agentId}</strong>
              <span>{reservation.sourceVoteId}</span>
            </div>
            <p>{reservation.description}</p>
          </article>
        ))}
      </section>

      <section className="result-section" aria-label={t("result.actionPlanTrace")}>
        <h3>{t("result.actionPlanTrace")}</h3>
        <p>{snapshot.actionPlan.summary}</p>
        {snapshot.actionPlan.items.map((item) => (
          <article className="action-item" key={item.id}>
            <h4>{item.title}</h4>
            <dl className="field-list">
              <div>
                <dt>{t("result.rationale")}</dt>
                <dd>{item.rationale}</dd>
              </div>
              <div>
                <dt>{t("result.conditions")}</dt>
                <dd>{item.conditions.length > 0 ? item.conditions.join(", ") : t("result.noItems")}</dd>
              </div>
              <div>
                <dt>{t("result.validationStep")}</dt>
                <dd>{item.firstValidation}</dd>
              </div>
              <div>
                <dt>{t("result.sourceReferences")}</dt>
                <dd>{item.sourceRefs.join(", ")}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </section>
  );
}

function isKnownPhase(phase: string): phase is Phase {
  return phases.includes(phase as Phase);
}

function normalizeError(caught: unknown): RawApiError {
  if (caught && typeof caught === "object" && "code" in caught && "message" in caught) {
    return caught as RawApiError;
  }
  return {
    code: "unknown_error"
  };
}

function localizeError(error: RawApiError, t: Translator): ApiError {
  return translateError(error.code, t) ?? {
    code: error.code,
    message: error.message ?? t("error.unknownRequest"),
    recoveryHint: error.recoveryHint
  };
}

function translateError(code: string, t: Translator): ApiError | null {
  const errorKeys: Partial<Record<string, { message: TranslationKey; recoveryHint: TranslationKey }>> = {
    invalid_request: {
      message: "error.invalidRequest",
      recoveryHint: "error.invalidRequest.recoveryHint"
    },
    invalid_agent_config: {
      message: "error.invalidAgentConfig",
      recoveryHint: "error.invalidAgentConfig.recoveryHint"
    },
    provider_config_error: {
      message: "error.providerConfig",
      recoveryHint: "error.providerConfig.recoveryHint"
    },
    auth_failed: {
      message: "error.authFailed",
      recoveryHint: "error.authFailed.recoveryHint"
    },
    permission_denied: {
      message: "error.permissionDenied",
      recoveryHint: "error.permissionDenied.recoveryHint"
    },
    insufficient_balance: {
      message: "error.insufficientBalance",
      recoveryHint: "error.insufficientBalance.recoveryHint"
    },
    model_not_found: {
      message: "error.modelNotFound",
      recoveryHint: "error.modelNotFound.recoveryHint"
    },
    rate_limited: {
      message: "error.rateLimited",
      recoveryHint: "error.rateLimited.recoveryHint"
    },
    token_limit_exceeded: {
      message: "error.tokenLimitExceeded",
      recoveryHint: "error.tokenLimitExceeded.recoveryHint"
    },
    network_failed: {
      message: "error.networkFailed",
      recoveryHint: "error.networkFailed.recoveryHint"
    },
    timeout: {
      message: "error.networkFailed",
      recoveryHint: "error.networkFailed.recoveryHint"
    },
    provider_unavailable: {
      message: "error.providerUnavailable",
      recoveryHint: "error.providerUnavailable.recoveryHint"
    },
    schema_parse_failed: {
      message: "error.schemaParseFailed",
      recoveryHint: "error.schemaParseFailed.recoveryHint"
    },
    unknown_provider_error: {
      message: "error.unknownProvider",
      recoveryHint: "error.unknownProvider.recoveryHint"
    }
  };
  const keys = errorKeys[code];
  return keys
    ? {
        code,
        message: t(keys.message),
        recoveryHint: t(keys.recoveryHint)
      }
    : null;
}

function getSavedLocale(): Locale {
  if (typeof window === "undefined") return "zh-CN";
  const savedLocale = window.localStorage.getItem(localePreferenceKey);
  return locales.includes(savedLocale as Locale) ? (savedLocale as Locale) : "zh-CN";
}

function syncDescriptionMeta(content: string) {
  const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="description"]'));
  const [firstMeta, ...duplicateMetas] = metas;
  const meta = firstMeta ?? document.head.appendChild(document.createElement("meta"));
  meta.name = "description";
  meta.content = content;
  duplicateMetas.forEach((duplicate) => duplicate.remove());
}
