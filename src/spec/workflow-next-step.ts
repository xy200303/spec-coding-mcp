/* Workflow recommendation helpers that keep MCP tool choices predictable. */
import type { SpecItem, TodoItem } from "./types.js";

export interface WorkflowState {
  projectRoot: string;
  specsDir: string;
  activeSpecs: SpecItem[];
  reviewSpecs: SpecItem[];
  todoSpecs: SpecItem[];
  doneSpecs: SpecItem[];
  openTodos: TodoItem[];
  selectedSpecs: SpecItem[];
}

export type WorkflowRecommendationPhase = "inspect" | "context";

export interface WorkflowRecommendation {
  nextTool: string;
  alternatives: string[];
  arguments: Record<string, string>;
  reason: string;
  when: string;
  afterwards: string;
}

function hasAnyExecutableWorkItem(state: WorkflowState): boolean {
  return Boolean(state.selectedSpecs.length || state.openTodos.length || state.activeSpecs.length || state.todoSpecs.length || state.reviewSpecs.length);
}

function projectArguments(state: WorkflowState): Record<string, string> {
  return { projectRoot: state.projectRoot, specsDir: state.specsDir };
}

function firstSpecFile(specs: SpecItem[], fallback: string): string {
  return specs[0]?.file ?? fallback;
}

function currentWorkFile(state: WorkflowState, fallback: string): string {
  return state.openTodos[0]?.file ?? state.selectedSpecs[0]?.file ?? state.activeSpecs[0]?.file ?? state.todoSpecs[0]?.file ?? fallback;
}

function inspectWorkflowRecommendation(state: WorkflowState): WorkflowRecommendation {
  if (!hasAnyExecutableWorkItem(state) && !state.doneSpecs.length) {
    return {
      nextTool: "spec_bootstrap",
      alternatives: ["spec_todo", "spec_create"],
      arguments: { ...projectArguments(state), projectKind: "auto" },
      reason: "当前没有 review、active、todo 或 selected spec，需要先建立项目入口。",
      when: "项目首次接入或 specs 尚未初始化时。",
      afterwards: "bootstrap 后调用 `spec_context`；用户已经给出明确小任务时可改用 `spec_todo`，明确功能需求时可改用 `spec_create`。"
    };
  }

  if (!hasAnyExecutableWorkItem(state) && state.doneSpecs.length) {
    return {
      nextTool: "spec_todo",
      alternatives: ["spec_create"],
      arguments: { ...projectArguments(state), prompt: "<small ordered task list>", title: "<short task title>" },
      reason: "当前只有 done 历史记录，没有待执行任务；新工作应先创建任务或功能 spec。",
      when: "项目已经接入过 Spec Coding，但当前没有 active、todo、review 或 open TODO 时。",
      afterwards: "创建任务后调用 `spec_context`，再按 open TODO 或 selected spec 执行。"
    };
  }

  if (state.openTodos.length) {
    return {
      nextTool: "spec_context",
      alternatives: [],
      arguments: projectArguments(state),
      reason: "当前有 open TODO，必须先读取上下文并按 TODO 顺序执行。",
      when: "只查看了 `spec_list` 或 `specc status`，还没有读取本轮 `spec_context` 时。",
      afterwards: "调用 `spec_context` 后按 open TODO 自上而下执行，并用 `spec_checkpoint` 记录完成情况。"
    };
  }

  if (state.activeSpecs.length || state.todoSpecs.length) {
    return {
      nextTool: "spec_context",
      alternatives: [],
      arguments: projectArguments(state),
      reason: "已存在 active spec 或 TODO，必须先读取模型可执行上下文和工程约束。",
      when: "只查看了 `spec_list`，还没有读取本轮 `spec_context` 时。",
      afterwards: "按 `spec_context` 中的 open TODO 或 selected spec 执行。"
    };
  }

  if (state.reviewSpecs.length) {
    return {
      nextTool: "spec_context",
      alternatives: [],
      arguments: { ...projectArguments(state), files: firstSpecFile(state.reviewSpecs, "<review spec path>") },
      reason: "当前只有 review spec，需要读取审查上下文并补全真实业务行为。",
      when: "旧项目已经生成 AI 源码审查任务，但还没有 active spec 时。",
      afterwards: "补全真实业务行为后，转入 active spec 或调用 `spec_create`。"
    };
  }

  return {
    nextTool: "spec_context",
    alternatives: [],
    arguments: projectArguments(state),
    reason: "需要读取模型可执行上下文后再选择下一步。",
    when: "当前状态不明确时。",
    afterwards: "按 `spec_context` 的推荐继续。"
  };
}

function contextWorkflowRecommendation(state: WorkflowState): WorkflowRecommendation {
  if (!hasAnyExecutableWorkItem(state) && !state.doneSpecs.length) {
    return {
      nextTool: "spec_bootstrap",
      alternatives: ["spec_todo", "spec_create"],
      arguments: { ...projectArguments(state), projectKind: "auto" },
      reason: "当前没有可执行任务，不能直接实现代码。",
      when: "没有 selected spec、open TODO、active、todo 或 review 时。",
      afterwards: "优先生成 AGENTS、specs 和可执行入口后再调用 `spec_context`；用户已经给出明确小任务时可改用 `spec_todo`，明确功能需求时可改用 `spec_create`。"
    };
  }

  if (!hasAnyExecutableWorkItem(state) && state.doneSpecs.length) {
    return {
      nextTool: "spec_todo",
      alternatives: ["spec_create"],
      arguments: { ...projectArguments(state), prompt: "<small ordered task list>", title: "<short task title>" },
      reason: "当前没有待执行任务，已有 done 记录说明项目已接入；新工作应先创建 spec_todo 或 spec_create。",
      when: "只有 done specs，且没有 selected spec、open TODO、active、todo 或 review 时。",
      afterwards: "创建任务后再次调用 `spec_context`，再开始实现。"
    };
  }

  if (state.openTodos.length) {
    return {
      nextTool: "spec_checkpoint",
      alternatives: [],
      arguments: { ...projectArguments(state), file: currentWorkFile(state, "<current spec or TODO file>"), completedTodos: "<completed TODO text>", verification: "<commands and status>", behaviorRecords: "<confirmed actual behavior>" },
      reason: "当前有 open TODO，应先按顺序执行 TODO，并在完成步骤后记录结果。",
      when: "完成至少一个 open TODO 后。",
      afterwards: "继续下一个 TODO；全部完成且验证通过后再考虑 `spec_done`。"
    };
  }

  if (state.selectedSpecs.length || state.activeSpecs.length) {
    return {
      nextTool: "spec_checkpoint",
      alternatives: ["spec_done"],
      arguments: { ...projectArguments(state), file: currentWorkFile(state, "<active or selected spec file>"), completedTodos: "<completed TODO text>", verification: "<commands and status>", behaviorRecords: "<confirmed actual behavior>" },
      reason: "当前有 active/selected spec，应先按 spec 实现，阶段性完成后记录进度。",
      when: "完成一段实现、测试或风险处理后。",
      afterwards: "全部验证通过并记录最终行为契约后，再调用 `spec_done`。"
    };
  }

  if (state.reviewSpecs.length) {
    return {
      nextTool: "spec_create",
      alternatives: [],
      arguments: { ...projectArguments(state), prompt: "<confirmed behavior summary from review>", title: "<business capability name>" },
      reason: "当前只有 review spec，需要先补全真实业务行为，再创建或转入 active spec。",
      when: "AI 已阅读 review 中列出的源码和测试后。",
      afterwards: "创建 active spec 后再次调用 `spec_context`。"
    };
  }

  return {
    nextTool: "spec_todo",
    alternatives: ["spec_create"],
    arguments: { ...projectArguments(state), prompt: "<small ordered task list>", title: "<short task title>" },
    reason: "当前没有明确可执行项，需要先创建任务。",
    when: "小任务用 `spec_todo`，功能开发用 `spec_create`。",
    afterwards: "创建任务后再次调用 `spec_context`。"
  };
}

export function recommendedWorkflowStep(state: WorkflowState, phase: WorkflowRecommendationPhase = "context"): WorkflowRecommendation {
  return phase === "inspect" ? inspectWorkflowRecommendation(state) : contextWorkflowRecommendation(state);
}

export function workflowRecommendationLines(state: WorkflowState, phase: WorkflowRecommendationPhase = "context"): string[] {
  const recommendation = recommendedWorkflowStep(state, phase);
  return [
    "## Recommended Next Step",
    "",
    `- nextTool: \`${recommendation.nextTool}\``,
    `- alternatives: ${recommendation.alternatives.length ? recommendation.alternatives.map((tool) => `\`${tool}\``).join(", ") : "无"}`,
    `- arguments: ${JSON.stringify(recommendation.arguments)}`,
    `- reason: ${recommendation.reason}`,
    `- when: ${recommendation.when}`,
    `- afterwards: ${recommendation.afterwards}`,
    ""
  ];
}
