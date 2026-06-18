# Default Multilingual Support

## One-Line Definition

确保 RONR 的所有 feature、协议、UI 文案、API 字段和输出结构默认遵循多语言术语管理，并在 UI 中支持语言切换。

## Status

草稿

## Priority

高

## Problem

RONR 面向多语言用户。如果新增 feature 时没有同步术语、本地化口径和 UI 语言切换约束，协议字段、UI 文案和文档会逐渐出现同义词漂移，最终影响实现、翻译和用户理解。

## Users

- 个人决策用户
- 产品设计者
- 后续实现者
- 文档维护者

## Goals

- 将多语言支持设为所有后续改动的默认要求。
- 让新增名词、枚举、角色、阶段和输出字段都能映射到唯一 `Canonical Term`。
- 保持 `docs/glossary.md` 作为术语和本地化口径的单一事实源。
- 在 UI 中提供语言切换能力，并确保可见文案通过本地化资源管理。

## Non-Goals

- 本轮提供所有未来语言的完整翻译。
- 本轮不要求完成所有深层业务内容的人工翻译，但必须先建立可扩展的 locale、translation key 和 fallback 机制。

## User Flow

1. 用户进入 Web UI。
2. 用户通过 `Language Switcher` 选择可用 locale。
3. UI 将导航、按钮、状态、错误提示和核心流程文案切换到对应语言。
4. 如果某个 translation key 缺少目标语言文案，系统使用默认语言 fallback，并保留可追踪的 key。
5. 维护者新增或修改 feature 时，检查该 feature 是否引入新的术语、枚举、角色、阶段、字段或 UI 文案。
6. 如果术语已存在，feature 文档复用 `docs/glossary.md` 中的 `Canonical Term`。
7. 如果术语不存在，维护者先更新 `docs/glossary.md` 的多语言对照。
8. feature 文档在 `Multilingual and Glossary Impact` 中记录术语影响。

## Requirements

- 所有新增 feature 文档必须包含 `Multilingual and Glossary Impact`。
- 新增 `Canonical Term` 必须同步写入 `docs/glossary.md`。
- 协议字段、API 字段、枚举值和代码标识符优先使用英文 canonical term。
- UI 文案可以本地化，但必须能追溯到唯一 canonical term。
- UI 必须提供可见的 `Language Switcher`。
- 首批支持 locale 为 `zh-CN`、`zh-TW`、`en`、`ja`、`ko`，对应 `docs/glossary.md` 的语言列。
- 默认 locale 为 `zh-CN`。
- 用户切换语言后，系统应保存用户偏好，并在后续会话中复用。
- 所有用户可见静态 UI 文案必须通过 translation key 管理，不允许散落硬编码。
- Web UI 的固定结构标签必须通过 translation key 管理，包括页面标题、`html lang`、语言切换器、配置面板、错误提示、结果区 section 标题、阶段、角色、mandate、Vote.position、Motion.status、Objection type / severity / resolution status、Action Plan Trace 字段名。
- AI 生成的正文内容不在前端猜译；创建会话时必须传入当前 `locale`，Role Agent Runtime 必须把该 locale 作为输出语言约束传给 Chair、Member 和 Secretary Agent。
- 缺少目标语言翻译时，必须 fallback 到默认语言，并保留后续补齐翻译的可追踪项。
- 修改已有术语时，必须检查 PRD、Roadmap、Architecture、Feature 文档和 Glossary 是否一致。

## Multilingual and Glossary Impact

- 引入新的 `Canonical Term`：`Default Multilingual Support`、`Multilingual and Glossary Impact`、`Language Switcher`、`Locale`、`Translation Key`、`Fallback Language`。
- 复用已有术语：`Canonical Term`、`docs/glossary.md`、`Role`、`Mandate`、`Vote`、`Action Plan`。
- Web 结果视图复用已有术语：`Motion Status`、`Objection Type`、`Objection Severity`、`Resolution Status`、`Action Plan Trace`、`Source Reference`、`Validation Step`、`Rationale`、`Reservation`。
- 新增 feature 模板字段：`Multilingual and Glossary Impact`。
- 本 feature 要求同步更新 `docs/glossary.md`。

## Development Mode

`Build-first`

原因：该 feature 既是项目级文档和流程约束，也要求 Web UI 具备语言切换能力；后续实现需要运行时代码、翻译资源和 UI 验证。

## Acceptance Criteria

- `docs/features/template.md` 包含 `Multilingual and Glossary Impact`。
- `docs/features/index.md` 将 `Default Multilingual Support` 标记为 P0 高优先级 feature。
- `docs/glossary.md` 收录本 feature 引入的新 canonical terms。
- `AGENTS.md` 明确要求后续任何相关改动都检查并维护 glossary。
- Web UI 提供 `Language Switcher`，至少支持 `zh-CN`、`zh-TW`、`en`、`ja`、`ko`。
- 切换 locale 后，导航、按钮、状态、错误提示和核心流程文案能更新为目标语言或按规则 fallback。
- 切换 locale 后，结果视图中所有固定结构标签和枚举值必须更新为目标语言；AI 生成的标题、摘要、理由等正文内容由 session `locale` 约束生成，不由前端临时翻译。
- 切换 locale 后，浏览器 `document.title` 和 `html lang` 必须同步更新。
- 用户语言偏好能在后续会话中复用。

## Verification Plan

- 自动化测试：覆盖 locale 选择、偏好复用、fallback、translation key 缺失、结构化错误本地化、结果区枚举/字段标签本地化、Role Agent Runtime 传递输出语言约束。
- fixture 验证：需要为首批 locale 准备最小翻译资源 fixture。
- 人工检查：检查模板、索引、AGENTS、glossary 和 Web UI 语言切换是否形成闭环。
- 当前文档变更验证：检查 `Non-Goals` 不再排除语言切换 UI，并确认 glossary 收录新增 canonical terms。

## Technical Notes

未来实现 Web UI 或 API contract 时，应将本 feature 转化为 lint、schema、translation key 检查和 PR checklist 约束，避免新增不可本地化文案或未登记 canonical term。

建议运行时最小设计：

- `locale` 使用 BCP 47 风格标识，例如 `zh-CN`、`zh-TW`、`en`、`ja`、`ko`。
- translation key 使用稳定英文路径，例如 `session.startButton`。
- 默认 fallback 顺序为目标 locale -> `zh-CN`。
- 对 AI 生成内容不强制实时完整翻译，但系统 UI、结构化字段标签和错误提示必须可本地化。

## Rollout

立即作为 P0 文档规则生效。Web MVP 应在最小界面中实现语言切换入口；后续所有 feature 文档和实现计划都必须遵循。
