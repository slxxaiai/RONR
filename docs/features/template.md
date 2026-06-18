# Feature Name

## One-Line Definition

用一句话描述这个功能。

## Status

草稿

## Priority

低 / 中 / 高

## Problem

这个功能解决什么用户问题或流程问题？

## Users

谁会使用这个功能？优先描述个人决策用户，以及 RONR 内部的 Chair Agent、Secretary Agent、Member Agent 或特定 Member mandate。

## Goals

- 目标 1
- 目标 2

## Non-Goals

- 范围外事项 1

## User Flow

1. 用户提出一个个人决策问题或补充约束。
2. RONR 创建或推进一个 AI Agent 议事会话。
3. Chair Agent 分配下一步议事任务。
4. Secretary Agent 记录证据链。
5. Member Agent 按 mandate 发言、质疑、修正或表决。
6. RONR 返回下一步议事状态、结构化结果或带证据链的行动清单。

## Requirements

- 需求 1
- 需求 2

## Multilingual and Glossary Impact

- 是否引入新的 `Canonical Term`：
- 是否复用 `docs/glossary.md` 中已有术语：
- 是否新增或修改 UI 文案、API 字段、协议字段、枚举、角色、阶段或输出字段：
- 如有新增名词，必须同步更新 `docs/glossary.md` 的多语言对照。

## Development Mode

选择一种主要开发范式，并简述原因：

- `TDD-first`
- `Regression-first`
- `Contract-first + test`
- `Spec + fixture-first`
- `Review + fixture eval-first`
- `Mock + contract-first`
- `Preview-first`
- `Review-first`
- `Benchmark-first`
- `Threat-model + test-first`

推荐值：`TDD-first`

## Acceptance Criteria

- 给定有效输入时，功能返回预期结果。
- 给定无效或不支持的输入时，功能返回清晰错误。

## Verification Plan

- 自动化测试：
- fixture 验证：
- 人工检查：
- 不需要测试的理由：

## Technical Notes

在这里记录模块边界、数据模型说明和依赖关系。

## Rollout

描述这个功能应该如何引入和验证。
