/* Structured checkpoint writer for spec and TODO progress updates. */
import { promises as fs } from "node:fs";
import { bulletList, markCompletedTodos, normalizeTodoText, verificationLines } from "./todo-files.js";
import { resolveInsideRoot } from "./spec-files.js";
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
    "## 进度记录",
    "",
    `- 时间：${nowIso()}`,
    `- 摘要：${input.summary.trim()}`,
    ...(input.note?.trim() ? [`- 备注：${input.note.trim()}`] : []),
    "",
    "### 完成摘要",
    "",
    ...bulletList([input.summary.trim()], "无"),
    "",
    "### 已完成清单",
    "",
    ...bulletList(completedTodos, "无"),
    "",
    "### 变更文件",
    "",
    ...bulletList((input.changedFiles ?? []).map((file) => `\`${file}\``), "未记录"),
    "",
    "### 验证结果",
    "",
    ...verificationLines(input.verification ?? []),
    "",
    ...behaviorRecordLines("### 行为记录", input.behaviorRecords),
    "",
    "### 风险",
    "",
    ...bulletList(input.risks ?? [], "无"),
    "",
    "### 阻塞",
    "",
    ...bulletList(input.blockers ?? [], "无")
  ].join("\n");
  await fs.writeFile(source, `${marked.text.trimEnd()}\n${checkpoint}\n`, "utf8");
  return {
    projectRoot: root,
    specsDir,
    files: [{ path: relativePosix(root, source), status: "updated" }],
    specs: [relativePosix(root, source)],
    nextSteps: [
      marked.matched.length ? `已勾选 ${marked.matched.length} 个 TODO。` : "未匹配到可勾选 TODO。",
      unmatchedTodos.length ? `有 ${unmatchedTodos.length} 个 completedTodos 未匹配到原文，请检查 TODO 文案是否一致。` : "所有 completedTodos 均已匹配或未提供 completedTodos。",
      "确认剩余 TODO、验证结果、风险和最终行为契约后，才可调用 spec_done 归档。"
    ]
  };
}
