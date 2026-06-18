# User Input Attachments

## One-Line Definition

定义用户通过文字、语音或文件输入个人决策问题时，RONR 如何接收、归一化和纳入议事上下文。

## Status

草稿

## Priority

中

## Problem

PRD 中 MVP 提到用户问题可以通过文字、语音、文件输入。如果不先定义输入边界，Web 入口可能过早引入复杂上传、转写或解析依赖，偏离最小闭环。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent

## Goals

- 首版明确文字输入为 P0。
- 将语音和文件输入定义为可选增强能力。
- 对附件内容做归一化摘要，供 Chair 确认议题。
- 避免自动执行或信任未验证的附件内容。

## Non-Goals

- 通用文件管理。
- 大文件存储。
- 自动语音识别模型选型。
- 复杂文档解析 pipeline。

## User Flow

1. 用户通过 Web 输入个人决策问题。
2. 用户可选添加语音或文件附件。
3. RONR 将附件内容转换为可审阅的上下文摘要。
4. Chair Agent 在 `Call to Order` 阶段确认问题、目标和约束。
5. 用户确认或修正附件摘要后，议事流程继续。

## Requirements

- P0 必须支持文字输入。
- 语音和文件输入不得阻塞最小 Web 闭环。
- 附件内容必须转成明确上下文片段，并标记来源。
- 附件摘要必须可被用户确认或修正。
- 高风险或不可解析附件必须返回清晰错误。

## Development Mode

`Spec + fixture-first`

输入附件涉及多种格式和不确定内容，应先定义输入 schema、归一化输出和 fixture，再接入具体解析能力。

## Acceptance Criteria

- 给定纯文字问题时，可以创建 Deliberation Session。
- 给定附件摘要时，Chair Agent 能在议题确认阶段引用其来源。
- 给定不可解析附件时，系统返回清晰错误且不启动错误上下文议事。

## Verification Plan

- 自动化测试：覆盖纯文字输入、附件摘要引用、不可解析附件错误。
- fixture 验证：提供文字输入、语音转写文本、文件摘要和解析失败 fixture。
- 人工检查：确认附件摘要不会伪装成用户已确认事实。
- 不需要测试的理由：P0 只实现文字输入时，语音和文件可保留为文档化增强。

## Technical Notes

该 feature 不要求首版引入语音转写或文档解析依赖。任何附件解析结果都应作为带来源的上下文输入，由 Chair 在议题确认阶段显式确认。

## Rollout

P0 只支持文字输入；P1 增加文件摘要；语音输入在 Web 体验和隐私边界明确后再评估。

