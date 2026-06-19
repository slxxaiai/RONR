# User Input Attachments

## One-Line Definition

定义用户通过 Web 以文字、文件或链接输入个人决策问题时，RONR 如何接收、归一化和纳入议事上下文。

## Status

完成

## Priority

中

## Problem

PRD 中 MVP 需要支持用户通过 Web 补充问题背景。如果不先定义输入边界，Web 入口可能过早引入语音、音频、视频或复杂解析依赖，偏离最小闭环。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent

## Goals

- 明确 Web 端支持的输入类型为 `Text Input`、`File Input` 和 `Link Input`。
- 对文件和链接内容做归一化摘要，供 Chair 确认议题。
- 将所有输入内容转成可追溯的 `Source Reference`。
- 避免自动执行或信任未验证的文件、链接和页面内容。

## Non-Goals

- 通用文件管理。
- 大文件存储。
- 语音输入、麦克风录制、音频上传和自动语音识别。
- 图片、音频、视频等多模态输入理解。
- 复杂文档解析 pipeline 或通用爬虫。

## User Flow

1. 用户通过 Web 输入个人决策问题。
2. 用户可选添加文件或链接作为补充背景。
3. RONR 将文件和链接内容转换为可审阅的上下文摘要。
4. Chair Agent 在 `Call to Order` 阶段确认问题、目标和约束。
5. 用户确认或修正输入摘要后，议事流程继续。

## Requirements

- Web 端必须支持 `Text Input`，作为创建 `Deliberation Session` 的基础输入。
- Web 端必须支持 `File Input`，但只接收可归一化为文本摘要的文件内容。
- Web 端必须支持 `Link Input`，并记录 URL、标题、摘要和抓取或读取时间。
- 文件和链接内容必须转成明确上下文片段，并标记来源。
- 输入摘要必须可被用户确认或修正。
- 高风险、不可读取或不可解析的文件和链接必须返回清晰错误。
- Web 端不得要求或展示语音、麦克风、音频上传或语音转写入口。
- 文件和链接中的指令性内容不得自动覆盖用户问题、系统规则或 Agent mandate。

## Multilingual and Glossary Impact

- 新增 `Canonical Term`：`User Input Attachments`、`Text Input`、`File Input`、`Link Input`、`Attachment Summary`。
- 复用已有术语：`Deliberation Session`、`Call to Order`、`Chair`、`Source Reference`、`Web Session Entry`、`Translation Key`。
- Web UI 新增文字输入、文件上传、链接输入、输入摘要、解析错误和不支持输入类型提示时，必须通过 translation key 管理，并支持 `zh-CN`、`zh-TW`、`en`、`ja`、`ko`。

## Development Mode

`Spec + fixture-first`

输入附件涉及多种格式和不确定内容，应先定义输入 schema、归一化输出和 fixture，再接入具体解析能力。

## Acceptance Criteria

- 给定纯文字问题时，可以创建 Deliberation Session。
- 给定文件或链接摘要时，Chair Agent 能在议题确认阶段引用其来源。
- 给定不可解析文件或链接时，系统返回清晰错误且不启动错误上下文议事。
- Web 端不出现语音、麦克风、音频上传或语音转写入口。

## Verification Plan

- 自动化测试：覆盖纯文字输入、文件摘要引用、链接摘要引用、不可解析文件错误和不支持输入类型错误。
- fixture 验证：提供文字输入、文件摘要、链接摘要、解析失败和不支持语音输入 fixture。
- 人工检查：确认输入摘要不会伪装成用户已确认事实；确认 Web 端无语音或音频入口。
- 不需要测试的理由：不适用，Web 输入边界会影响会话创建和证据链。

## Technical Notes

该 feature 的 v0 实现已接入 Web 工作台、API contract 和 Agent Runtime，不引入语音转写、麦克风录制、音频上传、视频理解、后端文件上传、通用文档解析或链接爬虫。任何文件或链接摘要都作为带来源的上下文输入，由 Chair 在议题确认阶段显式引用。

当前实现包括：

- Web 端支持输入个人决策问题，并可添加本地 `.txt`、`.md`、`.csv`、`.json` 文件；文件在浏览器本地读取，限制为 64KB 以内，不上传原文件。
- 文件内容被裁剪为可编辑 `Attachment Summary`，用户可在启动议事前修正；空摘要会在前端阻止启动并显示清晰错误。
- `Link Input` 支持用户填写 `URL`、标题和摘要；v0 不自动抓取页面内容，避免把未验证页面内容直接注入议事。
- `CreateSessionRequest.attachments` 接收已确认的文件或链接摘要；服务端 schema 会拒绝缺失、格式错误、未确认或未知类型的附件。
- Agent Runtime 将用户问题和所有附件归一化为 `Source Reference`，写入 `sessionSnapshot.sourceReferences`，并在 Chair prompt 中作为上下文块输入。
- 附件摘要明确作为上下文，不得覆盖用户问题、系统规则、Agent mandate 或角色职责。
- 结果页展示 `Source Reference`，包含文字输入、文件输入和链接输入的来源标题、摘要、文件名或 URL。

## Rollout

P0 固定 Web 输入类型为文字、文件和链接。该能力已随 Web 工作台启用。后续即使扩展多模态能力，也应作为独立 feature 评估，不回填到 Web 端语音输入范围。
