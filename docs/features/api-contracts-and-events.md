# API Contracts and Events

## One-Line Definition

定义 Web、Orchestrator、Core 和 Agent Runtime 之间共享的 API request / response、session event 和错误契约。

## Status

进行中

## Priority

高

## Problem

RONR 的 Web 入口、Role Runtime、Provider Adapter 和 Core Domain 需要通过稳定契约协作。如果没有统一 contracts，UI、API 和核心状态容易各自解释字段，导致阶段、错误和 trace 不一致。

## Users

- 个人决策用户
- 后续实现者
- Web UI
- Orchestrator

## Goals

- 固定 P0 共享 request / response schema。
- 固定 session event 类型和错误结构。
- 让 Web 只消费 contract，不直接推断核心状态。
- 让 contracts 可被 `apps/web`、`packages/agents`、`packages/providers` 和 `packages/core` 复用。

## Non-Goals

- 公开第三方 API。
- 多租户权限契约。
- 复杂实时流协议。

## User Flow

1. Web 提交创建会话请求。
2. API 返回 session id、当前阶段和下一步任务。
3. Orchestrator 追加 session event。
4. Web 根据 snapshot 和 event 展示阶段、Agent 输出和错误。

## Requirements

- 创建会话请求必须包含用户问题和可选 Agent 配置。
- 会话响应必须包含 session id、phase、status 和下一步任务。
- session event 必须区分用户输入、Agent 输出、阶段推进、错误和完成事件。
- 错误必须包含稳定 code、message 和可选 recovery hint。
- Contracts 不得依赖具体 Web 组件或供应商 SDK。

## Development Mode

`Contract-first + test`

该 feature 是跨模块边界，应先定义 schema、错误码和事件枚举，再写契约测试和实现。

## Acceptance Criteria

- Web 创建会话请求能被 contract schema 校验。
- 未知 session event type 被拒绝。
- 错误响应始终包含稳定 code 和用户可读 message。

## Verification Plan

- 自动化测试：覆盖有效 request / response、未知 event type、缺少错误 code、错误 recovery hint。
- fixture 验证：提供 create session、agent output、phase advanced、provider error、session completed 事件 fixture。
- 人工检查：确认字段命名与 PRD、Architecture、Glossary 一致。
- 不需要测试的理由：不适用，contracts 是跨模块边界。

## Technical Notes

契约定义属于 `packages/contracts/`。流式事件 schema 仅在接入实时输出时新增；首版可先用普通 request / response 和 session event 列表。

## Rollout

先定义 P0 创建会话、推进会话、读取 snapshot 和错误响应契约；后续再扩展实时事件和历史记录查询契约。
