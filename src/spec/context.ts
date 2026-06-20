/* Model-ready context assembly for spec-driven development. */
import path from "node:path";
import { scanSource } from "./source-scan.js";
import { buildContextInstructions, buildSpecContextMarkdown } from "./context-markdown.js";
import type { SpecContext } from "./types.js";
import { extractTodos } from "./todo-files.js";
import { listSpecsIn } from "./spec-files.js";
import { findCandidateFiles } from "./context-source.js";
import { readSpecsWithText } from "./spec-reader.js";
import type { ContextMode } from "./types.js";

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
    ? [...activeSpecs, ...reviewSpecs, ...todoSpecs].filter((item) => requested.some((file) => item.file === file || item.file.endsWith(file)))
    : [...activeSpecs, ...todoSpecs];
  const selectedSpecs = await readSpecsWithText(root, selectedBase, maxSpecChars);
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
    selectedSpecs,
    todos,
    source,
    candidateFiles,
    instructions,
    markdown
  };
}
