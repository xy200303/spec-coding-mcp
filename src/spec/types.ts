/* Shared types for spec workflows and MCP session state. */
export interface GeneratedFile {
  path: string;
  status: "created" | "updated" | "skipped";
  reason?: string;
}

export interface SourceScanSummary {
  totalFiles: number;
  manifests: string[];
  packageScripts: string[];
  apiFiles: string[];
  uiFiles: string[];
  dataFiles: string[];
  testFiles: string[];
  routeHints: string[];
  componentHints: string[];
  modelHints: string[];
  exportHints: string[];
  importHints: string[];
  referenceHints: string[];
}

export interface SourceSpecCandidate {
  domain: string;
  name: string;
  title: string;
  evidence: string[];
  routes: string[];
  components: string[];
  models: string[];
  tests: string[];
}

export interface SpecResult {
  projectRoot: string;
  specsDir: string;
  files: GeneratedFile[];
  specs: string[];
  nextSteps: string[];
  source?: SourceScanSummary;
}

export interface AgentFileResult {
  projectRoot: string;
  file: string;
  files: GeneratedFile[];
  nextSteps: string[];
}

export interface TodoItem {
  file: string;
  text: string;
  checked: boolean;
  line: number;
}

export interface VerificationItem {
  command: string;
  status: "passed" | "failed" | "not-run";
  note?: string;
}

export interface BehaviorRecord {
  scenario: string;
  condition: string;
  result: string;
  defaultBehavior?: string;
  edgeCase?: string;
  verification?: string;
  relatedFiles?: string[];
}

export interface TodoResult {
  task: string;
  status: "done" | "blocked";
  note?: string;
  verificationCommands?: string[];
  relatedFiles?: string[];
  blocker?: string;
}

export interface SpecItem {
  file: string;
  title: string;
  status: string;
  source: string;
  updatedAt?: string;
}

export type ContextMode = "workflow" | "hints" | "full";

export interface SpecContext {
  projectRoot: string;
  specsDir: string;
  contextMode: ContextMode;
  requestedSpecs: {
    requested: string[];
    matched: string[];
    unmatched: string[];
  };
  source?: SourceScanSummary;
  activeSpecs: SpecItem[];
  reviewSpecs: SpecItem[];
  todoSpecs: SpecItem[];
  doneSpecs: SpecItem[];
  selectedSpecs: Array<SpecItem & { text: string }>;
  todos: TodoItem[];
  candidateFiles: string[];
  instructions: string[];
  markdown: string;
}

export interface ReviewResult {
  file: string;
  summary: string;
  completedTodos: string[];
  incompleteTodos: string[];
  verification: VerificationItem[];
  behaviorRecords: BehaviorRecord[];
  changedFiles: string[];
  risks: string[];
  blockers: string[];
}

export interface SessionGuardState {
  specContextSeen: boolean;
}
