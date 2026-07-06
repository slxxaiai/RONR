# Minimal Web Deliberation View

## One-Line Definition

定义最小 Web 议事视图需要展示的三栏工作台、会议进度状态栏、流式会议输出、Agent 群聊式发言流、分歧、表决和行动清单。

## Status

完成

## Priority

高

## Problem

用户需要看见 AI Agent 议事过程，而不只是等待最终总结。最小 Web 视图必须让用户在一个工作台里完成话题输入、角色配置和议事观察，并通过群聊式发言流理解谁在发言、分歧在哪里、结论如何形成。

## Users

- 个人决策用户
- Chair Agent
- Secretary Agent
- Member Agent

## Goals

- 采用左中右三栏布局：左侧 `Topic Panel`，中间 `Meeting Area`，右侧 `Role Configuration Panel`。
- 在 `Meeting Area` 标题行展示 `Meeting Status Bar`，让用户实时识别当前 `Stage`、当前调度 Agent、`Current Speaker` 和会话是否已完成。
- 以 `Streaming Meeting Output` 和 `Chat Thread` 展示 Agent 发言，每条 `Agent Turn Message` 显示 Agent 头像、角色、mandate 和阶段。
- 在同一个 `Agent Turn Message` 中合并展示一次 Agent 回合的 `Search Source Citation`、`Thinking Summary` 和 Speech，不拆成多个对话消息。
- `Search Source Citation` 和 `Thinking Summary` 放入默认收起的 `Collapsed Detail`，用户主动展开后查看。
- Speech 使用 `Typewriter Streaming` 逐字显示，不在单个事件到达时一次性插入完整内容。
- 展示 Agent 发言、Objection、Vote 和 Action Plan。
- 让用户能理解最终建议的来源。

## Non-Goals

- 复杂可视化图谱。
- 椭圆或矩形会议桌布局。
- 多会话仪表盘。
- 响应式移动端完整体验。

## User Flow

1. 用户在 `Topic Panel` 输入个人决策问题，可添加文件补充背景，也可直接在问题中粘贴 URL。
2. 用户在 `Role Configuration Panel` 配置 Chair、Secretary、Member、model、mandate 和最大讨论轮次。
3. 用户启动 Deliberation Session。
4. `Meeting Area` 标题行通过 `Meeting Status Bar` 展示当前进度，正文以 `Streaming Meeting Output` 展示等待状态、搜索来源、思考摘要、Agent 发言和后续议事输出。
5. 每个 Agent 回合在 `Meeting Output` 中形成一个 `Agent Turn Message`；搜索来源和思考摘要进入默认收起的 `Collapsed Detail`，Speech 通过 `Typewriter Streaming` 逐字显示。
6. 表决阶段展示 Vote.position 分布。
7. 行动决议阶段展示 Action Plan 和 trace。

## Requirements

- 视图必须区分阶段、Agent、发言类型和最终行动项。
- Web 首屏必须采用三栏信息架构，左右为可折叠 `Side Panel`，中间为主要 `Meeting Area`。
- `Topic Panel` 必须承载个人决策问题、文件输入、URL 自动抓取提示和启动议事入口，不展示手动链接输入控件。
- `Role Configuration Panel` 必须承载 provider 状态、角色模型选择、Member mandate、最大讨论轮次和添加/删除 Member。
- `Meeting Area` 必须以群聊式 `Chat Thread` 为主，不使用椭圆桌、环形头像或会议桌模拟布局。
- `Meeting Status Bar` 必须位于 `Meeting Area` 标题行，展示当前 `Stage`、当前调度 Agent、`Current Speaker` 和会话进度状态。
- `Meeting Status Bar` 字体必须弱于标题和正文，避免抢占 `Chat Thread` 的阅读重点。
- `Meeting Output` 必须支持流式追加事件，至少包括 `search_sources`、`thinking`、`speech` 和 `completed`。
- 同一 Agent、同一 Stage 的 `search_sources`、`thinking` 和 `speech` 必须合并为一个 `Agent Turn Message`，不得拆成多个独立对话气泡。
- 同一 Agent 在同一 Stage 再次开始新的搜索、思考、生成过程时，必须生成新的 `Agent Turn Message`，不得覆盖或混入上一条已完成发言。
- `Thinking Summary` 必须使用淡色、低对比样式，放入默认收起的 `Collapsed Detail`；不得展示 `Raw Chain-of-Thought`。
- `Search Source Citation` 必须在对应 `Agent Turn Message` 内明确展示标题、URL 和可用摘要，并默认收起，用户可主动展开。
- 当 `search_sources` 没有可用来源时，`Agent Turn Message` 仍必须保留默认收起的搜索详情，展示 `Search Status` 和可用的 `Search Error Code`，不得静默吞掉搜索步骤。
- Speech 必须使用 `Typewriter Streaming` 逐字显示，不得在 `speech` 事件到达时一次性插入完整段落。
- 每条 `Agent Turn Message` 必须显示角色头像和 Agent 发言内容；可以用弱 tag 展示角色、mandate 和 Stage。
- 左右 `Side Panel` 可以隐藏，隐藏后必须提供边缘恢复入口。
- Vote.position 必须显示为支持、反对、弃权、有条件支持。
- Reservation 必须独立展示为保留意见。
- Action Item 必须能展示来源引用摘要。
- 结果视图中的固定结构标签必须支持多语言，包括当前阶段、主议题、发言、反对意见、表决、保留意见、行动清单追溯、理由、条件、验证步骤和来源引用。
- 结果视图中的枚举值必须支持多语言，包括阶段、角色、mandate、Vote.position、Motion.status、Objection type、Objection severity 和 Resolution status。

## Multilingual and Glossary Impact

- 复用已有术语：`Stage`、`Role`、`Mandate`、`Vote Position`、`Motion Status`、`Objection Type`、`Objection Severity`、`Resolution Status`、`Action Plan Trace`、`Rationale`、`Validation Step`、`Source Reference`、`Reservation`、`Condition`、`Topic Panel`、`Meeting Area`、`Role Configuration Panel`、`Meeting Output`、`Meeting Status Bar`、`Current Speaker`、`Raw Chain-of-Thought`。
- 新增 `Canonical Term`：`Side Panel`、`Chat Thread`、`Chat Message`、`Agent Turn Message`、`Collapsed Detail`、`Streaming Meeting Output`、`Typewriter Streaming`、`Thinking Summary`、`Search Source Citation`、`Search Status`、`Search Error Code`。
- Web UI 结果区新增或修改文案时，必须同步维护 translation key，并检查 `docs/glossary.md`。

## Development Mode

`Preview-first`

该 feature 主要定义最小 Web 信息架构，应先通过预览确认阶段、发言、表决和 trace 展示是否可读，再补关键路径测试。

## Acceptance Criteria

- 用户能从 Web 视图识别左侧话题输入区、中间议事输出区和右侧角色配置区。
- 用户能隐藏和恢复左右 `Side Panel`。
- 用户能看到至少 Chair、Secretary、Member 的输出。
- 用户能在 `Meeting Area` 标题行看到当前 `Stage`、当前调度 Agent、`Current Speaker` 和等待、进行中、完成或异常状态。
- 用户能在中央 `Meeting Output` 中看到实时追加的 Agent 回合消息，搜索来源和淡色思考摘要默认收起，展开后可查看。
- 用户能在同一个 `Agent Turn Message` 中查看该 Agent 本回合的搜索来源、思考摘要和发言。
- 用户能看到 Speech 逐字显示，而不是整段内容一次性弹出。
- 用户能明确识别每条搜索来源引用的标题、URL 和摘要。
- 用户能以群聊消息形式看到 Agent 头像、角色和发言。
- 用户能看到最终 Action Plan 及其来源证据摘要。

## Verification Plan

- 自动化测试：覆盖关键渲染路径，例如阶段标题、流式事件、合并的 Agent Turn Message、默认收起的 Thinking Summary、Search Source Citation、Typewriter Streaming、Agent 输出、Vote.position 和 Action Plan 来源摘要。
- fixture 验证：使用一组完整 session snapshot fixture 渲染页面。
- 人工检查：检查用户是否能一屏理解当前话题、角色配置、Agent 发言、分歧和下一步行动。
- 不需要测试的理由：视觉微调可人工检查；流程展示必须有 fixture 或组件测试。

## Technical Notes

该 feature 定义最小 UI 信息架构，不规定具体组件库细节。当前确认的视觉方向是：左右功能区贴边、可折叠、轻量阴影；中间为扁平群聊式议事流；不使用会议桌模拟。

## Rollout

先支持单会话页面；后续再扩展历史记录、筛选和图谱化证据链。
