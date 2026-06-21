# Spec Coding MCP Specs

本目录用于 spec coding：先写清楚规格，再让 AI 按规格修改代码和测试。

## 前置要求

任何代码或文档变更之前，必须先调用 `spec_context` 并读取输出。
如果当前没有 `spec_context` 结果，就不要直接开始实现。

## 工作流

1. 先调用 `spec_bootstrap` 建立项目入口：新项目生成起步 active spec，旧项目生成 AI 源码审查任务。
2. 再调用 `spec_context`，确认当前任务的 spec、TODO 和工程约束。
3. AI 必须阅读 `review/*.md` 列出的源码和测试，再把真实行为总结成业务规格。
4. 小任务放在 `todo/`；功能开发放在 `active/`。
5. Codex 按 spec 和未勾选 TODO 修改代码和测试。
6. 阶段完成后调用 `spec_checkpoint` 记录进度、验证和实际行为。
7. 验证通过且最终行为契约已记录后，才能调用 `spec_done`。

## 状态

- `source-review/needs-ai-summary`：静态源码线索生成的 AI 审查任务，不代表业务事实，必须阅读源码后补全。
- `draft`：用户正在描述需求，尚未实现。
- `active`：准备实现或正在实现。
- `todo`：轻量任务清单，AI 应按未勾选项顺序执行。
- `done`：代码和测试已按该 spec 完成。

## 目录

- `review/`：指导 AI 阅读源码并总结真实行为的待审查任务。
- `active/YYYY-MM-DD/NNN-readable-name.md`：当前要实现的 specs，按日期和当天顺序归档。
- `todo/YYYY-MM-DD/NNN-readable-name.md`：可执行 TODO 清单，适合拆分小任务或补充实现步骤。
- `done/YYYY-MM-DD/NNN-readable-name.md`：已经完成的 specs，必须保留来自代码和测试验证的最终行为契约。
- `guidance/*.md`：可编辑的指导性提示词，供 `spec_guidance_list` 和 `spec_guidance_read` 按需读取。

## 指导性提示词

`spec_guidance_list` 会列出内置 guidance 名称和对应 Markdown 路径；`spec_guidance_read` 会读取某一份提示词。
这些提示词只用于在模型忘记工程、UI/UX、spec 写作、Git 提交或 PR 工作流原则时按需提醒，不替代当前 spec、TODO、用户要求或代码事实。
`spec_context` 只显示 guidance 索引和必要执行护栏，不展开完整原则正文；需要细节时再按 name 读取 guidance。
用户可以直接编辑 `guidance/*.md`；目录缺失、为空或缺少默认文件时，工具会补齐内置默认 Markdown，已有文件不会被覆盖。

## 命名要求

- 文件名使用当天递增序号和可读业务名，避免 `todo-9.md` 这类无法审查的名称。
- `done/` 只记录实际代码行为、测试结果或用户确认事实；禁止把猜测写成最终行为。
