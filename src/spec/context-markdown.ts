/* Markdown rendering helpers for spec context assembly. */
import type { ContextMode, SourceScanSummary, SpecContext, SpecItem } from "./types.js";
import { businessConfirmationBullets, engineeringRuleSections } from "../templates/markdown.js";
import { currentTaskInstructions } from "../templates/prompt-protocol.js";
import { workflowRecommendationLines } from "./workflow-next-step.js";
import { APP_VERSION } from "../shared/meta.js";

function withFallbackLines(items: string[], empty: string): string[] {
  return items.length ? items : [empty];
}

export function buildContextInstructions(): string[] {
  return currentTaskInstructions;
}

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

function renderSelectedSpecs(selectedSpecs: Array<SpecItem & { text: string }>, state: EmptyWorkState): string[] {
  if (!selectedSpecs.length) return renderEmptySelectedSpecs(state);
  return selectedSpecs.map((spec, index) => [`### ${index + 1}. ${spec.file}`, "", "```md", spec.text, "```"].join("\n"));
}

function renderTodoLines(todos: SpecContext["todos"], hasSelectedSpecs: boolean, state: EmptyWorkState): string[] {
  if (todos.length) {
    return todos.map((todo, index) => `${index + 1}. ${todo.text}（${todo.file}:${todo.line}）`);
  }
  if (hasSelectedSpecs) {
    return ["- 未发现未完成 TODO；请按 selected specs 的目标、行为规则和验收标准执行。"];
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
    ...renderSelectedSpecs(input.selectedSpecs, workState),
    "",
    "## Open TODOs",
    "",
    ...renderTodoLines(openTodos, input.selectedSpecs.length > 0, workState),
    "",
    ...workflowRecommendationLines({
      projectRoot: input.root,
      specsDir: input.specsDir,
      activeSpecs: input.activeSpecs,
      reviewSpecs: input.reviewSpecs,
      todoSpecs: input.todoSpecs,
      doneSpecs: input.doneSpecs,
      openTodos,
      selectedSpecs: input.selectedSpecs
    }),
    "## Completed TODOs",
    "",
    ...renderCompletedTodoLines(input.todos),
    "",
    "## Engineering Constraints",
    "",
    ...engineeringRuleSections(),
    "",
    "## Business Confirmation Rules",
    "",
    ...businessConfirmationBullets(),
    "",
    ...renderSuggestedSearchTargets(input.candidateFiles, input.contextMode),
    ...renderSourceHintsSection(input.source, input.contextMode),
    "## Current Task Protocol",
    "",
    ...input.instructions.map((item) => `- ${item}`)
  ].join("\n");
}
