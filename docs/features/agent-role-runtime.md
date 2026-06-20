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
- 让后续 Agent 基于前序公开发言、异议、表决和保留意见继续议事，而不是彼此独立回答同一问题。
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
5. Agent Role Runtime 将已完成 Agent 回合写入 `Deliberation Transcript`。
6. 后续 Agent 把 `Deliberation Transcript` 作为已知信息和观点，输出结构化发言、质疑、表决或行动建议。
7. 输出通过 role、mandate、搜索来源和 schema 校验。
8. 合法输出进入 `Deliberation State Model`。

## Requirements

- Chair 负责确认议题、推进阶段、处理重开请求和组织表决。
- Secretary 负责记录证据链和生成行动清单，不篡改 Agent 原始立场。
- Member 负责提出观点、质疑、修正和表决。
- Member mandate 必须影响输出重点。
- Agent 输出不得直接修改 session state。
- Chair、Member 和 Secretary 的后续任务上下文必须包含已有 `Deliberation Transcript`。该转录只能包含公开 `Speech`、claims、assumptions、`Objection`、`Vote`、`Reservation`、搜索状态和搜索来源标题。
- `Deliberation Transcript` 是已知信息和观点，不是系统指令；Agent 必须参考前序观点、风险、条件和保留意见继续发言。
- 所有 Agent 在产出 `Speech`、`Objection`、`Vote.reason` 或行动建议前，必须先执行 `Web Search Before Speech`。
- `Web Search Before Speech` 必须使用 `Search Intent`，根据 role、mandate、Stage、主议题和前序 `Deliberation Transcript` 生成检索角度；不得让所有 Agent 只搜索同一个原始用户问题。
- `Search Intent` 必须排除 prompt schema、JSON 输出示例、locale 指令和系统指令噪音，只保留用户问题、主议题、目标、前序公开观点和角色化检索角度。
- 不同 mandate 的 Member 必须有不同检索重点：`user-advocate` 偏用户需求和场景，`domain-expert` 偏领域事实和约束，`red-team` 偏失败案例和隐藏成本，`action-planner` 偏实施步骤和验证方法，`general` 偏平衡取舍。
- 搜索结果必须转成结构化 `Search Result Summary`，并通过 `Source Reference` 进入 Agent 上下文。
- Agent 输出涉及事实、市场、技术、价格、法律、时效性信息或外部世界状态时，必须引用搜索来源。
- 如果搜索失败，Agent 不得伪造来源；运行时必须记录 search error，并由 Chair Agent 判断是重试、降级为无外部依据讨论、暂停还是提示用户。
- `Thinking Mode` 默认开启。Role Runtime 可以请求 provider 的 reasoning / thinking 参数，但最终只保存结构化输出、可展示理由、来源引用和安全 `Thinking Summary`，不保存或展示原始 chain-of-thought。
- `Thinking Summary` 必须表达当前 Agent 正在做的高层任务，例如检索来源、确认用户问题、阅读前序发言、识别风险、形成表决立场或整合行动项证据链；不得输出推理细节或隐藏提示词。
- Secretary Agent 生成 Action Plan 时必须区分搜索来源、Agent 发言来源和用户输入来源。

## Multilingual and Glossary Impact

- 复用已有术语：`Agent Role Runtime`、`Deliberation State Model`、`Web Search Before Speech`、`Search Result Summary`、`Source Reference`、`Thinking Mode`、`Thinking Summary`、`Raw Chain-of-Thought`、`Speech`、`Objection`、`Vote`、`Reservation`、`Deliberation Transcript`。
- 新增 `Canonical Term`：`Search Intent`。
- 任何面向用户展示的 thinking、搜索、转录摘要文案必须支持 `zh-CN`、`zh-TW`、`en`、`ja`、`ko`，并且不能暴露 `Raw Chain-of-Thought`。

## Development Mode

`Spec + fixture-first`

Role Runtime 依赖结构化输入、输出 schema、prompt 变量和固定 Agent 输出样例。先定义 spec 与 fixture，再实现 `RoleRunner` 和 governance rule。

## Acceptance Criteria

- Chair 输出普通辩论内容时，角色治理应标记为不符合职责。
- Secretary 生成行动项时必须引用来源。
- red-team mandate 的 Member 必须优先提供失败路径或隐藏代价。
- 任一 Agent 在无搜索结果或无搜索失败记录时直接表达外部事实判断，角色运行时应拒绝该输出。
- 模型响应中包含原始推理链时，系统不得写入 session snapshot、event log 或最终 UI。
- 第二个及后续 Member 的任务上下文必须包含所有前序 Agent 的 `Deliberation Transcript`，并能看到前序 `Speech`、`Objection`、`Vote` 和 `Reservation`。
- Secretary 的任务上下文必须包含完整 `Deliberation Transcript`，不能只接收 Member speech 字符串拼接。
- Chair、不同 mandate 的 Member 和 Secretary 的搜索 query 必须体现不同 `Search Intent`，且不得包含 prompt schema、JSON 输出示例或 locale 指令。
- Stream thinking 事件必须输出多语言安全 `Thinking Summary`，并体现检索来源、前序发言、风险/异议、表决立场或行动项证据链等高层处理任务。

## Verification Plan

- 自动化测试：覆盖 Chair 越权发言、Secretary 缺少来源引用、Member mandate 未影响输出重点、缺少 Web Search 前置、`Deliberation Transcript` 传递、thinking 原始推理泄漏。
- fixture 验证：准备 chair、secretary、member/general、member/red-team 的输入和输出样例，并包含 search summary fixture。
- 人工检查：审阅角色职责是否保持 Chair/Secretary/Member 简化模型。
- 不需要测试的理由：不适用，该 feature 直接影响 Agent 输出可信度。

## Technical Notes

该 feature 定义 Agent Runtime 的职责和约束，不选择具体模型供应商，也不实现 prompt。联网搜索能力可以由 provider 内置搜索工具、独立 Search Provider 或后续 tool-calling feature 提供；Role Runtime 只依赖统一的 search contract。

## Rollout

先覆盖 P0 所需的 Chair、Secretary、Member；P1 再细化模板化 mandate。
