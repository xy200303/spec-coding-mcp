# 补齐 status JSON 推荐上下文

## Meta

- status: done
- source: user-prompt

## 用户原始描述

让 specc status --json 的 recommendation 与 spec_list/spec_context 的 Recommended Next Step 信息更一致，向后兼容地新增 recommendation.when 和 recommendation.afterwards。要求：
- 保留 schemaVersion=1、nextStep、nextTool、alternatives、arguments、reason 现有字段。
- 新增 recommendation.when 和 recommendation.afterwards，直接来自共享 WorkflowRecommendation。
- 更新 README 和 release-check 契约说明。
- 更新单元测试和 smoke 测试覆盖新增字段。
- 文本版 specc status 仍保持简洁，不新增长说明。
- 验证 bun run build、bun test/unit.ts、bun test/smoke.ts、bun run release:check、git diff --check。

## TODO

- [x] 让 specc status --json 的 recommendation 与 spec_list/spec_context 的 Recommended Next Step 信息更一致，向后兼容地新增 recommendation.when 和 recommendation.afterwards。要求：
- [x] 保留 schemaVersion=1、nextStep、nextTool、alternatives、arguments、reason 现有字段。
- [x] 新增 recommendation.when 和 recommendation.afterwards，直接来自共享 WorkflowRecommendation。
- [x] 更新 README 和 release-check 契约说明。
- [x] 更新单元测试和 smoke 测试覆盖新增字段。
- [x] 文本版 specc status 仍保持简洁，不新增长说明。
- [x] 验证 bun run build、bun test/unit.ts、bun test/smoke.ts、bun run release:check、git diff --check。

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

- at: 2026-06-20T17:00:42.723Z
- summary: 已为 specc status --json 的 recommendation 向后兼容新增 when 和 afterwards 字段，并同步 README、release-check、单测和 smoke 覆盖。

### Summary

- 已为 specc status --json 的 recommendation 向后兼容新增 when 和 afterwards 字段，并同步 README、release-check、单测和 smoke 覆盖。

### Completed TODOs

- 让 specc status --json 的 recommendation 与 spec_list/spec_context 的 Recommended Next Step 信息更一致，向后兼容地新增 recommendation.when 和 recommendation.afterwards。要求：
- 保留 schemaVersion=1、nextStep、nextTool、alternatives、arguments、reason 现有字段。
- 新增 recommendation.when 和 recommendation.afterwards，直接来自共享 WorkflowRecommendation。
- 更新 README 和 release-check 契约说明。
- 更新单元测试和 smoke 测试覆盖新增字段。
- 文本版 specc status 仍保持简洁，不新增长说明。
- 验证 bun run build、bun test/unit.ts、bun test/smoke.ts、bun run release:check、git diff --check。

### Changed Files

- `src/cli/status-recommendation.ts`
- `README.md`
- `scripts/release-check.mjs`
- `test/unit.ts`
- `test/smoke.ts`

### Verification

- passed `bun run build`：TypeScript 构建通过。
- passed `bun test/unit.ts`：状态推荐单测覆盖 when/afterwards。
- passed `bun test/smoke.ts`：CLI status JSON 场景覆盖新增字段。
- passed `bun run release:check`：README 契约检查通过。
- passed `git diff --check`：退出码为 0，仅出现 Windows LF/CRLF 提示。

### 实际行为记录

| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |
|---|---|---|---|---|---|---|
| status JSON 推荐上下文 | 调用 specc status --json | recommendation 保留 nextTool、alternatives、arguments、reason，并新增 when、afterwards。 | schemaVersion 仍为 1，nextStep 字符串继续保留用于兼容旧脚本。 | 未记录 | bun test/smoke.ts | `src/cli/status-recommendation.ts`<br>`test/smoke.ts` |
| 共享推荐透传 | status recommendation 来源于 WorkflowRecommendation | when 和 afterwards 直接透传共享推荐结果，与 spec_list/spec_context 的 Recommended Next Step 语义一致。 | 未记录 | 未记录 | bun test/unit.ts | `src/cli/status-recommendation.ts`<br>`src/spec/workflow-next-step.ts` |
| 文本输出保持简洁 | 调用 specc status 不带 --json | 文本版仍只显示 Workflow State 和单行 Next Step，不新增 when/afterwards 长说明。 | 未记录 | 未记录 | bun test/smoke.ts | `src/cli/command-status.ts`<br>`test/smoke.ts` |

### Risks

- 无

### Blockers

- 无

## Done

- doneAt: 2026-06-20T17:00:58.476Z
- note: status JSON recommendation when/afterwards 字段补齐完成并通过验收。

## 最终行为契约

| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |
|---|---|---|---|---|---|---|
| status JSON 推荐上下文 | 调用 specc status --json | recommendation 保留 nextTool、alternatives、arguments、reason，并新增 when、afterwards。 | schemaVersion 仍为 1，nextStep 字符串继续保留用于兼容旧脚本。 | 未记录 | bun test/smoke.ts | `src/cli/status-recommendation.ts`<br>`test/smoke.ts` |
| 共享推荐透传 | status recommendation 来源于 WorkflowRecommendation | when 和 afterwards 直接透传共享推荐结果，与 spec_list/spec_context 的 Recommended Next Step 语义一致。 | 未记录 | 未记录 | bun test/unit.ts | `src/cli/status-recommendation.ts`<br>`src/spec/workflow-next-step.ts` |
| 文本输出保持简洁 | 调用 specc status 不带 --json | 文本版仍只显示 Workflow State 和单行 Next Step，不新增 when/afterwards 长说明。 | 未记录 | 未记录 | bun test/smoke.ts | `src/cli/command-status.ts`<br>`test/smoke.ts` |
