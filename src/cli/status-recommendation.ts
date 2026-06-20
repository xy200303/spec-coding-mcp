/* Status workflow recommendation adapter for CLI text and JSON output. */
import { recommendedWorkflowStep, type WorkflowRecommendation, type WorkflowState as FullWorkflowState } from "../spec/workflow-next-step.js";
import type { SpecItem, TodoItem } from "../spec/types.js";

export type WorkflowState = { active: number; todo: number; review: number; done: number; openTodos: number };
export type RecommendationArguments = Record<string, string>;

export const STATUS_JSON_SCHEMA_VERSION = 1;

export interface StatusRecommendation {
  nextTool: string;
  alternatives: string[];
  arguments: RecommendationArguments;
  reason: string;
}

export interface StatusDecision extends StatusRecommendation {
  nextStep: string;
}

function placeholderSpec(file: string, status: SpecItem["status"]): SpecItem {
  return { file, title: file, status, source: "status-summary" };
}

function placeholderTodo(file: string): TodoItem {
  return { file, text: file, checked: false, line: 1 };
}

function statusWorkflowState(input: { workflowState: WorkflowState; projectRoot: string; specsDir: string }): FullWorkflowState {
  return {
    projectRoot: input.projectRoot,
    specsDir: input.specsDir,
    activeSpecs: Array.from({ length: input.workflowState.active }, (_, index) => placeholderSpec(`active-${index + 1}.md`, "active")),
    reviewSpecs: Array.from({ length: input.workflowState.review }, (_, index) => placeholderSpec(`review-${index + 1}.md`, "review")),
    todoSpecs: Array.from({ length: input.workflowState.todo }, (_, index) => placeholderSpec(`todo-${index + 1}.md`, "todo")),
    doneSpecs: Array.from({ length: input.workflowState.done }, (_, index) => placeholderSpec(`done-${index + 1}.md`, "done")),
    openTodos: Array.from({ length: input.workflowState.openTodos }, (_, index) => placeholderTodo(`todo-${index + 1}.md`)),
    selectedSpecs: []
  };
}

function statusNextStep(input: WorkflowState, recommendation: WorkflowRecommendation): string {
  if (input.openTodos) {
    return "Call spec_context and execute open TODOs in order.";
  }
  if (recommendation.nextTool === "spec_context") {
    return "Call spec_context in your AI tool before changing code or docs.";
  }
  if (recommendation.nextTool === "spec_todo") {
    return "No open work items. Create a new spec_todo or spec_create entry when new work starts.";
  }
  if (recommendation.nextTool === "spec_bootstrap") {
    return "Run specc bootstrap --project-root <path> --project-kind auto.";
  }
  return recommendation.afterwards;
}

export function decideStatusRecommendation(input: { workflowState: WorkflowState; projectRoot: string; specsDir: string }): StatusDecision {
  const recommendation = recommendedWorkflowStep(statusWorkflowState(input), "inspect");
  return {
    nextStep: statusNextStep(input.workflowState, recommendation),
    nextTool: recommendation.nextTool,
    alternatives: recommendation.alternatives,
    arguments: recommendation.arguments,
    reason: recommendation.reason
  };
}

export function publicStatusRecommendation(decision: StatusDecision): StatusRecommendation {
  return {
    nextTool: decision.nextTool,
    alternatives: decision.alternatives,
    arguments: decision.arguments,
    reason: decision.reason
  };
}
