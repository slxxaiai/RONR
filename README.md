# RONR

RONR AI 是一个面向个人决策的多 AI Agent 议事系统，用轻量 Robert's Rules of Order 流程组织多个 Agent 讨论、质疑、修正和表决，并输出带证据链的行动清单。

本项目当前已进入 v0 可运行纵切阶段：首个 Web 产品入口使用 Next.js App Router、TypeScript、Zod 和 Vitest，支持 PPIO OpenAI-compatible provider、模型列表、角色配置和单次议事结果展示。

## Default Language

本仓库正文默认使用中文。文档标题、字段名、代码标识符、文件名、命令、第三方 API 名称和协议字段使用英文；没有准确中文表达的核心概念可以保留英文。

## Project Structure

```text
.
|-- README.md
|-- AGENTS.md
|-- CHANGELOG.md
|-- .gitignore
|-- package.json
|-- package-lock.json
|-- config/
|   `-- provider.example.json
|-- docs/
|   |-- architecture.md
|   |-- development.md
|   |-- glossary.md
|   |-- prd.md
|   |-- roadmap.md
|   |-- tech-stack.md
|   `-- features/
|       |-- index.md
|       |-- template.md
|       `-- deliberation-session-lifecycle.md
|-- apps/
|   `-- web/
|-- packages/
|   |-- core/
|   |-- agents/
|   |-- providers/
|   |-- contracts/
|   `-- db/
|-- tests/
|   |-- unit/
|   |-- integration/
|   `-- fixtures/
`-- scripts/
    |-- test.sh
    |-- lint.sh
    `-- dev.sh
```

## Directory Purpose

- `docs/` 存放项目说明、架构、开发、路线图和功能规划文档。
- `config/provider.example.json` 是本地 provider 配置模板；真实密钥写入
  `config/provider.local.json`，该文件已被 Git 忽略，不能提交。
- `docs/glossary.md` 维护核心术语的多语言对照，用于协议、文档和 UI 本地化。
- `docs/tech-stack.md` 记录 Web-first 技术选型、跨端策略和后续 monorepo 演进方向。
- `docs/features/` 独立跟踪重要 RONR 功能，包括状态、范围、验收标准和
  设计说明。
- `apps/web/` 存放首个 Next.js Web 产品入口、API routes、本地化资源和 UI。
- `packages/core/` 预留给核心 AI Agent 议事流程、议事状态机、角色治理和证据链逻辑。
- `packages/agents/` 存放 Role Agent Runtime、顺序角色调用和 Agent 输出 schema 校验。
- `packages/providers/` 存放模型供应商适配层；v0 实现 OpenAI-compatible adapter 和 PPIO preset。
- `packages/contracts/` 存放 API request / response、Agent 配置、会话快照和 provider model schema。
- `packages/db/` 存放 Record Repository、SQLite adapter、Session Event Log 和 Snapshot 持久化边界。
- `tests/unit/` 预留给纯逻辑的单元测试。
- `tests/integration/` 预留给 API、持久化和模块协作的集成测试。
- `tests/fixtures/` 存放可复用测试数据。
- `scripts/` 提供稳定的开发、检查和测试命令入口。

## Development Commands

当前使用 npm 管理 Web-first TypeScript 工具链：

```sh
scripts/dev.sh
scripts/lint.sh
scripts/test.sh
```

底层命令分别是 `npm run dev`、`npm run lint` 和 `npm test`。

首次本地运行前：

```sh
npm install
cp config/provider.example.json config/provider.local.json
```

在 `config/provider.local.json` 中填写 PPIO API key 后运行：

```sh
scripts/dev.sh
```
