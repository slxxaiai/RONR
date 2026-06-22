import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { createSqliteDeliberationRecordRepository } from "@ronr/db";
import type { DeliberationSessionSnapshot } from "@ronr/contracts";

describe("Deliberation Record repository", () => {
  test("stores a replayable Robert Rules record scoped to a local anonymous user", async () => {
    const repository = createSqliteDeliberationRecordRepository({
      databasePath: join(mkdtempSync(join(tmpdir(), "ronr-records-")), "records.sqlite")
    });
    const user = await repository.ensureUserReference({
      id: "user-local-1",
      type: "local_anonymous"
    });

    const record = await repository.createRecord({
      userReferenceId: user.id,
      sessionId: "session-1",
      meetingRuleType: "robert_rules",
      title: "是否先做个人版",
      question: "我应该先做个人版还是团队版？",
      locale: "zh-CN",
      status: "active",
      phase: "call_to_order"
    });
    await repository.appendEvent({
      recordId: record.id,
      sessionId: record.sessionId,
      userReferenceId: user.id,
      sequence: 1,
      type: "session_started",
      payload: { type: "session_started", sessionId: "session-1", phase: "call_to_order" }
    });
    await repository.appendEvent({
      recordId: record.id,
      sessionId: record.sessionId,
      userReferenceId: user.id,
      sequence: 2,
      type: "speech",
      payload: { type: "speech", speech: { id: "speech-chair", agentId: "chair", content: "确认议题" } }
    });
    await repository.saveSnapshot({
      recordId: record.id,
      sessionId: record.sessionId,
      snapshot,
      version: 1
    });
    await repository.completeRecord({
      recordId: record.id,
      status: "completed",
      phase: "action_resolution",
      actionPlanSummary: "先做个人版验证。"
    });

    const list = await repository.listRecordsByUser(user.id);
    expect(list).toEqual([
      expect.objectContaining({
        id: record.id,
        userReferenceId: user.id,
        sessionId: "session-1",
        meetingRuleType: "robert_rules",
        title: "是否先做个人版",
        status: "completed",
        phase: "action_resolution",
        eventCount: 2,
        actionPlanSummary: "先做个人版验证。"
      })
    ]);

    const detail = await repository.getRecordDetail(record.id, user.id);
    expect(detail?.snapshot).toMatchObject({ id: "session-1", actionPlan: { summary: "先做个人版验证。" } });
    expect(detail?.events.map((event) => event.sequence)).toEqual([1, 2]);
    expect(detail?.events.map((event) => event.type)).toEqual(["session_started", "speech"]);

    await repository.ensureUserReference({
      id: "user-local-2",
      type: "local_anonymous"
    });
    await expect(repository.getRecordDetail(record.id, "user-local-2")).resolves.toBeNull();
  });
});

const snapshot: DeliberationSessionSnapshot = {
  id: "session-1",
  userQuestion: "我应该先做个人版还是团队版？",
  sourceReferences: [],
  goal: "选择首个产品方向",
  constraints: [],
  locale: "zh-CN",
  status: "completed",
  phase: "action_resolution",
  agents: [
    { id: "chair", role: "chair", model: "model-a" },
    { id: "secretary", role: "secretary", model: "model-a" },
    { id: "member-user", role: "member", mandate: "user-advocate", model: "model-a" },
    { id: "member-red", role: "member", mandate: "red-team", model: "model-a" }
  ],
  motions: [{ id: "motion-main", title: "先做个人版", description: "先验证个人决策用户", status: "adopted" }],
  speeches: [
    {
      id: "speech-chair",
      agentId: "chair",
      role: "chair",
      phase: "call_to_order",
      content: "确认议题",
      claims: ["选择首个产品方向"],
      assumptions: []
    }
  ],
  objections: [],
  votes: [],
  reservations: [],
  actionPlan: {
    summary: "先做个人版验证。",
    items: [
      {
        id: "action-1",
        title: "验证个人版",
        rationale: "降低首发范围",
        conditions: [],
        firstValidation: "完成 3 次真实议事",
        sourceRefs: ["speech-chair"]
      }
    ]
  },
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z"
};
