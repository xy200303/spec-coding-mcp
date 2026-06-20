# 增加 CLI status 诊断命令

## Meta

- status: done
- source: user-prompt

## 用户原始描述

为 specc CLI 增加 status 命令，用于本地诊断当前工具和项目工作流状态。命令支持 --project-root、--specs-dir、--help；默认 projectRoot 为当前目录，specsDir 为 specs。输出包含 Spec Coding MCP 版本、项目路径、specs 路径、Workflow State 计数（active/todo/review/done）和下一步建议：如果没有 active/todo/review，则建议 specc bootstrap；如果有任务，则建议使用 spec_context。不要启动 MCP server，不做写入。更新 README、release-check、smoke/unit 测试。保持 KISS，复用现有 listSpecs。

## TODO

- [x] 为 specc CLI 增加 status 命令，用于本地诊断当前工具和项目工作流状态。命令支持 --project-root、--specs-dir、--help；默认 projectRoot 为当前目录，specsDir 为 specs。输出包含 Spec Coding MCP 版本、项目路径、specs 路径、Workflow State 计数（active/todo/review/done）和下一步建议：如果没有 active/todo/review，则建议 specc bootstrap；如果有任务，则建议使用 spec_context。不要启动 MCP server，不做写入。更新 README、release-check、smoke/unit 测试。保持 KISS，复用现有 listSpecs。

## 执行要求

- 开始前必须先调用 `spec_context`，确认当前 TODO 上下文和工程约束。
- AI 必须按未勾选 TODO 从上到下执行。
- 完成任务后把对应项改成 `[x]`。
- 无法完成的任务保持 `[ ]`，并在任务下方写明阻塞原因。
- 完成后必须记录实际行为：业务分支条件、默认参数行为、边界处理结果和验证结果。

## 实际行为记录

- 分支条件：完成后补充已实现行为。
- 默认参数行为：完成后补充默认值和覆盖规则。
- 边界处理结果：完成后补充异常、空值、权限、状态等处理结果。
- 验证结果：完成后记录验证命令和结果。

## 工程质量约束

这些规则是强制约束，不是建议。

### Hard Rules

- Fail Fast：尽早校验输入、依赖、前置条件和无效状态。
- 风险先确认：不明确、高影响或高风险决策先问用户。
- 文件注释：新建或重写文件保留顶部注释；复杂边界写为什么，不写废话。
- 禁止在一个文件里混合 UI、业务、数据访问逻辑；禁止在领域层引用 Web / DB 框架。
- 禁止为了模式而模式：不要无故引入接口、工厂、泛型、抽象层。
- 性能与资源：避免不必要高复杂度，不阻塞主线程，不泄露连接、内存或文件句柄。

### Recommended Practices

- KISS + YAGNI：优先最简单可用方案，不预埋未确认复杂度。
- Clean Code：业务意图命名，短函数，低嵌套，DRY，显式行为。
- Human Readable：按线性故事写代码，复杂逻辑拆成有语义的小步骤。
- Clean Architecture + DDD：按业务能力分层，领域规则不依赖框架、DB 或 Web。
- SOLID + SoC：职责单一，关注点分离，组合优于继承，依赖抽象。
- 测试优先：核心逻辑可单测，验证命令和结果必须记录。
- 向后兼容：小步修改，不破坏已有 API、数据和行为契约。
- 成熟库优先：已有成熟方案不手搓；新增依赖先确认必要性。
- 项目结构：按业务语义拆分目录和文件，避免单文件堆砌和目录平铺。
- UI/交互：符合直觉，状态完整，文案简洁，布局清楚。
- Boy Scout Rule：局部顺手清理，不做无关大重构。
- AI + Human：结构清晰、边界明确，便于 AI 修改和人类维护。

## 业务不确定性强制确认

这些规则是硬性约束，不是建议。

- 业务不确定性强制确认：金额、费率、结算、退款、折扣、税费、状态机、并发、幂等、重试、回滚、规则来源不明或角色差异，必须先问清楚。
- 禁止猜业务：不要用常识补规则，不要自行假设边界。
- 澄清格式：说明不清楚之处，给出 2 到 3 种可能解释，等待用户确认。
- 金钱与合规：涉及钱、合规、审计的实现必须有明确来源或产品确认注释。

## Checkpoint

- at: 2026-06-20T15:03:59.810Z
- summary: 新增 specc status 只读诊断命令，输出版本、项目路径、specs 路径、Workflow State 和下一步建议。

### Summary

- 新增 specc status 只读诊断命令，输出版本、项目路径、specs 路径、Workflow State 和下一步建议。

### Completed TODOs

- 为 specc CLI 增加 status 命令，用于本地诊断当前工具和项目工作流状态。命令支持 --project-root、--specs-dir、--help；默认 projectRoot 为当前目录，specsDir 为 specs。输出包含 Spec Coding MCP 版本、项目路径、specs 路径、Workflow State 计数（active/todo/review/done）和下一步建议：如果没有 active/todo/review，则建议 specc bootstrap；如果有任务，则建议使用 spec_context。不要启动 MCP server，不做写入。更新 README、release-check、smoke/unit 测试。保持 KISS，复用现有 listSpecs。

### Changed Files

- `src/cli/main.ts`
- `src/cli/compatibility-contract.ts`
- `README.md`
- `scripts/release-check.mjs`
- `test/smoke.ts`
- `test/unit.ts`

### Verification

- passed `bun run build`：TypeScript 构建通过。
- passed `bun test/unit.ts`：CLI help 契约包含 status。
- passed `bun test/smoke.ts`：覆盖空项目 status、active spec status 和 status --help。
- passed `bun run release:check`：发布契约覆盖 README 中 specc status 说明。
- passed `node dist/index.js status --project-root .`：真实 dist 输出版本、路径、Workflow State 和下一步建议。
- passed `node dist/index.js status --help`：真实 dist 输出 status 参数帮助。
- passed `git diff --check`：无 whitespace error；仅有 Git LF/CRLF 提示。

### 实际行为记录

| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |
|---|---|---|---|---|---|---|
| 空项目 status | 运行 specc status 且 active/todo/review 均为 0 | 输出版本、项目路径、specs 路径、Workflow State，并建议运行 specc bootstrap。 | projectRoot 默认当前目录；specsDir 默认 specs。 | 只调用 listSpecs，不启动 MCP server，不写文件。 | bun test/smoke.ts | `src/cli/main.ts`<br>`test/smoke.ts` |
| 有任务 status | 运行 specc status 且 active、todo 或 review 至少有一个 | 输出 Workflow State，并建议先在 AI 工具里调用 spec_context。 | done 数量只展示历史归档，不决定下一步建议。 | 当前项目有 todo spec 时也建议 spec_context。 | node dist/index.js status --project-root . | `src/cli/main.ts` |
| status 帮助 | 运行 specc status --help 或 -h | 输出 Usage 和 Options，不读取或写入项目 workflow 文件。 | help 分支优先返回。 | 即使传入 --project-root，--help 也只显示帮助。 | bun test/smoke.ts; node dist/index.js status --help | `src/cli/main.ts`<br>`test/smoke.ts` |

### Risks

- 无

### Blockers

- 无

## Done

- doneAt: 2026-06-20T15:04:13.704Z
- note: CLI status now provides read-only local workflow diagnostics.

## 最终行为契约

| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |
|---|---|---|---|---|---|---|
| 空项目 status | 运行 specc status 且 active/todo/review 均为 0 | 输出版本、项目路径、specs 路径、Workflow State，并建议运行 specc bootstrap。 | projectRoot 默认当前目录；specsDir 默认 specs。 | 只调用 listSpecs，不启动 MCP server，不写文件。 | bun test/smoke.ts | `src/cli/main.ts`<br>`test/smoke.ts` |
| 有任务 status | 运行 specc status 且 active、todo 或 review 至少有一个 | 输出 Workflow State，并建议先在 AI 工具里调用 spec_context。 | done 数量只展示历史归档，不决定下一步建议。 | 当前项目有 todo spec 时也建议 spec_context。 | node dist/index.js status --project-root . | `src/cli/main.ts` |
| status 帮助 | 运行 specc status --help 或 -h | 输出 Usage 和 Options，不读取或写入项目 workflow 文件。 | help 分支优先返回。 | 即使传入 --project-root，--help 也只显示帮助。 | bun test/smoke.ts; node dist/index.js status --help | `src/cli/main.ts`<br>`test/smoke.ts` |
