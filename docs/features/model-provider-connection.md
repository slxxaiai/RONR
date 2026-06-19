# Model Provider Connection

## One-Line Definition

定义最小 Web 闭环所需的真实 OpenAI-compatible Model Provider 连接能力，并以 PPIO 作为首个参考连接配置。

## Status

完成

## Priority

高

## Problem

RONR 的最小 Web 闭环需要真实模型参与，而不是只靠 mock 或 fixture。Provider 连接必须抽象供应商差异，同时安全处理 API key、标准化供应商错误，并避免把供应商细节泄漏进核心议事状态。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent
- Member Agent

## Goals

- 支持 OpenAI-compatible Provider，并用 PPIO 作为首个真实 provider preset。
- 将模型调用与 core domain 解耦。
- 支持联网搜索能力，使 Agent 在表达观点前可以获得外部信息来源。
- 默认启用模型 thinking / reasoning 配置，并防止原始推理链进入事件日志或 UI。
- 通过服务端 Bearer token 鉴权调用模型，不让浏览器、core、prompt template 或事件日志接触明文 API key。
- 标准化模型调用失败、供应商错误和结构化输出失败。
- 优先复用 Web runtime 的 `fetch` 和现有 schema 校验能力，不为首版引入供应商 SDK。

## Non-Goals

- 同时实现多个供应商专属 SDK。
- 模型排行榜或自动选型。
- 供应商计费管理。
- 浏览器端直连模型供应商。
- 首版流式输出；需要实时展示时再接入 `SSE`。

## User Flow

1. 用户或系统选择一个 `Provider Profile`，例如 `ppio-default`。
2. Agent Role Runtime 将 role、mandate、phase 和 prompt template 渲染结果转换为 `ModelProviderRequest`。
3. Provider Registry 根据 `providerProfileId` 找到 `OpenAICompatibleProvider` 和服务端 `Secret Reference`。
4. Adapter 在服务端读取 API key，向 `{baseURL}/chat/completions` 发送请求，并在 header 中使用 Bearer 鉴权。
5. Provider 返回原始 chat completion response。
6. Adapter 抽取 message content、finish reason、usage 和供应商元数据，返回标准化 `ModelProviderResponse`。
7. Agent Role Runtime 解析并校验 Agent 输出 schema；合法输出再进入 core state transition。

## Requirements

### Provider Profile

Provider 配置应表达为 `Provider Profile`，而不是把供应商细节散落在 Agent 或 Web 组件中。

最小字段：

- `id`：例如 `ppio-default`。
- `displayName`：用于 Web 展示，例如 `PPIO`。
- `protocol`：首版固定为 `openai-compatible`。
- `baseURL`：例如 `https://api.ppio.com/openai/v1`。
- `chatCompletionPath`：默认 `/chat/completions`。
- `webSearchPath`：默认 `/v3/web-search`，用于 PPIO 搜索摘要。
- `auth.type`：首版固定为 `bearer`。
- `apiKeySecretRef`：服务端密钥引用，例如 `env:RONR_PROVIDER_PPIO_API_KEY`。
- `defaultModel`：默认模型名，由配置提供，不硬编码到 adapter。
- `timeoutMs`：单次请求超时时间。
- `maxTokensDefault`：默认 `max_tokens`。
- `temperatureDefault`：默认 `temperature`。
- `structuredOutputMode`：`json_schema`、`json_object` 或 `text`。
- `webSearchEnabledDefault`：默认是否允许联网搜索，RONR 默认开启。
- `thinkingEnabledDefault`：默认是否启用 thinking / reasoning，RONR 默认开启。
- `thinkingBudgetDefault`：可选 reasoning token / effort / budget 配置。

`apiKeySecretRef` 指向服务端环境变量或后续 secret store。任何 API response、event log、prompt template、debug trace 和浏览器状态都不得包含明文 API key。

### PPIO Preset

PPIO 作为首个真实 provider preset，使用 OpenAI-compatible chat completion 形态：

- `baseURL`：`https://api.ppio.com/openai/v1`
- `chatCompletionPath`：`/chat/completions`
- `Content-Type`：`application/json`
- `Authorization`：`Bearer <API key>`
- 请求体至少包含 `model`、`messages` 和 `max_tokens`
- 如 Agent 输出需要结构化结果，按 profile 的 `structuredOutputMode` 使用 `json_schema` 或 `json_object`
- thinking 使用 PPIO 兼容字段 `separate_reasoning`、`enable_thinking` 和可选 `thinking_budget`
- 联网搜索使用 PPIO `POST /v3/web-search` 生成 `Search Result Summary`，再作为上下文输入 Agent 模型调用

PPIO 的模型名称来自用户配置或后续模型列表能力，本 feature 不维护模型清单。

### Request Contract

`ModelProviderRequest` 应只表达模型调用所需信息：

- `requestId`
- `providerProfileId`
- `model`
- `messages`
- `responseSchema`
- `temperature`
- `maxTokens`
- `timeoutMs`
- `metadata`

`messages` 首版只要求支持 `system`、`user`、`assistant` 三类文本消息。`User Input Attachments` 产生的文件和链接上下文应先归一化为文本摘要和 `Source Reference`；图片、音频、视频等多模态输入不属于该 feature 的 Web 首版范围，应由后续独立 feature 评估。工具调用由后续 tool calling feature 单独扩展。

如果 provider 支持内置联网搜索或 tool calling，`ModelProviderRequest` 应能表达：

- `tools`
- `toolChoice`
- `webSearchEnabled`
- `thinkingEnabled`
- `thinkingBudget`
- `sourcePolicy`

`webSearchEnabled` 默认开启，但具体执行可以由 Agent Runtime 的统一 search contract 完成，而不要求每个模型供应商都提供同名 API。Provider 不支持原生搜索时，Orchestrator 应使用独立 Search Provider 先生成 `Search Result Summary`，再调用模型。

### Response Contract

`ModelProviderResponse` 应返回标准化结果：

- `requestId`
- `provider`
- `model`
- `contentText`
- `finishReason`
- `usage`
- `rawResponseId`
- `providerMeta`
- `searchResults`
- `thinkingMeta`

`providerMeta` 只能包含可观测性需要的非敏感信息，例如 HTTP status、latency、供应商错误名和 sanitized request id。不得包含 API key、完整 prompt、完整用户附件或未脱敏原始响应。

`searchResults` 只能保存结构化摘要和来源引用，不保存整页抓取内容。`thinkingMeta` 只能保存是否启用、预算、供应商返回的非敏感统计，不保存原始 chain-of-thought。

### Web Search and Thinking Defaults

- RONR 默认要求 `Web Search Before Speech`：Agent 在表达观点前必须先获得搜索摘要或明确的搜索失败记录。
- RONR 默认启用 `Thinking Mode`：Provider request 应尽可能开启供应商支持的 reasoning / thinking 配置。
- 供应商不支持 thinking 参数时，adapter 应记录 capability fallback，但不能阻塞会话。
- 供应商返回原始推理链时，adapter 必须丢弃或脱敏，不能进入 `ModelProviderResponse.contentText`、event log、trace 或 UI。
- 联网搜索失败时，应返回标准化 search error，由 Orchestrator 决定重试、暂停、降级或继续。

### Error Normalization

Provider adapter 必须把 HTTP 错误、网络错误和供应商错误名映射为稳定内部错误码：

| Internal Error | PPIO / HTTP Signal | Retryable | User Action |
| --- | --- | --- | --- |
| `auth_failed` | `FAILED_TO_AUTH`、`INVALID_API_KEY`、401、403 且指向 API key 问题 | 否 | 检查 API key 或 `apiKeySecretRef` |
| `permission_denied` | `ACCESS_DENY` | 否 | 检查账号或模型权限 |
| `insufficient_balance` | `NOT_ENOUGH_BALANCE` | 否 | 处理供应商余额或预算 |
| `model_not_found` | `MODEL_NOT_FOUND`、404 | 否 | 更换模型配置 |
| `invalid_request` | `INVALID_REQUEST_BODY`、400 | 否 | 修正 adapter request 或 schema |
| `rate_limited` | `RATE_LIMIT_EXCEEDED`、429 | 是 | 稍后重试或降低并发 |
| `token_limit_exceeded` | `TOKEN_LIMIT_EXCEEDED`、429 | 否 | 降低上下文或 `maxTokens` |
| `provider_unavailable` | `SERVICE_NOT_AVAILABLE`、503 | 是 | 稍后重试或切换 provider |
| `timeout` | 请求超过 `timeoutMs` | 是 | 稍后重试或提高超时 |
| `network_failed` | DNS、TLS、连接失败 | 是 | 检查网络或供应商状态 |
| `schema_parse_failed` | 内容无法解析为目标 JSON 或 schema 不匹配 | 否 | 重试当前 Agent 任务或调整 prompt / schema |
| `search_failed` | 搜索 provider 失败、无可用搜索结果或搜索超时 | 视原因决定 | 重试搜索、暂停或降级为无外部依据讨论 |
| `unknown_provider_error` | 未识别错误 | 视 HTTP status 决定 | 查看 sanitized diagnostics |

自动重试只允许用于 `rate_limited`、`provider_unavailable`、`timeout` 和 `network_failed`，且首版最多重试一次。`auth_failed`、`invalid_request`、`model_not_found` 和 `schema_parse_failed` 不应盲目重试。

### Runtime Boundary

- `apps/web` 只能通过 RONR API 触发模型调用，不直接调用 PPIO。
- `packages/agents` 负责 role task、prompt rendering、Provider 调用和 Agent 输出 schema 校验。
- `packages/providers` 负责 provider profile、adapter、鉴权 header、transport、搜索能力适配、thinking 参数适配、响应抽取和错误标准化。
- `packages/core` 不依赖 provider SDK、provider profile、网络、API key 或供应商错误结构。
- `packages/contracts` 定义跨模块共享的 request、response 和 error schema。

### Observability and Secrets

- 日志只能记录 `providerProfileId`、`model`、latency、HTTP status、internal error 和 sanitized provider error。
- `Authorization` header、API key、原始 secret value 必须在日志、异常和 event log 中脱敏。
- 原始 chain-of-thought、完整搜索页面内容和完整 provider raw response 不得进入日志、事件、trace 或浏览器状态。
- 连接测试只返回可展示状态，例如 `ok`、`auth_failed`、`model_not_found`、latency 和 sanitized message。
- 首版可用环境变量承载 secret；需要多用户 provider profile 时，再评估 secret store 和加密存储。

## Multilingual and Glossary Impact

- 复用 `docs/glossary.md` 中已有术语：`Model Provider Connection`、`Model Provider`、`OpenAI-compatible Provider`、`Agent Role Runtime`、`Source Reference`。
- 新增术语：`Provider Profile`、`Secret Reference`、`Web Search Before Speech`、`Search Result Summary`、`Thinking Mode`、`Thinking Budget`。
- 新增或修改协议字段：`providerProfileId`、`apiKeySecretRef`、`structuredOutputMode`、`webSearchEnabledDefault`、`thinkingEnabledDefault`、`thinkingBudgetDefault`、`webSearchEnabled`、`thinkingEnabled`、`thinkingBudget`、`sourcePolicy`、`ModelProviderRequest`、`ModelProviderResponse`、`ModelProviderError`。
- UI 文案只能展示 provider 名称、模型名和连接状态，不展示 secret value。

## Development Mode

`Mock + contract-first`

Provider 连接应先定义统一接口、mock provider、错误码和结构化输出契约，再接真实 OpenAI-compatible provider。

## Acceptance Criteria

- 给定有效 Provider 配置时，Agent Runtime 能获得模型输出。
- 给定 PPIO preset、有效 `apiKeySecretRef` 和模型名时，adapter 能构造符合 OpenAI-compatible chat completion 的请求。
- 给定鉴权失败、权限不足、余额不足、限流、模型不存在、超时或不可解析输出时，系统返回标准化错误并保留当前会话状态。
- 给定 provider 支持搜索时，adapter 能表达搜索工具调用或返回搜索来源摘要。
- 给定 provider 支持 thinking 配置时，adapter 默认启用 thinking / reasoning。
- 给定 provider 返回原始推理链时，系统不会保存或展示原始推理链。
- Core domain 文档不出现供应商 SDK 依赖。
- 浏览器、event log、prompt template 和 core state 中不出现明文 API key。

## Verification Plan

- 自动化测试：覆盖 mock provider 成功输出、PPIO preset request 构造、Bearer header 注入、搜索参数传递、thinking 参数传递、鉴权失败、权限不足、余额不足、限流、模型不存在、超时、schema_parse_failed、search_failed 和 provider_unavailable。
- fixture 验证：准备 PPIO chat completion success response、search summary response、thinking meta response、LLM error response 和 malformed JSON response fixture。
- 人工检查：确认 API key、原始 chain-of-thought、完整搜索页面内容不进入 core、prompt template、event log、前端展示或错误消息。
- 不需要测试的理由：不适用，该 feature 涉及外部连接和错误恢复。

## Technical Notes

本 feature 已实现最小可运行连接能力和边界，不存储真实 API key。真实密钥仍只允许写入本地忽略文件 `config/provider.local.json`。

当前实现包括：

- `packages/providers`：本地 profile 解析、PPIO/OpenAI-compatible model list、chat completion、PPIO web search、Bearer 鉴权、错误标准化、search/thinking 安全元数据和 raw chain-of-thought 脱敏。
- `packages/agents`：每个 Agent 发言前执行 search-before-speech，搜索成功时把 `Search Result Summary` 输入模型，搜索失败时记录 `search_failed` 并按 optional 策略降级；每次模型调用传入 role-specific JSON schema 和 thinking/search 意图。
- `packages/contracts`：对外 `ProviderCallMeta` 只暴露 latency、HTTP status、search 状态/数量、thinking 开关/预算/统计和 capability fallback，不暴露 API key、完整 prompt、完整搜索页面或原始推理链。
- `apps/web`：统一把 provider/runtime 错误转换成 `{ code, message, recoveryHint? }`。

首版实现时不引入 PPIO SDK 或 OpenAI SDK。`OpenAICompatibleProvider` 可以基于 Web runtime / Node runtime 的 `fetch` 实现，减少依赖面。`response_format` 的具体 schema 由 `packages/agents` 或 `packages/contracts` 提供，adapter 只负责转换为供应商请求格式。

Provider adapter 的输出校验分两层：

1. Adapter 校验供应商 response shape，例如 `choices[0].message.content` 是否存在。
2. Agent Role Runtime 校验 Agent 输出是否符合 role-specific schema。

如果供应商支持 `json_schema`，adapter 应传入 schema 以提高结构化输出稳定性；但不能只依赖供应商保证，仍必须在本地做 schema 校验。

## Rollout

P0 分三步引入：

1. `MockModelProvider`：已用 unit/integration mock 固定 `ModelProviderRequest`、`ModelProviderResponse` 和 `ModelProviderError` contract。
2. `OpenAICompatibleProvider`：已实现非流式 chat completion adapter，使用 PPIO preset 做首个真实连接。
3. `Connection Test`：已提供 `/api/providers/ppio/connection-test`，只返回 `ok`、provider profile、latency 和 model count 等可展示状态；`/api/providers/ppio/models` 负责完整模型列表。

Claude 专属适配、本地模型适配、模型列表同步、流式输出和多用户 secret store 后续再拆 feature。

## External References

- PPIO API 鉴权方式：https://ppio.com/docs/models/reference-authentication
- PPIO 创建聊天对话请求：https://ppio.com/docs/models/reference-llm-create-chat-completion
- PPIO API 错误码说明：https://ppio.com/docs/models/reference-error-code
