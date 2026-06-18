# UI Aesthetic Style

## One-Line Definition

定义 RONR Web UI 采用 shadcn/ui 启发的中性、紧凑、可本地化的工具型视觉风格。

## Status

完成

## Priority

高

## Problem

RONR 当前 Web UI 已能运行议事流程，但视觉语言仍偏早期工程样式：强调色过重、控件密度和状态层级不统一、结果区可读性不足。RONR 需要一个稳定的 UI 美学基线，让后续 Web feature 共享同一套视觉 token、控件尺寸和信息层级，而不是每次新增界面都重新决定样式。

## Users

- 个人决策用户
- 产品设计者
- Web UI 实现者
- 后续 feature 维护者

## Goals

- 提炼 shadcn/ui 的中性黑白灰、语义化 token、紧凑控件、细边框和低装饰风格。
- 将 RONR Web UI 改造成更像工作台和文档工具的界面，而不是营销页或会议工具。
- 保持 `Language Switcher`、locale 偏好和 translation key 管理不被视觉改造破坏。
- 为后续 Web UI 建立可复用的 CSS token、panel、control、tag 和 trace card 风格。

## Non-Goals

- 不引入 shadcn/ui 包或 Tailwind 作为依赖。
- 不重写 RONR 的业务流程、API contract 或 Agent Runtime。
- 不改变 RONR 的产品定位；仍然是面向个人决策的多 AI Agent 议事系统。
- 不追求完全复制 shadcn/ui 网站页面结构，只吸收其视觉原则。

## User Flow

1. 用户打开 RONR Web 工作台。
2. 用户看到紧凑的顶部栏、配置面板、输入区域和结果区。
3. 用户切换 `Locale`，所有固定 UI 文案继续按 translation key 更新。
4. 用户配置模型和角色，控件保持一致的尺寸、边框、hover 和 focus 状态。
5. 用户启动议事后，结果区以细边框、弱背景和清晰 tag 呈现阶段、发言、表决、反对意见和 Action Plan Trace。

## Requirements

- 使用语义化 CSS token，例如 `--background`、`--foreground`、`--card`、`--muted`、`--muted-foreground`、`--border`、`--input`、`--ring`、`--primary`、`--primary-foreground`。
- 主色必须以黑白灰为主，避免绿色、蓝紫渐变或大面积单色强调。
- 控件高度应保持紧凑，普通按钮和 select 接近 32-36px；主要输入区域可以按任务需要更高。
- 卡片、panel、tag 和按钮的圆角应保持在 8-10px 左右，避免夸张圆角。
- 使用细边框、弱背景和少量阴影建立层级，不使用装饰性渐变、orb、bokeh 或营销式 hero。
- 结果区的 `Stage`、`Speech`、`Vote`、`Objection`、`Reservation` 和 `Action Plan Trace` 必须保持可扫描。
- 所有 UI 文案仍必须通过 translation key 管理；视觉改造不得新增不可本地化裸文案。
- hover、disabled 和 `focus-visible` 状态必须可见，且不能造成布局跳动。

## Multilingual and Glossary Impact

- 新增 `Canonical Term`：`UI Aesthetic Style`、`Design Token`、`Focus Ring`。
- 复用已有术语：`Language Switcher`、`Locale`、`Translation Key`、`Fallback Language`、`Minimal Web Deliberation View`、`Action Plan Trace`。
- 本 feature 修改 Web UI 视觉样式，不新增 API 字段、协议字段、角色、阶段或输出结构。
- 需要同步更新 `docs/glossary.md` 的多语言对照。

## Development Mode

`Preview-first`

该 feature 主要影响 Web UI 视觉和可读性。先用 feature 文档固定视觉原则，再实现 CSS / class 调整，并通过浏览器预览、截图和现有 UI 测试验证语言切换与关键流程没有回退。

## Acceptance Criteria

- 存在 `docs/features/ui-aesthetic-style.md`，记录 shadcn/ui 风格提炼和 RONR 采用范围。
- `docs/features/index.md` 收录 `UI Aesthetic Style`。
- `docs/glossary.md` 收录新增 canonical terms。
- Web UI 使用中性 semantic token 系统，不再依赖绿色 accent 作为主要视觉识别。
- 配置面板、主输入区、结果区、tag、按钮、select、textarea 的尺寸、圆角、边框和 focus 状态一致。
- `Language Switcher` 和 locale 偏好仍可用；切换语言后固定 UI 文案仍全部更新。
- 自动化测试、lint、build 和浏览器预览验证通过。

## Verification Plan

- 自动化测试：运行 `npm test` 覆盖语言切换、结果区枚举和运行时 locale 约束。
- 静态检查：运行 `npm run lint` 和 `npm run build`。
- 浏览器检查：在 `http://localhost:3000` 检查桌面视图中控件、panel、tag、结果区和 locale 切换；必要时检查移动宽度。
- 文档检查：确认 feature index 和 glossary 与本 feature 一致。

## Technical Notes

shadcn/ui 当前站点的可观察视觉基线：

- 页面字体为 `Geist, "Geist Fallback"`。
- 首页 H1 约 `48px`、`600` 字重、`52.8px` 行高。
- Header 高度约 `64px`，背景为白色，底部分隔线为浅灰。
- 普通按钮或导航项约 `32px` 高、`14px` 字号、`500` 字重、`8px` 圆角。
- 核心 token 以 `--background`、`--foreground`、`--card`、`--primary`、`--muted`、`--border`、`--ring` 和 `--radius: .625rem` 组织。

RONR 不复制 shadcn/ui 的具体组件实现，而是在现有 CSS 中建立等价的语义 token 和控制尺寸。

## Rollout

先作用于 v0 单页 Web 工作台。后续新增 Web feature 时，应复用本 feature 的 token 和控件风格；如果引入组件库或深色模式，需要更新本 feature。
