# Docs-Is-Code MCP

本项目把“基于文档的编程”做成一个本地 MCP 服务。用户只需要修改 Markdown spec，MCP 会自动识别文档语义块变化，生成实现计划，并在代码和测试完成后记录同步基线。

## 目标

- 不要求用户手写稳定 ID。
- 不要求用户维护 change-log。
- 不要求用户记住多个 skill。
- 使用 `.docs-code/index.automerge` 自动跟踪文档块身份、操作历史、hash 和语义变化。
- 让 Codex 通过 MCP 工具完成“读文档变更 -> 生成实现计划 -> 改代码测试 -> 标记同步”的闭环。

## MCP 工具

| 工具 | 作用 |
|---|---|
| `docs_code_init` | 初始化 `docs/` 和 `.docs-code/state.json` |
| `docs_code_generate_from_prompt` | 根据用户输入的产品想法、功能描述或业务流程生成中文规格文档 |
| `docs_code_generate_from_source` | 扫描现有项目源码，反推出中文规格文档和源码线索 |
| `docs_code_scan` | 扫描 Markdown 文档，自动识别新增/修改/删除/重命名块 |
| `docs_code_plan` | 根据文档变化生成实现计划 |
| `docs_code_context` | 给大模型返回可直接用于实现的上下文：变更文档块全文、父级上下文、搜索关键词、候选代码文件、测试要求和完成步骤 |
| `docs_code_mark_synced` | 代码和测试完成后，将当前文档标记为已实现 |
| `docs_code_reset_state` | 手动重置基线，接受当前文档为已实现 |

## 使用方式

### 推荐：交互式安装

从 npm 全局安装后运行：

```bash
npm install -g docs-is-code-mcp
dic init
```

`dic init` 会自动扫描本机已安装的 AI 编程工具，并用 `@clack/prompts` 让你选择安装到哪些工具：

- Codex：写入 `~/.codex/config.toml`
- Claude Code：调用 `claude mcp add`
- OpenCode：写入全局 `opencode.json`

安装后重启对应工具即可使用 MCP。

### 本地开发

```bash
npm install
npm run build
npm test
```

本地调试 MCP server：

```bash
npm run start
```

或直接使用构建后的 CLI：

```bash
node dist/index.js serve
```

### 手动配置备用

如果不想使用 `dic init`，可以手动把 MCP server 加到工具配置里。npm 全局安装后，Codex 可写成：

```toml
[mcp_servers.docs-is-code]
command = "dic"
args = ["serve"]
```

Windows 上如果工具无法直接解析 npm 全局 bin，可以写成：

```toml
[mcp_servers.docs-is-code]
command = "cmd"
args = ["/c", "dic", "serve"]
```

唯一命令：

- `dic`

## 发布到 npm

GitHub Actions 已包含两条流水线：

- `CI`：在 push、PR 和手动触发时运行 `npm ci`、`npm run build`、`npm run smoke`、`npm pack --dry-run`。
- `Publish npm`：发布 GitHub Release 时自动执行构建、smoke test，并使用 `NPM_TOKEN` 执行 `npm publish --access public`。

发布前需要在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 中添加 `NPM_TOKEN`。Release tag 必须和 `package.json` 的版本一致，例如当前版本 `0.1.0` 对应 tag `v0.1.0`。

## 推荐工作流

### 全新项目

1. 用户描述系统、功能、业务流程、UI 或客户端需求。
2. Codex 调用 `docs_code_generate_from_prompt` 生成 `docs/` 规格树。
3. 用户审阅并直接修改生成的中文 Markdown。
4. Codex 调用 `docs_code_context` 获取未实现文档增量和实现上下文。
5. Codex 按文档修改代码和测试。
6. 测试通过后，Codex 调用 `docs_code_mark_synced` 更新 CRDT 基线。

### 现有项目

1. Codex 调用 `docs_code_generate_from_source` 静态扫描源码，生成 `docs/indexes/source-overview.md` 和 feature 文档。
2. 用户审阅源码反推文档，补充业务规则、接口、数据、UI、交互、客户端和测试要求。
3. 后续用户只需要修改 `docs/**/*.md`。
4. Codex 调用 `docs_code_scan` 或 `docs_code_context` 查看未实现增量。
5. Codex 按文档修改代码和测试。
6. 测试通过后，Codex 调用 `docs_code_mark_synced` 更新 CRDT 基线。

### 日常修改

1. 用户直接编辑 `docs/**/*.md`。
2. Codex 调用 `docs_code_context`，让 MCP 自动识别哪些文档块和代码尚未同步。
3. Codex 按上下文修改后端、前端、客户端、数据库和测试中受影响的最小范围。
4. 验证通过后，Codex 调用 `docs_code_mark_synced`。

用户不需要手动创建 ID、维护 `change-log`、记录哪些文档已实现。MCP 会按 Markdown 文件和标题块自动拆分规格块，维护内部 `blockId`，并用内容 hash、语义 hash、标题路径和关键词相似度识别修改、移动、改标题、删除和新增。

## Codex 使用提示

当用户说“基于我的描述生成规格”时，Codex 应调用：

```text
docs_code_generate_from_prompt
```

当用户说“从现有项目生成规格”时，Codex 应调用：

```text
docs_code_generate_from_source
```

当用户说“根据文档更新代码”时，Codex 应优先调用：

```text
docs_code_context
```

完成代码和测试修改并验证通过后，再调用：

```text
docs_code_mark_synced
```

如果用户明确表示当前文档和代码已经一致，可以调用：

```text
docs_code_reset_state
```

`docs_code_plan` 仍然可用于只需要轻量实现计划的场景；`docs_code_context` 更适合真正交给大模型改代码，因为它包含变更块全文和候选源码位置。

## 状态文件

`.docs-code/index.automerge` 是 MCP 的权威 CRDT 状态文件，不需要用户手写。它记录每个 Markdown 标题块的内部 `blockId`、文件、标题路径、hash、语义 hash、操作事件和已实现时间。

`.docs-code/state.json` 是给人看的导出文件，用于审计和调试，不作为唯一真相。

注意：如果用户绕过 MCP，直接用普通编辑器修改 Markdown，CRDT 无法捕获逐字符编辑操作。MCP 会在下一次扫描时把文件快照差异转换为 CRDT 操作事件，并用标题路径、内容语义 hash、关键词相似度等信号维持块身份。
