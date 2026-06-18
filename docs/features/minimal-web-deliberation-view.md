# Minimal Web Deliberation View

## One-Line Definition

定义最小 Web 议事视图需要展示的阶段、Agent 发言、分歧、表决和行动清单。

## Status

草稿

## Priority

高

## Problem

用户需要看见 AI Agent 议事过程，而不只是等待最终总结。最小 Web 视图必须让用户理解当前阶段、谁在发言、分歧在哪里、结论如何形成。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent
- Member Agent

## Goals

- 展示当前议事阶段和进度。
- 展示 Agent 发言、Objection、Vote 和 Action Plan。
- 让用户能理解最终建议的来源。

## Non-Goals

- 复杂可视化图谱。
- 多会话仪表盘。
- 响应式移动端完整体验。

## User Flow

1. 用户创建 Deliberation Session。
2. Web 展示当前阶段和 Agent 列表。
3. Agent 输出按阶段追加到议事流。
4. 表决阶段展示 Vote.position 分布。
5. 行动决议阶段展示 Action Plan 和 trace。

## Requirements

- 视图必须区分阶段、Agent、发言类型和最终行动项。
- Vote.position 必须显示为支持、反对、弃权、有条件支持。
- Reservation 必须独立展示为保留意见。
- Action Item 必须能展示来源引用摘要。

## Development Mode

`Preview-first`

该 feature 主要定义最小 Web 信息架构，应先通过预览确认阶段、发言、表决和 trace 展示是否可读，再补关键路径测试。

## Acceptance Criteria

- 用户能从 Web 视图识别当前阶段。
- 用户能看到至少 Chair、Secretary、Member 的输出。
- 用户能看到最终 Action Plan 及其来源证据摘要。

## Verification Plan

- 自动化测试：覆盖关键渲染路径，例如阶段标题、Agent 输出、Vote.position 和 Action Plan 来源摘要。
- fixture 验证：使用一组完整 session snapshot fixture 渲染页面。
- 人工检查：检查用户是否能一屏理解当前阶段、分歧和下一步行动。
- 不需要测试的理由：视觉微调可人工检查；流程展示必须有 fixture 或组件测试。

## Technical Notes

该 feature 定义最小 UI 信息架构，不规定具体视觉风格和组件库细节。

## Rollout

先支持单会话页面；后续再扩展历史记录、筛选和图谱化证据链。
