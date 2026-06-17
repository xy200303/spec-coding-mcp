# Spec Coding MCP

这是一个面向 **spec coding** 的本地 MCP 服务。

核心思路很简单：先写或审查一份小规格，再让 AI 按规格修改代码和测试。它不再尝试把整个系统永久文档化，也不维护复杂的 CRDT 状态。

## 目标

- 从没有 spec 的旧项目中反推 `specs/` 目录，方便用户审查当前系统。
- 用户开发前先修改或新增 spec。
- Codex 读取 active spec，按最新规格实现代码和测试。
- 验证通过后把 spec 归档到 `done/`。

## 目录结构

```text
specs/
  README.md
  review/
    source-inventory.md
    index.md
    *.md
  active/
    *.md
  done/
    *.md
  templates/
    feature.md
    bugfix.md
    removal.md
```

- `review/`：从源码反推的当前代码事实，状态通常是 `source-derived/current-code`，用于用户审查。
- `active/`：准备实现或正在实现的 spec。
- `done/`：已实现并验证通过的 spec。
- `templates/`：新建 spec 的模板。

## MCP 工具

| 工具 | 作用 |
|---|---|
| `spec_init` | 初始化 `specs/` 目录和模板 |
| `spec_generate_from_source` | 从现有源码反推 review specs |
| `spec_create` | 根据用户描述创建 active spec |
| `spec_list` | 列出 review、active、done specs |
| `spec_context` | 返回给 Codex 实现代码所需的 spec 上下文 |
| `spec_done` | 验证通过后把 spec 移到 done |

## 推荐工作流

### 旧系统第一次接入

1. 调用 `spec_generate_from_source`。
2. 用户阅读 `specs/review/source-inventory.md` 和 `specs/review/*.md`。
3. 用户把源码反推内容改成真实业务规格。
4. 需要开发时，将目标 spec 放到 `specs/active/`，或让 `spec_context` 读取指定文件。
5. Codex 按 spec 修改代码和测试。
6. 验证通过后调用 `spec_done`。

### 新需求开发

1. 调用 `spec_create`，根据用户描述生成 active spec。
2. 用户审阅并修改 `specs/active/*.md`。
3. 调用 `spec_context`。
4. Codex 按 spec 实现代码和测试。
5. 验证通过后调用 `spec_done`。

## 安装

```bash
npm install -g @dev_xiaoyun/spec-coding-mcp
specc init
```

`specc init` 会扫描本机的 Codex、Claude Code、OpenCode，并让你选择注册 MCP。

手动配置 Codex 时推荐使用 Node 直连入口：

```toml
[mcp_servers.spec-coding]
command = "C:\\nvm4w\\nodejs\\node.exe"
args = ["C:\\nvm4w\\nodejs\\node_modules\\@dev_xiaoyun\\spec-coding-mcp\\dist\\index.js"]
```

路径需要按你的 Node 全局安装目录调整。

## 本地开发

```bash
npm install
npm test
```

启动 MCP server：

```bash
specc
```

或：

```bash
node dist/index.js
```

## 设计边界

Spec Coding MCP 不做这些事：

- 不试图把整个系统永久文档化。
- 不追踪每个功能点和代码位置的强一致状态。
- 不使用用户手写 ID 或 change log。
- 不把半成品开发状态伪装成已完成。

它只做一件事：让每次开发都有一份清楚、可审查、可实现、可归档的 spec。
