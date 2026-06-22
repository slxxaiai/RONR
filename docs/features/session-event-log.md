# Session Event Log

## One-Line Definition

记录 Deliberation Session 中的用户输入、Agent 输出、阶段推进、插话、错误和完成事件，支撑恢复、证据链和 Deliberation Records。

## Status

进行中

## Priority

高

## Problem

如果 RONR 只保存当前 session snapshot，用户插话、阶段重开、Agent 立场变化和错误恢复都会丢失过程信息。Event Log 是证据链、恢复和后续质量评估的基础。

## Users

- 个人决策用户
- Secretary Agent
- Chair Agent
- 后续实现者

## Goals

- 记录所有影响议事过程的事件。
- 支持从 event log 重建 session snapshot。
- 为 Deliberation Trace 和 Quality Review 提供过程证据。
- 在 Provider 失败或用户暂停后保留已完成过程。

## Non-Goals

- 长期历史分析。
- 多用户审计日志。
- 外部 observability 平台。

## User Flow

1. 用户创建会话，系统记录 `session_started`。
2. Chair、Member、Secretary 输出时记录 Agent event。
3. 阶段推进时记录 phase event。
4. 用户插话、暂停或重开阶段时记录 user interruption event。
5. 生成 Action Plan 时记录 session completed event。
6. Deliberation Records 读取 event log 和 snapshot 进行 Meeting Replay。

## Requirements

- 每个 event 必须包含 `id`、`recordId`、`sessionId`、`userReferenceId`、`sequence`、`type`、`createdAt` 和 payload。
- event 必须 append-only，不覆盖历史。
- `sequence` 必须在同一 record 内单调递增。
- session snapshot 必须能引用产生它的 event。
- 用户插话和阶段重开不得删除旧 event。
- Provider 错误必须记录为 event，并保持 session 可恢复。

## Development Mode

`TDD-first`

Event Log 是状态恢复和证据链基础，应先写 append-only、重放、错误保留和重开阶段测试。

## Acceptance Criteria

- 给定一组有效 event，系统能重建当前 session snapshot。
- 阶段重开后旧 event 仍然存在，并能区分新旧阶段输出。
- Provider 失败后 event log 保留失败前已完成的 Agent 输出。

## Verification Plan

- 自动化测试：覆盖 append-only、snapshot replay、用户插话、阶段重开、Provider error event。
- fixture 验证：提供一个完整 session event log fixture 和一个失败恢复 fixture。
- 人工检查：确认 event type 和 contracts 文档一致。
- 不需要测试的理由：不适用，该 feature 是可追溯性的基础。

## Technical Notes

当前本地运行阶段使用 SQLite 持久化 event log，并通过 Record Repository 隔离存储实现。未来迁移 Postgres 时保留 event payload、sequence 和 snapshot 语义不变。

## Rollout

先在 stream 运行链路记录 `session_started`、`search_sources`、`thinking`、`speech`、`completed`、`error` 等事件；后续用户插话接入后继续追加 interruption event，不重写旧 event。
