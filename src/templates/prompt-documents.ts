/* User prompt spec and TODO spec templates. */
import { businessConfirmationSection, engineeringConstraintSection, workflowGuardSection } from "./markdown.js";

const TODO_SECTION_TITLES = new Set([
  "目标",
  "验收",
  "验收标准",
  "实际行为记录",
  "实际行为记录要求",
  "验证",
  "验证命令",
  "执行要求",
  "说明"
]);

interface PromptTodoTask {
  text: string;
  checked: boolean;
}

function cleanPromptBullet(line: string): string {
  return line.trim().replace(/^[-*]\s*/, "");
}

function isMarkdownBullet(line: string): boolean {
  return /^\s*[-*]\s+/.test(line);
}

function isMarkdownCheckbox(line: string): boolean {
  return /^\s*[-*]\s+\[[ xX]\]\s+.+/.test(line);
}

function isCheckedMarkdownCheckbox(line: string): boolean {
  return /^\s*[-*]\s+\[[xX]\]\s+.+/.test(line);
}

function checkboxText(line: string): string {
  return cleanPromptBullet(line).replace(/^\[[ xX]\]\s*/, "").trim();
}

function isSectionTitle(line: string): boolean {
  const title = line.replace(/[:：]\s*$/, "").trim();
  return TODO_SECTION_TITLES.has(title);
}

function isVerificationCommand(line: string): boolean {
  return /^`?(bun|npm|pnpm|yarn|node|git)\s+[^`]+`?\s*(通过|passed|pass)?[。.]?$/i.test(line);
}

function isActionableTodoLine(line: string): boolean {
  if (!line) return false;
  if (isSectionTitle(line)) return false;
  if (isVerificationCommand(line)) return false;
  return true;
}

function taskFromMarkdownLine(line: string): PromptTodoTask {
  const text = isMarkdownCheckbox(line) ? checkboxText(line) : cleanPromptBullet(line).trim();
  return { text, checked: isCheckedMarkdownCheckbox(line) };
}

function taskFromPlainLine(line: string): PromptTodoTask {
  return { text: line.trim(), checked: false };
}

function todoTasksFromPrompt(prompt: string): PromptTodoTask[] {
  const lines = prompt.split(/\r?\n/);
  const markdownTasks = lines
    .filter(isMarkdownBullet)
    .map(taskFromMarkdownLine)
    .filter((task) => isActionableTodoLine(task.text));
  if (markdownTasks.length) return markdownTasks;

  return lines
    .map(taskFromPlainLine)
    .filter((task) => isActionableTodoLine(task.text));
}

export function userPromptSpec(title: string, prompt: string): string {
  return [
    `# ${title}`,
    "",
    "## Meta",
    "",
    "- status: active",
    "- source: user-prompt",
    "",
    "## 用户原始描述",
    "",
    prompt,
    "",
    "## 目标",
    "",
    "- 根据用户描述实现对应行为。",
    "",
    "## 影响范围",
    "",
    "- 后端/API：待 Codex 根据代码定位",
    "- 前端/客户端：待 Codex 根据代码定位",
    "- 数据/迁移：待 Codex 根据代码定位",
    "- 测试：必须新增或更新",
    "",
    "## 行为规则",
    "",
    "| 场景 | 条件 | 预期结果 |",
    "|---|---|---|",
    "| 正常 | 满足业务前置条件 | 完成目标行为 |",
    "| 失败 | 参数、权限、状态或依赖异常 | 返回可理解错误，不产生未声明副作用 |",
    "",
    "## AI 实现计划",
    "",
    "- 改动范围：待 Codex 阅读代码后补充。",
    "- 关键文件：待 Codex 阅读代码后补充。",
    "- 数据流：待 Codex 阅读代码后补充。",
    "- 分支处理：列出正常、失败、边界和异常分支。",
    "- 默认值/配置：列出默认参数、配置来源和覆盖规则。",
    "- 风险确认：不明确或高影响规则先向用户确认。",
    "",
    "## 实际行为记录",
    "",
    "- 分支条件：完成后补充已实现行为。",
    "- 默认参数行为：完成后补充默认值和覆盖规则。",
    "- 边界处理结果：完成后补充异常、空值、权限、状态等处理结果。",
    "- 验证结果：完成后记录验证命令和结果。",
    "",
    "## 验收标准",
    "",
    "- 代码行为符合本 spec。",
    "- 测试覆盖正常流程和关键失败分支。",
    "",
    ...workflowGuardSection(),
    "",
    ...engineeringConstraintSection(),
    "",
    ...businessConfirmationSection(),
    "",
    "## TODO",
    "",
    "- [ ] 定位相关实现和测试。",
    "- [ ] 按本 spec 修改代码。",
    "- [ ] 新增或更新测试。",
    "- [ ] 运行验证命令并记录结果。"
  ].join("\n");
}

export function todoSpec(title: string, prompt: string): string {
  const tasks = todoTasksFromPrompt(prompt);
  return [
    `# ${title}`,
    "",
    "## Meta",
    "",
    "- status: todo",
    "- source: user-prompt",
    "",
    "## 用户原始描述",
    "",
    prompt,
    "",
    "## TODO",
    "",
    ...(tasks.length ? tasks.map((task) => `- [${task.checked ? "x" : " "}] ${task.text}`) : ["- [ ] 待补充任务。"]),
    "",
    "## 执行要求",
    "",
    "- 开始前必须先调用 `spec_context`，确认当前 TODO 上下文和工程约束。",
    "- AI 必须按未勾选 TODO 从上到下执行。",
    "- 完成任务后把对应项改成 `[x]`。",
    "- 无法完成的任务保持 `[ ]`，并在任务下方写明阻塞原因。",
    "- 完成后必须记录实际行为：业务分支条件、默认参数行为、边界处理结果和验证结果。",
    "",
    "## 实际行为记录",
    "",
    "- 分支条件：完成后补充已实现行为。",
    "- 默认参数行为：完成后补充默认值和覆盖规则。",
    "- 边界处理结果：完成后补充异常、空值、权限、状态等处理结果。",
    "- 验证结果：完成后记录验证命令和结果。",
    "",
    ...engineeringConstraintSection(),
    "",
    ...businessConfirmationSection()
  ].join("\n");
}
