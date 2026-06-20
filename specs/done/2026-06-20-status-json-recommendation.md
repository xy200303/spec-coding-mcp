# 记录 status JSON recommendation 契约

## Meta

- status: done
- source: user-prompt

## 用户原始描述

补充 `specc status --json` 的 README 和 release-check 契约，记录新增的 `recommendation` 机器可读字段。

目标：
- README 中说明 JSON 输出包含 `recommendation.nextTool`、`recommendation.alternatives`、`recommendation.reason`。
- README 中说明 `nextStep` 仍保留用于人类可读和兼容旧脚本。
- release-check 校验 README 包含关键字段，避免后续文档漂移。
- 不改运行时代码。

验收：
- `bun run build` 通过。
- `bun test/unit.ts` 通过。
- `bun test/smoke.ts` 通过。
- `bun run release:check` 通过。
- `git diff --check` 通过。

## TODO

- [x] 补充 `specc status --json` 的 README 和 release-check 契约，记录新增的 `recommendation` 机器可读字段。
- [x] 目标：
- [x] README 中说明 JSON 输出包含 `recommendation.nextTool`、`recommendation.alternatives`、`recommendation.reason`。
- [x] README 中说明 `nextStep` 仍保留用于人类可读和兼容旧脚本。
- [x] release-check 校验 README 包含关键字段，避免后续文档漂移。
- [x] 不改运行时代码。
- [x] 验收：
- [x] `bun run build` 通过。
- [x] `bun test/unit.ts` 通过。
- [x] `bun test/smoke.ts` 通过。
- [x] `bun run release:check` 通过。
- [x] `git diff --check` 通过。

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

- at: 2026-06-20T16:04:43.800Z
- summary: 补充 status JSON recommendation 文档契约：README 说明 recommendation.nextTool/alternatives/reason 与兼容 nextStep，release-check 固定关键字段。

### Summary

- 补充 status JSON recommendation 文档契约：README 说明 recommendation.nextTool/alternatives/reason 与兼容 nextStep，release-check 固定关键字段。

### Completed TODOs

- 补充 `specc status --json` 的 README 和 release-check 契约，记录新增的 `recommendation` 机器可读字段。
- 目标：
- README 中说明 JSON 输出包含 `recommendation.nextTool`、`recommendation.alternatives`、`recommendation.reason`。
- README 中说明 `nextStep` 仍保留用于人类可读和兼容旧脚本。
- release-check 校验 README 包含关键字段，避免后续文档漂移。
- 不改运行时代码。
- 验收：
- `bun run build` 通过。
- `bun test/unit.ts` 通过。
- `bun test/smoke.ts` 通过。
- `bun run release:check` 通过。
- `git diff --check` 通过。

### Changed Files

- `README.md`
- `scripts/release-check.mjs`

### Verification

- passed `bun run build`：TypeScript 编译通过。
- passed `bun test/unit.ts`：既有单测通过。
- passed `bun test/smoke.ts`：烟测通过。
- passed `bun run release:check`：README 关键字段契约通过。
- passed `git diff --check`：仅出现 Windows LF/CRLF 提示，无空白错误。

### 实际行为记录

| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |
|---|---|---|---|---|---|---|
| README JSON 字段契约 | 用户查看 `specc status --json` 文档 | README 明确说明 JSON 包含 `recommendation.nextTool`、`recommendation.alternatives`、`recommendation.reason`。 | `nextStep` 字符串仍保留，用于人类可读和兼容旧脚本。 | 脚本和编辑器插件应优先读取 `recommendation.nextTool`，避免解析自然语言文案。 | bun run release:check | `README.md`<br>`scripts/release-check.mjs` |
| 发布契约检查 | 运行 `bun run release:check` | release-check 校验 README 包含 recommendation 三个字段和 nextStep。 | 文档漂移会导致发布检查失败。 | 本次不改运行时代码，只固定公开说明。 | bun run release:check | `scripts/release-check.mjs` |

### Risks

- 无

### Blockers

- 无

## Done

- doneAt: 2026-06-20T16:05:02.171Z
- note: 已完成 status JSON recommendation 文档和发布契约补充。

## 最终行为契约

| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |
|---|---|---|---|---|---|---|
| README status JSON 契约 | 阅读安装/CLI 工作流文档 | 文档说明 `specc status --json` 同时提供兼容 `nextStep` 和结构化 `recommendation` 字段。 | 脚本优先使用 `recommendation.nextTool`。 | 避免脚本解析人类可读文案。 | bun run release:check | `README.md` |
| release-check 文档防漂移 | 运行发布检查 | 检查 README 是否包含 `recommendation.nextTool`、`recommendation.alternatives`、`recommendation.reason`、`nextStep`。 | 字段缺失时发布检查失败。 | 运行时代码未改动。 | bun run release:check | `scripts/release-check.mjs` |
