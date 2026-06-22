/* User prompt spec and TODO spec templates. */
import { guidancePointerSection, workflowGuardSection } from "./markdown.js";
import { MARKDOWN_METADATA_UPDATED, MARKDOWN_METADATA_VERSION, withMarkdownMetadata } from "./metadata.js";

const TODO_SECTION_TITLES = new Set([
  "acceptance",
  "acceptance criteria",
  "description",
  "goal",
  "goals",
  "requirements",
  "tasks",
  "todo",
  "verification",
  "目标",
  "要求",
  "验收",
  "验收标准",
  "行为约定",
  "完成标准",
  "任务说明",
  "执行协议",
  "执行记录",
  "执行清单",
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

function cleanMarkdownPrefix(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*]\s*/, "");
}

function cleanTaskText(line: string): string {
  const text = cleanMarkdownPrefix(line);
  if (isSectionTitle(text)) return "";
  return text
    .replace(/^\[[ xX]\]\s*/, "")
    .replace(/(?:。|\.)?\s*(?:要求|requirements?)[:：]\s*$/i, "。")
    .trim();
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

function isSectionTitle(line: string): boolean {
  const title = cleanMarkdownPrefix(line).replace(/[:：]\s*$/, "").trim().toLowerCase();
  return TODO_SECTION_TITLES.has(title);
}

function isActionableTodoLine(line: string): boolean {
  if (!line) return false;
  if (isSectionTitle(line)) return false;
  return true;
}

function taskFromMarkdownLine(line: string): PromptTodoTask {
  const text = cleanTaskText(line);
  return { text, checked: isCheckedMarkdownCheckbox(line) };
}

function taskFromPlainLine(line: string): PromptTodoTask {
  return { text: cleanTaskText(line), checked: false };
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
  const websiteTask = isWebsitePrompt(`${title}\n${prompt}`);
  const ossTask = isOssPrompt(`${title}\n${prompt}`);
  return withMarkdownMetadata({
    name: "active-spec",
    version: MARKDOWN_METADATA_VERSION,
    title,
    type: "active-spec",
    status: "active",
    source: "user-prompt",
    description: "User-requested implementation spec with goals, behavior rules, TODOs, and verification requirements.",
    category: "spec",
    triggers: ["implementation", "feature", "bugfix", "todo", "verification"],
    appliesTo: ["active-specs", "coding-tasks", "tests", "behavior-records"],
    updated: MARKDOWN_METADATA_UPDATED
  }, [
    `# ${title}`,
    "",
    "## 任务说明",
    "",
    prompt,
    "",
    "## 目标结果",
    "",
    "- 根据用户描述实现对应行为。",
    "",
    "## 事实依据",
    "",
    "- 项目真实定位：待 Codex 根据用户描述、仓库、文档或确认结果补充；不明确时先确认或搜索。",
    "- 真实对象：列出首屏/核心流程必须出现的 repo、截图、demo、项目矩阵、核心交互、组件或数据。",
    "- 事实来源：列出可用于文案和结构的用户输入、README、源码、配置、公开链接或明确确认。",
    "- 禁止编造：指标、客户、性能数据、邮箱、融资、商业定位、社区规模和路线图承诺都必须有来源。",
    "- CTA：只使用真实下一步，例如 GitHub、Docs、Demo、Install、Contribute、Roadmap、Issue 或用户确认的业务入口。",
    "",
    "## 影响范围",
    "",
    "- 后端/API：待 Codex 根据代码定位",
    "- 前端/客户端：待 Codex 根据代码定位",
    "- 数据/迁移：待 Codex 根据代码定位",
    "- 测试：必须新增或更新",
    "",
    "## 行为约定",
    "",
    "| 场景 | 条件 | 预期结果 |",
    "|---|---|---|",
    "| 正常 | 满足业务前置条件 | 完成目标行为 |",
    "| 失败 | 参数、权限、状态或依赖异常 | 返回可理解错误，不产生未声明副作用 |",
    "",
    "## 实现计划",
    "",
    "- 目标能力：待 Codex 阅读代码后补充要新增、修改或移除的业务能力。",
    "- 阅读入口：列出已读取或必须读取的源码、测试、配置和文档。",
    "- 改动文件：列出计划修改的文件和每个文件承担的职责。",
    "- 数据流：描述触发入口、输入与前置状态、执行步骤、输出结果、副作用和持久化边界。",
    "- 分支处理：列出正常、失败、边界、权限、状态和异常分支。",
    "- 默认值/配置：列出默认参数、配置来源、覆盖规则和环境差异。",
    "- 验证命令：列出计划运行的测试、构建、lint 或人工验证命令。",
    "- 待确认问题：列出业务规则不明确、影响面大或高风险的点；未确认前不要实现。",
    "",
    "## UI/交互 Skill 路由",
    "",
    "- 仅当前端、页面、组件或交互受影响时填写。",
    "- UI/UX 工作不要在 spec 中展开本地设计原则或 checklist；读取 `ui-ux` guidance 后使用指定的 `ui-ux-pro-max` skill。",
    "- 如果 `ui-ux-pro-max` 未安装，先调用 `spec_skills_install`；需要预览命令时使用 `dryRun: true`。",
    "- 如果需要其他专项 UI/UX skill，先调用 `spec_skills_search` 搜索 skills.sh，再按任务需要安装。",
    "- 记录实际使用的 skill、安装或 dry-run 结果，以及该 skill 产出的关键设计/验收建议。",
    "",
    "## 执行记录",
    "",
    "- 记录来源：只能记录已阅读代码、已修改代码、测试结果或用户确认的事实。",
    "- 功能全过程：按功能点记录触发入口、输入与前置状态、执行步骤、输出结果和副作用。",
    "- 分支条件：完成后补充实际存在的正常、失败、边界、权限和状态分支，不只写一句结果。",
    "- 默认参数行为：完成后补充源码里的默认值、配置来源、覆盖规则以及未传参数时的完整流程。",
    "- 边界处理结果：完成后补充异常、空值、权限、状态等输入如何进入分支、在哪里返回、是否产生副作用。",
    "- 验证结果：完成后记录验证命令、覆盖的流程分支和关联文件。",
    "- 禁止事项：不要把猜测、常识或“看起来合理”的行为写成事实。",
    "",
    "## 完成标准",
    "",
    "- 代码行为符合本 spec。",
    "- 测试覆盖正常流程和关键失败分支。",
    "",
    ...workflowGuardSection(),
    "",
    ...guidancePointerSection(),
    "",
    "## 执行清单",
    "",
    "- [ ] 定位相关实现和测试。",
    "- [ ] 按本 spec 修改代码。",
    "- [ ] 新增或更新测试。",
    "- [ ] 运行验证命令并记录结果。"
  ]);
}

function isWebsitePrompt(text: string): boolean {
  const lower = text.toLowerCase();
  return [
    "官网",
    "网站",
    "landing",
    "homepage",
    "website",
    "site",
    "oss",
    "open source",
    "开源",
    "组织",
    "github"
  ].some((term) => lower.includes(term));
}

function isOssPrompt(text: string): boolean {
  const lower = text.toLowerCase();
  return [
    "oss",
    "open source",
    "开源",
    "开源组织",
    "github",
    "repo",
    "repository",
    "license",
    "贡献",
    "contribute",
    "contribution"
  ].some((term) => lower.includes(term));
}

export function todoSpec(title: string, prompt: string): string {
  const tasks = todoTasksFromPrompt(prompt);
  return withMarkdownMetadata({
    name: "todo-spec",
    version: MARKDOWN_METADATA_VERSION,
    title,
    type: "todo-spec",
    status: "todo",
    source: "user-prompt",
    description: "Lightweight executable TODO spec for ordered task execution and checkpoint recording.",
    category: "todo",
    triggers: ["todo", "task-list", "checkpoint", "verification"],
    appliesTo: ["todo-specs", "task-execution", "checkpoints"],
    updated: MARKDOWN_METADATA_UPDATED
  }, [
    `# ${title}`,
    "",
    "## 任务说明",
    "",
    prompt,
    "",
    "## 执行清单",
    "",
    ...(tasks.length ? tasks.map((task) => `- [${task.checked ? "x" : " "}] ${task.text}`) : ["- [ ] 待补充任务。"]),
    "",
    "## 执行协议",
    "",
    "- 开始前必须先调用 `spec_context`，确认当前 TODO 上下文。",
    "- AI 必须按未勾选 TODO 从上到下执行。",
    "- 完成任务后把对应项改成 `[x]`。",
    "- 无法完成的任务保持 `[ ]`，并在任务下方写明阻塞原因。",
    "- 阶段完成后调用 `spec_checkpoint`，记录实际行为、验证结果、风险和阻塞。",
    "",
    ...guidancePointerSection(),
    "",
    "## 执行记录",
    "",
    "- 记录来源：只能记录已阅读代码、已修改代码、测试结果或用户确认的事实。",
    "- 功能全过程：按功能点记录触发入口、输入与前置状态、执行步骤、输出结果和副作用。",
    "- 分支条件：完成后补充实际存在的正常、失败、边界、权限和状态分支，不只写一句结果。",
    "- 默认参数行为：完成后补充源码里的默认值、配置来源、覆盖规则以及未传参数时的完整流程。",
    "- 边界处理结果：完成后补充异常、空值、权限、状态等输入如何进入分支、在哪里返回、是否产生副作用。",
    "- 验证结果：完成后记录验证命令、覆盖的流程分支和关联文件。",
    "- 禁止事项：不要把猜测、常识或“看起来合理”的行为写成事实。"
  ]);
}
