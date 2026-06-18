# Session Template

## One-Line Definition

提供默认个人决策议事模板，减少用户手动配置 Agent 的成本。

## Status

草稿

## Priority

中

## Problem

如果每次都要求用户手动配置 Chair、Secretary、Member 和 mandate，最小 Web 闭环的启动成本会过高。Session Template 可以提供可复用的默认议事配置。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent
- Member Agent

## Goals

- 提供一个默认个人决策模板。
- 预置最小有效 Agent 配置。
- 允许用户在模板基础上调整 Member mandate。

## Non-Goals

- 大量领域模板库。
- 模板市场。
- 团队共享模板权限。

## User Flow

1. 用户创建 Deliberation Session。
2. 用户选择默认个人决策模板。
3. 模板填入 Chair、Secretary 和至少两个 Member。
4. 用户可调整 Member mandate。
5. 会话使用模板配置启动。

## Requirements

- 模板必须满足最小 Agent 配置要求。
- 模板必须明确适用的问题类型和不适用范围。
- 模板不能绕过 Agent Configuration 校验。
- 模板使用的 canonical term 必须和 glossary 一致。

## Development Mode

`Spec + fixture-first`

Session Template 主要是可复用配置，应先定义模板 schema、默认模板 fixture 和校验规则，再实现 UI 选择或运行时加载。

## Acceptance Criteria

- 用户选择默认模板后，无需手动添加 Agent 也能启动会话。
- 用户修改模板中的 Member mandate 后，配置仍需重新校验。
- 模板不适用于多人类协作会议产品。

## Verification Plan

- 自动化测试：覆盖默认模板通过配置校验、修改 mandate 后重新校验、模板缺少必选 Agent 失败。
- fixture 验证：提供默认个人决策模板 fixture。
- 人工检查：确认模板说明没有偏离个人决策定位。
- 不需要测试的理由：不适用，模板会影响会话启动。

## Technical Notes

该 feature 是 P1 增强能力。P0 可以先只在文档中定义默认配置。

## Rollout

先提供一个默认个人决策模板；后续再拆分技术选型、产品优先级、职业选择等领域模板。
