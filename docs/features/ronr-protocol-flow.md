# RONR Protocol Flow

## One-Line Definition

定义最小 Web 闭环需要执行的轻量 RONR 议事阶段。

## Status

进行中

## Priority

高

## Problem

多个 AI Agent 如果只轮流回答，仍然会变成无序聊天。RONR 需要用固定议事阶段约束 Agent 的发言、质疑、修正、表决和行动决议。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent
- Member Agent

## Goals

- 固定 P0 最小议事阶段。
- 明确每个阶段的目标和产物。
- 保证最终输出自然来自前序议事过程。

## Non-Goals

- 完整复刻 Robert's Rules of Order。
- 复杂程序动议和多层修正案。
- 多人类协作议事产品。

## User Flow

1. Chair Agent 执行 `Call to Order`，确认用户问题、目标和约束。
2. Chair Agent 形成 `Main Motion`。
3. Member Agent 进行 `Opening Statements`。
4. Member Agent 提出 `Objections and Risks`。
5. Chair Agent 组织 `Amendment`，修正候选方案。
6. Member Agent 进行 `Deliberation`。
7. Agent 进入 `Vote or Consensus`。
8. Secretary Agent 生成 `Action Resolution`。

## Requirements

- P0 阶段必须按固定顺序推进。
- 每个阶段必须记录输入、输出和来源 Agent。
- 进入下一阶段前必须满足最低产物要求。
- Deliberation 阶段必须支持用户设置的 `Max Deliberation Rounds`。
- 用户未设置最大讨论轮次时，Chair Agent 必须在每轮后执行 `Convergence Check`，判断是否进入 `Vote or Consensus`。
- 达到用户设置的最大讨论轮次时，系统必须停止继续追加 Deliberation 轮次，并将 `Convergence Status` 标记为 `round_limit_reached`。
- `Vote.position` 必须使用 `support`、`oppose`、`abstain`、`qualified_support`。

### Deliberation Exit Conditions

`Deliberation` 阶段可以在以下任一条件满足时退出：

- `Convergence Check` 判断已经收敛，`Convergence Status` 为 `converged`。
- 用户设置了 `Max Deliberation Rounds`，且 `Deliberation Round Count` 已达到该上限，`Convergence Status` 为 `round_limit_reached`。
- 用户插话要求暂停、重开阶段或放弃本次议事。

`Convergence Check` 至少包含：

- 不存在 `blocking + open` 的 Objection。
- 当前 Motion 已有可表决版本。
- 最近一轮没有新增实质信息，例如新的风险、反例、约束冲突、替代方案或关键假设。
- `qualified_support` 的条件已经记录为 `conditions` 或验证步骤。

达到轮次上限不代表实质收敛。最终 Action Plan 或 trace 必须保留 `round_limit_reached`，让用户知道讨论是因上限停止。

## Development Mode

`TDD-first`

该 feature 是核心议事状态机，必须先写阶段转换、前置条件和无效转换测试，再实现流程推进。

## Acceptance Criteria

- 给定有效会话和 Agent 配置时，流程能从 `Call to Order` 推进到 `Action Resolution`。
- 缺少主议题时，系统不能进入初始陈述。
- 缺少表决记录时，系统不能生成最终行动清单。
- 给定用户设置最大讨论轮次时，Deliberation 不得超过该轮次。
- 给定用户未设置最大讨论轮次时，系统必须记录 AI 自动收敛判断。

## Verification Plan

- 自动化测试：覆盖完整阶段路径、缺少主议题、缺少表决、非法跳阶段、最大讨论轮次、自动收敛判断。
- fixture 验证：提供一个最小有效会话流程 fixture。
- 人工检查：核对阶段命名与 PRD、Architecture、Glossary 一致。
- 不需要测试的理由：不适用，该 feature 属于核心流程。

## Technical Notes

该 feature 定义议事协议和阶段边界，不定义 UI 布局，也不直接定义模型供应商调用。

## Rollout

先将 P0 阶段作为唯一可运行流程；后续再增加用户插话和模板化流程变体。
