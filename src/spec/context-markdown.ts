/* Markdown rendering helpers for spec context assembly. */
import type { ContextMode, SourceScanSummary, SpecContext, SpecItem } from "./types.js";
import { currentTaskInstructions } from "../templates/prompt-protocol.js";
import { guidanceItems } from "./guidance.js";
import { workflowRecommendationLines } from "./workflow-next-step.js";
import { APP_VERSION } from "../shared/meta.js";

function withFallbackLines(items: string[], empty: string): string[] {
  return items.length ? items : [empty];
}

export function buildContextInstructions(): string[] {
  return currentTaskInstructions;
}

const requiredGuards = [
  "写代码或改文档前必须先读本次 `spec_context`；selected specs 和 open TODOs 是本轮唯一需求源。",
  "按 open TODOs 自上而下执行；无 TODO 时按 selected specs 的目标结果、行为约定和完成标准执行。",
  "源码线索只是搜索入口，不是事实；修改前必须自行读取相关文件、测试和配置确认。",
  "金额、状态机、并发、幂等、退款、权限、合规等高风险业务不确定时，先问用户，不要猜。",
  "阶段完成后调用 `spec_checkpoint`；实现、TODO、验证和最终行为契约都完成后才能调用 `spec_done`。"
];

type EmptyWorkState = "done-only" | "empty" | "has-work";

function emptyWorkState(input: {
  activeSpecs: SpecItem[];
  reviewSpecs: SpecItem[];
  todoSpecs: SpecItem[];
  doneSpecs: SpecItem[];
  selectedSpecs: Array<SpecItem & { text: string }>;
  openTodos: SpecContext["todos"];
}): EmptyWorkState {
  const hasExecutableWork = Boolean(input.selectedSpecs.length || input.openTodos.length || input.activeSpecs.length || input.todoSpecs.length || input.reviewSpecs.length);
  if (hasExecutableWork) return "has-work";
  return input.doneSpecs.length ? "done-only" : "empty";
}

function renderEmptySelectedSpecs(state: EmptyWorkState): string[] {
  if (state === "done-only") {
    return ["当前没有待执行 spec；项目已有 done 历史记录，需要新工作时请先创建 spec_todo 或 spec_create。"];
  }
  return ["当前没有可执行任务：优先调用 spec_bootstrap 建立项目入口；如果用户已经给出明确小任务或功能需求，再调用 spec_todo/spec_create。"];
}

function isSecondLevelHeading(line: string): boolean {
  return line.startsWith("## ") && !line.startsWith("### ");
}

function selectedSpecHeadings(text: string, limit: number): string[] {
  return text
    .split(/\r?\n/)
    .filter(isSecondLevelHeading)
    .filter((line) => !["## 执行要求", "## 执行协议", "## 工程质量约束", "## 业务不确定性强制确认", "## Checkpoint", "## 进度记录", "## Done", "## 归档记录"].includes(line))
    .slice(0, limit);
}

function selectedSpecSummaryLines(spec: SpecItem & { text: string }, index: number, mode: ContextMode): string[] {
  const headingLimit = mode === "full" ? 16 : 8;
  const headings = selectedSpecHeadings(spec.text, headingLimit);
  return [
    `### ${index + 1}. ${spec.title}`,
    "",
    `- file: \`${spec.file}\``,
    `- status: \`${spec.status}\``,
    `- source: \`${spec.source}\``,
    "- content: 未内嵌；需要完整内容时请用读文件工具打开上面的 file。",
    "- sections:",
    ...withFallbackLines(headings.map((heading) => `  - ${heading.replace(/^##\s+/, "")}`), "  - 未识别到章节标题"),
    ""
  ];
}

function renderSelectedSpecs(selectedSpecs: Array<SpecItem & { text: string }>, state: EmptyWorkState, mode: ContextMode): string[] {
  if (!selectedSpecs.length) return renderEmptySelectedSpecs(state);
  return selectedSpecs.flatMap((spec, index) => selectedSpecSummaryLines(spec, index, mode));
}

function renderTodoLines(todos: SpecContext["todos"], hasSelectedSpecs: boolean, state: EmptyWorkState): string[] {
  if (todos.length) {
    return todos.map((todo, index) => `${index + 1}. ${todo.text}（${todo.file}:${todo.line}）`);
  }
  if (hasSelectedSpecs) {
    return ["- 未发现未完成 TODO；请按 selected specs 的目标结果、行为约定和完成标准执行。"];
  }
  if (state === "done-only") {
    return ["- 当前没有 open TODO；项目只有 done 历史记录，需要新工作时先创建 spec_todo 或 spec_create。"];
  }
  return ["- 当前没有 open TODO，也没有 selected spec；不要开始实现，先创建或选择一个 spec。"];
}

function renderCompletedTodoLines(todos: SpecContext["todos"]): string[] {
  const completed = todos.filter((todo) => todo.checked);
  return completed.length ? completed.map((todo) => `- ${todo.text}（${todo.file}:${todo.line}）`) : ["- 无"];
}

function renderRequestedSpecs(requestedSpecs: SpecContext["requestedSpecs"]): string[] {
  if (!requestedSpecs.requested.length) return [];
  return [
    "## Requested Specs",
    "",
    `- requested: ${requestedSpecs.requested.length ? requestedSpecs.requested.map((file) => `\`${file}\``).join(", ") : "无"}`,
    `- matched: ${requestedSpecs.matched.length ? requestedSpecs.matched.map((file) => `\`${file}\``).join(", ") : "无"}`,
    `- unmatched: ${requestedSpecs.unmatched.length ? requestedSpecs.unmatched.map((file) => `\`${file}\``).join(", ") : "无"}`,
    ""
  ];
}

export function workflowStateLines(input: {
  activeCount: number;
  todoCount: number;
  reviewCount: number;
  doneCount: number;
  selectedCount: number;
  openTodoCount: number;
}): string[] {
  return [
    "## Workflow State",
    "",
    `- active specs: ${input.activeCount}`,
    `- todo specs: ${input.todoCount}`,
    `- review specs: ${input.reviewCount}`,
    `- done specs: ${input.doneCount}`,
    `- selected specs: ${input.selectedCount}`,
    `- open TODOs: ${input.openTodoCount}`,
    ""
  ];
}

const sourceGuidance = [
  "- 这些条目只是搜索线索，不是源码事实；修改前必须自行读取相关文件确认。",
  "- 优先使用 rg、Get-Content、语言服务和测试反馈理解真实代码。"
];

function renderSourceSignals(source?: SourceScanSummary): string[] {
  if (!source) return [];
  return [
    "## Source Signals",
    "",
    `- package scripts: ${source.packageScripts.length}`,
    `- tests: ${source.testFiles.length}`,
    `- routes: ${source.routeHints.length}`,
    `- exports: ${source.exportHints.length}`,
    `- imports: ${source.importHints.length}`,
    `- references: ${source.referenceHints.length}`,
    ""
  ];
}

function renderSuggestedSearchTargets(candidateFiles: string[], mode: ContextMode): string[] {
  if (mode === "workflow") return [];
  return [
    "## Suggested Search Targets",
    "",
    ...sourceGuidance,
    "",
    ...(candidateFiles.length ? candidateFiles.map((file) => `- \`${file}\``) : ["- 未仅凭文件名找到搜索线索；请按 spec 关键词自行搜索源码。"]),
    ""
  ];
}

function renderSourceHints(source: SourceScanSummary, mode: ContextMode): string[] {
  const coreHints = [
    ...source.packageScripts.slice(0, 12).map((item) => `- ${item}`),
    ...source.testFiles.slice(0, 12).map((item) => `- test: ${item}`)
  ];
  if (mode === "hints") return coreHints;
  return [
    ...coreHints,
    ...source.routeHints.slice(0, 12).map((item) => `- route: ${item}`),
    ...source.exportHints.slice(0, 12).map((item) => `- export: ${item}`),
    ...source.importHints.slice(0, 12).map((item) => `- import: ${item}`),
    ...source.referenceHints.slice(0, 12).map((item) => `- ref: ${item}`)
  ];
}

function renderSourceHintsSection(source: SourceScanSummary | undefined, mode: ContextMode): string[] {
  if (!source || mode === "workflow") return [];
  return [
    "## Source Hints",
    "",
    ...sourceGuidance,
    "",
    ...withFallbackLines(renderSourceHints(source, mode), "- 无"),
    ""
  ];
}

function renderGuidanceIndex(specsDir: string): string[] {
  return [
    "## Guidance Index",
    "",
    "原则详情不在 `spec_context` 展开；当模型不确定或忘记相关原则时，先调用 `spec_guidance_list` 查看索引，再调用 `spec_guidance_read` 读取对应 name。",
    "",
    ...guidanceItems(specsDir).map((item) => `- \`${item.name}\` v${item.version} [${item.category}]：${item.purpose}；${item.description}（${item.file}）`),
    "",
    "guidance 是按需提醒，不替代 selected specs、open TODO、用户要求或真实源码阅读。",
    ""
  ];
}

function lowerWorkText(input: {
  selectedSpecs: Array<SpecItem & { text: string }>;
  openTodos: SpecContext["todos"];
}): string {
  return [
    ...input.selectedSpecs.flatMap((spec) => [spec.title, spec.file, spec.status, spec.source, spec.text]),
    ...input.openTodos.map((todo) => todo.text)
  ].join("\n").toLowerCase();
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function guidanceRecommendationLines(input: {
  specsDir: string;
  selectedSpecs: Array<SpecItem & { text: string }>;
  openTodos: SpecContext["todos"];
  nextTool?: string;
}): string[] {
  const text = lowerWorkText(input);
  const recommendations: string[] = [];
  const add = (name: string, reason: string) => {
    const item = guidanceItems(input.specsDir).find((entry) => entry.name === name);
    if (!item || recommendations.some((line) => line.includes(`\`${name}\``))) return;
    recommendations.push(`- \`${name}\`（${item.file}）：${reason}`);
  };

  if (hasAny(text, ["ui", "ux", "前端", "页面", "组件", "交互", "样式", "布局", "表单", "按钮", "loading", "empty", "error", "disabled", "hover", "focus", "官网", "网站", "homepage", "landing", "website", "site", "首屏", "品牌", "视觉", "截图", "移动端"])) {
    add("ui-ux", "当前任务涉及界面或交互质量。");
  }
  if (hasAny(text, ["重构", "架构", "模块", "接口", "性能", "缓存", "并发", "权限", "状态机", "数据库", "api", "代码", "实现"])) {
    add("engineering", "当前任务涉及工程实现、边界或代码质量。");
  }
  if (hasAny(text, ["checkpoint", "done", "行为记录", "最终行为契约", "默认行为", "验收", "验证", "定位", "事实", "文案", "指标", "客户", "cta", "roadmap", "路线图"])) {
    add("spec-writing", "当前任务需要记录行为、验证或最终契约。");
  }
  if (hasAny(text, ["commit", "提交", "git"])) {
    add("git-commit", "当前任务提到提交或 Git 工作流。");
  }
  if (hasAny(text, ["pull request", "pr", "合并请求"])) {
    add("pr-submit", "当前任务提到 PR 或合并请求。");
  }
  if (input.nextTool === "spec_checkpoint" || input.nextTool === "spec_done" || hasAny(text, ["质量", "审查", "自查", "测试", "验证", "交付", "风险", "ui", "ux", "交互", "官网", "网站", "首屏", "oss", "开源", "github", "repo", "文案", "指标", "cta"])) {
    add("quality-review", "实现后或记录前建议自查代码、测试、UI/交互状态和风险。");
  }

  if (!recommendations.length) {
    add("engineering", "默认建议在实现不确定时读取工程原则。");
    add("quality-review", "完成实现后做一次轻量质量自查。");
  }

  return [
    "## Guidance Recommendations",
    "",
    "根据当前 spec/TODO 和下一步场景的轻量推荐；只在需要校准时读取，不替代源码阅读和用户要求。",
    "",
    ...recommendations,
    ""
  ];
}

function renderRequiredGuards(mode: ContextMode, instructions: string[]): string[] {
  void mode;
  void instructions;
  return requiredGuards.map((item) => `- ${item}`);
}

export function buildSpecContextMarkdown(input: {
  root: string;
  specsDir: string;
  contextMode: ContextMode;
  activeSpecs: SpecItem[];
  reviewSpecs: SpecItem[];
  todoSpecs: SpecItem[];
  doneSpecs: SpecItem[];
  requestedSpecs: SpecContext["requestedSpecs"];
  selectedSpecs: Array<SpecItem & { text: string }>;
  todos: SpecContext["todos"];
  source?: SourceScanSummary;
  candidateFiles: string[];
  instructions: string[];
}): string {
  const openTodos = input.todos.filter((todo) => !todo.checked);
  const workState = emptyWorkState({
    activeSpecs: input.activeSpecs,
    reviewSpecs: input.reviewSpecs,
    todoSpecs: input.todoSpecs,
    doneSpecs: input.doneSpecs,
    selectedSpecs: input.selectedSpecs,
    openTodos
  });
  const recommendationState = {
    projectRoot: input.root,
    specsDir: input.specsDir,
    activeSpecs: input.activeSpecs,
    reviewSpecs: input.reviewSpecs,
    todoSpecs: input.todoSpecs,
    doneSpecs: input.doneSpecs,
    openTodos,
    selectedSpecs: input.selectedSpecs
  };
  const recommendationLines = workflowRecommendationLines(recommendationState);
  const nextTool = recommendationLines.find((line) => line.startsWith("- nextTool:"))?.match(/`([^`]+)`/)?.[1];
  return [
    "# Spec Coding Context",
    "",
    `Spec Coding MCP：\`${APP_VERSION}\``,
    `项目：\`${input.root}\``,
    `Specs：\`${input.specsDir}\``,
    `选中 spec：${input.selectedSpecs.length}`,
    `Context mode：\`${input.contextMode}\``,
    "",
    ...workflowStateLines({
      activeCount: input.activeSpecs.length,
      todoCount: input.todoSpecs.length,
      reviewCount: input.reviewSpecs.length,
      doneCount: input.doneSpecs.length,
      selectedCount: input.selectedSpecs.length,
      openTodoCount: openTodos.length
    }),
    ...renderSourceSignals(input.source),
    ...renderRequestedSpecs(input.requestedSpecs),
    "## Selected Specs",
    "",
    ...renderSelectedSpecs(input.selectedSpecs, workState, input.contextMode),
    "",
    "## Open TODOs",
    "",
    ...renderTodoLines(openTodos, input.selectedSpecs.length > 0, workState),
    "",
    ...recommendationLines,
    "## Completed TODOs",
    "",
    ...renderCompletedTodoLines(input.todos),
    "",
    ...renderGuidanceIndex(input.specsDir),
    ...guidanceRecommendationLines({
      specsDir: input.specsDir,
      selectedSpecs: input.selectedSpecs,
      openTodos,
      nextTool
    }),
    ...renderSuggestedSearchTargets(input.candidateFiles, input.contextMode),
    ...renderSourceHintsSection(input.source, input.contextMode),
    "## Required Guards",
    "",
    ...renderRequiredGuards(input.contextMode, input.instructions)
  ].join("\n");
}
