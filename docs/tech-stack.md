# Tech Stack

本文档记录 RONR 的技术选型决策。当前产品入口优先级为：

```text
Web > App > CLI
```

因此首版采用 Web-first full-stack 方案，同时保持核心议事引擎与具体产品入口解耦，便于后续复用到手机 App、桌面 App 和内部 CLI。

技术栈遵循最小依赖原则：首版只引入支撑当前阶段闭环所必需的工具；数据库、E2E、跨端 App、组件库和桌面壳等能力在触发条件明确后再接入。

## 1. Decision Summary

首版固定：

- `TypeScript-first`：核心领域、Web、API、Agent Runtime 和 Provider Adapter 统一使用 TypeScript。
- `Next.js App Router + React`：首个 Web 产品入口，承载 Web UI 和轻量 API。
- `Zod`：仅用于跨边界运行时 schema 校验、Agent 输出校验和 API contract。
- `Vitest`：核心逻辑和服务模块单元测试。

暂不首版引入：

- `SSE`：首个原型可先用普通请求返回完整结果；需要流式展示会议进度和 Agent 发言时再接入。
- `Tailwind CSS + shadcn/ui`：等 Web UI 进入可复用组件阶段再引入；早期可先用 CSS Modules、少量全局 CSS 或框架内置能力。
- `Playwright`：等 Web 关键路径稳定后再接入 E2E。
- `Drizzle + Postgres`：当前不引入；本地会议记录先使用 SQLite + Record Repository，等云端多用户、复杂查询或 migration 压力出现后再评估。
- `Expo / React Native`：手机 App 阶段再引入。
- `Tauri`：桌面 App 阶段再引入。
- `CLI`：只作为开发、调试和自动化入口，不作为首个产品主入口。

## 2. Product Entry Strategy

### 2.1 Web First

RONR 首版最重要的是让用户看见和控制一场 AI 议事会：

- 创建议事会话。
- 配置角色和模型。
- 查看阶段推进。
- 看到不同角色的发言、反对意见、风险和表决。
- 在任意阶段插话、暂停、追问或重开讨论。
- 查看带证据链的行动清单。

这些能力依赖信息密度、实时反馈和证据链展示，优先适合 Web。

### 2.2 App Second

手机 App 和桌面 App 应复用核心协议、API contract 和会话服务，不重新实现议事状态机。

手机 App 和桌面 App 暂不引入具体运行时。等 Web 议事体验稳定后，再根据复用诉求选择：

- 手机 App：优先评估 `Expo / React Native`。
- 桌面 App：优先评估 `Tauri` 或直接使用 Web/PWA 形态。

### 2.3 CLI Last

CLI 不作为 MVP 用户主入口。它可以后续服务：

- 核心状态机调试。
- 固定 fixture 回放。
- Agent 输出检查。
- 自动化测试和开发脚本。

## 3. Recommended Repository Shape

引入语言栈后，建议从当前骨架演进为 monorepo：

```text
.
|-- apps/
|   |-- web/
|   |-- mobile/
|   |-- desktop/
|   `-- cli/
|-- packages/
|   |-- core/
|   |-- agents/
|   |   `-- prompts/
|   |-- providers/
|   |-- contracts/
|   |-- db/
|   `-- ui/
|-- docs/
|-- tests/
`-- scripts/
```

首版不需要一次创建所有目录。当前已创建：

```text
apps/web/
packages/core/
packages/agents/
packages/agents/prompts/
packages/providers/
packages/contracts/
packages/db/
```

等跨端复用明确后再加入 `packages/ui/`、`apps/mobile/` 和 `apps/desktop/`。在这些触发条件出现前，不创建空目录，也不提前安装相关依赖。

新增目录时需要同步更新 `README.md`。

## 4. Package Responsibilities

### 4.1 `apps/web/`

Web 产品入口。

职责：

- 会话创建和配置界面。
- 议事阶段视图。
- Agent 发言展示；需要实时体验时再升级为发言流展示。
- 用户插话、暂停、恢复和重开阶段操作。
- 行动清单和证据链展示。
- 通过 API 调用后端议事服务。

### 4.2 `packages/core/`

确定性 RONR 议事核心。

职责：

- 核心实体。
- 议事状态机。
- 阶段转换校验。
- 角色治理校验。
- 证据链校验。
- 行动清单结构校验。

约束：

- 不依赖 React。
- 不依赖 Next.js。
- 不依赖数据库 SDK。
- 不直接调用 LLM API。
- 不读取网络或外部文件。

### 4.3 `packages/agents/`

Role Agent Runtime。

职责：

- `RoleDefinition`。
- `RoleAgent`。
- `RoleRunner`。
- prompt template loader。
- prompt template 变量校验。
- 角色输出 schema。
- Agent 输出到核心命令的转换。

约束：

- 角色可以生成候选内容，但不能直接修改 session state。
- 状态推进必须经过 `packages/core/`。
- prompt template 内容不能硬编码在 TypeScript 代码文件中。
- TypeScript 代码只负责读取模板、校验变量、组装 message 和执行输出 schema 校验。

Prompt template 作为可配置资源存放在：

```text
packages/agents/prompts/
|-- chair/
|-- secretary/
`-- member/
```

模板格式优先使用纯文本或 Markdown frontmatter。首版不额外引入模板引擎，采用简单命名变量，例如 `{{session_goal}}`、`{{phase}}`、`{{motion_summary}}`。模板加载器必须校验变量是否全部传入，并拒绝未知变量或缺失变量。

每个模板应至少包含：

- `id`
- `role`
- `mandate`
- `phase`
- `version`
- `output_schema_id`
- `template`

后续如果模板数量增加，再评估是否需要专门的 prompt registry、版本管理或远程配置。

### 4.4 `packages/providers/`

模型供应商适配层。

职责：

- 定义统一 `ModelProvider` 接口。
- 首版实现 OpenAI-compatible adapter，并用 PPIO 作为第一个真实 provider preset。
- 后续按需要增加 Claude、DeepSeek 专属接口和本地模型 adapter。
- 标准化超时、限流、鉴权失败、结构化解析失败等错误。

约束：

- 不包含议事阶段判断。
- 不包含角色职责规则。
- 不直接写入持久化状态。
- 不在首版引入供应商 SDK；优先复用运行时 `fetch`。

### 4.5 `packages/contracts/`

跨边界类型和 schema。

职责：

- API request / response schema。
- Web 与服务端共享的 DTO。
- 会话事件 schema。
- 流式事件 schema；仅在接入实时输出时新增。

### 4.6 `packages/db/`

持久化模块。

职责：

- database schema。
- Session repository。
- Event log repository。
- Snapshot repository。
- SQLite adapter。
- 后续 Postgres adapter 的接口边界。

当前本地会议记录已经接入 `packages/db/`，采用 SQLite 作为本地 adapter。Web API 只依赖 Record Repository，不直接依赖 SQLite SQL。ORM 不在当前阶段固定；只有在 schema migration、复杂查询或云端部署需要类型安全迁移时再评估 Drizzle。

## 5. Runtime and API Strategy

首版 Web 可以使用 Next.js `Route Handlers` 提供 API：

```text
POST /api/sessions
GET  /api/sessions/:id
POST /api/sessions/:id/events
```

实时输出按阶段引入。早期可以先用普通请求返回完整阶段结果；当 Web 需要展示会议进度、Agent 发言流或长任务状态时，再使用 `SSE` 输出实时事件：

- `phase_started`
- `agent_speech_delta`
- `agent_speech_completed`
- `objection_recorded`
- `vote_recorded`
- `action_item_created`
- `session_completed`
- `session_failed`

Web UI 只消费事件和 session snapshot，不直接推断核心状态。

## 6. Persistence Strategy

当前阶段已经进入本地持久化：

1. `Local Phase`：SQLite 保存 Deliberation Record、Session Event Log 和 Session Snapshot。
2. `Cloud Phase`：需要云端多用户、跨设备同步、复杂历史查询或运维备份时，再迁移到 Postgres。

事件日志优先于只保存最终结果，因为 RONR 的价值来自可追溯过程。

持久化选型原则：

- 本地运行优先 SQLite，避免为了单机历史记录提前承担 Postgres 运维成本。
- API 和业务层依赖 Record Repository，不依赖具体数据库。
- 需要服务端多用户、部署、复杂历史查询、备份和权限隔离时，再评估 Postgres。
- 需要类型安全 migration 和复杂查询时，再评估 ORM，例如 Drizzle。

## 7. Testing Strategy

测试分层：

- `packages/core` 使用 `Vitest` 覆盖纯领域逻辑。
- `packages/agents` 使用 mock `ModelProvider` 测试角色输出校验和治理规则。
- `packages/providers` 使用 mock response 覆盖错误标准化。
- `apps/web` 先使用组件级或路由级测试；等关键用户流稳定后再接入 `Playwright` E2E。

首批测试应覆盖：

- 成功路径：从用户问题到行动清单。
- 用户插话：补充约束后影响后续阶段。
- 角色治理：不同角色不能越权输出。
- 证据链：行动项必须可追溯到发言、风险和表决。
- 会话事件：Web 可以按顺序消费阶段和发言事件；流式消费在接入 SSE 时再补充。

## 8. Alternatives Considered

### 8.1 `Hono + API-first`

优点：

- API 边界更清晰。
- 后续多端接入自然。
- 服务端实现轻量。

缺点：

- Web 首版体验需要额外搭 UI 应用。
- 用户可感知的产品进度较慢。

结论：不作为首选。若未来需要从 Next.js 中拆出独立 API 服务，再重新评估是否需要 `Hono`。

### 8.2 `Expo Universal App First`

优点：

- 移动端和 Web 有一定代码复用。
- 后续手机 App 路径更短。

缺点：

- RONR 首版的证据链、阶段流和多栏信息展示更偏桌面 Web。
- Web 产品细节和 SEO、分享、桌面交互不如 Next.js 直接。

结论：手机 App 阶段再评估是否引入 Expo。

### 8.3 `Python + FastAPI`

优点：

- LLM 原型生态成熟。
- Pydantic 适合结构化输出。

缺点：

- Web、App、API 和核心类型需要跨语言同步。
- 前端仍需要 TypeScript。

结论：不作为首版主栈。

### 8.4 Heavy Agent Framework

优点：

- 内置工具调用、memory 和多 Agent 编排能力。

缺点：

- RONR 的核心壁垒是自己的议事协议、角色治理和证据链。
- 重型框架容易让状态机、trace 和角色边界变得不可控。

结论：首版不采用。必要时只在 `packages/providers` 或 `packages/agents` 后侧局部适配，不进入核心。

### 8.5 UI Component Library First

优点：

- 可以较快获得一致的基础组件。
- 对复杂表单、弹窗和菜单有帮助。

缺点：

- 首版信息架构和交互模式尚未稳定，组件库可能过早固化 UI 结构。
- 引入样式、主题和生成文件后，维护面变大。

结论：首版先用少量手写组件和基础 CSS。等界面模式稳定、重复组件出现后，再评估 `shadcn/ui` 或其他组件库。

## 9. Initial Implementation Order

建议顺序：

1. 初始化 TypeScript monorepo 和 `apps/web`。
2. 建立 `packages/core` 的实体、状态机和测试。
3. 建立 `packages/contracts` 的 API schema；流式事件 schema 等实时输出接入时再补充。
4. 建立 `packages/agents` 的 `RoleDefinition`、`RoleRunner` 和 mock provider。
5. 在 Web 里实现创建会话、阶段进度和 Agent 发言展示。
6. 接入真实 OpenAI-compatible `ModelProvider` adapter，先使用 PPIO preset 验证。
7. 使用 SQLite + Record Repository 保存本地 Deliberation Records、event log 和 session snapshot。
8. 当 Web 关键路径稳定后，增加 E2E 覆盖完整议事闭环。

## 10. Decisions

- 首个实现语言：`TypeScript`。
- 首个产品入口：`Web`。
- Web 框架：`Next.js App Router`。
- UI 栈：首版使用轻量 CSS 和少量手写组件；组件库按需后置。
- 测试框架：`Vitest`；E2E 按需后置。
- Schema 校验：`Zod`。
- 实时输出：普通请求优先；需要流式体验时使用 `SSE`。
- 持久化：当前本地阶段使用 SQLite + Record Repository；云端多用户和复杂查询阶段再评估 Postgres / Drizzle。
- 手机 App：后续再评估 `Expo / React Native`。
- 桌面 App：后续再评估 `Tauri` 或 PWA。
- CLI：后续内部调试入口。
