# Architecture

本文档基于 `docs/prd.md` 和 `docs/roadmap.md`，描述 RONR MVP 的系统架构。当前仓库尚未选择具体语言栈，因此本文优先固定领域边界、数据模型、状态流转、Agent 编排和测试策略，为后续实现提供稳定设计。

## 1. Architecture Goals

RONR 的架构目标是支持一场可追溯、可中断、可恢复的 AI 议事会。系统需要把多个 Agent 的发言组织成受控流程，而不是把多个模型回答简单并列展示。

MVP 架构重点：

- 用确定性核心表示 `Deliberation Session`、阶段、动议、发言、反对意见、表决和行动清单。
- 将 AI 模型调用放在核心规则之外，通过明确接口接入。
- 让每个行动项都能追溯到相关发言、风险、分歧和表决。
- 支持用户在任意阶段插话，并由 Chair 判断暂停、补充约束、追问、重开阶段或恢复流程。
- 先服务个人决策闭环，不提前引入多人协作、企业权限、复杂 UI 或真实外部任务执行。

## 2. Recommended System Shape

RONR 采用“确定性议事核心 + Agent 编排层 + Model Provider 适配层”的形态。

```text
User / Client
    |
    v
API Layer
    |
    v
Deliberation Orchestrator
    |
    +--> Core Domain Engine
    |       |-- Session State Machine
    |       |-- RONR Protocol Rules
    |       |-- Role Governance
    |       `-- Trace Builder
    |
    +--> Agent Runtime
    |       |-- Chair Agent
    |       |-- Secretary Agent
    |       `-- Member Agents
    |           |-- general mandate
    |           |-- user-advocate mandate
    |           |-- domain-expert mandate
    |           |-- action-planner mandate
    |           `-- red-team mandate
    |
    +--> Model Provider Adapters
    |       |-- GPT
    |       |-- Claude
    |       |-- DeepSeek
    |       `-- Local Model
    |
    `--> Persistence / Session Store
```

这个设计把“议事程序是否有效”与“模型如何生成内容”分开。核心模块只接受结构化输入并产生状态变化、校验结果和下一步任务；Agent Runtime 负责把角色、职责授权和上下文组装成模型请求；Model Provider Adapters 只处理供应商差异。

## 3. Module Boundaries

### 3.1 `packages/core/`

`packages/core/` 是 RONR 的领域核心，负责可测试、可复现的议事逻辑。

建议职责：

- 定义核心实体：`DeliberationSession`、`Agent`、`Motion`、`Speech`、`Objection`、`Vote`、`DeliberationTrace`、`ActionPlan`。
- 实现轻量议事状态机：`Call to Order`、`Main Motion`、`Opening Statements`、`Objections and Risks`、`Amendment`、`Deliberation`、`Vote or Consensus`、`Action Resolution`。
- 校验阶段转换是否合法。
- 校验角色是否按 `role + mandate` 输出。
- 维护事件日志和证据链引用。
- 生成或校验行动清单结构。

核心模块不应直接调用外部模型、读写网络、处理 UI、绑定具体数据库或依赖供应商 SDK。

### 3.2 `apps/web/`

`apps/web/` 是首个 Web 产品入口，负责承载用户可见的议事体验，并通过 API 边界调用后端议事服务。

建议职责：

- 提供会话创建和角色配置界面。
- 展示议事阶段、Agent 发言、反对意见、风险、表决和行动清单；需要实时体验时再升级为发言流。
- 接收用户插话、暂停、恢复和重开阶段操作。
- 通过 API contract 调用 Orchestrator。
- 消费 session snapshot 和会话事件，不在 UI 内部推断权威状态；流式事件在接入实时输出时再补充。

MVP 首个产品入口采用 Web-first 方案，技术选型见 `docs/tech-stack.md`。API 层可以先由 Next.js `Route Handlers` 承载，但不应把核心议事逻辑锁死在 Next.js 内部。手机 App、桌面 App 和 CLI 后续都应复用同一套核心协议与 API contract。

### 3.3 `packages/agents/`

`packages/agents/` 负责 Role Agent Runtime。

建议职责：

- 定义 `RoleDefinition`、`RoleAgent` 和 `RoleRunner`。
- 维护 prompt template loader、模板变量校验和角色输出 schema。
- 调用 `ModelProvider` 获取结构化角色输出。
- 将 Agent 输出转换为核心命令候选。

角色可以生成候选内容，但不能直接修改 session state。状态推进必须经过 `packages/core/`。

Prompt template 必须作为可配置资源存放在 `packages/agents/prompts/`，不能硬编码在 TypeScript 代码文件中。代码只负责加载模板、校验变量、组装 message、调用 `ModelProvider` 和校验结构化输出。模板应按 `chair`、`secretary`、`member` 等角色分组，并带有 `id`、`role`、`mandate`、`phase`、`version` 和 `output_schema_id` 等元数据。

### 3.4 `packages/providers/`

`packages/providers/` 负责模型供应商适配。

建议职责：

- 定义统一 `ModelProvider` 接口。
- 首版适配 OpenAI-compatible provider，并以 PPIO preset 验证真实连接。
- 后续按需要扩展 Claude、DeepSeek 专属接口和本地模型。
- 标准化超时、限流、鉴权失败和结构化解析失败等错误。

该模块不负责议事阶段判断、角色职责规则或持久化写入。

### 3.5 `packages/contracts/`

`packages/contracts/` 负责跨边界类型和 schema。

建议职责：

- API request / response schema。
- 会话事件 schema。
- 流式事件 schema；仅在接入实时输出时新增。
- Web 与后端共享的 DTO。

### 3.6 Future Modules

技术选型确定为 TypeScript-first 后，可以按需要扩展以下模块，但不要求当前立即创建目录：

- `packages/db/`：承载会话快照、事件日志、repository 和 migration。
- `packages/ui/`：承载跨 Web、手机 App 和桌面 App 复用的 UI 基础组件。
- `packages/evaluation/`：承载议事质量评估，例如分歧暴露、风险覆盖、行动项可执行性和证据链完整性。
- `apps/mobile/`：承载后续手机 App。
- `apps/desktop/`：承载后续桌面 App。
- `apps/cli/`：承载内部调试和自动化入口。

具体目录演进见 `docs/tech-stack.md`。

新增目录时需要同步更新 `README.md`。

## 4. Core Domain Model

### 4.1 `DeliberationSession`

`DeliberationSession` 是一次完整议事闭环的根对象。

关键字段：

- `id`：会话唯一标识。
- `userQuestion`：用户原始问题。
- `goal`：Chair 确认后的目标。
- `constraints`：用户提供或插话补充的约束。
- `locale`：会话输出语言环境，例如 `zh-CN`、`en-US`。
- `maxDeliberationRounds`：用户可选设置的最大讨论轮次；为空时由 AI 自动判断收敛。
- `deliberationRoundCount`：Deliberation 阶段已完成的讨论轮次数。
- `convergenceStatus`：Deliberation 阶段的收敛判断状态。
- `phase`：当前议事阶段。
- `agents`：本场议事使用的 Agent 列表。
- `motions`：主议题和候选方案。
- `speeches`：结构化发言记录。
- `objections`：反对意见、风险、失败条件和替代观点。
- `votes`：Agent 对候选方案的表决记录，`position` 只允许 `support`、`oppose`、`abstain`、`qualified_support`。
- `reservations`：附加在表决、动议或行动项上的非阻断性保留意见。
- `trace`：可追溯证据链。
- `actionPlan`：最终行动清单。
- `status`：`created`、`active`、`paused`、`completed`、`cancelled`、`failed`。

### 4.2 `Agent`

`Agent` 是模型、角色和职责授权的组合。

关键字段：

- `id`
- `model`
- `role`
- `mandate`
- `constraints`
- `outputSchema`

`role` 决定 Agent 在流程中的发言职责，`mandate` 决定本场议事的边界和禁止行为。`model` 是能力来源，不应决定领域规则。

### 4.3 `Motion`

`Motion` 表示可讨论、修正和表决的候选主张。

关键字段：

- `id`
- `title`
- `description`
- `status`
- `createdFrom`
- `amendments`
- `supportingSpeechIds`
- `opposingSpeechIds`
- `riskIds`
- `voteIds`

MVP 可以先支持一个主议题和少量候选方案，不需要实现完整 Robert's Rules of Order 的所有动议类型。

### 4.4 `Speech`

`Speech` 是 Agent 在某个阶段的结构化表达。

关键字段：

- `id`
- `sessionId`
- `agentId`
- `role`
- `phase`
- `content`
- `claims`
- `assumptions`
- `references`
- `createdAt`

`Speech` 是证据链的基础单元。后续行动项不应只引用自然语言摘要，而应引用具体 `speechId`、`objectionId` 或 `voteId`。

### 4.5 `Objection`

`Objection` 表示反对意见、风险、反例、代价或失败条件。

关键字段：

- `id`
- `motionId`
- `raisedBy`
- `type`
- `description`
- `severity`
- `condition`
- `sourceSpeechId`
- `resolutionStatus`

### 4.6 `Vote`

`Vote` 表示 Agent 对候选方案的立场。

关键字段：

- `id`
- `sessionId`
- `motionId`
- `agentId`
- `position`：`support`、`oppose`、`abstain`、`qualified_support`
- `reason`
- `conditions`
- `sourceSpeechId`
- `reservationIds`

`Reservation` 是表决或建议的附加保留意见，不是 `position`。当 Agent 支持但附带限制条件时，应使用 `qualified_support`；当 Agent 不参与支持或反对判断时，应使用 `abstain`。

### 4.7 `Reservation`

`Reservation` 表示附加在表决、动议或行动项上的非阻断性保留意见。

关键字段：

- `id`
- `sessionId`
- `agentId`
- `targetType`
- `targetId`
- `content`
- `condition`
- `sourceSpeechId`
- `createdAt`

`Reservation` 不改变 `Vote.position`，也不阻止 `ActionPlan` 生成。如果顾虑会阻止推荐方向，应记录为 `Objection`。

### 4.8 `ActionPlan`

`ActionPlan` 是最终主输出。

关键字段：

- `summary`
- `recommendedDirection`
- `consensus`
- `disagreements`
- `largestRisks`
- `notRecommended`
- `nextSmallestAction`
- `items`

每个 `ActionItem` 至少包含：

- `content`
- `reason`
- `expectedBenefit`
- `risks`
- `firstValidation`
- `conditions`
- `sourceSpeechIds`
- `sourceObjectionIds`
- `sourceVoteIds`
- `sourceReservationIds`
- `userInterruptionImpact`

## 5. Session State Machine

会话生命周期、议事阶段、阶段转换、`ConvergenceStatus`、`maxDeliberationRounds`、`deliberationRoundCount` 和 `round_limit_reached` 的权威定义在 `docs/features/deliberation-state-model.md`。本节只保留架构层面的状态机约束，避免同一事实在 architecture 和 feature 文档中重复维护。

状态机设计要求：

- 每次阶段推进都通过显式命令完成，例如 `confirmGoal`、`createMainMotion`、`recordSpeech`、`recordObjection`、`amendMotion`、`recordVote`、`resolveActionPlan`。
- 阶段转换、收敛判断和轮次限制必须委托 `packages/core/` 校验；Orchestrator 不得复制或绕过 `Deliberation State Model` 中的规则。
- Web UI、Agent Runtime 和 Provider Adapter 只能消费 validated snapshot 或调用核心命令，不能直接改写 `status`、`phase`、`convergenceStatus` 或轮次字段。
- 用户插话必须被记录为事件，并影响后续上下文。
- 重开阶段时，系统不删除历史记录，而是追加新事件，并在证据链中标记哪些行动项受插话影响。

## 6. Deliberation Orchestrator

`Deliberation Orchestrator` 是连接核心状态机、Agent Runtime、模型适配器和持久化的应用层。

核心职责：

1. 读取当前 `DeliberationSession`。
2. 根据 `phase` 和核心规则判断下一步需要哪个 Agent 输出。
3. 为目标 Agent 构造受约束的任务上下文。
4. 调用 Agent Runtime 获取结构化输出。
5. 将输出转换为核心命令，例如 `recordSpeech` 或 `recordVote`。
6. 调用 `packages/core/` 校验并推进状态。
7. 保存事件日志和会话快照。
8. 返回当前结果、下一步任务或最终行动清单。

Orchestrator 可以包含重试、超时、模型失败降级等运行时逻辑，但不应在这里绕过核心规则直接改写会话结果。

## 7. Agent Runtime

Agent Runtime 负责把角色模板、职责授权、当前阶段和证据上下文转换为模型可执行任务。

Agent Runtime 默认在每个 Agent 表达观点前执行联网搜索，生成 `Search Result Summary` 和 `Source Reference` 后再调用模型。模型调用默认启用 thinking / reasoning 配置，但原始 chain-of-thought 不得进入 session snapshot、event log、trace 或 UI。

MVP 默认基础角色：

- `Chair`：确认议题、控制阶段、处理插话、组织表决。
- `Secretary`：记录关键发言、分歧、证据链和最终结果。
- `Member`：提出观点、质疑、修正、表决。一次议事至少需要两个 Member。

Member 可以被分配不同 mandate：

- `general`：普通议员，参与观点提出、质疑、修正和表决。
- `user-advocate`：站在用户目标、资源、偏好和约束上审查方案。
- `domain-expert`：针对具体领域提供专业视角。
- `action-planner`：重点把结论转成行动项、验证步骤和优先级。
- `red-team`：强制以反证、失败路径、误用风险和隐藏代价为主要视角。

质疑、反对和修正是所有 Member 的议事义务，不是某个默认角色的专属职责。

Agent Runtime 应提供统一输出约束：

- 每次输出都带 `agentId`、`role`、`phase`。
- 发言必须区分 `claim`、`assumption`、`risk`、`recommendation`。
- 发言必须引用搜索摘要或明确的搜索失败记录。
- 反对意见必须关联到目标 `motionId` 或明确说明它反对的是整体方向。
- 表决必须输出明确 `position` 和理由。
- 行动建议必须引用来源，不能只给结论。

## 8. Model Provider Adapters

`Model Provider Adapter` 层屏蔽不同模型供应商的调用差异。

统一接口应表达：

- `provider`
- `model`
- `messages`
- `responseSchema`
- `temperature`
- `maxTokens`
- `timeout`
- `webSearchEnabled`
- `thinkingEnabled`
- `thinkingBudget`

适配层职责：

- 构造供应商请求。
- 处理供应商响应。
- 将响应转换为 Agent Runtime 需要的结构。
- 适配 provider 原生搜索能力或接入独立 Search Provider 的结果。
- 适配 provider thinking / reasoning 参数，并过滤原始推理链。
- 标准化错误，例如超时、限流、鉴权失败、结构化输出解析失败。

适配层不负责决定议事阶段，不负责修改证据链，也不负责判断行动项是否可接受。

OpenAI-compatible provider 的详细连接契约、PPIO preset、Bearer 鉴权、错误映射和 secret 边界以 `docs/features/model-provider-connection.md` 为准。架构文档只保留模块边界，避免重复维护供应商细节。

## 9. Persistence Strategy

MVP 应优先保存两类数据：

- `Event Log`：所有用户输入、Agent 输出、阶段推进、插话、重开和表决事件。
- `Session Snapshot`：当前会话状态的可恢复快照。

推荐事件优先的原因：

- 用户插话和阶段重开需要保留历史，而不是覆盖旧状态。
- 行动项需要追溯到具体发言、风险和表决。
- 后续质量评估可以基于完整议事过程计算。

在没有数据库前，可以先用内存、fixture 或本地文件表示；需要本地恢复、历史记录或服务端多用户能力时，再按 `docs/tech-stack.md` 的阶段策略评估 SQLite、Postgres 或 ORM。选择不应泄漏到核心领域模块。

## 10. Deliberation Trace

`Deliberation Trace` 是 RONR 的核心壁垒之一。它不是普通日志，而是连接最终行动项和议事过程的结构化索引。

Trace 应支持从 `ActionItem` 反查：

- 哪些 Agent 支持该行动。
- 哪些 Agent 反对、弃权或有条件支持该行动。
- 哪些行动附加了 `Reservation` 保留意见。
- 关键风险来自哪些发言。
- 哪些假设尚未验证。
- 用户插话是否改变了行动项。
- 最终建议是否来自修正后的动议。

基本结构：

```text
ActionItem
  -> Speech[]
  -> Objection[]
  -> Vote[]
  -> Motion
  -> UserInterruption[]
```

核心校验规则：

- 没有来源引用的行动项不能进入最终输出。
- 有重大未解决风险的行动项必须在 `risks` 和 `firstValidation` 中体现。
- 表决存在明显分歧时，摘要必须显示关键分歧，而不是伪装成共识。

## 11. User Interruption Handling

用户插话是 MVP 的核心能力，不是附加聊天功能。

插话类型：

- `add_constraint`：补充目标、限制、偏好或背景。
- `ask_followup`：追问某个发言、风险或候选方案。
- `pause`：暂停自动推进。
- `resume`：恢复流程。
- `reopen_phase`：重开某个阶段。
- `cancel_session`：用户主动放弃本次议事，session 进入 `cancelled`。

用户要求改变讨论方向时，不新增 `redirect` 枚举。轻量方向调整按 `add_constraint` 处理；需要推翻前序上下文或重新讨论时按 `reopen_phase` 处理。

处理流程：

1. API Layer 接收用户插话。
2. Orchestrator 将插话记录为事件。
3. Chair Agent 判断插话类型和影响范围。
4. Core Domain Engine 校验是否允许暂停、恢复或重开。
5. Session 更新约束或阶段。
6. 后续 Agent 输出必须带上插话后的新上下文。
7. 最终行动项标记 `userInterruptionImpact`。

## 12. Error Handling

错误分为四类：

- `ValidationError`：用户输入、Agent 输出或核心命令结构不合法。
- `StateTransitionError`：当前阶段不允许执行目标操作。
- `RoleGovernanceError`：Agent 输出不符合角色职责或缺少必要字段。
- `ProviderError`：模型供应商超时、限流、鉴权失败或返回不可解析内容。

处理原则：

- 核心规则错误应返回清晰、可测试的原因。
- Provider 失败不应破坏当前会话状态。
- 结构化输出解析失败时，Orchestrator 可以要求同一 Agent 修复输出，但修复过程也应记录事件。
- 最终行动清单生成失败时，应保留已完成的发言、风险和表决，允许用户恢复或重试。

## 13. Testing Strategy

测试应跟随 roadmap 的 `Next` 阶段逐步加入。

优先测试：

- 成功路径：从用户问题到行动清单的完整闭环。
- 状态机边界：缺少主议题时不能进入发言阶段。
- 用户插话：补充约束后，后续阶段使用新约束，最终行动项标记影响。
- 反对意见进入行动项：重大风险必须出现在行动项风险和首个验证步骤中。
- 证据链缺失校验：没有 `sourceSpeechIds`、`sourceObjectionIds` 或 `sourceVoteIds` 的行动项不能通过最终校验。
- 角色治理：Chair 不参与普通辩论，Secretary 不篡改观点，Member 必须按 mandate 提出观点、质疑、修正或表决。

测试分层：

- `tests/unit/`：核心实体、状态转换、证据链校验、角色治理规则。
- `tests/integration/`：Orchestrator 与模拟 Agent Runtime、模拟 Model Provider、持久化快照的协作。
- `tests/fixtures/`：稳定的会话输入、Agent 输出样例、失败样例和最终行动清单样例。

测试工具链以 `docs/tech-stack.md` 为单一事实源。首次实现具体功能时应同步更新脚本入口并添加自动化测试，E2E 工具在 Web 关键路径稳定后再接入。

## 14. Security and Safety Boundaries

MVP 不执行真实外部任务，也不替代财务、医疗、法律等高风险专业决策。

架构层面的约束：

- 行动清单只输出建议和验证步骤，不直接调用外部执行系统。
- 高风险领域应在最终输出中显示限制和建议咨询专业人士。
- 用户提供的敏感信息应只进入当前会话上下文；是否长期记忆属于后续独立设计。
- Model Provider Adapter 不应记录或扩散超出会话需要的上下文。

## 15. Roadmap Alignment

### Now

当前阶段应继续补齐：

- `docs/ronr-protocol.md`：阶段、状态转换和发言规则。
- `docs/agent-roles.md`：默认角色、职责、禁止行为和输出格式。
- `docs/action-plan-schema.md`：行动清单与证据链结构。

### Next

下一阶段把本文架构转成可测试核心流程：

- 建模核心实体。
- 实现状态机和阶段转换。
- 实现用户插话处理。
- 实现角色治理校验。
- 实现证据链生成和行动清单校验。
- 添加第一批单元测试和集成测试。

### Later

核心议事引擎稳定后再扩展：

- Web 应用作为首个产品入口。
- 手机 App 和桌面 App 复用核心协议与 API contract。
- CLI 作为内部调试和自动化入口。
- 多模型供应商适配。
- 决策模板。
- 议事质量评估体系。
- 历史议事记录和用户偏好记忆。
- 多人类协作会议产品。

## 16. Technical Decisions

技术选型的单一事实源是 `docs/tech-stack.md`。架构文档只保留架构约束：核心议事模块必须独立于 Web 框架、UI、数据库和 LLM SDK，产品入口与运行时选型不得反向污染 `Core Domain Engine`。

仍需在实现计划中进一步细化：

- 是否首版直接接入真实多供应商模型，还是先使用可替换的 mock Provider。
- 结构化模型输出优先使用 JSON Schema、tool calling 还是 provider-specific structured output。
