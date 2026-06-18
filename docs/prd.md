# RONR PRD

## 1. Product Definition

RONR 是 Robert's Rules of Order for AI deliberation。

它是一个面向个人决策的多 Agent 议事系统。用户提出一个问题后，系统创建一场 AI 议事会，由多个 AI Agent 按轻量 Robert's Rules of Order 流程进行结构化讨论、反驳、修正、表决，并最终输出带证据链的行动清单。

RONR 的核心不是让多个模型分别回答同一个问题，而是让多个 AI 角色在规则下形成可追溯的决策过程。

## 2. Problem

用户在复杂问题上常会同时询问 GPT、Claude、DeepSeek 等模型，但会遇到以下问题：

- 多个回答并列堆放，用户仍然需要自己综合判断。
- 模型之间缺少反驳、追问、修正和表决机制。
- 结论缺少来源，用户难以区分共识、争议和单个模型偏见。
- 多 Agent 系统容易变成无序聊天，缺少程序约束和结果可信度。
- 讨论结果经常停留在总结层面，无法自然收敛为下一步行动。

RONR 要解决的问题是：如何把多个 AI 的观点组织成一个有程序、有分歧、有证据、有结论的决策过程。

## 3. Value Proposition

一句话：

> 从“问多个 AI”升级为“召开一场 AI 议事会”。

核心价值：

- 降低用户综合多个模型观点的成本。
- 通过议事义务和特定 mandate 显性暴露盲点。
- 每个 Agent 在表达观点前先搜索最新信息，并把外部依据纳入证据链。
- 用议事流程约束 Agent，避免无序讨论。
- 让最终行动项可追溯到发言、分歧、风险和表决。
- 支持用户随时插话、暂停、追问和重开讨论。
- 把讨论结果收敛成可执行行动，而不是泛泛总结。

## 4. Target Users

MVP 面向个人用户，尤其是需要在复杂问题上做判断的人：

- 产品经理、创业者、研究者、工程师。
- 需要做方案选择、策略判断、学习规划、职业选择的个人。
- 希望利用多个 AI 模型，但不想手动整合多个回答的用户。

第一版不面向企业多人会议，也不做组织协作系统。

## 5. MVP Scope

MVP 支持一个完整议事闭环：

1. 用户输入一个通用问题,可以通过文字、语言、文件输入。
2. 用户选择或配置多个议事 Agent。
3. 每个 Agent 由 `model + role + mandate` 组成。
4. 系统将用户问题转成主议题。
5. Chair Agent 推进轻量议事流程。
6. 各 Agent 在联网搜索并启用 thinking 模式后，按角色轮流发言。
7. 系统提取候选方案、支持理由、反对意见、风险和假设。
8. Chair Agent 组织简化表决或共识确认。
9. Secretary Agent 生成最终行动清单。
10. 每个行动项附带证据链。
11. 用户可随时打断、插话、追问、暂停或要求重开某个阶段。
12. 用户可以配置、选择会议模板，模板有固定的成员

## 6. Core Concepts

- **Deliberation Session / 议事会话**：围绕一个用户问题展开的一次完整讨论。
- **Agent / 议事代理**：模型、角色、职责和行为规则的组合。
- **Model / 模型**：GPT、Claude、DeepSeek、本地模型等能力来源。
- **Role / 角色**：Chair、Secretary、Member 三类基础角色。
- **Mandate / 职责授权**：Agent 在本场议事中的目标、边界和禁止行为。
- **Motion / 动议**：可被讨论、修正和表决的候选主张。
- **Speech / 发言**：Agent 在某个阶段的结构化表达。
- **Web Search Before Speech / 发言前联网搜索**：Agent 在表达观点前先搜索外部信息，并以来源引用支撑观点。
- **Objection / 反对意见**：对候选方案的风险、漏洞或替代观点。
- **Vote / 表决**：Agent 对候选方案的立场，`position` 枚举固定为 `support`、`oppose`、`abstain`、`qualified_support`。
- **Reservation / 保留意见**：附加在表决或建议上的非阻断性顾虑，不是 `Vote.position` 枚举值。
- **Deliberation Trace / 议事证据链**：从行动项追溯到发言、观点、分歧、风险和表决的记录。
- **Action Plan / 行动清单**：最终用户要执行或验证的步骤。

## 7. Role Model

MVP 默认采用简化角色模型。RONR 的核心是议事程序，不是复杂角色扮演系统。

### Required Roles

- **Chair / 主席**：控制流程、确认议题、分配发言权、推进阶段、组织表决或重开讨论。Chair 默认不参与普通辩论，默认不投票，避免既当裁判又当选手。
- **Secretary / 秘书**：记录关键发言、分歧、表决和证据链，生成最终行动清单。Secretary 默认不参与普通辩论，默认不投票。MVP 中可以由系统内置，不一定占用一个外部模型。
- **Member / 议员**：参与讨论、提出观点、质疑、修正、表决。一次议事至少需要 2 个 Member。

### Optional Mandates

Member 可以被分配不同 mandate。mandate 是职责授权，不是新的基础角色。

- **general**：普通议员，参与观点提出、质疑、修正和表决。
- **user-advocate**：站在用户目标、资源、偏好和约束上审查方案。
- **domain-expert**：针对技术、产品、市场、法律、财务等领域提供专业视角。
- **action-planner**：重点把结论转成行动项、验证步骤和优先级。
- **red-team**：强制以反证、失败路径、误用风险和隐藏代价为主要视角。

### Repeatability

- Chair 必选，不可重复。
- Secretary 必选，不可重复。
- Member 必选，至少 2 个，可重复。
- `domain-expert`、`general`、`red-team` 等 Member mandate 可以重复，但应该区分具体关注角度。

质疑、反对和修正是所有 Member 的议事义务，不是某个默认角色的专属职责。用户可以自由决定由不同模型担任不同 Member，或由同一模型通过不同 mandate 担任多个 Member。

## 8. Lightweight Deliberation Flow

MVP 不完整复刻 Robert's Rules of Order，而是采用轻量实用流程：

1. **Call to Order / 议题确认**
   Chair 确认用户问题、目标和约束。
2. **Main Motion / 形成主议题**
   系统将问题转成一个可讨论的主议题。
3. **Opening Statements / 初始陈述**
   各 Agent 按角色给出第一轮观点。
4. **Objections and Risks / 反对与风险**
   Member 明确提出漏洞、反例、风险和适用条件。带 `red-team` 或 `domain-expert` mandate 的 Member 需要优先贡献对应视角。
5. **Amendment / 修正候选方案**
   Chair 整理候选方案，并允许基于反对意见修正。
6. **Deliberation / 聚焦讨论**
   Agent 围绕候选方案进行短轮次讨论，避免发散。
7. **Vote or Consensus / 表决或共识确认**
   Agent 给出 `support`、`oppose`、`abstain` 或 `qualified_support` 之一，并说明理由。若存在非阻断性顾虑，应作为 `Reservation` 附加记录。
8. **Action Resolution / 行动决议**
   Secretary 生成带证据链的行动清单。带 `action-planner` mandate 的 Member 可以先提出行动拆解建议。
9. **User Interruption / 用户插话**
   用户可在任意阶段插话；Chair 判断是补充约束、追问、重开讨论还是暂停。

## 9. Final Output

主输出是带证据链的行动清单。

每个行动项包含：

- 行动内容。
- 推荐理由。
- 预期收益。
- 风险与反对意见。
- 先验证什么。
- 适用条件。
- 相关 Agent 发言来源。
- `support`、`oppose`、`abstain`、`qualified_support` 的表决情况。
- 附加的 `Reservation` 保留意见。
- 用户插话是否影响该行动项。

同时附带简短摘要：

- 推荐方向。
- 关键共识。
- 关键分歧。
- 最大风险。
- 不建议做的事项。
- 下一步最小行动。

## 10. Non-Goals

MVP 不做：

- 完整 Robert's Rules of Order 所有程序。
- 多人类协作会议产品。
- 企业权限和组织管理。
- 模型评测排行榜。
- 复杂 UI。
- 自动执行真实外部任务。
- 替代财务、医疗、法律等高风险领域的专业决策。

## 11. Moats

RONR 的壁垒不在多模型调用，而在以下系统能力：

- **RONR Protocol**：适配 AI Agent 的轻量议事协议。
- **Deliberation Trace**：可追溯的议事证据链。
- **Role Governance**：角色职责隔离和发言质量约束。
- **User Interruption Handling**：用户随时接管后的流程恢复能力。
- **Decision Templates**：不同问题类型的议事模板。
- **Evaluation System**：评估讨论是否充分、分歧是否暴露、行动是否可执行。

## 12. Success Metrics

MVP 可以用这些指标判断是否有效：

- 用户是否认为最终行动清单比单模型回答更可执行。
- 用户是否能看清每个行动项的来源和争议。
- 讨论是否暴露了用户原本没想到的风险。
- 用户是否减少了手动比较多个模型答案的工作量。
- 同一问题多次运行时，流程是否稳定、输出是否结构一致。
- 用户是否愿意在重要问题上重复使用 RONR。

## 13. Next Documents

建议后续继续细化三份文档：

- `docs/ronr-protocol.md`：议事阶段、状态机、发言规则。
- `docs/agent-roles.md`：每个角色的职责、禁止行为、输出格式。
- `docs/action-plan-schema.md`：行动清单和证据链的数据结构。
