# Roadmap

本路线图承接 `docs/prd.md`，使用“现在 / 下一步 / 以后”格式。PRD 是产品范围和价值主张的源头，Roadmap 负责把 PRD 中的 MVP 能力拆成阶段性工作。

## Now

当前阶段目标是把 RONR 的核心产品概念固定为可实现的设计规格。

- 固定 `docs/prd.md` 中的产品定位：面向个人决策的多 Agent 议事系统。
- 维护 `docs/glossary.md`，将核心协议、角色、流程和输出术语映射到多语言 UI 文案。
- 起草 `docs/ronr-protocol.md`，定义轻量 Robert's Rules of Order 议事阶段、状态转换和发言规则。
- 起草 `docs/agent-roles.md`，定义 Chair、Secretary、Member 三类基础角色，以及 `general`、`user-advocate`、`domain-expert`、`action-planner`、`red-team` 等 Member mandate。
- 起草 `docs/action-plan-schema.md`，定义带证据链的行动清单结构。
- 明确 MVP 不做的范围：完整议事法、多用户协作、企业权限、模型排行榜、复杂 UI 和自动执行外部任务。

## Next

下一阶段目标是把文档化的议事协议转成可测试的核心流程。

- 建模 `Deliberation Session`、`Agent`、`Motion`、`Speech`、`Objection`、`Vote`、`Deliberation Trace` 和 `Action Plan` 等核心概念。
- 实现轻量议事状态机，覆盖议题确认、主议题形成、初始陈述、反对与风险、方案修正、聚焦讨论、表决或共识确认、行动决议。
- 实现用户插话处理，支持暂停、补充约束、追问、重开阶段和恢复自动流程。
- 实现角色治理校验，确保 Chair、Secretary、Member 的职责边界清晰，并确保 Member 按各自 mandate 发言，避免无序附和。
- 实现证据链生成，让每个行动项可追溯到发言、分歧、风险和表决。
- 添加第一批自动化测试，至少覆盖成功路径、用户插话、反对意见进入行动项、证据链缺失校验。

## Later

后续阶段目标是在核心议事引擎稳定后扩展产品形态和长期壁垒。

- 增加 CLI、Web 应用或 API 形态，用于运行完整议事会话。
- 增加模型供应商适配层，支持 GPT、Claude、DeepSeek、本地模型等不同 `Model Provider`。
- 增加决策模板，例如技术选型、产品优先级、职业选择、采购决策和研究规划。
- 增加议事质量评估体系，检查分歧是否充分、风险是否暴露、行动项是否可执行、证据链是否完整。
- 增加历史议事记录和用户偏好记忆，用于复盘和改进后续议事配置。
- 在需要时扩展为多人类协作议事产品，但不影响 MVP 的个人决策定位。
