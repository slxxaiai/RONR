# Development

本文档记录如何在本地运行、测试、调试和扩展 RONR。

## Local Setup

当前除标准 shell 工具外，尚不需要包管理器或语言运行时。

## Commands

```sh
scripts/dev.sh
scripts/lint.sh
scripts/test.sh
```

这些脚本在接入具体实现栈前都是占位入口。添加工具链时，需要同步更新脚本和
本文档。

## Debugging

- 先运行 `git status --short` 了解本地变更。
- 使用 `rg --files` 查看项目文件树。
- 保持新增模块小而清晰，并绑定到一个 RONR 工作流或模块边界。
- Web 产品入口相关代码放在 `apps/web/`。
- 核心议事状态机、角色治理和证据链逻辑放在 `packages/core/`。
- Role Agent Runtime、角色 prompt 和输出 schema 放在 `packages/agents/`。
- 模型供应商 adapter 放在 `packages/providers/`。
- API、会话事件和流式事件 schema 放在 `packages/contracts/`。

## Adding Tooling

添加语言栈时，需要包含：

- 包管理或构建清单。
- 测试框架配置。
- lint 或格式化命令。
- 更新后的 `scripts/*.sh` 入口。
- 至少一个成功路径测试和一个边界条件测试。
