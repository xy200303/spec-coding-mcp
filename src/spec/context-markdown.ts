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

function renderSelectedSpecs(selectedSpecs: Array<SpecItem & { text: string }>): string[] {
  return selectedSpecs.length
    ? selectedSpecs.map((spec, index) => [`### ${index + 1}. ${spec.file}`, "", "```md", spec.text, "```"].join("\n"))
    : ["当前没有可执行任务：请先调用 spec_todo/spec_create，或把已有 spec 移到 active/ 或 todo/。"];
}

function renderTodoLines(todos: SpecContext["todos"], hasSelectedSpecs: boolean): string[] {
  if (todos.length) {
    return todos.map((todo, index) => `${index + 1}. ${todo.text}（${todo.file}:${todo.line}）`);
  }
  if (hasSelectedSpecs) {
    return ["- 未发现未完成 TODO；请按 selected specs 的目标、行为规则和验收标准执行。"];
  }
  return ["- 当前没有 open TODO，也没有 selected spec；不要开始实现，先创建或选择一个 spec。"];
}

function renderCompletedTodoLines(todos: SpecContext["todos"]): string[] {
  const completed = todos.filter((todo) => todo.checked);
  return completed.length ? completed.map((todo) => `- ${todo.text}（${todo.file}:${todo.line}）`) : ["- 无"];
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
  selectedSpecs: Array<SpecItem & { text: string }>;
  todos: SpecContext["todos"];
  source?: SourceScanSummary;
  candidateFiles: string[];
  instructions: string[];
}): string {
  const openTodos = input.todos.filter((todo) => !todo.checked);
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
    "## Selected Specs",
    "",
    ...renderSelectedSpecs(input.selectedSpecs),
    "",
    "## Open TODOs",
    "",
    ...renderTodoLines(openTodos, input.selectedSpecs.length > 0),
    "",
    ...workflowRecommendationLines({
      projectRoot: input.root,
      specsDir: input.specsDir,
      activeSpecs: input.activeSpecs,
      reviewSpecs: input.reviewSpecs,
      todoSpecs: input.todoSpecs,
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
