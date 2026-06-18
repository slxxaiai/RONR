# Agent Configuration

## One-Line Definition

允许用户选择或配置 Chair、Secretary、至少两个 Member、每个 Member 的 mandate，以及可选的最大讨论轮次。

## Status

进行中

## Priority

高

## Problem

RONR 的核心是多 AI Agent 议事。最小 Web 闭环需要明确哪些 Agent 参与、它们使用什么模型、承担什么基础角色和 mandate。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent
- Member Agent

## Goals

- 支持最小有效 Agent 配置。
- 保证 Chair、Secretary 和 Member 的职责边界清晰。
- 支持不同 Member 使用不同 mandate。
- 支持用户为 Deliberation 阶段设置可选的最大讨论轮次。

## Non-Goals

- Agent 市场或复杂角色库。
- 团队共享配置。
- 自动评测不同 Agent 配置优劣。

## User Flow

1. 用户创建或编辑一个议事会话。
2. 用户选择 Chair、Secretary 和至少两个 Member。
3. 用户为 Member 选择 `general`、`user-advocate`、`domain-expert`、`action-planner` 或 `red-team` mandate。
4. 用户可选择设置 `Max Deliberation Rounds`；如果未设置，则由 AI 自动执行 `Convergence Check`。
5. RONR 校验配置是否满足最小议事要求。
6. 校验通过后，议事流程可以启动。

## Requirements

- Chair 必选且不可重复。
- Secretary 必选且不可重复。
- Member 至少 2 个且可重复。
- 每个 Agent 必须绑定模型配置、role 和 mandate。
- Member mandate 必须使用 glossary 中已有 canonical term。
- `Max Deliberation Rounds` 是可选配置；用户未设置时，系统不得使用空值作为无限讨论许可。
- 用户设置 `Max Deliberation Rounds` 时，该值必须为正整数。

## Development Mode

`Contract-first + test`

Agent 配置是 Web、Role Runtime 和 core session 的共享契约，应先固定配置 schema、role 枚举、mandate 枚举和校验错误，再实现表单或运行时逻辑。

## Acceptance Criteria

- 给定 Chair、Secretary 和两个 Member 时，配置通过校验。
- 缺少 Chair、Secretary 或 Member 数量不足时，返回清晰错误。
- 使用未知 mandate 时，返回清晰错误。
- 给定有效 `Max Deliberation Rounds` 时，配置通过校验。
- 未设置 `Max Deliberation Rounds` 时，系统使用 AI 自动收敛判断。

## Verification Plan

- 自动化测试：覆盖有效配置、重复 Chair、缺少 Secretary、Member 数量不足、未知 mandate、有效最大讨论轮次、未设置最大讨论轮次。
- fixture 验证：提供默认个人决策配置和多组无效配置。
- 人工检查：确认角色文案和 glossary canonical term 一致。
- 不需要测试的理由：不适用，该 feature 是启动议事会话的前置条件。

## Technical Notes

Agent 配置描述议事参与者和少量 session-level 控制项。模型供应商连接由 `Model Provider Connection` 定义；角色执行由 `Agent Role Runtime` 定义；讨论轮次的实际收敛判断由 `RONR Protocol Flow` 和 `Deliberation State Model` 定义。

## Rollout

先提供一个最小默认配置，再允许用户调整模型和 Member mandate。
