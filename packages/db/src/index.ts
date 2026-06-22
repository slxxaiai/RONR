import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DeliberationSessionSnapshot, Locale, MeetingRuleType } from "@ronr/contracts";

export type UserReferenceType = "local_anonymous";
export type DeliberationRecordStatus = "active" | "completed" | "cancelled" | "failed";

export interface UserReference {
  id: string;
  type: UserReferenceType;
  createdAt: string;
  lastSeenAt: string;
}

export interface DeliberationRecordSummary {
  id: string;
  userReferenceId: string;
  sessionId: string;
  meetingRuleType: MeetingRuleType;
  title: string;
  question: string;
  locale: Locale;
  status: DeliberationRecordStatus;
  phase: string;
  actionPlanSummary?: string;
  eventCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface SessionEventRecord {
  id: string;
  recordId: string;
  sessionId: string;
  userReferenceId: string;
  sequence: number;
  type: string;
  payload: unknown;
  createdAt: string;
}

export interface DeliberationRecordDetail {
  record: DeliberationRecordSummary;
  snapshot?: DeliberationSessionSnapshot;
  events: SessionEventRecord[];
}

export interface DeliberationRecordRepository {
  ensureUserReference(input: {
    id: string;
    type: UserReferenceType;
  }): Promise<UserReference>;
  createRecord(input: {
    userReferenceId: string;
    sessionId: string;
    meetingRuleType: MeetingRuleType;
    title: string;
    question: string;
    locale: Locale;
    status: DeliberationRecordStatus;
    phase: string;
  }): Promise<DeliberationRecordSummary>;
  appendEvent(input: {
    recordId: string;
    sessionId: string;
    userReferenceId: string;
    sequence: number;
    type: string;
    payload: unknown;
  }): Promise<SessionEventRecord>;
  saveSnapshot(input: {
    recordId: string;
    sessionId: string;
    snapshot: DeliberationSessionSnapshot;
    version: number;
  }): Promise<void>;
  completeRecord(input: {
    recordId: string;
    status: DeliberationRecordStatus;
    phase: string;
    actionPlanSummary?: string;
  }): Promise<DeliberationRecordSummary>;
  listRecordsByUser(userReferenceId: string): Promise<DeliberationRecordSummary[]>;
  getRecordDetail(recordId: string, userReferenceId: string): Promise<DeliberationRecordDetail | null>;
}

export interface SqliteDeliberationRecordRepositoryOptions {
  databasePath: string;
}

type DatabaseRowValue = string | number | null;
type DatabaseRow = Record<string, DatabaseRowValue>;

export function createSqliteDeliberationRecordRepository(
  options: SqliteDeliberationRecordRepositoryOptions
): DeliberationRecordRepository {
  return new SqliteDeliberationRecordRepository(options.databasePath);
}

class SqliteDeliberationRecordRepository implements DeliberationRecordRepository {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    const resolvedPath = resolve(databasePath);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    this.db = new DatabaseSync(resolvedPath);
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec(schemaSql);
  }

  async ensureUserReference(input: { id: string; type: UserReferenceType }): Promise<UserReference> {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO user_references (id, type, created_at, last_seen_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at
    `).run(input.id, input.type, now, now);
    const row = this.db.prepare("SELECT * FROM user_references WHERE id = ?").get(input.id) as DatabaseRow;
    return toUserReference(row);
  }

  async createRecord(input: {
    userReferenceId: string;
    sessionId: string;
    meetingRuleType: MeetingRuleType;
    title: string;
    question: string;
    locale: Locale;
    status: DeliberationRecordStatus;
    phase: string;
  }): Promise<DeliberationRecordSummary> {
    const now = new Date().toISOString();
    const id = `record-${crypto.randomUUID()}`;
    this.db.prepare(`
      INSERT INTO deliberation_records (
        id,
        user_reference_id,
        session_id,
        meeting_rule_type,
        title,
        question,
        locale,
        status,
        phase,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.userReferenceId,
      input.sessionId,
      input.meetingRuleType,
      input.title,
      input.question,
      input.locale,
      input.status,
      input.phase,
      now,
      now
    );
    return this.getRecordSummaryById(id) as DeliberationRecordSummary;
  }

  async appendEvent(input: {
    recordId: string;
    sessionId: string;
    userReferenceId: string;
    sequence: number;
    type: string;
    payload: unknown;
  }): Promise<SessionEventRecord> {
    const now = new Date().toISOString();
    const id = `event-${crypto.randomUUID()}`;
    this.db.prepare(`
      INSERT INTO session_events (
        id,
        record_id,
        session_id,
        user_reference_id,
        sequence,
        type,
        payload_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.recordId,
      input.sessionId,
      input.userReferenceId,
      input.sequence,
      input.type,
      JSON.stringify(input.payload),
      now
    );
    this.touchRecord(input.recordId, now);
    return {
      id,
      recordId: input.recordId,
      sessionId: input.sessionId,
      userReferenceId: input.userReferenceId,
      sequence: input.sequence,
      type: input.type,
      payload: input.payload,
      createdAt: now
    };
  }

  async saveSnapshot(input: {
    recordId: string;
    sessionId: string;
    snapshot: DeliberationSessionSnapshot;
    version: number;
  }): Promise<void> {
    const now = new Date().toISOString();
    const id = `snapshot-${crypto.randomUUID()}`;
    this.db.prepare(`
      INSERT INTO session_snapshots (
        id,
        record_id,
        session_id,
        version,
        snapshot_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(record_id, version) DO UPDATE SET
        snapshot_json = excluded.snapshot_json,
        created_at = excluded.created_at
    `).run(
      id,
      input.recordId,
      input.sessionId,
      input.version,
      JSON.stringify(input.snapshot),
      now
    );
    this.touchRecord(input.recordId, now);
  }

  async completeRecord(input: {
    recordId: string;
    status: DeliberationRecordStatus;
    phase: string;
    actionPlanSummary?: string;
  }): Promise<DeliberationRecordSummary> {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE deliberation_records
      SET status = ?,
          phase = ?,
          action_plan_summary = ?,
          updated_at = ?,
          completed_at = CASE WHEN ? IN ('completed', 'cancelled', 'failed') THEN ? ELSE completed_at END
      WHERE id = ?
    `).run(
      input.status,
      input.phase,
      input.actionPlanSummary ?? null,
      now,
      input.status,
      now,
      input.recordId
    );
    return this.getRecordSummaryById(input.recordId) as DeliberationRecordSummary;
  }

  async listRecordsByUser(userReferenceId: string): Promise<DeliberationRecordSummary[]> {
    const rows = this.db.prepare(`
      SELECT
        records.*,
        COUNT(events.id) AS event_count
      FROM deliberation_records records
      LEFT JOIN session_events events ON events.record_id = records.id
      WHERE records.user_reference_id = ?
      GROUP BY records.id
      ORDER BY records.updated_at DESC
    `).all(userReferenceId) as DatabaseRow[];
    return rows.map(toRecordSummary);
  }

  async getRecordDetail(recordId: string, userReferenceId: string): Promise<DeliberationRecordDetail | null> {
    const record = this.getRecordSummaryById(recordId, userReferenceId);
    if (!record) return null;
    const eventRows = this.db.prepare(`
      SELECT * FROM session_events
      WHERE record_id = ?
      ORDER BY sequence ASC
    `).all(recordId) as DatabaseRow[];
    const snapshotRow = this.db.prepare(`
      SELECT * FROM session_snapshots
      WHERE record_id = ?
      ORDER BY version DESC
      LIMIT 1
    `).get(recordId) as DatabaseRow | undefined;
    return {
      record,
      ...(snapshotRow ? { snapshot: JSON.parse(String(snapshotRow.snapshot_json)) as DeliberationSessionSnapshot } : {}),
      events: eventRows.map(toSessionEvent)
    };
  }

  private getRecordSummaryById(recordId: string, userReferenceId?: string): DeliberationRecordSummary | null {
    const row = this.db.prepare(`
      SELECT
        records.*,
        COUNT(events.id) AS event_count
      FROM deliberation_records records
      LEFT JOIN session_events events ON events.record_id = records.id
      WHERE records.id = ?
      ${userReferenceId ? "AND records.user_reference_id = ?" : ""}
      GROUP BY records.id
      LIMIT 1
    `).get(...(userReferenceId ? [recordId, userReferenceId] : [recordId])) as DatabaseRow | undefined;
    return row ? toRecordSummary(row) : null;
  }

  private touchRecord(recordId: string, updatedAt: string) {
    this.db.prepare("UPDATE deliberation_records SET updated_at = ? WHERE id = ?").run(updatedAt, recordId);
  }
}

function toUserReference(row: DatabaseRow): UserReference {
  return {
    id: String(row.id),
    type: row.type as UserReferenceType,
    createdAt: String(row.created_at),
    lastSeenAt: String(row.last_seen_at)
  };
}

function toRecordSummary(row: DatabaseRow): DeliberationRecordSummary {
  return {
    id: String(row.id),
    userReferenceId: String(row.user_reference_id),
    sessionId: String(row.session_id),
    meetingRuleType: row.meeting_rule_type as MeetingRuleType,
    title: String(row.title),
    question: String(row.question),
    locale: row.locale as Locale,
    status: row.status as DeliberationRecordStatus,
    phase: String(row.phase),
    ...(row.action_plan_summary ? { actionPlanSummary: String(row.action_plan_summary) } : {}),
    eventCount: Number(row.event_count ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ...(row.completed_at ? { completedAt: String(row.completed_at) } : {})
  };
}

function toSessionEvent(row: DatabaseRow): SessionEventRecord {
  return {
    id: String(row.id),
    recordId: String(row.record_id),
    sessionId: String(row.session_id),
    userReferenceId: String(row.user_reference_id),
    sequence: Number(row.sequence),
    type: String(row.type),
    payload: JSON.parse(String(row.payload_json)),
    createdAt: String(row.created_at)
  };
}

const schemaSql = `
CREATE TABLE IF NOT EXISTS user_references (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  account_user_id TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deliberation_records (
  id TEXT PRIMARY KEY,
  user_reference_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  meeting_rule_type TEXT NOT NULL,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  locale TEXT NOT NULL,
  status TEXT NOT NULL,
  phase TEXT NOT NULL,
  action_plan_summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY(user_reference_id) REFERENCES user_references(id)
);

CREATE TABLE IF NOT EXISTS session_events (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_reference_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(record_id, sequence),
  FOREIGN KEY(record_id) REFERENCES deliberation_records(id),
  FOREIGN KEY(user_reference_id) REFERENCES user_references(id)
);

CREATE TABLE IF NOT EXISTS session_snapshots (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(record_id, version),
  FOREIGN KEY(record_id) REFERENCES deliberation_records(id)
);
`;
