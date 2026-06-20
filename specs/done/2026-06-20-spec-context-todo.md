# 避免 spec_context 截断 TODO 读取

## Meta

- status: done
- source: user-prompt

## 用户原始描述

修复 spec_context 在不内嵌完整 spec 正文后仍用 maxSpecChars 截断 selected spec 文本的问题。要求：
- Open TODO 提取必须基于完整 spec 文件内容，不能因为 maxSpecChars 变小而漏掉后半段 TODO。
- Selected Specs 的章节索引也应基于完整文件内容生成；MCP 返回仍不内嵌完整正文。
- maxSpecChars 如果仍保留，只能影响未来可能的展示摘要，不能影响 TODO 提取和 workflow 推荐。
- 更新 smoke 或 unit 测试：构造一个前面有超长正文、后面有 TODO 的 spec，设置很小 maxSpecChars，仍能提取后半段 TODO。
- 验证 bun run build、bun test/unit.ts、bun test/smoke.ts、bun run release:check、git diff --check。

## TODO

- [x] Open TODO 提取必须基于完整 spec 文件内容，不能因为 maxSpecChars 变小而漏掉后半段 TODO。
- [x] Selected Specs 的章节索引也应基于完整文件内容生成；MCP 返回仍不内嵌完整正文。
- [x] maxSpecChars 如果仍保留，只能影响未来可能的展示摘要，不能影响 TODO 提取和 workflow 推荐。
- [x] 更新 smoke 或 unit 测试：构造一个前面有超长正文、后面有 TODO 的 spec，设置很小 maxSpecChars，仍能提取后半段 TODO。
- [x] 验证 bun run build、bun test/unit.ts、bun test/smoke.ts、bun run release:check、git diff --check。

## 实际行为记录

- 分支条件：完成后补充已实现行为。
- 默认参数行为：完成后补充默认值和覆盖规则。
- 边界处理结果：完成后补充异常、空值、权限、状态等处理结果。
- 验证结果：完成后记录验证命令和结果。

## Done

- doneAt: 2026-06-20T17:58:08.740Z
- note: spec_context 内部读取完整 spec，返回保持索引化。

## 最终行为契约

| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |
|---|---|---|---|---|---|---|
| 长 spec 后半段 TODO | spec 文件前部超过 maxSpecChars，TODO 位于文件后半段 | spec_context 仍能提取后半段 open TODO，并用于 Recommended Next Step 和 Open TODOs。 | readSpecsWithText 始终读取完整文件内容；maxSpecChars 不影响内部 TODO 提取。 | MCP 返回仍不内嵌长正文，只显示章节索引和 TODO 文本。 | bun test/smoke.ts | `src/spec/spec-reader.ts`<br>`test/smoke.ts` |
| 长 spec 章节索引 | 章节标题位于 maxSpecChars 之后 | Selected Specs 的 sections 仍包含后半段章节标题。 | 章节索引来自完整文件内容；workflow/hints/full 都保持不复制正文。 | 未记录 | bun test/smoke.ts | `src/spec/spec-reader.ts`<br>`src/spec/context-markdown.ts`<br>`test/smoke.ts` |
