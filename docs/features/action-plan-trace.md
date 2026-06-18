# Action Plan Trace

## One-Line Definition

定义最终 Action Plan 如何追溯到 Speech、Objection、Vote、Reservation、搜索来源和用户插话。

## Status

进行中

## Priority

高

## Problem

RONR 的核心价值是让行动建议可追溯。如果行动项只是一段总结，用户仍然无法判断建议来自哪些 Agent、哪些风险和哪些表决。

## Users

- 个人决策用户
- Secretary Agent
- Member Agent

## Goals

- 让每个 Action Item 都有证据来源。
- 展示支持、反对、弃权和有条件支持情况。
- 单独记录 Reservation 保留意见。
- 展示 Agent 观点背后的搜索来源摘要。

## Non-Goals

- 自动执行 Action Item。
- 复杂审计报表。
- 长期效果追踪。

## User Flow

1. Secretary Agent 收集议事过程记录。
2. Secretary Agent 生成 Action Plan。
3. 每个 Action Item 引用相关 Speech、Objection、Vote 和搜索来源。
4. Web 展示行动内容、理由、风险、验证步骤和来源。
5. 用户可以从行动项回看关键证据。

## Requirements

- Action Item 必须包含行动内容、理由、风险、验证步骤和来源引用。
- Action Item 必须展示 `support`、`oppose`、`abstain`、`qualified_support` 表决情况。
- Reservation 必须作为附加保留意见展示。
- Action Item 的外部事实依据必须能追溯到 `Search Result Summary` 或对应 `Source Reference`。
- Action Plan 不得展示或保存模型原始 chain-of-thought。
- 缺少证据链的 Action Item 不得进入最终输出。

## Development Mode

`TDD-first`

该 feature 影响 `packages/core` 的 Action Plan 和 Deliberation Trace 校验，必须先写缺失引用、未知 Vote.position 和 Reservation 误用等失败用例。

## Acceptance Criteria

- 给定完整议事记录时，每个 Action Item 都能追溯到至少一个 Speech 和一个 Vote。
- 存在 Objection 时，相关风险必须进入 Action Item 或最终摘要。
- 存在 Reservation 时，Action Plan 单独展示保留意见，而不是把它当作 Vote.position。
- 存在搜索来源时，Action Plan 能展示来源摘要而非完整网页内容。

## Verification Plan

- 自动化测试：覆盖完整 trace、缺少 Speech、缺少 Vote、缺少搜索来源、Reservation 被误放入 Vote.position、原始推理链泄漏。
- fixture 验证：准备一组完整议事记录、一组包含搜索来源记录和一组缺失证据链记录。
- 人工检查：核对 Action Plan 展示字段是否和 PRD Final Output 一致。
- 不需要测试的理由：不适用，该 feature 属于核心可信度能力。

## Technical Notes

该 feature 与 `Deliberation State Model` 共用核心对象，但关注最终输出和用户可读追溯。

## Rollout

先覆盖 P0 最小行动清单；后续再扩展审计视图和历史复盘。
