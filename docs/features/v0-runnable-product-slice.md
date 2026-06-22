# V0 Runnable Product Slice

## One-Line Definition

用最小 Web 纵切跑通真实 OpenAI-compatible provider、模型列表、Agent 配置、顺序角色调用和阶段化议事结果展示。

## Status

完成

## Priority

高

## Problem

RONR 当前已有产品文档和工程骨架，但用户还不能启动一个真实 AI Agent 议事会话。v0 需要先形成可运行产品闭环，让用户能配置本地 API key、选择模型和角色，并看到带证据链的行动清单。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent
- Member Agent
- 后续实现者

## Goals

- 从 PPIO OpenAI-compatible provider 拉取完整可用模型列表。
- 允许用户在启动会议前为 Chair、Secretary 和至少两个 Member 配置模型与 mandate。
- 用真实 LLM 顺序执行 Chair、Member、Secretary 任务。
- 在单页 Web 工作台展示阶段、Agent 发言、Objection、Vote、Reservation 和 Action Plan Trace。
- 使用本地忽略配置文件保存 API key，避免上传 GitHub。

## Non-Goals

- 多 provider 管理。
- 完整登录系统、团队权限、复杂多用户管理。
- 用户插话和多 provider 管理。
- 模型排行榜、自动选型或供应商计费管理。

说明：数据库、历史会议和持久化恢复已由后续 `Deliberation Records` 与 `Session Event Log` feature 承接，不再作为当前产品整体的非目标。

## User Flow

1. 用户复制 `config/provider.example.json` 为 `config/provider.local.json` 并填写 PPIO API key。
2. 用户运行 Web 产品。
3. Web 从 provider API 拉取模型列表。
4. 用户为 Chair、Secretary 和 Member 选择模型，并为 Member 选择 mandate。
5. 用户输入个人决策问题并启动议事。
6. RONR 服务端按 Chair -> Member -> Secretary 顺序调用真实模型。
7. Web 展示完整议事结果和 Action Plan Trace。

## Requirements

- `config/provider.local.json` 必须被 `.gitignore` 忽略。
- Provider model list 必须来自 `GET /openai/v1/models`，不硬编码模型清单。
- 浏览器不得接触明文 API key。
- 创建会话请求必须包含 `userQuestion`、`locale` 和 `agentConfig`。
- Agent 配置必须校验 Chair、Secretary 和至少两个 Member。
- 每个 Agent 调用必须使用启动会话时选择的模型。
- Agent 输出必须经过 JSON schema 校验，失败时返回稳定错误。
- Web UI 静态文案必须通过 translation key 管理，并提供 `Language Switcher`。

## Multilingual and Glossary Impact

- 复用已有术语：`Model Provider Connection`、`Provider Profile`、`Secret Reference`、`Agent Configuration`、`Language Switcher`、`Action Plan Trace`。
- 不新增新的 `Canonical Term`。
- 新增 UI 文案均通过 translation key 管理。
- 新增 API 字段复用计划中的 `ProviderModel`、`AgentConfig`、`CreateSessionRequest`、`CreateSessionResponse`。

## Development Mode

`Contract-first + test`

该纵切跨 provider、contracts、agents、API 和 Web UI。先用契约与测试固定模型列表、Agent 配置、错误响应和快照结构，再实现运行时和界面。

## Acceptance Criteria

- 缺少或无效 `config/provider.local.json` 时返回清晰错误。
- 模型列表 API 能返回 provider 支持的模型字段。
- 用户能为 Chair、Secretary 和 Member 选择模型并启动议事。
- 成功会话返回 `status=completed`、`phase=action_resolution` 和 `sessionSnapshot`。
- Web 结果视图展示阶段、Agent 输出、Vote.position 和 Action Plan Trace。

## Verification Plan

- 自动化测试：provider config、模型列表、错误映射、Agent 配置校验、Agent schema 失败、API handler 和 UI 渲染。
- fixture 验证：使用 mock fetch 模拟 PPIO 模型列表和 chat completion。
- 人工检查：用真实 `provider.local.json` 启动 Web，确认模型列表和议事结果可用。
- 不需要测试的理由：真实供应商稳定性不作为单元测试前提，通过 mock contract 和人工连接验证覆盖。

## Technical Notes

首版只支持 PPIO profile。真实 API key 存在 `config/provider.local.json`，示例文件只提交示例值。`packages/providers` 负责读取配置、请求模型列表、调用 chat completions 和错误标准化；`packages/agents` 负责顺序角色调用和输出 schema 校验；`apps/web` 只通过 RONR API 触发模型调用。

## Rollout

先合并 v0 runnable slice，让团队能本地启动和试用。后续再拆分用户插话、多 provider 管理、云端账号系统和更完整的 E2E 验收。
