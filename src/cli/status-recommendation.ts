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
  when: string;
  afterwards: string;
}

export interface StatusDecision extends StatusRecommendation {
  nextStep: string;
}

export interface StatusRecommendationInput {
  projectRoot: string;
  specsDir: string;
  activeSpecs: SpecItem[];
  reviewSpecs: SpecItem[];
  todoSpecs: SpecItem[];
  doneSpecs: SpecItem[];
  openTodos: TodoItem[];
}

export function countStatusWorkflowState(input: StatusRecommendationInput): WorkflowState {
  return {
    active: input.activeSpecs.length,
    todo: input.todoSpecs.length,
    review: input.reviewSpecs.length,
    done: input.doneSpecs.length,
    openTodos: input.openTodos.length
  };
}

function statusWorkflowState(input: StatusRecommendationInput): FullWorkflowState {
  return {
    projectRoot: input.projectRoot,
    specsDir: input.specsDir,
    activeSpecs: input.activeSpecs,
    reviewSpecs: input.reviewSpecs,
    todoSpecs: input.todoSpecs,
    doneSpecs: input.doneSpecs,
    openTodos: input.openTodos,
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

export function decideStatusRecommendation(input: StatusRecommendationInput): StatusDecision {
  const workflowState = countStatusWorkflowState(input);
  const recommendation = recommendedWorkflowStep(statusWorkflowState(input), "inspect");
  return {
    nextStep: statusNextStep(workflowState, recommendation),
    nextTool: recommendation.nextTool,
    alternatives: recommendation.alternatives,
    arguments: recommendation.arguments,
    reason: recommendation.reason,
    when: recommendation.when,
    afterwards: recommendation.afterwards
  };
}

export function publicStatusRecommendation(decision: StatusDecision): StatusRecommendation {
  return {
    nextTool: decision.nextTool,
    alternatives: decision.alternatives,
    arguments: decision.arguments,
    reason: decision.reason,
    when: decision.when,
    afterwards: decision.afterwards
  };
}
