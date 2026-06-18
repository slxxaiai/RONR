# Agent Role Runtime

## One-Line Definition

定义 Chair、Secretary 和 Member 在各议事阶段的职责、输入、输出和禁止行为。

## Status

草稿

## Priority

高

## Problem

同一个模型可以承担不同 Agent，但 RONR 必须通过 role 和 mandate 约束它们的行为，避免多个 Agent 输出同质化或越权修改会话状态。

## Users

- Chair Agent
- Secretary Agent
- Member Agent
- 个人决策用户

## Goals

- 明确基础角色的职责边界。
- 让 Member mandate 影响发言视角。
- 确保 Agent 输出能被 core state 接收和追溯。

## Non-Goals

- 具体 prompt 文案优化。
- Agent 记忆系统。
- 多模型效果评测。

## User Flow

1. Orchestrator 根据当前阶段选择目标 Agent。
2. Agent Role Runtime 为目标 Agent 构造任务上下文。
3. Agent 输出结构化发言、质疑、表决或行动建议。
4. 输出通过 role 和 mandate 校验。
5. 合法输出进入 `Deliberation State Model`。

## Requirements

- Chair 负责确认议题、推进阶段、处理重开请求和组织表决。
- Secretary 负责记录证据链和生成行动清单，不篡改 Agent 原始立场。
- Member 负责提出观点、质疑、修正和表决。
- Member mandate 必须影响输出重点。
- Agent 输出不得直接修改 session state。

## Development Mode

`Spec + fixture-first`

Role Runtime 依赖结构化输入、输出 schema、prompt 变量和固定 Agent 输出样例。先定义 spec 与 fixture，再实现 `RoleRunner` 和 governance rule。

## Acceptance Criteria

- Chair 输出普通辩论内容时，角色治理应标记为不符合职责。
- Secretary 生成行动项时必须引用来源。
- red-team mandate 的 Member 必须优先提供失败路径或隐藏代价。

## Verification Plan

- 自动化测试：覆盖 Chair 越权发言、Secretary 缺少来源引用、Member mandate 未影响输出重点。
- fixture 验证：准备 chair、secretary、member/general、member/red-team 的输入和输出样例。
- 人工检查：审阅角色职责是否保持 Chair/Secretary/Member 简化模型。
- 不需要测试的理由：不适用，该 feature 直接影响 Agent 输出可信度。

## Technical Notes

该 feature 定义 Agent Runtime 的职责和约束，不选择具体模型供应商，也不实现 prompt。

## Rollout

先覆盖 P0 所需的 Chair、Secretary、Member；P1 再细化模板化 mandate。
