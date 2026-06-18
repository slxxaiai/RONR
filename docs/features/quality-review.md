# Quality Review

## One-Line Definition

在最终输出前检查议事结果是否包含风险、分歧、表决、证据链和下一步行动。

## Status

草稿

## Priority

中

## Problem

多 Agent 议事可能表面完成但缺少关键质量要素，例如没有反对意见、没有风险、没有表决或行动项无法追溯。Quality Review 用于阻止低质量输出直接成为最终 Action Plan。

## Users

- 个人决策用户
- Secretary Agent
- Chair Agent

## Goals

- 检查最终输出是否满足 RONR 的最低质量标准。
- 暴露缺失的风险、分歧、表决或证据链。
- 让用户知道行动清单是否足够可信。

## Non-Goals

- 自动判断决策一定正确。
- 模型排行榜。
- 复杂评分体系或审计报表。

## User Flow

1. Secretary Agent 准备生成 Action Plan。
2. RONR 执行 Quality Review。
3. 如果质量要素缺失，Chair Agent 决定补充讨论或标记限制。
4. 如果检查通过，Action Plan 进入最终展示。

## Requirements

- 检查是否存在至少一个 Objection 或风险说明。
- 检查是否存在 Vote 记录。
- 检查 Action Item 是否具备来源引用。
- 检查是否包含下一步最小行动。
- 检查 Reservation 是否和 Vote.position 分离。

## Development Mode

`TDD-first`

Quality Review 是最终输出前的规则校验，应先写缺失风险、缺失 Vote、缺失来源和 Reservation 误用的失败用例。

## Acceptance Criteria

- 缺少 Vote 记录时，Quality Review 不允许直接完成最终输出。
- 缺少来源引用的 Action Item 被标记为不合格。
- 通过检查的 Action Plan 包含风险、分歧、证据链和下一步行动。

## Verification Plan

- 自动化测试：覆盖缺少风险、缺少 Vote、缺少来源、缺少下一步最小行动和完整通过场景。
- fixture 验证：准备通过和不通过的 Action Plan fixture。
- 人工检查：确认错误提示能指导 Chair 重开讨论或 Secretary 标记限制。
- 不需要测试的理由：不适用，该 feature 是质量门禁。

## Technical Notes

该 feature 是 P1 增强能力；P0 的 Action Plan Trace 已定义最低证据链要求。

## Rollout

先做最低质量检查，再扩展为议事质量评估体系。
