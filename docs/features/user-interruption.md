# User Interruption

## One-Line Definition

允许用户在议事过程中暂停、补充约束、追问、要求重开阶段或放弃本次议事。

## Status

草稿

## Priority

中

## Problem

RONR 不能是黑箱自动结论。用户需要在议事过程中随时接管，把新约束、追问或方向调整纳入后续 Agent 讨论和最终行动清单。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent
- Member Agent

## Goals

- 支持用户在任意活动阶段插话。
- 让 Chair Agent 判断插话类型和影响范围。
- 让 Secretary Agent 记录插话对行动项的影响。
- 支持用户主动结束当前 session，并将状态标记为 `cancelled`。

## Non-Goals

- 多用户实时协作。
- 任意外部工具调用。
- 自动执行用户插话中的任务。

## User Flow

1. 用户在议事进行中输入插话。
2. RONR 将插话记录为 User Interruption。
3. Chair Agent 判断插话是暂停、补充约束、追问还是重开阶段。
4. 会话按判断结果继续、暂停或回到指定阶段。
5. 最终 Action Plan 标记受插话影响的行动项。
6. 如果用户选择放弃本次议事，session 进入 `cancelled`，系统保留已有过程记录但不生成最终 Action Plan。

## Requirements

- 支持 `pause`、`resume`、`add_constraint`、`ask_followup`、`reopen_phase`、`cancel_session`。
- 不新增 `redirect` 插话类型；用户要求改变讨论方向时，轻量调整归入 `add_constraint`，需要推翻前序上下文或重新讨论时归入 `reopen_phase`。
- 用户插话必须进入 Deliberation Trace。
- 重开阶段不得删除历史记录。
- 后续 Agent 输出必须使用插话后的新上下文。
- 用户放弃本次议事时，`Session Status` 必须进入 `cancelled`，不得记录为 `failed`。

## Development Mode

`TDD-first`

用户插话会改变状态流、上下文和 trace，应先写暂停、恢复、补充约束、追问和重开阶段的状态测试。

## Acceptance Criteria

- 用户补充约束后，后续 Agent 发言体现新约束。
- 用户暂停后，会话不继续自动推进。
- 用户重开阶段后，历史记录保留且新增记录可追溯。
- 用户放弃本次议事后，会话不继续自动推进，不要求生成 Action Plan，且已有过程记录保留。

## Verification Plan

- 自动化测试：覆盖 pause、resume、add_constraint、ask_followup、reopen_phase、cancel_session 和历史保留。
- fixture 验证：提供插话前后 session snapshot fixture。
- 人工检查：确认最终 Action Plan 标记受插话影响的行动项。
- 不需要测试的理由：不适用，该 feature 影响核心流程恢复。

## Technical Notes

该 feature 是 P1 增强能力；P0 可先定义接口和展示位置，但不要求完整交互。

## Rollout

先支持补充约束和暂停恢复，再支持追问和重开阶段。
