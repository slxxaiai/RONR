# Prompt Template Configuration

## One-Line Definition

将 Chair、Secretary 和 Member 的 prompt template 作为可配置资源管理，而不是硬编码在代码文件中。

## Status

草稿

## Priority

高

## Problem

RONR 的 Agent 行为高度依赖 prompt。如果 prompt 分散硬编码在 TypeScript 文件里，后续很难审阅、版本化、复用和用 fixture 验证，也容易让角色职责和输出 schema 不同步。

## Users

- Chair Agent
- Secretary Agent
- Member Agent
- 后续实现者

## Goals

- 将 prompt template 存放在 `packages/agents/prompts/`。
- 按 `chair`、`secretary`、`member` 分组管理模板。
- 明确模板元数据、变量和输出 schema 绑定关系。
- 让 Role Runtime 只负责加载、校验和渲染模板。
- 让模板显式接收搜索摘要、来源引用和 thinking 模式约束。

## Non-Goals

- 在线 prompt 编辑器。
- 远程 prompt registry。
- 多版本 A/B 测试。
- 自动 prompt 优化。

## User Flow

1. Orchestrator 选择目标 Agent 和当前阶段。
2. Role Runtime 根据 role、mandate 和 phase 查找 prompt template。
3. Template loader 校验模板元数据和变量。
4. Template renderer 用上下文变量生成 model messages。
5. Role Runtime 在模型调用前注入 `Search Result Summary` 和 `Source Reference`。
6. Role Runtime 默认启用 `Thinking Mode`，并要求模板禁止输出原始推理链。
7. Role Runtime 调用 Model Provider 并校验输出 schema。

## Requirements

- Prompt template 内容不能硬编码在 TypeScript 代码文件中。
- 模板必须包含 `id`、`role`、`mandate`、`phase`、`version`、`output_schema_id` 和正文。
- 模板变量必须显式声明，并在渲染前校验。
- 模板必须声明搜索相关变量，例如 `search_result_summary`、`source_references` 或等价 canonical field。
- 模板必须包含 thinking 安全约束：可以要求模型充分分析，但不得要求输出原始 chain-of-thought。
- 模板必须要求 Agent 输出把外部事实判断关联到 `Source Reference`。
- 缺少变量、未知变量或 schema 不匹配时必须返回清晰错误。
- 模板必须能用 fixture 做离线校验。

## Development Mode

`Review + fixture eval-first`

Prompt template 调整需要先人工审阅角色职责和变量，再用固定输入 fixture 验证模板能产出符合 schema 的结构化输出。

## Acceptance Criteria

- 给定有效模板和完整变量时，Role Runtime 能生成 model messages。
- 给定缺少变量或未知变量时，模板加载或渲染失败并返回清晰错误。
- 给定模板绑定不存在的 `output_schema_id` 时，系统拒绝加载模板。
- 给定缺少搜索摘要变量的发言模板，系统拒绝加载或拒绝渲染。
- 给定模板要求输出原始推理链，系统拒绝加载。

## Verification Plan

- 自动化测试：覆盖有效模板加载、缺少变量、未知变量、schema id 不存在、role/phase 不匹配、缺少搜索摘要变量、模板请求原始推理链。
- fixture 验证：提供 chair、secretary、member/red-team 的模板和输入变量 fixture，包含 search summary 和 source references。
- 人工检查：审阅模板是否符合 Chair、Secretary、Member 职责边界。
- 不需要测试的理由：不适用，prompt template 直接影响 Agent 行为。

## Technical Notes

模板资源目录为 `packages/agents/prompts/`。首版优先使用纯文本或 Markdown frontmatter，不额外引入模板引擎。TypeScript 代码只负责 loader、变量校验、渲染和输出 schema 绑定。

模板可以提示模型进行充分分析，但只能要求输出结构化结论、简要理由、风险、假设和来源引用。原始 chain-of-thought 不属于 RONR 可保存输出。

## Rollout

先覆盖 P0 所需的 Chair、Secretary、Member 模板；后续再按 mandate 拆分更细的模板。
