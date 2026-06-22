# Deliberation Records

## One-Line Definition

为本地用户引用保存可重放的 Deliberation Session 历史记录，包含会议规则类型、详细事件过程、时间和最终 Session Snapshot。

## Status

进行中

## Priority

高

## Problem

RONR 的个人决策用户需要回看一次 AI Agent 议事的完整过程，而不仅是最终 Action Plan。即使当前没有复杂用户系统，也需要把记录关联到可迁移的 User Reference，否则未来接入账号系统时无法平滑绑定历史记录。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent
- 后续云端部署实现者

## Goals

- 保存每场 Deliberation Session 的摘要记录、Session Event Log 和 Session Snapshot。
- 使用 User Reference 将记录关联到本地匿名用户，未来可绑定正式账号用户。
- 保存 Meeting Rule Type，当前固定为 `robert_rules`，未来可扩展其他议事规则。
- 支持在 Topic Panel 中切换 New Meeting 和 History，并从 History 选择记录进行 Meeting Replay。
- Meeting Replay 必须在 Meeting Area 展示完整历史记录、Speaker Order 和按发言顺序还原的 Agent 发言。
- 当前本地运行采用 SQLite；通过 Record Repository 隔离存储接口，保留未来迁移 Postgres 的边界。

## Non-Goals

- 不实现登录、注册、团队空间、权限系统。
- 不实现跨设备同步。
- 不实现复杂全文检索、统计分析或多租户审计。
- 不把 Meeting Replay 设计成人类会议录音或语音回放。

## User Flow

1. 用户首次打开 Web，系统生成 `User Reference`，类型为 `local_anonymous`，并保存在本地浏览器。
2. 用户在 Topic Panel 选择 New Meeting，输入个人决策问题，默认使用 `robert_rules` 创建 Deliberation Session。
3. Session Stream 运行时，系统按顺序追加事件到 Session Event Log，并在完成时保存 Session Snapshot。
4. 用户在 Topic Panel 选择 History，系统按当前 User Reference 读取 Deliberation Records。
5. 用户点击某条历史记录卡片，系统读取 Record Detail，把事件和 Snapshot 回放到 Meeting Area。
6. Meeting Area 显示历史记录标题、问题、会议规则、状态、Speaker Order，以及按事件顺序排列的 Agent 发言。

## Requirements

- `Deliberation Record` 必须包含 `id`、`userReferenceId`、`sessionId`、`meetingRuleType`、`title`、`question`、`locale`、`status`、`phase`、`eventCount`、`createdAt`、`updatedAt`。
- `Session Event` 必须包含 `id`、`recordId`、`sessionId`、`userReferenceId`、`sequence`、`type`、`payload`、`createdAt`。
- `sequence` 必须在同一 record 内单调递增，用于 Meeting Replay。
- `Session Snapshot` 必须保存完整 JSON，用于快速恢复最终状态。
- API 读取记录时必须按 `userReferenceId` 过滤，不能读取其他 User Reference 的记录。
- Web 创建议事时必须发送 `userReferenceId` 和 `meetingRuleType`。
- Topic Panel 必须提供 New Meeting 和 History 入口。
- History 中的整张记录卡片必须可点击，不能只允许点击标题。
- Meeting Replay 必须优先按照 `Session Event.sequence` 还原发言顺序；当旧记录缺少 Speech Event 时，才允许退回 `Session Snapshot.speeches`。
- History 读取失败时复用结构化错误展示，不吞掉错误。

## Data and Storage Design

当前实现使用 SQLite，数据库文件位于本地运行环境，默认路径为 `data/ronr.sqlite`，可通过 `RONR_DB_PATH` 覆盖。SQLite 只作为当前本地 adapter，不是业务层唯一事实源。

存储边界由 `Record Repository` 定义。Web API 和 Agent Runtime 只依赖 repository 接口，不直接依赖 SQLite SQL。未来迁移 Postgres 时，新增 Postgres adapter 并复用同一 repository contract。

最小表：

- `user_references`
- `deliberation_records`
- `session_events`
- `session_snapshots`

Event Log 是事实源，Snapshot 是恢复和读取优化。

## Development Mode

`TDD-first`

会议记录涉及持久化、用户关联和重放顺序，必须先写 repository、API 和 UI 行为测试，再实现。

## Acceptance Criteria

- 本地 SQLite repository 可以保存、列出、读取一条带 `robert_rules` 的 Deliberation Record。
- Record Detail 返回有序 Session Event Log 和最新 Session Snapshot。
- 不同 User Reference 不能读取彼此的记录。
- Session Stream 完成后，History 中能看到对应记录，并可回放到 Meeting Area。
- 点击历史记录卡片正文、摘要或标题，都能在 Meeting Area 打开完整记录。
- Meeting Area 打开历史记录后，必须展示 Speaker Order，并按顺序展示发言人和发言内容。
- Web 请求体包含 `userReferenceId` 和 `meetingRuleType`。
- 代码中不把 SQLite API 引入浏览器 bundle。

## Verification Plan

- 自动化测试：repository 单元测试覆盖用户隔离、事件顺序、Snapshot 读取。
- 自动化测试：API 集成测试覆盖 stream 持久化、records list/detail 和越权读取 404。
- 自动化测试：UI 测试覆盖 New Meeting、History、User Reference、本地会议规则类型和 Meeting Replay。
- 构建验证：`npm run build` 检查 Next.js server/client 边界。

## Multilingual and Glossary Impact

新增或复用以下 Canonical Term：

- `Deliberation Record`
- `Deliberation Records`
- `Record Repository`
- `User Reference`
- `Local Anonymous User`
- `Meeting Rule Type`
- `robert_rules`
- `Meeting Replay`
- `Speaker Order`
- `New Meeting`
- `History`

Topic Panel 新增 UI 文案必须覆盖 `zh-CN`、`zh-TW`、`en`、`ja`、`ko`。
