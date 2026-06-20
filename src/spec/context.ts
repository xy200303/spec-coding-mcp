/* Model-ready context assembly for spec-driven development. */
import path from "node:path";
import { scanSource } from "./source-scan.js";
import { buildContextInstructions, buildSpecContextMarkdown } from "./context-markdown.js";
import type { SpecContext, SpecItem } from "./types.js";
import { extractTodos } from "./todo-files.js";
import { listSpecsIn } from "./spec-files.js";
import { findCandidateFiles } from "./context-source.js";
import { readSpecsWithText } from "./spec-reader.js";
import type { ContextMode } from "./types.js";

function selectDefaultSpecs(input: { activeSpecs: SpecItem[]; reviewSpecs: SpecItem[]; todoSpecs: SpecItem[] }): SpecItem[] {
  const executableSpecs = [...input.activeSpecs, ...input.todoSpecs];
  return executableSpecs.length ? executableSpecs : input.reviewSpecs;
}

function selectRequestedSpecs(input: { requested: string[]; activeSpecs: SpecItem[]; reviewSpecs: SpecItem[]; todoSpecs: SpecItem[] }): SpecItem[] {
  return [...input.activeSpecs, ...input.reviewSpecs, ...input.todoSpecs]
    .filter((item) => input.requested.some((file) => item.file === file || item.file.endsWith(file)));
}

function requestedSpecSummary(requested: string[], selectedSpecs: SpecItem[]): SpecContext["requestedSpecs"] {
  const matched = selectedSpecs.map((spec) => spec.file);
  const unmatched = requested.filter((file) => !matched.some((matchedFile) => matchedFile === file || matchedFile.endsWith(file)));
  return { requested, matched, unmatched };
}

export async function specContext(input: { projectRoot: string; specsDir?: string; files?: string[]; maxSpecChars?: number; candidateFileLimit?: number; contextMode?: ContextMode }): Promise<SpecContext> {
  const root = path.resolve(input.projectRoot);
  const specsDir = input.specsDir ?? "specs";
  const maxSpecChars = input.maxSpecChars ?? 8000;
  const contextMode = input.contextMode ?? "workflow";
  const requested = input.files ?? [];
  const activeSpecs = await listSpecsIn(root, specsDir, "active");
  const reviewSpecs = await listSpecsIn(root, specsDir, "review");
  const todoSpecs = await listSpecsIn(root, specsDir, "todo");
  const doneSpecs = await listSpecsIn(root, specsDir, "done");
  const selectedBase = requested.length
    ? selectRequestedSpecs({ requested, activeSpecs, reviewSpecs, todoSpecs })
    : selectDefaultSpecs({ activeSpecs, reviewSpecs, todoSpecs });
  const selectedSpecs = await readSpecsWithText(root, selectedBase, maxSpecChars);
  const requestedSpecs = requestedSpecSummary(requested, selectedSpecs);
  const todos = selectedSpecs.flatMap((spec) => extractTodos(spec.file, spec.text));
  const shouldIncludeSourceHints = contextMode !== "workflow";
  const candidateFiles = shouldIncludeSourceHints ? await findCandidateFiles(root, selectedSpecs, input.candidateFileLimit ?? 40) : [];
  const source = shouldIncludeSourceHints ? await scanSource({ root, maxFiles: 600 }) : undefined;
  const instructions = buildContextInstructions();
  const markdown = buildSpecContextMarkdown({
    root,
    specsDir,
    contextMode,
    activeSpecs,
    reviewSpecs,
    todoSpecs,
    doneSpecs,
    requestedSpecs,
    selectedSpecs,
    todos,
    source,
    candidateFiles,
    instructions
  });
  return {
    projectRoot: root,
    specsDir,
    contextMode,
    activeSpecs,
    reviewSpecs,
    todoSpecs,
    doneSpecs,
    requestedSpecs,
    selectedSpecs,
    todos,
    source,
    candidateFiles,
    instructions,
    markdown
  };
}
