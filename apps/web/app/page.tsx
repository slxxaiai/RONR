"use client";

import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AgentConfig,
  CreateSessionResponse,
  DeliberationStreamEvent,
  DeliberationSessionSnapshot,
  DeliberationStreamSearchSourcesEvent,
  DeliberationStreamThinkingEvent,
  Locale,
  Mandate,
  ProviderModel,
  Speech,
  UserInputAttachment
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

type AttachmentDraft = UserInputAttachment;
type MeetingProgressState = "waiting" | "running" | "active" | "completed" | "failed";
type VisibleStreamEvent = DeliberationStreamThinkingEvent | DeliberationStreamSearchSourcesEvent | { type: "speech"; speech: Speech };
type AgentTurn = {
  id: string;
  agentId: string;
  role: Speech["role"];
  mandate?: Mandate;
  phase: string;
  sources: DeliberationStreamSearchSourcesEvent["sources"];
  searchStatus?: DeliberationStreamSearchSourcesEvent["status"];
  searchErrorCode?: string;
  thinkingSummary?: string;
  speech?: Speech;
};

const mandates: Mandate[] = ["user-advocate", "domain-expert", "red-team", "general", "action-planner"];
const minimumMemberCount = 2;
const maxAttachmentFileBytes = 64 * 1024;
const supportedAttachmentExtensions = [".txt", ".md", ".csv", ".json"];

const phases = [
  "call_to_order",
  "main_motion",
  "opening_statements",
  "objections_and_risks",
  "vote_or_consensus",
  "action_resolution"
] as const;

type Phase = (typeof phases)[number];

type SessionEntryState = {
  initialPhase: Phase;
  activeAgentId: string;
  currentSpeakerAgentId: string;
  nextTask: string;
  sessionEntry: {
    phase: Phase;
    activeAgentId: string;
    currentSpeakerAgentId: string;
    nextTask: string;
  };
};

const roleTranslationKeys: Record<Speech["role"], TranslationKey> = {
  chair: "roles.chair",
  secretary: "roles.secretary",
  member: "roles.member"
};

const localePreferenceKey = "ronr.locale";

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("zh-CN");
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(createDefaultAgentConfig());
  const [topicPanelHidden, setTopicPanelHidden] = useState(false);
  const [rolePanelHidden, setRolePanelHidden] = useState(false);
  const [maxDeliberationRoundsInput, setMaxDeliberationRoundsInput] = useState("");
  const [maxDeliberationRoundsTouched, setMaxDeliberationRoundsTouched] = useState(false);
  const [question, setQuestion] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [attachmentError, setAttachmentError] = useState<TranslationKey | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkSummary, setLinkSummary] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<RawApiError | null>(null);
  const [questionTouched, setQuestionTouched] = useState(false);
  const [sessionEntry, setSessionEntry] = useState<SessionEntryState | null>(null);
  const [streamEvents, setStreamEvents] = useState<VisibleStreamEvent[]>([]);
  const [snapshot, setSnapshot] = useState<DeliberationSessionSnapshot | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const localizedError = useMemo(() => error ? localizeError(error, t) : null, [error, t]);
  const showQuestionError = questionTouched && !question.trim();
  const maxDeliberationRounds = parseMaxDeliberationRounds(maxDeliberationRoundsInput);
  const showMaxDeliberationRoundsError =
    maxDeliberationRoundsTouched && maxDeliberationRoundsInput.trim() !== "" && maxDeliberationRounds === null;

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
        setAgentConfig(createDefaultAgentConfig(firstModel));
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
    if (!question.trim()) {
      setQuestionTouched(true);
      setError(null);
      setSessionEntry(null);
      setStreamEvents([]);
      setSnapshot(null);
      return;
    }
    if (maxDeliberationRounds === null) {
      setMaxDeliberationRoundsTouched(true);
      setError(null);
      setSessionEntry(null);
      setStreamEvents([]);
      setSnapshot(null);
      return;
    }
    if (attachments.some((attachment) => !attachment.summary.trim())) {
      setAttachmentError("attachments.summaryMissing");
      setError(null);
      setSessionEntry(null);
      setStreamEvents([]);
      setSnapshot(null);
      return;
    }
    setRunning(true);
    setError(null);
    setAttachmentError(null);
    setQuestionTouched(false);
    setSessionEntry(null);
    setStreamEvents([]);
    setSnapshot(null);
    try {
      const response = await fetch("/api/sessions/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuestion: question,
          locale,
          agentConfig,
          attachments,
          ...(maxDeliberationRounds ? { maxDeliberationRounds } : {})
        })
      });
      if (!response.ok) throw await response.json();
      if (response.headers.get("Content-Type")?.includes("application/x-ndjson")) {
        await consumeSessionStream(response);
      } else {
        applySessionPayload(await response.json() as CreateSessionResponse);
      }
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

      <section className={`workspace-grid${topicPanelHidden ? " topic-collapsed" : ""}${rolePanelHidden ? " role-collapsed" : ""}`}>
        {topicPanelHidden && (
          <button
            type="button"
            className="edge-float edge-float-left"
            aria-label={t("layout.showTopicPanel")}
            onClick={() => setTopicPanelHidden(false)}
          >
            {t("layout.topicPanel")}
          </button>
        )}
        {rolePanelHidden && (
          <button
            type="button"
            className="edge-float edge-float-right"
            aria-label={t("layout.showRolePanel")}
            onClick={() => setRolePanelHidden(false)}
          >
            {t("layout.roleConfigPanel")}
          </button>
        )}

        {!topicPanelHidden && (
          <aside className="topic-panel">
            <div className="panel-heading">
              <h2>{t("layout.topicPanel")}</h2>
              <button
                type="button"
                className="panel-collapse-action"
                aria-label={t("layout.hideTopicPanel")}
                onClick={() => setTopicPanelHidden(true)}
              >
                ‹
              </button>
            </div>

            <label className="question-box">
              <span>{t("session.question")}</span>
              <textarea
                value={question}
                aria-invalid={showQuestionError}
                aria-describedby={showQuestionError ? "question-error" : undefined}
                onBlur={() => setQuestionTouched(true)}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  if (event.target.value.trim()) setQuestionTouched(false);
                }}
                placeholder={t("session.question.placeholder")}
              />
            </label>
            {showQuestionError && (
              <p className="validation-message" id="question-error" role="alert">
                {t("session.emptyQuestion")}
              </p>
            )}

            <section className="attachments-panel" aria-label={t("attachments.title")}>
              <div className="trace-card-header">
                <h2>{t("attachments.title")}</h2>
              </div>
              <div className="file-picker-field">
                <span className="file-picker-label">{t("attachments.file")}</span>
                <span className="file-picker-control">
                  <button
                    className="file-picker-button"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    {t("attachments.chooseFile")}
                  </button>
                  <span className="file-picker-status">{t("attachments.noFileSelected")}</span>
                  <input
                    ref={fileInputRef}
                    aria-label={t("attachments.file")}
                    accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json"
                    className="file-picker-input"
                    onChange={(event) => {
                      void addFiles(event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                </span>
              </div>
              <div className="link-input-grid">
                <label>
                  <span>{t("attachments.linkUrl")}</span>
                  <input
                    aria-label={t("attachments.linkUrl")}
                    inputMode="url"
                    onChange={(event) => setLinkUrl(event.target.value)}
                    value={linkUrl}
                  />
                </label>
                <label>
                  <span>{t("attachments.linkTitle")}</span>
                  <input
                    aria-label={t("attachments.linkTitle")}
                    onChange={(event) => setLinkTitle(event.target.value)}
                    value={linkTitle}
                  />
                </label>
                <label>
                  <span>{t("attachments.linkSummary")}</span>
                  <textarea
                    aria-label={t("attachments.linkSummary")}
                    className="attachment-summary-input"
                    onChange={(event) => setLinkSummary(event.target.value)}
                    value={linkSummary}
                  />
                </label>
                <button className="secondary-action" type="button" onClick={addLinkAttachment}>
                  {t("attachments.addLink")}
                </button>
              </div>
              {attachmentError && (
                <p className="validation-message" role="alert">
                  {t(attachmentError)}
                </p>
              )}
              <AttachmentList
                attachments={attachments}
                onRemove={(id) => setAttachments(attachments.filter((attachment) => attachment.id !== id))}
                onSummaryChange={(id, summary) => {
                  setAttachments(attachments.map((attachment) => (
                    attachment.id === id ? { ...attachment, summary } : attachment
                  )));
                }}
                t={t}
              />
            </section>

            <button
              className="primary-action"
              disabled={running || loadingModels || models.length === 0}
              onClick={startSession}
            >
              {running ? t("session.running") : t("session.start")}
            </button>

            {sessionEntry && (
              <SessionEntrySummary
                entry={sessionEntry}
                t={t}
              />
            )}
          </aside>
        )}

        <section className="meeting-panel" aria-label={t("layout.meetingArea")}>
          <div className="panel-heading meeting-heading">
            <div className="meeting-title-group">
              <p className="eyebrow">RONR</p>
              <h2>{t("layout.meetingArea")}</h2>
            </div>
            <MeetingStatusBar
              localizedError={localizedError}
              running={running}
              sessionEntry={sessionEntry}
              snapshot={snapshot}
              streamEvents={streamEvents}
              t={t}
            />
          </div>

          <div className="meeting-chat" aria-label={t("layout.meetingOutput")}>
            <section className="meeting-output" aria-label={t("layout.meetingOutput")}>
              {localizedError && (
                <div className="error-panel" role="alert">
                  <strong className="error-code">{localizedError.code}</strong>
                  <p>{localizedError.message}</p>
                  {localizedError.recoveryHint && <small>{localizedError.recoveryHint}</small>}
                </div>
              )}

              {!localizedError && (snapshot || streamEvents.length > 0) && (
                <MeetingEventStream events={mergeMeetingEvents(snapshot, streamEvents)} t={t} />
              )}

              {!localizedError && !snapshot && streamEvents.length === 0 && (
                <div className="chat-thread">
                  <div className="chat-message chat-message-system">
                    <div className="chat-avatar" aria-hidden="true">AI</div>
                    <div className="chat-bubble">
                      <strong>{t("layout.waitingOutput")}</strong>
                      <p>{t("session.nextTask")}: {t("phase.call_to_order")}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>

        {!rolePanelHidden && (
          <aside className="role-panel setup-panel">
            <div className="panel-heading">
              <h2>{t("layout.roleConfigPanel")}</h2>
              <button
                type="button"
                className="panel-collapse-action"
                aria-label={t("layout.hideRolePanel")}
                onClick={() => setRolePanelHidden(true)}
              >
                ›
              </button>
            </div>

            <section className="panel-section panel-section-inline">
              <h2>{t("provider.config")}</h2>
              <p className={`status-pill ${models.length > 0 ? "status-ok" : "status-warn"}`}>
                {loadingModels ? t("provider.loading") : `${models.length} ${t("provider.loaded")}`}
              </p>
            </section>

            <section className="panel-section role-config-section">
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
                  <div className="member-fields">
                    <RoleModelSelect
                      label={`${t("roles.member")} ${index + 1} ${t("roles.model")}`}
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
                  {agentConfig.members.length > minimumMemberCount && (
                    <button
                      type="button"
                      className="ghost-action member-remove-action"
                      aria-label={`${t("roles.removeMember")} ${index + 1}`}
                      onClick={() => removeMember(index)}
                    >
                      {t("roles.removeMember")}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="secondary-action"
                disabled={running || loadingModels || models.length === 0}
                onClick={addMember}
              >
                {t("roles.addMember")}
              </button>
              <label>
                <span>{t("roles.maxRounds")}</span>
                <input
                  aria-invalid={showMaxDeliberationRoundsError}
                  aria-describedby={showMaxDeliberationRoundsError ? "max-rounds-error" : undefined}
                  inputMode="numeric"
                  min={1}
                  onBlur={() => setMaxDeliberationRoundsTouched(true)}
                  onChange={(event) => {
                    setMaxDeliberationRoundsInput(event.target.value);
                    if (parseMaxDeliberationRounds(event.target.value) !== null) {
                      setMaxDeliberationRoundsTouched(false);
                    }
                  }}
                  placeholder={t("roles.maxRounds.placeholder")}
                  type="number"
                  value={maxDeliberationRoundsInput}
                />
              </label>
              {showMaxDeliberationRoundsError && (
                <p className="validation-message" id="max-rounds-error" role="alert">
                  {t("roles.maxRounds.invalid")}
                </p>
              )}
            </section>
          </aside>
        )}
      </section>
    </main>
  );

  function updateMember(index: number, member: AgentConfig["members"][number]) {
    setAgentConfig({
      ...agentConfig,
      members: agentConfig.members.map((item, itemIndex) => itemIndex === index ? member : item)
    });
  }

  function addMember() {
    const model = agentConfig.members.at(-1)?.model || agentConfig.chair.model || models[0]?.id || "";
    setAgentConfig({
      ...agentConfig,
      members: [
        ...agentConfig.members,
        {
          id: nextMemberId(agentConfig.members),
          model,
          mandate: "general"
        }
      ]
    });
  }

  function removeMember(index: number) {
    if (agentConfig.members.length <= minimumMemberCount) return;
    setAgentConfig({
      ...agentConfig,
      members: agentConfig.members.filter((_, itemIndex) => itemIndex !== index)
    });
  }

  async function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    for (const file of files) {
      const validationError = validateAttachmentFile(file);
      if (validationError) {
        setAttachmentError(validationError);
        return;
      }
      try {
        const text = await readAttachmentFile(file);
        const summary = summarizeAttachmentText(text);
        if (!summary) {
          setAttachmentError("attachments.fileReadFailed");
          return;
        }
        setAttachments((current) => [
          ...current,
          {
            id: `att-file-${crypto.randomUUID()}`,
            type: "file",
            title: file.name,
            summary,
            fileName: file.name,
            mimeType: file.type || "text/plain",
            sizeBytes: file.size,
            confirmedByUser: true,
            readAt: new Date().toISOString()
          }
        ]);
        setAttachmentError(null);
      } catch {
        setAttachmentError("attachments.fileReadFailed");
      }
    }
  }

  function addLinkAttachment() {
    const url = linkUrl.trim();
    const title = linkTitle.trim();
    const summary = linkSummary.trim();
    if (!isHttpUrl(url)) {
      setAttachmentError("attachments.linkInvalid");
      return;
    }
    if (!title || !summary) {
      setAttachmentError("attachments.summaryRequired");
      return;
    }
    setAttachments((current) => [
      ...current,
      {
        id: `att-link-${crypto.randomUUID()}`,
        type: "link",
        title,
        summary,
        url,
        confirmedByUser: true,
        readAt: new Date().toISOString()
      }
    ]);
    setLinkUrl("");
    setLinkTitle("");
    setLinkSummary("");
    setAttachmentError(null);
  }

  async function consumeSessionStream(response: Response) {
    if (!response.body) {
      throw {
        code: "invalid_request",
        message: "Session stream response body is empty."
      };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        handleSessionStreamEvent(JSON.parse(line) as DeliberationStreamEvent);
      }
      if (done) break;
    }
    const trailing = buffer.trim();
    if (trailing) {
      handleSessionStreamEvent(JSON.parse(trailing) as DeliberationStreamEvent);
    }
  }

  function handleSessionStreamEvent(event: DeliberationStreamEvent) {
    if (event.type === "error") {
      setError({
        code: event.code,
        message: event.message,
        recoveryHint: event.recoveryHint
      });
      return;
    }
    if (event.type === "session_started") {
      setSessionEntry({
        initialPhase: event.phase,
        activeAgentId: event.activeAgentId,
        currentSpeakerAgentId: event.currentSpeakerAgentId,
        nextTask: event.nextTask,
        sessionEntry: {
          phase: event.phase,
          activeAgentId: "chair",
          currentSpeakerAgentId: "chair",
          nextTask: event.nextTask
        }
      });
      return;
    }
    if (event.type === "thinking" || event.type === "search_sources" || event.type === "speech") {
      setStreamEvents((current) => [...current, event]);
      return;
    }
    if (event.type === "completed") {
      setSnapshot(event.sessionSnapshot);
    }
  }

  function applySessionPayload(sessionPayload: CreateSessionResponse) {
    setSessionEntry({
      initialPhase: sessionPayload.initialPhase,
      activeAgentId: sessionPayload.activeAgentId,
      currentSpeakerAgentId: sessionPayload.currentSpeakerAgentId,
      nextTask: sessionPayload.nextTask,
      sessionEntry: sessionPayload.sessionEntry
    });
    setSnapshot(sessionPayload.sessionSnapshot);
  }
}

function createDefaultAgentConfig(model = ""): AgentConfig {
  return {
    chair: { model },
    secretary: { model },
    members: [
      { id: "member-user", model, mandate: "user-advocate" },
      { id: "member-red", model, mandate: "red-team" }
    ]
  };
}

function nextMemberId(members: AgentConfig["members"]): string {
  const numericIds = members
    .map((member) => member.id.match(/^member-(\d+)$/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value));
  return `member-${Math.max(0, ...numericIds) + 1}`;
}

function parseMaxDeliberationRounds(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

function AttachmentList({
  attachments,
  onRemove,
  onSummaryChange,
  t
}: {
  attachments: AttachmentDraft[];
  onRemove: (id: string) => void;
  onSummaryChange: (id: string, summary: string) => void;
  t: Translator;
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="attachment-list">
      {attachments.map((attachment) => (
        <article className="attachment-item" key={attachment.id}>
          <div className="trace-card-header">
            <strong>{attachment.title}</strong>
            <span>{t("attachments.confirmed")}</span>
          </div>
          <div className="tag-row">
            <span>{attachment.type === "file" ? t("attachments.file") : t("attachments.linkUrl")}</span>
            {attachment.fileName && <span>{attachment.fileName}</span>}
            {attachment.url && <span>{attachment.url}</span>}
          </div>
          <label>
            <span>{t("attachments.summary")}</span>
            <textarea
              aria-label={t("attachments.summary")}
              className="attachment-summary-input"
              onChange={(event) => onSummaryChange(attachment.id, event.target.value)}
              value={attachment.summary}
            />
          </label>
          <button className="ghost-action" type="button" onClick={() => onRemove(attachment.id)}>
            {t("attachments.remove")}
          </button>
        </article>
      ))}
    </div>
  );
}

function SessionEntrySummary({
  entry,
  t
}: {
  entry: SessionEntryState;
  t: Translator;
}) {
  return (
    <section className="session-entry-panel" aria-label={t("session.entry")}>
      <div className="trace-card-header">
        <h2>{t("session.entryCreated")}</h2>
        <span>{t(`phase.${entry.initialPhase}`)}</span>
      </div>
      <dl className="field-list">
        <div>
          <dt>{t("session.activeAgent")}</dt>
          <dd>{entry.activeAgentId}</dd>
        </div>
        <div>
          <dt>{t("session.nextTask")}</dt>
          <dd>{entry.nextTask}</dd>
        </div>
      </dl>
    </section>
  );
}

function MeetingStatusBar({
  localizedError,
  running,
  sessionEntry,
  snapshot,
  streamEvents,
  t
}: {
  localizedError: ApiError | null;
  running: boolean;
  sessionEntry: SessionEntryState | null;
  snapshot: DeliberationSessionSnapshot | null;
  streamEvents: VisibleStreamEvent[];
  t: Translator;
}) {
  const currentPhase = resolveCurrentPhase(sessionEntry, snapshot, streamEvents);
  const activeAgentId = resolveActiveAgentId(sessionEntry, snapshot, streamEvents);
  const currentSpeakerAgentId = resolveCurrentSpeakerAgentId(sessionEntry, snapshot, streamEvents);
  const progressState = resolveMeetingProgressState({ localizedError, running, sessionEntry, snapshot });

  return (
    <div className="meeting-status-bar" aria-label={t("meetingStatus.label")}>
      <span className="meeting-status-item">
        <span className="meeting-status-label">{t("meetingStatus.stage")}</span>
        <span className="meeting-status-value">{t(`phase.${currentPhase}`)}</span>
      </span>
      <span className="meeting-status-item">
        <span className="meeting-status-label">{t("meetingStatus.activeAgent")}</span>
        <span className="meeting-status-value">{activeAgentId}</span>
      </span>
      <span className="meeting-status-item">
        <span className="meeting-status-label">{t("meetingStatus.currentSpeaker")}</span>
        <span className="meeting-status-value">{currentSpeakerAgentId}</span>
      </span>
      <span className="meeting-status-state" data-state={progressState}>
        {t(`meetingStatus.${progressState}`)}
      </span>
    </div>
  );
}

function resolveCurrentPhase(
  sessionEntry: SessionEntryState | null,
  snapshot: DeliberationSessionSnapshot | null,
  streamEvents: VisibleStreamEvent[]
): Phase {
  const phase = snapshot?.phase
    ?? getLatestStreamStatus(streamEvents)?.phase
    ?? sessionEntry?.sessionEntry.phase
    ?? sessionEntry?.initialPhase;
  return phase && isKnownPhase(phase) ? phase : "call_to_order";
}

function resolveActiveAgentId(
  sessionEntry: SessionEntryState | null,
  snapshot: DeliberationSessionSnapshot | null,
  streamEvents: VisibleStreamEvent[]
): string {
  return snapshot?.speeches.at(-1)?.agentId
    ?? getLatestStreamStatus(streamEvents)?.agentId
    ?? sessionEntry?.activeAgentId
    ?? sessionEntry?.sessionEntry.activeAgentId
    ?? snapshot?.speeches.at(-1)?.agentId
    ?? "chair";
}

function resolveCurrentSpeakerAgentId(
  sessionEntry: SessionEntryState | null,
  snapshot: DeliberationSessionSnapshot | null,
  streamEvents: VisibleStreamEvent[]
): string {
  return snapshot?.speeches.at(-1)?.agentId
    ?? getLatestStreamStatus(streamEvents)?.agentId
    ?? sessionEntry?.currentSpeakerAgentId
    ?? sessionEntry?.sessionEntry.currentSpeakerAgentId
    ?? snapshot?.speeches.at(-1)?.agentId
    ?? "chair";
}

function getLatestStreamStatus(streamEvents: VisibleStreamEvent[]): { phase: string; agentId: string } | null {
  for (let index = streamEvents.length - 1; index >= 0; index -= 1) {
    const event = streamEvents[index];
    if (event.type === "speech") {
      return {
        phase: event.speech.phase,
        agentId: event.speech.agentId
      };
    }
    return {
      phase: event.phase,
      agentId: event.agentId
    };
  }
  return null;
}

function resolveMeetingProgressState({
  localizedError,
  running,
  sessionEntry,
  snapshot
}: {
  localizedError: ApiError | null;
  running: boolean;
  sessionEntry: SessionEntryState | null;
  snapshot: DeliberationSessionSnapshot | null;
}): MeetingProgressState {
  if (localizedError) return "failed";
  if (running) return "running";
  if (snapshot?.status === "completed") return "completed";
  if (sessionEntry) return "active";
  return "waiting";
}

function validateAttachmentFile(file: File): TranslationKey | null {
  if (file.size > maxAttachmentFileBytes) return "attachments.fileTooLarge";
  const name = file.name.toLowerCase();
  const hasSupportedExtension = supportedAttachmentExtensions.some((extension) => name.endsWith(extension));
  const isTextMime = file.type.startsWith("text/") || file.type === "application/json" || file.type === "";
  return hasSupportedExtension && isTextMime ? null : "attachments.fileUnsupported";
}

function readAttachmentFile(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsText(file);
  });
}

function summarizeAttachmentText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function mergeMeetingEvents(
  snapshot: DeliberationSessionSnapshot | null,
  streamEvents: VisibleStreamEvent[]
): VisibleStreamEvent[] {
  if (!snapshot) return streamEvents;
  const streamedSpeechIds = new Set(
    streamEvents
      .filter((event): event is { type: "speech"; speech: Speech } => event.type === "speech")
      .map((event) => event.speech.id)
  );
  const streamedSpeechSignatures = new Set(
    streamEvents
      .filter((event): event is { type: "speech"; speech: Speech } => event.type === "speech")
      .map((event) => speechReplaySignature(event.speech))
  );
  return [
    ...streamEvents,
    ...snapshot.speeches
      .filter((speech) => !streamedSpeechIds.has(speech.id) && !streamedSpeechSignatures.has(speechReplaySignature(speech)))
      .map((speech): VisibleStreamEvent => ({ type: "speech", speech }))
  ];
}

function speechReplaySignature(speech: Speech): string {
  return JSON.stringify({
    agentId: speech.agentId,
    role: speech.role,
    mandate: speech.mandate ?? "",
    phase: speech.phase,
    content: speech.content.trim()
  });
}

const speechParagraphBreakMarkers = [
  "第一[，,、]",
  "第二[，,、]",
  "第三[，,、]",
  "第四[，,、]",
  "第五[，,、]",
  "其一[，,、]",
  "其二[，,、]",
  "其三[，,、]",
  "首先[，,、]",
  "其次[，,、]",
  "再次[，,、]",
  "最后[，,、]",
  "综上[，,、]",
  "因此[，,、]",
  "First[,，]",
  "Second[,，]",
  "Third[,，]",
  "Finally[,，]",
  "In summary[,，]"
];
const speechParagraphBreakPattern = new RegExp(`(?=(?:${speechParagraphBreakMarkers.join("|")}))`, "g");

function formatSpeechParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(speechParagraphBreakPattern))
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function MeetingEventStream({
  events,
  t
}: {
  events: VisibleStreamEvent[];
  t: Translator;
}) {
  const turns = buildAgentTurns(events);
  return (
    <section className="chat-thread" aria-label={t("result.speeches")}>
      {turns.map((turn) => (
        <AgentTurnMessage key={turn.id} t={t} turn={turn} />
      ))}
    </section>
  );
}

function buildAgentTurns(events: VisibleStreamEvent[]): AgentTurn[] {
  const turns: AgentTurn[] = [];
  let activeTurn: AgentTurn | null = null;
  const turnCounts = new Map<string, number>();

  function getTurn(input: {
    agentId: string;
    role: Speech["role"];
    mandate?: Mandate;
    phase: string;
    startsNewTurn?: boolean;
  }): AgentTurn {
    const currentTurn = activeTurn;
    const canReuseActiveTurn = currentTurn
      && currentTurn.agentId === input.agentId
      && currentTurn.phase === input.phase
      && !input.startsNewTurn;
    if (canReuseActiveTurn) {
      currentTurn.role = input.role;
      currentTurn.phase = input.phase;
      if (input.mandate) currentTurn.mandate = input.mandate;
      return currentTurn;
    }
    const baseId = `${input.agentId}-${input.phase}`;
    const count = turnCounts.get(baseId) ?? 0;
    turnCounts.set(baseId, count + 1);
    const next: AgentTurn = {
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      agentId: input.agentId,
      role: input.role,
      ...(input.mandate ? { mandate: input.mandate } : {}),
      phase: input.phase,
      sources: []
    };
    activeTurn = next;
    turns.push(next);
    return next;
  }

  events.forEach((event) => {
    if (event.type === "search_sources") {
      const turn = getTurn({ ...event, startsNewTurn: Boolean(activeTurn?.speech) });
      turn.sources = event.sources;
      turn.searchStatus = event.status ?? (event.sources.length > 0 ? "completed" : "failed");
      turn.searchErrorCode = event.errorCode;
      return;
    }
    if (event.type === "thinking") {
      const turn = getTurn({ ...event, startsNewTurn: Boolean(activeTurn?.speech) });
      turn.thinkingSummary = event.summary;
      return;
    }
    const turn = getTurn({
      agentId: event.speech.agentId,
      role: event.speech.role,
      ...(event.speech.mandate ? { mandate: event.speech.mandate } : {}),
      phase: event.speech.phase,
      startsNewTurn: Boolean(activeTurn?.speech)
    });
    turn.speech = event.speech;
  });

  return turns;
}

function AgentTurnMessage({
  t,
  turn
}: {
  t: Translator;
  turn: AgentTurn;
}) {
  const speechContent = turn.speech?.content ?? "";
  const displayedSpeechContent = useTypewriterText(speechContent);
  const isStreamingSpeech = Boolean(turn.speech && displayedSpeechContent.length < speechContent.length);
  const speechParagraphs = formatSpeechParagraphs(displayedSpeechContent);
  const visibleSpeechParagraphs = speechParagraphs.length > 0 ? speechParagraphs : [""];

  return (
    <article className="chat-message chat-turn" data-turn-id={turn.id}>
      <div className={`chat-avatar${turn.speech ? "" : " chat-avatar-muted"}`} aria-hidden="true">
        {turn.agentId.slice(0, 2).toUpperCase()}
      </div>
      <div className={`chat-bubble${turn.speech ? "" : " chat-bubble-muted"}`}>
        <div className="chat-meta">
          <strong>{turn.agentId}</strong>
          <span>{turn.speech ? t(roleTranslationKeys[turn.role]) : t("stream.thinking")}</span>
          {turn.mandate && <span>{t(`mandate.${turn.mandate}`)}</span>}
          <span>{isKnownPhase(turn.phase) ? t(`phase.${turn.phase}`) : turn.phase}</span>
        </div>
        {(turn.sources.length > 0 || turn.searchStatus) && (
          <details className="turn-disclosure turn-sources">
            <summary>{t("stream.sourceDetails")}</summary>
            <div className="source-list">
              {turn.sources.length > 0
                ? turn.sources.map((source) => (
                  <div className="source-item" key={`${source.title}-${source.url}`}>
                    <strong>{source.title}</strong>
                    {source.snippet && <p>{source.snippet}</p>}
                    <a href={source.url} target="_blank" rel="noreferrer">{source.url}</a>
                  </div>
                ))
                : (
                  <div className="source-item source-item-muted">
                    <strong>{t(`stream.searchStatus.${turn.searchStatus ?? "failed"}`)}</strong>
                    {turn.searchErrorCode && <p>{t("stream.searchErrorCode")}: {turn.searchErrorCode}</p>}
                  </div>
                )}
            </div>
          </details>
        )}
        {turn.thinkingSummary && (
          <details className="turn-disclosure turn-thinking">
            <summary>{t("stream.thinkingDetails")}</summary>
            <p>{turn.thinkingSummary}</p>
          </details>
        )}
        {turn.speech && (
          <div className="speech-content">
            {visibleSpeechParagraphs.map((paragraph, index) => (
              <p key={index}>
                {paragraph}
                {isStreamingSpeech && index === visibleSpeechParagraphs.length - 1 && (
                  <span className="streaming-caret" aria-hidden="true" />
                )}
              </p>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function useTypewriterText(target: string, delayMs = 6): string {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText((current) => target.startsWith(current) ? current : "");
  }, [target]);

  useEffect(() => {
    if (!target || displayedText.length >= target.length) return;
    const timeout = window.setTimeout(() => {
      setDisplayedText(target.slice(0, displayedText.length + 1));
    }, delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, displayedText, target]);

  return displayedText;
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
