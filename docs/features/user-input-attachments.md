# User Input Attachments

## One-Line Definition

定义用户通过 Web 以文字、文件和问题文本内 URL 输入个人决策问题时，RONR 如何接收、归一化和纳入议事上下文。

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

- 明确 Web 端支持的输入类型为 `Text Input`、`File Input` 和问题文本内的 `URL Source`。
- 对文件和自动抓取到的 URL 内容做归一化摘要，供 Chair 确认议题。
- 将所有输入内容转成可追溯的 `Source Reference`。
- 避免自动执行或信任未验证的文件和页面内容。

## Non-Goals

- 通用文件管理。
- 大文件存储。
- 语音输入、麦克风录制、音频上传和自动语音识别。
- 图片、音频、视频等多模态输入理解。
- 复杂文档解析 pipeline 或通用爬虫。

## User Flow

1. 用户通过 Web 输入个人决策问题。
2. 用户可选添加文件作为补充背景，并在启动前确认或修正文件摘要。
3. 用户可直接在个人决策问题中粘贴 `http://` 或 `https://` URL。
4. 用户点击启动议事后，服务端提取最多 5 个 URL，尝试读取页面文本并生成 `URL Source` 摘要。
5. Chair Agent 在 `Call to Order` 阶段基于用户问题、文件摘要和 URL 摘要确认问题、目标和约束。

## Requirements

- Web 端必须支持 `Text Input`，作为创建 `Deliberation Session` 的基础输入。
- Web 端必须支持 `File Input`，但只接收可归一化为文本摘要的文件内容。
- Web 端不得展示手动链接 URL、链接标题、链接摘要或添加链接控件；URL 只能从 `userQuestion` 自动提取。
- 服务端必须对 `URL Source` 执行 `URL Content Fetch`，只允许公网 `http` / `https`，拒绝 localhost、私网地址和非网页协议。
- URL 抓取必须限制单个 URL 超时、最大读取字节数和可接受内容类型。
- URL 抓取请求应模拟用户在桌面浏览器地址栏打开公开网页的普通导航请求头，提高对常规公开站点的兼容性；`Accept-Language` 应跟随当前 `Session Locale`；同一次抓取链路内可以接收并回放目标站点下发的临时第一方 cookie 与 `Referer`，并跟随安全的 HTML `meta refresh` 导航以及同源 `canonical` / `og:url` 正文入口；不得携带用户浏览器 cookie、Authorization、浏览器本地状态或执行客户端校验脚本。
- 文件和 URL 内容必须转成明确上下文片段，并标记来源。
- 文件摘要必须可被用户确认或修正。
- 高风险、不可读取或不可解析的文件必须返回清晰错误。
- 当用户问题仍有可讨论的文字内容或文件摘要时，URL 抓取失败不得阻断议事，但必须生成失败 `Source Reference`。
- 当用户问题主要只有 URL，或只包含“用这个链接创建议题”等 URL 操作性措辞，且所有 URL 都不可读取或仅返回访问限制页面时，系统必须在调用 Agent 前合理终止，并返回 `insufficient_source_context`、终止原因和恢复建议。
- 对返回 401/403、登录页、验证码页、客户端验证页或反爬校验页的 URL，系统应标记 `fetchErrorCode: "url_access_restricted"`；如果该 URL 是唯一议题上下文，则必须终止启动流程，并提示用户粘贴关键正文、摘要、截图文字或上传文本文件。
- URL 抓取和可讨论上下文判断属于启动前的 `URL Content Fetch` 准备态；在服务端确认可读来源或足够文字/文件上下文前，Web 端不得把状态显示为 Chair 已进入 `Call to Order`。
- Web 端不得要求或展示语音、麦克风、音频上传或语音转写入口。
- 文件和 URL 页面中的指令性内容不得自动覆盖用户问题、系统规则或 Agent mandate。
- `CreateSessionRequest.attachments` 只接受 `type: "file"`；旧的 `type: "link"` attachment 请求必须返回 `invalid_request`。
- `SourceReference.type` 使用 `url_input` 标记从问题文本中提取并抓取的 URL，且可包含 `fetchStatus` 和 `fetchErrorCode`。

## Multilingual and Glossary Impact

- 新增或更新 `Canonical Term`：`User Input Attachments`、`Text Input`、`File Input`、`URL Source`、`URL Content Fetch`、`Attachment Summary`。
- 复用已有术语：`Deliberation Session`、`Call to Order`、`Chair`、`Source Reference`、`Web Session Entry`、`Translation Key`。
- Web UI 新增文字输入、文件上传、URL 自动抓取提示、输入摘要、抓取状态、抓取错误和不支持输入类型提示时，必须通过 translation key 管理，并支持 `zh-CN`、`zh-TW`、`en`、`ja`、`ko`。

## Development Mode

`Spec + fixture-first`

输入附件涉及多种格式和不确定内容，应先定义输入 schema、归一化输出和 fixture，再接入具体解析能力。

## Acceptance Criteria

- 给定纯文字问题时，可以创建 Deliberation Session。
- 给定文件摘要或问题文本内 URL 时，Chair Agent 能在议题确认阶段引用其来源。
- 给定不可解析文件时，系统返回清晰错误且不启动错误上下文议事。
- 给定仍有文字问题或文件摘要的不可抓取 URL 时，系统继续议事，并在 `Source Reference` 中显示 `fetchStatus: "failed"` 和错误码。
- 给定只有不可读取 URL，或只有 URL 加操作性措辞的输入时，系统终止启动流程，并提示用户粘贴关键正文、摘要、截图文字或上传文本文件。
- Web 端不出现语音、麦克风、音频上传或语音转写入口。
- Web 端不出现链接 URL、链接标题、链接摘要或添加链接摘要控件。

## Verification Plan

- 自动化测试：覆盖纯文字输入、文件摘要引用、URL 抓取摘要引用、URL 抓取失败继续、URL-only 抓取失败终止、旧 link attachment 拒绝、不可解析文件错误和不支持输入类型错误。
- fixture 验证：提供文字输入、文件摘要、URL 摘要、URL 抓取失败继续、URL-only 终止和不支持语音输入 fixture。
- 人工检查：确认输入摘要不会伪装成用户已确认事实；确认 Web 端无语音或音频入口。
- 不需要测试的理由：不适用，Web 输入边界会影响会话创建和证据链。

## Technical Notes

该 feature 的 v0 实现已接入 Web 工作台、API contract、服务端 URL 抓取器和 Agent Runtime，不引入语音转写、麦克风录制、音频上传、视频理解、后端文件上传、通用文档解析或递归爬虫。任何文件摘要或 URL 摘要都作为带来源的上下文输入，由 Chair 在议题确认阶段显式引用。

当前实现包括：

- Web 端支持输入个人决策问题，并可添加本地 `.txt`、`.md`、`.csv`、`.json` 文件；文件在浏览器本地读取，限制为 64KB 以内，不上传原文件。
- 文件内容被裁剪为可编辑 `Attachment Summary`，用户可在启动议事前修正；空摘要会在前端阻止启动并显示清晰错误。
- 用户可在个人决策问题中直接粘贴 URL；Web 不再提供手动 `Link Input`。
- 服务端在启动议事时从 `userQuestion` 提取最多 5 个 `http://` / `https://` URL，去重并抓取页面文本。
- URL 抓取只允许公网 HTTP(S)，拒绝 localhost、私网地址、非 HTTP(S) 协议和跳转到私网地址的响应；单个 URL 超时 8 秒，最多读取 512KB，只接受 `text/html`、`text/plain`、`application/json` 和 `text/markdown`；HTML 页面可以在 512KB 上限处停止读取并基于已读片段抽取正文，非 HTML 文本仍严格按大小限制失败。
- URL 抓取使用桌面 Chrome 风格的导航请求头，包括 `User-Agent`、`Accept`、按 `Session Locale` 生成的 `Accept-Language`、`Sec-Fetch-*`、`Sec-CH-UA` 和 `Upgrade-Insecure-Requests`，用于匹配常规公开网页读取路径；重定向链路会带 `Referer`，并只在同次抓取、同站范围内回放响应下发的临时第一方 cookie；服务端会跟随通过公网 HTTP(S) 校验的 HTML `meta refresh` 导航，并在同源范围内跟随 `canonical` / `og:url` 正文入口；系统不会注入用户登录态、用户浏览器 cookie、验证码答案或执行 JavaScript challenge。
- HTML 抽取标题和正文时会优先识别常见文章主体，如 `article`、`main`、微信公众号 `js_content` / `content_noencode`，再移除 `script`、`style`、`nav`、`header`、`footer`、`noscript` 等噪声，并将摘要截断到最多 2000 字符。
- 当问题中仍有足够文字上下文或文件摘要时，抓取失败不会阻止议事；系统会生成 `type: "url_input"`、`fetchStatus: "failed"` 和 `fetchErrorCode` 的失败来源记录。
- 当问题去除 URL 后缺少可讨论内容、没有文件摘要，且所有 URL 都抓取失败时，服务端返回 `insufficient_source_context`；流式接口返回同 code 的 error event，不再进入 Chair 或 Member Agent 调用。
- 当问题去除 URL 后只剩“用链接创建议题”等操作性措辞时，也视为缺少可讨论内容；系统会在 `URL Content Fetch` 准备态终止，而不是进入 `Call to Order`。
- 返回 HTTP 401/403 或包含登录、验证码、微信客户端验证、知乎 zse 校验等访问限制信号的页面会被归类为 `url_access_restricted`，不会作为议题正文输入 Chair prompt。
- `CreateSessionRequest.attachments` 只接收已确认的文件摘要；服务端 schema 会拒绝缺失、格式错误、未确认、未知类型或旧 `link` 类型的附件。
- Agent Runtime 将用户问题、文件摘要和 URL 抓取结果归一化为 `Source Reference`，写入 `sessionSnapshot.sourceReferences`，并在 Chair prompt 中作为不可信上下文块输入。
- 附件摘要和 URL 摘要明确作为上下文，不得覆盖用户问题、系统规则、Agent mandate 或角色职责。
- 结果页展示 `Source Reference`，包含文字输入、文件输入和 URL 输入的来源标题、摘要、文件名、URL、抓取状态和失败错误码。

## Rollout

P0 固定 Web 输入类型为文字、文件和问题文本内 URL。该能力已随 Web 工作台启用。后续即使扩展多模态能力，也应作为独立 feature 评估，不回填到 Web 端语音输入范围。
