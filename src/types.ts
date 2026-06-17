export type BlockKind =
  | "document"
  | "feature"
  | "api"
  | "rule"
  | "flow"
  | "data"
  | "ui"
  | "interaction"
  | "test"
  | "section";

export interface DocBlock {
  key: string;
  kind: BlockKind;
  file: string;
  titlePath: string[];
  title: string;
  level: number;
  startLine: number;
  endLine: number;
  text: string;
  normalizedText: string;
  hash: string;
  semanticHash: string;
  keywords: string[];
}

export interface BlockState {
  blockId: string;
  key: string;
  kind: BlockKind;
  file: string;
  titlePath: string[];
  title: string;
  startLine: number;
  endLine: number;
  hash: string;
  semanticHash: string;
  keywords: string[];
  implementedHash?: string;
  implementedAt?: string;
  lastSeenAt?: string;
  removedAt?: string;
  aliases?: string[];
}

export interface DocsCodeState extends Record<string, unknown> {
  version: 2;
  generatedAt: string;
  docsDir: string;
  blocks: Record<string, BlockState>;
  keyIndex: Record<string, string>;
  events: JournalEvent[];
}

export type ChangeType = "added" | "modified" | "removed" | "moved" | "renamed" | "resurrected" | "unchanged";

export interface BlockChange {
  type: ChangeType;
  block?: DocBlock;
  previous?: BlockState;
  similarity?: number;
  blockId?: string;
  reasons?: string[];
}

export interface ScanResult {
  projectRoot: string;
  docsDir: string;
  blocks: DocBlock[];
  changes: BlockChange[];
  stateExists: boolean;
  statePath: string;
}

export interface ImplementationTask {
  summary: string;
  changedBlocks: BlockChange[];
  suggestedFiles: string[];
  testTargets: string[];
  instructions: string[];
}

export type JournalEventType =
  | "baseline"
  | "observed"
  | "added"
  | "modified"
  | "moved"
  | "renamed"
  | "removed"
  | "resurrected"
  | "implemented"
  | "reset";

export interface JournalEvent {
  eventId: string;
  type: JournalEventType;
  blockId?: string;
  at: string;
  file?: string;
  titlePath?: string[];
  hash?: string;
  semanticHash?: string;
  previous?: Partial<BlockState>;
  similarity?: number;
  reasons?: string[];
}
