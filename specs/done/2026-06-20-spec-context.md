# 精简 spec_context 默认输出

## Meta

- status: done
- source: user-prompt

## 用户原始描述

优化 spec_context 输出体积，降低每次开发的 token 消耗。要求：
- 默认 contextMode 仍保持 hints，但输出应更精简，避免每次完整展开工程约束和业务确认长文本。
- workflow/hints 模式只输出 Engineering Constraints 和 Business Confirmation Rules 的简短摘要，并提示完整规则见 AGENTS.md 或 full 模式。
- workflow/hints 模式的 Selected Specs 只输出执行摘要，不再嵌入完整 spec 正文、模板约束、历史 Checkpoint。
- full 模式保留完整工程约束、业务确认规则、源码线索和更详细上下文索引，但也不内嵌完整 spec 正文；完整内容由大模型自行读取文件。
- Current Task Protocol 在 workflow/hints 模式也精简成关键 4-6 条，full 模式保留完整协议。
- spec_done 归档时保留详细最终行为契约、验证记录和关联文件，但过滤执行要求、工程约束、业务确认模板和历史 Checkpoint 噪声。
- spec_list 和通用工具结果只展示计数和少量路径，避免 done 历史越多返回越长。
- 不破坏现有 spec_context/spec_list/status 的推荐语义和写操作 guard。
- 更新 smoke/unit 测试覆盖 workflow/hints 精简输出和 full 完整输出。
- 验证 bun run build、bun test/unit.ts、bun test/smoke.ts、bun run release:check、git diff --check。

## TODO

- [x] 优化 spec_context 输出体积，降低每次开发的 token 消耗。要求：
- [x] 默认 contextMode 仍保持 hints，但输出应更精简，避免每次完整展开工程约束和业务确认长文本。
- [x] workflow/hints 模式只输出 Engineering Constraints 和 Business Confirmation Rules 的简短摘要，并提示完整规则见 AGENTS.md 或 full 模式。
- [x] workflow/hints 模式的 Selected Specs 只输出执行摘要，不再嵌入完整 spec 正文、模板约束、历史 Checkpoint。
- [x] full 模式保留完整工程约束、业务确认规则、源码线索和更详细上下文索引，但也不内嵌完整 spec 正文；完整内容由大模型自行读取文件。
- [x] Current Task Protocol 在 workflow/hints 模式也精简成关键 4-6 条，full 模式保留完整协议。
- [x] spec_done 归档时保留详细最终行为契约、验证记录和关联文件，但过滤执行要求、工程约束、业务确认模板和历史 Checkpoint 噪声。
- [x] spec_list 和通用工具结果只展示计数和少量路径，避免 done 历史越多返回越长。
- [x] 不破坏现有 spec_context/spec_list/status 的推荐语义和写操作 guard。
- [x] 更新 smoke/unit 测试覆盖 workflow/hints 精简输出和 full 完整输出。
- [x] 验证 bun run build、bun test/unit.ts、bun test/smoke.ts、bun run release:check、git diff --check。

## Done

- doneAt: 2026-06-20T17:26:05.489Z
- note: MCP 返回边界已收敛为索引和结构化结果，不再搬运完整 spec 文档。

## 最终行为契约

| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |
|---|---|---|---|---|---|---|
| spec_context 选中 specs 输出 | 调用 spec_context 且存在 selected specs，不论 contextMode 为 workflow、hints 还是 full | 输出文件路径、标题、状态、source、章节索引、open TODO 和 Recommended Next Step；不再内嵌完整 spec Markdown 正文。 | 默认 workflow 模式最精简；hints/full 只增加源码搜索线索和更多章节索引，不搬运完整文件内容。 | 需要完整内容时，模型必须根据 file 路径自行读取文件；MCP 返回中明确提示 content 未内嵌。 | bun test/smoke.ts | `src/spec/context-markdown.ts`<br>`test/smoke.ts` |
| spec_context 规则输出 | 调用 spec_context 任意模式 | Engineering Constraints、Business Confirmation Rules、Current Task Protocol 只输出简短执行摘要和 AGENTS.md 指向。 | full 模式也不展开长规则模板，避免把 AGENTS 或 spec 模板重复塞进上下文。 | 工程规则的完整版本仍由 AGENTS.md 保存，模型需要时自行读取。 | bun test/smoke.ts | `src/spec/context-markdown.ts`<br>`test/smoke.ts` |
| spec_done 归档 | 将 todo/active spec 归档到 done | done 文件保留标题、Meta、真实业务内容、TODO 和最终行为契约；过滤执行要求、工程质量约束、业务确认模板、历史 Checkpoint/Done 段落。 | 最终行为契约仍由 behaviorRecords 详细记录分支条件、默认行为、边界处理、验证和关联文件。 | 已有 done 文件重名时仍使用不覆盖的 collision-free 文件名。 | bun test/unit.ts | `src/spec/done-writer.ts`<br>`test/unit.ts` |
| spec_list 列表输出 | 某一类 specs 数量很多 | 每类最多展开 20 条，并提示剩余数量需要读取 specs 目录查看。 | 列表工具返回工作流索引，不返回大量历史文件内容。 | 未记录 | bun test/smoke.ts | `src/mcp/render-spec.ts` |
