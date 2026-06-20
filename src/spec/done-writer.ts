/* Archive writer for completed specs. */
import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveInsideRoot } from "./spec-files.js";
import type { BehaviorRecord, SpecResult } from "./types.js";
import { nowIso, pathExists, relativePosix } from "../shared/utils.js";
import { behaviorRecordLines, hasBehaviorRecords } from "./behavior-record.js";

async function unusedDoneFile(doneDir: string, sourceFile: string): Promise<string> {
  const parsed = path.parse(sourceFile);
  let target = path.join(doneDir, sourceFile);
  let suffix = 2;
  while (await pathExists(target)) {
    target = path.join(doneDir, `${parsed.name}-${suffix}${parsed.ext}`);
    suffix += 1;
  }
  return target;
}

function markArchivedStatus(text: string): string {
  if (/^-\s*status:\s*.+?\s*$/im.test(text)) {
    return text.replace(/^-\s*status:\s*.+?\s*$/im, "- status: done");
  }
  return text;
}

const doneArchiveExcludedSections = new Set([
  "## 执行要求",
  "## 工程质量约束",
  "## 业务不确定性强制确认",
  "## Checkpoint",
  "## Done",
  "## 最终行为契约"
]);

function isTopLevelSection(line: string): boolean {
  return line.startsWith("## ") && !line.startsWith("### ");
}

function cleanDoneArchiveText(text: string): string {
  const output: string[] = [];
  let shouldKeepSection = true;

  for (const line of text.split(/\r?\n/)) {
    if (isTopLevelSection(line)) {
      shouldKeepSection = !doneArchiveExcludedSections.has(line);
    }
    if (shouldKeepSection) output.push(line);
  }

  return output.join("\n").trimEnd();
}

export async function markSpecDone(input: { projectRoot: string; specsDir?: string; file: string; note?: string; behaviorRecords?: BehaviorRecord[] }): Promise<SpecResult> {
  const root = input.projectRoot;
  const specsDir = input.specsDir ?? "specs";
  const source = resolveInsideRoot(root, input.file, "Spec file");
  const doneDir = path.join(root, specsDir, "done");
  await fs.mkdir(doneDir, { recursive: true });
  const target = await unusedDoneFile(doneDir, path.basename(source));
  const text = cleanDoneArchiveText(markArchivedStatus(await fs.readFile(source, "utf8")));
  const doneText = [
    text.trimEnd(),
    "",
    "## Done",
    "",
    `- doneAt: ${nowIso()}`,
    input.note ? `- note: ${input.note}` : "- note: verified by user/Codex",
    "",
    ...behaviorRecordLines("## 最终行为契约", input.behaviorRecords)
  ].join("\n");
  await fs.writeFile(target, `${doneText}\n`, "utf8");
  await fs.rm(source);
  return {
    projectRoot: root,
    specsDir,
    files: [{ path: relativePosix(root, target), status: "created" }],
    specs: [relativePosix(root, target)],
    nextSteps: [
      "Spec 已归档到 done/。",
      ...(hasBehaviorRecords(input.behaviorRecords)
        ? ["最终行为契约已记录。"]
        : ["Warning: 未提供最终行为契约；请补充分支条件、默认参数行为、边界处理和验证结果。"])
    ]
  };
}
