# Agent Role Runtime

## One-Line Definition

定义 Chair、Secretary 和 Member 在各议事阶段的职责、输入、输出和禁止行为。

## Status

进行中

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
- 强制 Agent 在表达观点前先执行联网搜索并引用来源。
- 默认启用模型的 thinking / reasoning 能力，但不暴露原始推理过程。

## Non-Goals

- 具体 prompt 文案优化。
- Agent 记忆系统。
- 多模型效果评测。

## User Flow

1. Orchestrator 根据当前阶段选择目标 Agent。
2. Agent Role Runtime 为目标 Agent 构造任务上下文。
3. Agent Role Runtime 执行 `Web Search Before Speech`，并把搜索摘要和来源引用加入上下文。
4. Agent Role Runtime 默认启用 `Thinking Mode` 调用模型。
5. Agent 输出结构化发言、质疑、表决或行动建议。
6. 输出通过 role、mandate、搜索来源和 schema 校验。
7. 合法输出进入 `Deliberation State Model`。

## Requirements

- Chair 负责确认议题、推进阶段、处理重开请求和组织表决。
- Secretary 负责记录证据链和生成行动清单，不篡改 Agent 原始立场。
- Member 负责提出观点、质疑、修正和表决。
- Member mandate 必须影响输出重点。
- Agent 输出不得直接修改 session state。
- 所有 Agent 在产出 `Speech`、`Objection`、`Vote.reason` 或行动建议前，必须先执行 `Web Search Before Speech`。
- 搜索结果必须转成结构化 `Search Result Summary`，并通过 `Source Reference` 进入 Agent 上下文。
- Agent 输出涉及事实、市场、技术、价格、法律、时效性信息或外部世界状态时，必须引用搜索来源。
- 如果搜索失败，Agent 不得伪造来源；运行时必须记录 search error，并由 Chair Agent 判断是重试、降级为无外部依据讨论、暂停还是提示用户。
- `Thinking Mode` 默认开启。Role Runtime 可以请求 provider 的 reasoning / thinking 参数，但最终只保存结构化输出、可展示理由和来源引用，不保存或展示原始 chain-of-thought。
- Secretary Agent 生成 Action Plan 时必须区分搜索来源、Agent 发言来源和用户输入来源。

## Development Mode

`Spec + fixture-first`

Role Runtime 依赖结构化输入、输出 schema、prompt 变量和固定 Agent 输出样例。先定义 spec 与 fixture，再实现 `RoleRunner` 和 governance rule。

## Acceptance Criteria

- Chair 输出普通辩论内容时，角色治理应标记为不符合职责。
- Secretary 生成行动项时必须引用来源。
- red-team mandate 的 Member 必须优先提供失败路径或隐藏代价。
- 任一 Agent 在无搜索结果或无搜索失败记录时直接表达外部事实判断，角色运行时应拒绝该输出。
- 模型响应中包含原始推理链时，系统不得写入 session snapshot、event log 或最终 UI。

## Verification Plan

- 自动化测试：覆盖 Chair 越权发言、Secretary 缺少来源引用、Member mandate 未影响输出重点、缺少 Web Search 前置、thinking 原始推理泄漏。
- fixture 验证：准备 chair、secretary、member/general、member/red-team 的输入和输出样例，并包含 search summary fixture。
- 人工检查：审阅角色职责是否保持 Chair/Secretary/Member 简化模型。
- 不需要测试的理由：不适用，该 feature 直接影响 Agent 输出可信度。

## Technical Notes

该 feature 定义 Agent Runtime 的职责和约束，不选择具体模型供应商，也不实现 prompt。联网搜索能力可以由 provider 内置搜索工具、独立 Search Provider 或后续 tool-calling feature 提供；Role Runtime 只依赖统一的 search contract。

## Rollout

先覆盖 P0 所需的 Chair、Secretary、Member；P1 再细化模板化 mandate。
