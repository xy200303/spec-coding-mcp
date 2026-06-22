/* Shared task protocol text for model-facing spec context and AGENTS output. */
export const currentTaskInstructions = [
  "先读本次 `spec_context`；没有上下文不得实现或改文档。",
  "如果项目没有 specs/、AGENTS.md 或可执行 spec，先调用 `spec_bootstrap`：新项目生成起步 active spec，旧项目生成 AI 源码审查任务。",
  "selected specs 和 open TODOs 是唯一需求源，不按旧对话扩范围。",
  "小而明确的临时任务用 `spec_todo`；需要设计和完成标准的功能开发用 `spec_create` 或 active spec。",
  "按 open TODOs 自上而下执行；无 TODO 但有 selected specs 时，按 spec 目标结果、行为约定和完成标准执行。",
  "每完成一个 TODO，必须勾选 `[x]`；无法完成则保留 `[ ]` 并写明阻塞。",
  "先读任务说明、目标结果、行为约定、完成标准和代码线索，再搜索代码。",
  "源码线索只是搜索入口，不是事实来源；修改前必须自行读取相关文件确认。",
  "遵守 Hard Rules、Recommended Practices 和 Business Confirmation Rules；冲突或高风险时先问用户。",
  "高风险业务描述不完整时，停止实现，说明疑点并给出 2 到 3 种解释。",
  "阶段完成后调用 `spec_checkpoint` 记录执行清单、文件、验证、风险和阻塞。",
  "`spec_done` 只能在实现完成、TODO 已更新、验证结果和最终行为契约已记录后调用。"
];
