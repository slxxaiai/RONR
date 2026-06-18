# Deliberation Session Lifecycle

## One-Line Definition

引导 RONR 从用户决策问题启动一场多 AI Agent 议事会话，并收敛为带证据链的行动清单。

## Status

草稿

## Priority

中

## Problem

用户需要的不只是多个模型各自回答，而是一场受控的 AI Agent 议事过程：不同 Agent 能提出观点、质疑、修正、表决，并让最终行动项可追溯。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent
- Member Agent

## Goals

- 表达 AI Agent 议事会话的主要阶段。
- 说明每个阶段需要哪些 Agent 输出。
- 保证最终行动清单能追溯到发言、反对意见、风险和表决。

## Non-Goals

- 辅助人类会议主持。
- 多人类协作会议产品。
- 完整复刻 Robert's Rules of Order 的所有程序。
- 自动执行行动清单中的真实外部任务。

## User Flow

1. 用户提出一个个人决策问题。
2. RONR 创建 Deliberation Session，并配置 Chair、Secretary 和至少两个 Member。
3. Chair Agent 将用户问题确认成主议题。
4. Member Agent 按 mandate 发言、质疑、提出修正或表决。
5. Secretary Agent 记录发言、分歧、风险、表决和用户插话。
6. RONR 生成带证据链的行动清单。

## Requirements

- 跟踪 Deliberation Session 当前阶段。
- 跟踪 Chair、Secretary、Member 的基础角色和 Member mandate。
- 记录 Speech、Objection、Vote 和 User Interruption。
- 生成 Action Plan 时保留 Deliberation Trace 引用。

## Development Mode

`TDD-first`

该功能影响 `packages/core` 的议事状态机、角色治理和证据链校验，必须先写核心单元测试，再实现状态转换和校验逻辑。

## Acceptance Criteria

- 给定一个有效用户问题和至少两个 Member Agent 时，系统能推进到主议题确认阶段。
- 给定缺少必选 Chair、Secretary 或 Member 数量不足的配置时，系统返回清晰校验错误。
- 给定最终行动项缺少来源发言、反对意见或表决引用时，系统返回证据链校验错误。

## Verification Plan

- 自动化测试：覆盖有效会话启动、缺少必选角色、Member 数量不足、证据链缺失校验。
- fixture 验证：提供一组有效会话输入和一组无效角色配置输入。
- 人工检查：检查最终行动清单是否能追溯到 Speech、Objection 和 Vote。
- 不需要测试的理由：不适用，该功能属于核心模块。

## Technical Notes

核心状态转换逻辑属于 `packages/core/`。Agent prompt、模型调用和输出 schema 应放在 `packages/agents/` 或 `packages/providers/`，不能直接修改核心会话状态。

## Rollout

先实现确定性的会话状态机和 fixture 测试，再接入模拟 Agent Runtime，最后接入真实 Model Provider。
