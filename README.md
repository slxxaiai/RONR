# RONR

RONR AI 是一个面向个人决策的多 AI Agent 议事系统，用轻量 Robert's Rules of Order 流程组织多个 Agent 讨论、质疑、修正和表决，并输出带证据链的行动清单。

本项目目前处于可继续实现的工程骨架阶段。在选择具体语言栈之前，先固定文档、源码、测试和脚本入口的组织方式。

## Default Language

本仓库正文默认使用中文。文档标题、字段名、代码标识符、文件名、命令、第三方 API 名称和协议字段使用英文；没有准确中文表达的核心概念可以保留英文。

## Project Structure

```text
.
|-- README.md
|-- AGENTS.md
|-- CHANGELOG.md
|-- .gitignore
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
|   `-- contracts/
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
- `docs/glossary.md` 维护核心术语的多语言对照，用于协议、文档和 UI 本地化。
- `docs/tech-stack.md` 记录 Web-first 技术选型、跨端策略和后续 monorepo 演进方向。
- `docs/features/` 独立跟踪重要 RONR 功能，包括状态、范围、验收标准和
  设计说明。
- `apps/web/` 预留给首个 Web 产品入口。
- `packages/core/` 预留给核心 AI Agent 议事流程、议事状态机、角色治理和证据链逻辑。
- `packages/agents/` 预留给 Role Agent Runtime、角色定义、可配置 prompt template 和输出 schema。
- `packages/providers/` 预留给模型供应商适配层；首版优先实现 OpenAI-compatible adapter 和 PPIO preset。
- `packages/contracts/` 预留给 API request / response、会话事件和流式事件 schema。
- `tests/unit/` 预留给纯逻辑的单元测试。
- `tests/integration/` 预留给 API、持久化和模块协作的集成测试。
- `tests/fixtures/` 存放可复用测试数据。
- `scripts/` 提供稳定的开发、检查和测试命令入口。

## Development Commands

当前尚未配置具体语言栈或测试框架。以下脚本入口会在工具链接入前明确
提示“尚未配置”，避免误以为已有可运行命令：

```sh
scripts/dev.sh
scripts/lint.sh
scripts/test.sh
```

引入具体语言栈时，需要同步更新这些脚本，并在本节记录底层命令。
