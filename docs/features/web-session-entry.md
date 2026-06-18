# Web Session Entry

## One-Line Definition

允许用户通过 Web 输入个人决策问题，并创建一个新的 `Deliberation Session`。

## Status

草稿

## Priority

高

## Problem

RONR 需要一个最小 Web 入口，让个人决策用户能从一个明确问题开始 AI Agent 议事，而不是停留在文档或命令行概念。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent

## Goals

- 接收用户的个人决策问题。
- 创建新的 `Deliberation Session`。
- 把用户问题交给 Chair Agent 进入 `Call to Order`。

## Non-Goals

- 用户登录、权限和组织空间。
- 历史会话管理。
- 复杂表单、多页面向导或企业协作入口。

## User Flow

1. 用户打开 Web 产品入口。
2. 用户输入一个个人决策问题。
3. 用户提交问题。
4. RONR 创建 `Deliberation Session`。
5. Chair Agent 开始确认目标、背景和约束。

## Requirements

- Web 入口必须明确服务个人决策问题。
- 用户问题不能为空。
- 成功创建会话后，系统必须返回会话标识、初始阶段和下一步议事任务。
- 失败时必须返回清晰错误，而不是静默停留在输入页。

## Development Mode

`Preview-first`

该 feature 是 Web 产品入口，先确认最小交互和错误反馈是否清晰，再补表单校验和创建会话的关键路径测试。

## Acceptance Criteria

- 给定有效用户问题时，RONR 创建一个新的 `Deliberation Session` 并进入 `Call to Order`。
- 给定空问题时，Web 入口显示清晰校验信息。
- 创建会话后，用户能看到当前议事阶段和 Chair Agent 的下一步任务。

## Verification Plan

- 自动化测试：覆盖空问题校验、有效问题提交和创建会话后的阶段展示。
- fixture 验证：使用最小有效用户问题和空输入 fixture。
- 人工检查：确认页面文案强调个人决策场景，而不是人类会议工具。
- 不需要测试的理由：不适用，该 feature 是用户入口。

## Technical Notes

该 feature 只定义 Web 入口能力。状态创建属于 core/session 边界；页面展示属于 Web 边界；不在本 feature 中实现模型调用或完整议事流程。

## Rollout

先作为 P0 最小闭环入口，与 `Agent Configuration` 和 `RONR Protocol Flow` 联合验收。
