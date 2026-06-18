# Repository Guidelines

## Default Language

本仓库正文默认使用中文。文档标题、固定字段名、代码标识符、文件名、命令、第三方 API 名称和协议字段使用英文；
没有准确中文表达的核心概念可以保留英文；
新增文档应遵循“标题字段英文固定、正文中文”的规则。

## Project Structure & Module Organization

本仓库当前是可继续实现的工程骨架：

- `README.md` 介绍 RONR，并记录当前文件结构。
- `AGENTS.md` 提供贡献者和智能体协作指南。
- `CHANGELOG.md` 记录重要项目变更。
- `.gitignore` 定义基础忽略规则。
- `docs/` 存放架构、开发、路线图和功能规划文档。
- `docs/features/` 按功能独立跟踪重要功能规格。
- `apps/web/` 预留给首个 Web 产品入口。
- `packages/core/` 预留给核心 RONR 工作流、议事状态机、角色治理和证据链逻辑。
- `packages/agents/` 预留给 Role Agent Runtime、角色定义、prompt 和输出 schema。
- `packages/providers/` 预留给模型供应商适配层；首版优先实现 OpenAI-compatible adapter 和 PPIO preset。
- `packages/contracts/` 预留给 API request / response、会话事件和流式事件 schema。
- `tests/unit/` 预留给聚焦逻辑的单元测试。
- `tests/integration/` 预留给跨模块和 API 集成测试。
- `tests/fixtures/` 存放可复用测试数据。
- `scripts/` 存放本地开发、检查和测试的稳定命令入口。

保持新增模块职责聚焦。新增目录时，同步在 `README.md` 里说明用途。

## Build, Test, and Development Commands

当前阶段尚未配置构建系统、包管理清单或测试框架。项目较小时使用这些基础命令：

- `rg --files` 快速列出工作区文件。
- `git status --short` 在编辑前后检查未提交变更。
- `scripts/dev.sh` 是预留的本地开发入口。
- `scripts/lint.sh` 是预留的代码检查或格式化入口。
- `scripts/test.sh` 是预留的测试入口。

这些脚本入口当前会明确提示工具链尚未配置。引入语言栈时，需要在同一次
变更中补充标准命令，例如 `npm test`、`npm run dev`、`cargo test` 或
`make build`。

## Coding Style & Naming Conventions

遵循首次引入的语言或框架约定。在工具链加入之前，文件保持 UTF-8 编码；
代码标识符使用清晰英文；文档文件名使用描述性的英文小写或 kebab-case，
例如 `docs/ronr-protocol.md` 或 `docs/deliberation-flow.md`。避免宽泛的
工具模块，优先使用与 RONR AI Agent 议事工作流相关的领域命名。

需求管理，如果需求没有对应的 feature ，请先生成 feature，并和用户确认，再进行实现
最小改动原则，每次只针对单个 feature 做实现和改动，不要修改与当前 feature 无关的代码和文件
最小验证原则，每次变更一个 feature ，都需要做功能验证，且核心模块都要有完整的单元测试

## Development Mode Selection

不要对所有工作强制使用同一种开发范式。每个 issue 或 feature 应根据风险、确定性和影响面选择 `Development Mode`，并在对应 `docs/features/*.md` 中记录。

推荐选择规则：

- Bug 修复：`Regression-first`，先写复现或回归测试，再修复。
- `packages/core` 核心议事状态机、证据链、角色治理：`TDD-first`，先写单元测试，再实现。
- `packages/contracts` API、事件、schema：`Contract-first + test`，先定契约和校验规则，再测试实现。
- `packages/agents` Role Runtime：`Spec + fixture-first`，先定义输入、输出 schema、prompt 变量和 fixture，再实现。
- Prompt template 调整：`Review + fixture eval-first`，先人工审阅模板，再用固定样例验证输出结构。
- `packages/providers` Model Provider Adapter：`Mock + contract-first`，先 mock provider 和错误契约，再接真实 provider。
- Web UI 交互：`Preview-first`，先确认交互效果，再补关键路径测试。
- UI 视觉微调：`Review-first`，人工检查即可；影响流程时补测试。
- 性能优化：`Benchmark-first`，先建立基准，再优化。
- 安全、权限、API key、外部连接：`Threat-model + test-first`，先明确攻击面和边界，再实现。
- 文档改动：`Review-first`，通常不需要自动化测试，但要做一致性检查。

核心模块不能因为选择了非 TDD 模式而降低验证要求。只要影响 `packages/core` 的状态转换、证据链、角色治理或行动清单校验，就必须有自动化单元测试。

## Testing Guidelines

首次实现功能时同步添加测试。自动化测试放在 `tests/` 或框架标准测试目录。
测试命名应描述行为，而不是实现细节，例如 `test_motion_lifecycle` 或
`motion-lifecycle.test.ts`。每个新功能至少包含一个成功路径测试，以及一个
边界条件或校验失败测试。

## Commit & Pull Request Guidelines

当前历史只有一次初始提交，尚未形成项目专属提交规范。提交信息使用简短的祈使句；
如无特殊原因，优先使用中文描述。

合并请求应包含简短摘要、变更原因、测试结果或“尚未配置测试”的说明。
涉及界面变更时附截图或录屏。可用时链接相关问题或设计文档。

## Agent-Specific Instructions

编辑前先检查是否已有项目指导文件，避免覆盖用户手写内容。保持变更范围聚焦；
结构或命令变化时同步更新文档；缺少工具链时明确说明，不要编造不存在的命令。
新增或修改产品文档时，必须保持 RONR 的定位一致：面向个人决策的多 AI Agent
议事系统，而不是辅助人类开会的会议工具。
RONR 默认支持多语言。任何新增或修改 feature、协议、UI 文案、API 字段、
角色、阶段、枚举或输出结构时，都必须检查 `docs/glossary.md`：复用已有
`Canonical Term`，新增名词时同步补充多语言对照，并在对应 feature 文档中
记录多语言影响。
涉及 Web UI 的改动必须支持 `Language Switcher`、locale 偏好和 translation
key 管理；不要新增无法本地化或无法追溯到 `Canonical Term` 的裸文案。
