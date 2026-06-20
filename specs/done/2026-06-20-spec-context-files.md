# 提示 spec_context 未匹配的 files

## Meta

- status: done
- source: user-prompt

## 用户原始描述

优化 spec_context 的显式 files 参数体验：当用户传入 files 但没有匹配到任何 active/review/todo spec，或者部分 files 未匹配时，在输出上下文中明确提示未匹配项，避免模型误以为没有任务。要求：
- 显式 files 参数的优先级保持不变，不匹配时不回退默认选择。
- 输出中新增清晰的 Requested Specs/请求文件提示，列出 requested、matched、unmatched。
- selected specs、open TODO 和推荐逻辑仍基于实际匹配到的 specs。
- 更新类型结构以保存 requested/matched/unmatched 信息。
- 更新单元或 smoke 测试覆盖完全未匹配和部分匹配场景。
- 验证 bun run build、bun test/unit.ts、bun test/smoke.ts、bun run release:check、git diff --check。

## TODO

- [x] 优化 spec_context 的显式 files 参数体验：当用户传入 files 但没有匹配到任何 active/review/todo spec，或者部分 files 未匹配时，在输出上下文中明确提示未匹配项，避免模型误以为没有任务。要求：
- [x] 显式 files 参数的优先级保持不变，不匹配时不回退默认选择。
- [x] 输出中新增清晰的 Requested Specs/请求文件提示，列出 requested、matched、unmatched。
- [x] selected specs、open TODO 和推荐逻辑仍基于实际匹配到的 specs。
- [x] 更新类型结构以保存 requested/matched/unmatched 信息。
- [x] 更新单元或 smoke 测试覆盖完全未匹配和部分匹配场景。
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

- at: 2026-06-20T17:06:11.906Z
- summary: 为 spec_context 显式 files 参数增加 Requested Specs 输出，显示 requested、matched、unmatched，避免文件路径拼错时静默得到空 selected specs。

### Summary

- 为 spec_context 显式 files 参数增加 Requested Specs 输出，显示 requested、matched、unmatched，避免文件路径拼错时静默得到空 selected specs。

### Completed TODOs

- 优化 spec_context 的显式 files 参数体验：当用户传入 files 但没有匹配到任何 active/review/todo spec，或者部分 files 未匹配时，在输出上下文中明确提示未匹配项，避免模型误以为没有任务。要求：
- 显式 files 参数的优先级保持不变，不匹配时不回退默认选择。
- 输出中新增清晰的 Requested Specs/请求文件提示，列出 requested、matched、unmatched。
- selected specs、open TODO 和推荐逻辑仍基于实际匹配到的 specs。
- 更新类型结构以保存 requested/matched/unmatched 信息。
- 更新单元或 smoke 测试覆盖完全未匹配和部分匹配场景。
- 验证 bun run build、bun test/unit.ts、bun test/smoke.ts、bun run release:check、git diff --check。

### Changed Files

- `src/spec/types.ts`
- `src/spec/context.ts`
- `src/spec/context-markdown.ts`
- `test/smoke.ts`

### Verification

- passed `bun run build`：TypeScript 构建通过。
- passed `bun test/unit.ts`：单元测试通过。
- passed `bun test/smoke.ts`：覆盖完全未匹配和部分匹配 files 场景。
- passed `bun run release:check`：发布契约检查通过。
- passed `git diff --check`：退出码为 0，仅出现 Windows LF/CRLF 提示。

### 实际行为记录

| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |
|---|---|---|---|---|---|---|
| 完全未匹配 files | spec_context 显式传入 files，但没有任何 active/review/todo spec 匹配 | 输出 Requested Specs 区块，matched 显示无，unmatched 列出原始请求；selected specs 仍为 0。 | 显式 files 不匹配时不回退默认选择。 | 未记录 | bun test/smoke.ts | `src/spec/context.ts`<br>`src/spec/context-markdown.ts`<br>`test/smoke.ts` |
| 部分匹配 files | files 中既有真实 spec 路径，也有不存在路径 | Requested Specs 同时列出 requested、matched 和 unmatched，selected specs 只包含真实匹配到的 spec。 | 未记录 | 未记录 | bun test/smoke.ts | `src/spec/context.ts`<br>`src/spec/context-markdown.ts`<br>`test/smoke.ts` |
| 默认选择不受影响 | 未传 files | 不渲染 Requested Specs 区块，仍按 active/todo 优先、review-only 选 review 的默认规则。 | 未记录 | 未记录 | bun test/smoke.ts | `src/spec/context.ts`<br>`src/spec/context-markdown.ts` |

### Risks

- 无

### Blockers

- 无

## Done

- doneAt: 2026-06-20T17:06:43.898Z
- note: spec_context requested files 匹配提示已完成并通过验收。

## 最终行为契约

| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |
|---|---|---|---|---|---|---|
| 完全未匹配 files | spec_context 显式传入 files，但没有任何 active/review/todo spec 匹配 | 输出 Requested Specs 区块，matched 显示无，unmatched 列出原始请求；selected specs 仍为 0。 | 显式 files 不匹配时不回退默认选择。 | 未记录 | bun test/smoke.ts | `src/spec/context.ts`<br>`src/spec/context-markdown.ts`<br>`test/smoke.ts` |
| 部分匹配 files | files 中既有真实 spec 路径，也有不存在路径 | Requested Specs 同时列出 requested、matched 和 unmatched，selected specs 只包含真实匹配到的 spec。 | 未记录 | 未记录 | bun test/smoke.ts | `src/spec/context.ts`<br>`src/spec/context-markdown.ts`<br>`test/smoke.ts` |
| 默认选择不受影响 | 未传 files | 不渲染 Requested Specs 区块，仍按 active/todo 优先、review-only 选 review 的默认规则。 | 未记录 | 未记录 | bun test/smoke.ts | `src/spec/context.ts`<br>`src/spec/context-markdown.ts` |
