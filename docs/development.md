# Development

本文档记录如何在本地运行、测试、调试和扩展 RONR。

## Local Setup

当前使用 Node.js、npm、Next.js App Router、TypeScript、Zod 和 Vitest。

首次安装依赖：

```sh
npm install
```

如本地网络需要代理，可先设置：

```sh
export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 all_proxy=socks5://127.0.0.1:7891
```

复制 provider 配置模板：

```sh
cp config/provider.example.json config/provider.local.json
```

`config/provider.local.json` 用于填写本地 API key，已被 Git 忽略，不得提交。

## Commands

```sh
scripts/dev.sh
scripts/lint.sh
scripts/test.sh
```

当前脚本已接入：

- `scripts/dev.sh` -> `npm run dev`
- `scripts/lint.sh` -> `npm run lint`
- `scripts/test.sh` -> `npm test`

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
