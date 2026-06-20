<p align="center">
  <img src="./docs/public/favicon.svg" width="96" height="96" alt="Spec Coding MCP logo" />
</p>

<h1 align="center">Spec Coding MCP</h1>

<p align="center">
  <strong>给 AI 编程工具使用的 spec / TODO / checkpoint 本地 MCP 工作流</strong>
</p>

<p align="center">
  先审查规格，再执行任务，最后把实现事实写回项目。
</p>

<p align="center">
  <a href="https://spec.xyun.dev/">文档与网站</a>
  ·
  <a href="https://spec.xyun.dev/guide/getting-started">快速开始</a>
  ·
  <a href="https://spec.xyun.dev/guide/mcp-tools">MCP 工具</a>
  ·
  <a href="https://www.npmjs.com/package/@dev_xiaoyun/spec-coding-mcp">npm 包</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@dev_xiaoyun/spec-coding-mcp"><img alt="npm version" src="https://img.shields.io/npm/v/%40dev_xiaoyun%2Fspec-coding-mcp?style=flat-square&color=0f766e" /></a>
  <a href="https://github.com/xy200303/spec-coding-mcp/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/xy200303/spec-coding-mcp/ci.yml?branch=main&style=flat-square&label=CI" /></a>
  <a href="https://github.com/xy200303/spec-coding-mcp/actions/workflows/deploy-docs.yml"><img alt="Docs" src="https://img.shields.io/github/actions/workflow/status/xy200303/spec-coding-mcp/deploy-docs.yml?branch=main&style=flat-square&label=docs" /></a>
  <img alt="Node 22 plus" src="https://img.shields.io/badge/node-22%2B-3c873a?style=flat-square" />
  <img alt="MCP server" src="https://img.shields.io/badge/MCP-server-334155?style=flat-square" />
  <a href="./LICENSE"><img alt="License MIT" src="https://img.shields.io/badge/license-MIT-b45309?style=flat-square" /></a>
</p>

<p align="center">
  <code>npm install -g @dev_xiaoyun/spec-coding-mcp</code>
  <br />
  <code>specc init</code>
</p>

---

Spec Coding MCP 是一个面向 **spec coding** 的本地 MCP 服务。

核心思路很简单：先写或审查一份小规格，再让 AI 按规格修改代码和测试。它不再尝试把整个系统永久文档化，也不维护复杂的 CRDT 状态。

## 目标

- 从没有 spec 的旧项目中反推 `specs/` 目录，方便用户审查当前系统。
- 用户开发前先修改或新增 spec。
- 用户可以用 TODO 清单拆分任务，模型按未勾选项顺序执行。
- 工具会把全局工程质量约束注入模型上下文，强制约束代码风格、项目结构和 UI 直觉性。
- 工具强制遵守 KISS、YAGNI、Clean Code、Clean Architecture、DDD、Fail Fast、SOLID、SoC 和 Boy Scout Rule。
- 工具还会防止混层、过度抽象和不必要的复杂度，把代码组织成适合大型项目、也适合人读的结构。
- 工具强制业务不确定性先确认：遇到金额、费率、结算、分账、退款、折扣、税费、状态机流转、并发、幂等、重试、回滚、规则来源不明或角色行为不一致时，必须先停下并向用户确认。
- 工具禁止靠常识猜业务规则；不清楚时要先说清哪里不清楚，再给出 2 到 3 种可能解释，等用户确认后再继续。
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
  todo/
    *.md
  done/
    *.md
  templates/
    feature.md
    bugfix.md
    removal.md
```

- `review/`：AI 源码审查任务，状态通常是 `source-review/needs-ai-summary`；静态线索只用于指导 AI 阅读源码，不代表业务事实。
- `active/`：准备实现或正在实现的 spec。
- `todo/`：轻量可执行 TODO 清单，适合临时任务、拆分步骤或补充实现顺序。
- `done/`：已实现并验证通过的 spec。
- `templates/`：新建 spec 的模板。

## MCP 工具

### 主路径工具

| 工具 | 作用 |
|---|---|
| `spec_bootstrap` | 首选项目入口：新项目生成 AGENTS、specs 和起步 active spec；旧项目生成 AGENTS、specs 和 AI 源码审查任务 |
| `spec_context` | 所有写操作前必须调用；返回 spec、TODO、工程约束、可选搜索线索和下一步推荐 |
| `spec_list` | inspect 阶段查看 review、active、todo、done 状态，并推荐下一步先读取 `spec_context` |

### 任务创建工具

| 工具 | 适用场景 |
|---|---|
| `spec_create` | 功能开发、问题修复或移除任务，需要行为规则、验收标准和实现计划 |
| `spec_todo` | 小而明确的临时任务，适合按 TODO 顺序执行 |

### 结果记录工具

| 工具 | 适用场景 |
|---|---|
| `spec_checkpoint` | 阶段性完成后记录 TODO、文件、验证、实际行为、风险和阻塞 |
| `spec_review_result` | 高级交接/审查记录，适合部分完成、存在未完成 TODO 或阻塞时使用 |
| `spec_done` | 仅在实现、TODO、验证和最终行为契约都完成后归档 |

### 高级维护工具

| 工具 | 适用场景 |
|---|---|
| `spec_init` | 只初始化或刷新 `specs/` 目录和模板；普通项目接入优先用 `spec_bootstrap` |
| `spec_generate_agents` | 只重新生成 `AGENTS.md`；普通项目接入优先用 `spec_bootstrap` |
| `spec_generate_from_source` | 只重新生成旧项目的 AI 源码审查任务；普通旧项目接入优先用 `spec_bootstrap` |

## 推荐工作流

### 统一入口

1. 新项目先调用 `spec_bootstrap`，传 `projectKind: "new"`，生成 `AGENTS.md`、`specs/` 和起步 active spec。
2. 旧项目先调用 `spec_bootstrap`，传 `projectKind: "existing"`，生成 `AGENTS.md`、`specs/` 和 AI 源码审查任务。
3. 不确定时使用 `projectKind: "auto"`，工具会根据源码线索选择新项目或旧项目流程。
4. 之后再调用 `spec_context`，按 active spec 或 open TODO 开始开发。

### 旧系统第一次接入

1. 调用 `spec_bootstrap`，传 `projectKind: "existing"`。
2. AI 阅读 `specs/review/source-inventory.md` 和 `specs/review/*.md` 里的源码线索，并打开真实源码和测试。
3. AI 把阅读后的真实行为总结成业务规格；不允许只靠静态线索补业务结论。
4. 需要开发时，将目标 spec 放到 `specs/active/`，或让 `spec_context` 读取指定文件。
5. Codex 按 spec 修改代码和测试。
6. 验证通过后调用 `spec_done`。

### 新需求开发

1. 在任何代码或文档变更前，先调用 `spec_context`。
2. 调用 `spec_create`，根据用户描述生成 active spec。
3. 用户审阅并修改 `specs/active/*.md`。
4. 如需拆任务，可调用 `spec_todo` 或在 spec 里写 `## TODO`。
5. 再次调用 `spec_context`，确认当前 spec、TODO 和工程约束。
6. Codex 按 spec 和未勾选 TODO 顺序实现代码和测试。
7. 阶段性完成后调用 `spec_checkpoint` 记录完成情况。
8. 验证通过后调用 `spec_done`。

### 流程选择规则

- 新项目初始化：`spec_bootstrap`。
- 旧项目接入：`spec_bootstrap`，然后 AI 补全 review spec。
- 临时小任务：`spec_todo`。
- 需要行为规则和验收标准的功能：`spec_create` 或已有 active spec。
- 阶段记录：`spec_checkpoint` 或 `spec_review_result`。
- 完成归档：只在实现、验证和最终行为契约都完成后调用 `spec_done`。

`spec_context` 默认使用 `contextMode: "workflow"`，只输出任务流程、spec/TODO 和约束。需要源码线索时显式传入 `contextMode: "hints"`；需要完整源码扫描线索时再使用 `contextMode: "full"`。这些线索只是搜索入口，不是事实来源，模型修改前必须自行读取相关文件确认。

`spec_list` 和 `spec_context` 都会输出 `Recommended Next Step`，但语义不同：`spec_list` 属于 inspect 阶段，通常推荐下一步先读取 `spec_context`；`spec_context` 属于执行前上下文阶段，才推荐执行 TODO、补全 review、实现 active spec 或记录结果。即使当前没有 active、todo、review 或 selected spec，`spec_context` 也必须输出结构化下一步推荐，而不是只提示“不要开始实现”。空任务状态优先推荐 `spec_bootstrap` 建立项目入口，并把 `spec_todo`、`spec_create` 作为用户已给出明确任务时的备选。推荐会固定包含 `nextTool`、`alternatives`、`arguments`、`reason`、`when` 和 `afterwards`。`nextTool` 始终是单一工具 ID；`arguments` 只放可安全推导的上下文值或占位说明，不替模型编造 prompt、title 或行为记录。模型应优先执行 `nextTool`，只有用户明确要求或条件不满足时才考虑 `alternatives`。

`spec_list` 和 `spec_context` 的输出头部会显示当前 Spec Coding MCP 版本号。版本号来自 `src/shared/meta.ts` 读取的 `package.json`，用于判断当前运行中的 MCP 服务是否已经重启或更新到最新构建。

两者也会输出 `Workflow State` 摘要，展示 active、todo、review、done、selected spec 和 open TODO 数量。这个摘要只来自当前 specs 状态，帮助模型快速判断工作流位置，不替代源码阅读或业务判断。

### 写操作硬约束

`spec_create`、`spec_todo`、`spec_generate_agents`、`spec_checkpoint`、`spec_review_result`、`spec_done` 都要求当前会话先调用过 `spec_context`。

如果跳过 `spec_context`，这些写操作会直接失败，并明确提示先读取模型上下文。

### TODO 驱动任务

TODO 可以放在 `specs/todo/*.md`，也可以写在 active spec 的 `## TODO` 中：

```md
## TODO

- [ ] 定位用户详情接口和测试。
- [ ] 增加禁用态字段。
- [ ] 更新验证命令并记录结果。
```

`spec_context` 会提取所有未勾选 TODO，要求模型按顺序执行；完成后应把对应任务改成 `[x]`，无法完成时保留未勾选并说明阻塞原因。

### Checkpoint 闭环

`spec_checkpoint` 用于把实现后的事实写回 spec 或 TODO 文件：

- 完成摘要
- 已完成并自动勾选的 TODO
- 本次变更文件
- 验证命令和结果
- 实际行为记录：业务分支条件、默认参数行为、边界处理结果
- 结构化 `behaviorRecords`：场景、条件、结果、默认行为、边界处理、验证和关联文件
- 已知风险

`spec_done` 会把结构化行为记录渲染为 `## 最终行为契约`。如果没有提供 `behaviorRecords`，工具会在 next steps 中提示补充分支条件、默认参数行为、边界处理和验证结果。
- 阻塞项

它适合复杂项目里的阶段性开发，让下一轮 AI 或人类能直接看到已经完成什么、验证过什么、还剩什么。

`spec_review_result` 则更偏“阶段结果汇报”，会记录完成和未完成 TODO、验证结果、变更文件、风险和阻塞，适合复杂项目交接。

### 全局工程质量约束

工程质量约束的单一可信来源在 `src/templates/constraints.ts`，Markdown 渲染统一由 `src/templates/markdown.ts` 完成。

`spec_context`、`AGENTS.md`、spec 模板和 TODO 模板都应通过这套模板模块输出同一组规则，避免 README、AGENTS 和上下文各自维护一份不一致的长清单。

当前提示词协议分为三层：

- Hard Rules：Fail Fast、风险确认、文件顶部注释、禁止混层、禁止无意义抽象、性能和资源底线。
- Recommended Practices：KISS、YAGNI、Clean Code、Human Readable、Clean Architecture、DDD、SOLID、SoC、测试优先、成熟库优先、局部小步重构、AI 可生成且人类可维护。
- Business Confirmation Rules：金额、费率、结算、分账、退款、折扣、税费、状态机、并发、幂等、重试、回滚、规则来源不明或角色行为不一致时，必须先向用户确认，不允许靠常识猜业务。
- Current Task Protocol：当前任务必须如何读取 `spec_context`、执行 TODO、记录 checkpoint 和归档 done。

提示词协议由 `src/templates/constraints.ts`、`src/templates/prompt-protocol.ts` 和 `src/templates/markdown.ts` 共同生成。

## 安装

```bash
npm install -g @dev_xiaoyun/spec-coding-mcp
specc init
```

`specc init` 会扫描本机的 Codex、Claude Code、OpenCode、Cursor、Continue 和 Windsurf，并让你选择注册 MCP。

手动配置 Codex 时推荐使用 Node 直连入口：

```toml
[mcp_servers.spec-coding]
command = "C:\\nvm4w\\nodejs\\node.exe"
args = ["C:\\nvm4w\\nodejs\\node_modules\\@dev_xiaoyun\\spec-coding-mcp\\dist\\index.js", "serve"]
```

路径需要按你的 Node 全局安装目录调整。

## 本地开发

```bash
npm install
npm test
```

测试入口：

- `npm run build`：TypeScript 构建。
- `npm run unit`：细粒度单元测试，覆盖 TODO 解析、checkpoint 写回、MCP guard 和注册兼容契约。
- `npm run smoke`：端到端 smoke 测试，覆盖 spec、AGENTS、CLI 和注册主流程。
- `npm run release:check`：发布前契约检查，覆盖版本、CLI/MCP 启动参数和关键文档说明。
- `npm run verify`：依次运行 build、unit、smoke、release:check。
- `npm test`：等同于 `npm run verify`。

启动 MCP server：

```bash
specc serve
```

或：

```bash
node dist/index.js serve
```

## 发布

发布新版时，先在本地明确目标版本并提交版本变更：

```bash
npm run release:manual -- 0.2.6 --dry-run
npm run release:manual -- 0.2.6 --publish
```

`--dry-run` 只检查工作区、tag 和 npm 版本，不修改文件。`--publish` 会同步版本、运行验证、提交版本变更、创建 tag，并 push main 和 tag。

等价的手动命令如下：

```bash
npm version 0.2.6 --no-git-tag-version
npm install --package-lock-only --ignore-scripts
npm run verify
git add package.json package-lock.json
git commit -m "发布 0.2.6"
git tag v0.2.6
git push origin main
git push origin v0.2.6
```

`vX.Y.Z` tag 会触发 `Publish npm` 工作流完成 npm 发布。

npm 发布 workflow 使用 GitHub Actions secret `NPM_TOKEN`。发布前需要在仓库 secrets 中配置具备发布权限的 `NPM_TOKEN`。

如果某个 tag 已经由失败发布创建过、但 npm 没有发布成功，可以删除并重建同版本 tag 后重新 push。

发布前本地也可以运行：

```bash
npm run verify
```

`Publish npm` 工作流会在 tag/release 触发时校验 `vX.Y.Z` 与 `package.json` 版本一致，运行 `npm run verify`，然后执行 npm publish。手动触发 `Publish npm` 时，`dry_run=false` 才会真实发布。

## 设计边界

Spec Coding MCP 不做这些事：

- 不试图把整个系统永久文档化。
- 不追踪每个功能点和代码位置的强一致状态。
- 不使用用户手写 ID 或 change log。
- 不把半成品开发状态伪装成已完成。

它只做一件事：让每次开发都有一份清楚、可审查、可实现、可归档的 spec。
