/* Structured checkpoint writer for spec and TODO progress updates. */
import { promises as fs } from "node:fs";
import { bulletList, markCompletedTodos, normalizeTodoText, verificationLines } from "./todo-files.js";
import { listSpecsIn, resolveInsideRoot } from "./spec-files.js";
import type { BehaviorRecord, SpecResult, VerificationItem } from "./types.js";
import { nowIso, relativePosix } from "../shared/utils.js";
import { behaviorRecordLines } from "./behavior-record.js";

export async function recordSpecCheckpoint(input: {
  projectRoot: string;
  specsDir?: string;
  file: string;
  summary: string;
  completedTodos?: string[];
  changedFiles?: string[];
  verification?: VerificationItem[];
  behaviorRecords?: BehaviorRecord[];
  risks?: string[];
  blockers?: string[];
  note?: string;
}): Promise<SpecResult> {
  const root = input.projectRoot;
  const specsDir = input.specsDir ?? "specs";
  const source = resolveInsideRoot(root, input.file, "Checkpoint file");
  const oldText = await fs.readFile(source, "utf8");
  const completedTodos = input.completedTodos ?? [];
  const marked = markCompletedTodos(oldText, completedTodos);
  const unmatchedTodos = completedTodos.map(normalizeTodoText).filter(Boolean).filter((todo) => !marked.matched.includes(todo));
  const checkpoint = [
    "",
    "## \u8FDB\u5EA6\u8BB0\u5F55",
    "",
    `- \u65F6\u95F4\uFF1A${nowIso()}`,
    `- \u6458\u8981\uFF1A${input.summary.trim()}`,
    ...(input.note?.trim() ? [`- \u5907\u6CE8\uFF1A${input.note.trim()}`] : []),
    "",
    "### \u5B8C\u6210\u6458\u8981",
    "",
    ...bulletList([input.summary.trim()], "\u65E0"),
    "",
    "### \u5DF2\u5B8C\u6210\u6E05\u5355",
    "",
    ...bulletList(completedTodos, "\u65E0"),
    "",
    "### \u53D8\u66F4\u6587\u4EF6",
    "",
    ...bulletList((input.changedFiles ?? []).map((file) => `\`${file}\``), "\u672A\u8BB0\u5F55"),
    "",
    "### \u9A8C\u8BC1\u7ED3\u679C",
    "",
    ...verificationLines(input.verification ?? []),
    "",
    ...behaviorRecordLines("### \u884C\u4E3A\u8BB0\u5F55", input.behaviorRecords),
    "",
    "### \u98CE\u9669",
    "",
    ...bulletList(input.risks ?? [], "\u65E0"),
    "",
    "### \u963B\u585E",
    "",
    ...bulletList(input.blockers ?? [], "\u65E0")
  ].join("\n");
  await fs.writeFile(source, `${marked.text.trimEnd()}\n${checkpoint}\n`, "utf8");
  const [remainingActive, remainingTodo, remainingReview, remainingDone] = await Promise.all([
    listSpecsIn(root, specsDir, "active"),
    listSpecsIn(root, specsDir, "todo"),
    listSpecsIn(root, specsDir, "review"),
    listSpecsIn(root, specsDir, "done")
  ]);
  const openTodoCount = (marked.text.match(/\[ \]/g) ?? []).length;
  return {
    projectRoot: root,
    specsDir,
    files: [{ path: relativePosix(root, source), status: "updated" }],
    specs: [relativePosix(root, source)],
    nextSteps: [
      marked.matched.length ? `\u5DF2\u52FE\u9009 ${marked.matched.length} \u4E2A TODO\u3002` : "\u672A\u5339\u914D\u5230\u53EF\u52FE\u9009 TODO\u3002",
      unmatchedTodos.length ? `\u6709 ${unmatchedTodos.length} \u4E2A completedTodos \u672A\u5339\u914D\u5230\u539F\u6587\uFF0C\u8BF7\u68C0\u67E5 TODO \u6587\u6848\u662F\u5426\u4E00\u81F4\u3002` : "\u6240\u6709 completedTodos \u5747\u5DF2\u5339\u914D\u6216\u672A\u63D0\u4F9B completedTodos\u3002",
      "\u786E\u8BA4\u5269\u4F59 TODO\u3001\u9A8C\u8BC1\u7ED3\u679C\u3001\u98CE\u9669\u548C\u6700\u7EC8\u884C\u4E3A\u5951\u7EA6\u540E\uFF0C\u624D\u53EF\u8C03\u7528 spec_done \u5F52\u6863\u3002",
      "",
      `\u5237\u65B0\u76EE\u5F55\u5BB9\u91CF\uFF1Aactive=${remainingActive.length}, todo=${remainingTodo.length}, review=${remainingReview.length}, done=${remainingDone.length}\u3002\u5F53\u524D spec open TODO=${openTodoCount}`
    ]
  };
}
