# End-to-End Acceptance Tests

本文档用于记录 RONR 核心功能的 end-to-end 验收 case。当前文件是人工验收与后续自动化 E2E 的共同基线；在引入 Playwright 或其他 E2E 工具前，先用本文件沉淀关键用户路径、验收输入和预期结果。

## Scope

覆盖从用户提出个人决策问题，到 RONR 创建 AI Agent 议事会话、推进议事流程、展示 Agent 输出、处理用户插话，并产出带证据链行动清单的完整路径。

首版重点覆盖：

- Web Session Entry
- Agent Configuration
- RONR Protocol Flow
- Deliberation State Model
- Session Event Log
- Agent Role Runtime
- Prompt Template Configuration
- Model Provider Connection
- Action Plan Trace
- Minimal Web Deliberation View
- User Interruption

## Out of Scope

- 性能压测。
- 多用户协同。
- 真实计费校验。
- 移动 App、桌面 App 和 CLI 验收。
- 供应商模型质量横向评测。

## Test Environment

| Field | Value |
| --- | --- |
| Date |  |
| Commit |  |
| Branch |  |
| Runtime | Web |
| Browser |  |
| Model Provider | Mock / PPIO / Other |
| Provider Profile |  |
| Test Data |  |
| Tester |  |

## Case Format

每个 case 使用以下格式补充：

```md
### E2E-000 Case Title

**Feature**

关联 feature 文档，例如 `web-session-entry.md`。

**Priority**

P0 / P1 / P2

**Preconditions**

- 前置条件 1

**Input**

用户输入、角色配置、模型配置或附件。

**Steps**

1. 操作步骤 1
2. 操作步骤 2

**Expected Result**

- 预期结果 1
- 预期结果 2

**Evidence**

- 截图、日志、event id、session id 或测试输出。

**Status**

Not Run / Pass / Fail / Blocked

**Notes**

补充风险、异常、后续自动化建议。
```

## Core Acceptance Matrix

| Area | Acceptance Focus | Status | Notes |
| --- | --- | --- | --- |
| Session Creation | 用户能从 Web 创建个人决策议事会话 | Not Run |  |
| Agent Configuration | Chair、Secretary、Member 和 Member mandate 配置正确 | Not Run |  |
| Protocol Flow | 会话按 RONR 轻量流程推进 | Not Run |  |
| State Model | 阶段、motion、speech、objection、vote、action item 状态一致 | Not Run |  |
| Event Log | 用户输入、Agent 输出、阶段推进和错误都被记录为 append-only event | Not Run |  |
| Agent Role Runtime | Chair、Secretary、Member 输出符合 role 和 mandate 边界 | Not Run |  |
| Prompt Template | Prompt template 从配置资源加载，不硬编码在代码中 | Not Run |  |
| Model Provider | Mock 或真实 provider 能返回结构化 Agent 输出 | Not Run |  |
| Model Switching | 用户能在 Web 端切换不同模型后完成完整讨论 | Not Run |  |
| Role Editing | 用户能在 Web 端编辑角色后完成完整讨论 | Not Run |  |
| Error Recovery | Provider 错误、schema 解析失败或超时不会破坏当前 session state | Not Run |  |
| User Interruption | 用户插话能影响后续议事，并保留历史证据链 | Not Run |  |
| Action Plan Trace | 每个行动项能追溯到发言、反对意见、表决或插话 | Not Run |  |
| Minimal Web View | Web 能展示阶段、Agent 输出、表决和行动清单 | Not Run |  |

## Acceptance Cases

### E2E-001 Create Session And Reach Action Plan

**Feature**

`web-session-entry.md`、`ronr-protocol-flow.md`、`action-plan-trace.md`

**Priority**

P0

**Preconditions**

- Web runtime 可启动。
- 至少存在 Chair、Secretary 和两个 Member。
- Model Provider 可使用 mock 或有效 provider profile。

**Input**

待补充。

**Steps**

1. 待补充。

**Expected Result**

- 待补充。

**Evidence**

- 待补充。

**Status**

Not Run

**Notes**

作为最小端到端验收主路径。

### E2E-002 User Interruption Updates Later Deliberation

**Feature**

`user-interruption.md`、`session-event-log.md`、`action-plan-trace.md`

**Priority**

P0

**Preconditions**

- 已创建一场进行中的议事会话。

**Input**

待补充。

**Steps**

1. 待补充。

**Expected Result**

- 待补充。

**Evidence**

- 待补充。

**Status**

Not Run

**Notes**

重点验证插话后的历史保留、阶段影响和行动项追溯。

### E2E-003 Provider Error Does Not Corrupt Session

**Feature**

`model-provider-connection.md`、`session-event-log.md`

**Priority**

P0

**Preconditions**

- 可切换到会返回错误的 mock provider，或使用无效 provider profile。

**Input**

待补充。

**Steps**

1. 待补充。

**Expected Result**

- 待补充。

**Evidence**

- 待补充。

**Status**

Not Run

**Notes**

重点验证错误标准化、用户可见错误和 session state 保留。

### E2E-004 Complete Deliberation After Switching Model

**Feature**

`model-provider-connection.md`、`agent-configuration.md`、`minimal-web-deliberation-view.md`

**Priority**

P0

**Preconditions**

- Web runtime 可启动。
- 至少存在两个可选模型配置。
- 至少存在 Chair、Secretary 和两个 Member。
- Model Provider 可使用 mock 或有效 provider profile。

**Input**

待补充。

**Steps**

1. 在 Web 端创建或进入一场议事会话。
2. 在模型配置入口切换到另一个模型。
3. 提交一个个人决策问题并启动讨论。
4. 等待 RONR 完成完整议事流程。

**Expected Result**

- 讨论使用切换后的模型配置运行。
- Chair、Secretary 和 Member 均能产生符合角色边界的输出。
- 会话能完成从议题确认到行动清单的完整流程。
- 最终行动清单带有可追溯证据链。

**Evidence**

- 待补充。

**Status**

Not Run

**Notes**

重点验证 Web 端模型切换不会破坏完整讨论链路。

### E2E-005 Complete Deliberation After Editing Roles

**Feature**

`agent-configuration.md`、`agent-role-runtime.md`、`minimal-web-deliberation-view.md`

**Priority**

P0

**Preconditions**

- Web runtime 可启动。
- 角色编辑入口可用。
- Model Provider 可使用 mock 或有效 provider profile。

**Input**

待补充。

**Steps**

1. 在 Web 端创建或进入一场议事会话。
2. 编辑 Chair、Secretary 或 Member 配置。
3. 确认至少保留一个 Chair、一个 Secretary 和两个 Member。
4. 提交一个个人决策问题并启动讨论。
5. 等待 RONR 完成完整议事流程。

**Expected Result**

- 讨论使用编辑后的角色配置运行。
- Member mandate 能影响对应 Agent 输出重点。
- 会话能完成从议题确认到行动清单的完整流程。
- 最终行动清单带有可追溯证据链。

**Evidence**

- 待补充。

**Status**

Not Run

**Notes**

重点验证 Web 端角色编辑会真实影响后续完整讨论，而不是只改变展示文案。

## Execution Log

| Date | Case ID | Environment | Status | Evidence | Tester | Notes |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |
