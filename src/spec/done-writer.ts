/* Archive writer for completed specs. */
import { promises as fs } from "node:fs";
import path from "node:path";
import { inferSpecFileName, nextSpecDocumentPath, resolveInsideRoot, titleFromMarkdown } from "./spec-files.js";
import type { BehaviorRecord, SpecResult } from "./types.js";
import { nowIso, relativePosix } from "../shared/utils.js";
import { behaviorRecordLines, hasBehaviorRecords } from "./behavior-record.js";

function markArchivedStatus(text: string): string {
  let nextText = text;
  if (/^---\s*$/m.test(text) && /^status:\s*.+?\s*$/im.test(text)) {
    nextText = nextText.replace(/^status:\s*.+?\s*$/im, "status: done");
    nextText = nextText.replace(/^type:\s*.+?\s*$/im, "type: done-spec");
    nextText = nextText.replace(/^category:\s*.+?\s*$/im, "category: done");
  }
  if (/^-\s*status:\s*.+?\s*$/im.test(nextText)) {
    nextText = nextText.replace(/^-\s*status:\s*.+?\s*$/im, "- status: done");
  }
  return nextText;
}

const doneArchiveExcludedSections = new Set([
  "## Meta",
  "## 执行要求",
  "## 执行协议",
  "## Guidance",
  "## 工程质量约束",
  "## 业务不确定性强制确认",
  "## Checkpoint",
  "## 进度记录",
  "## Done",
  "## 归档记录",
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
  const sourceText = await fs.readFile(source, "utf8");
  const title = titleFromMarkdown(sourceText, path.basename(source, ".md"));
  const targetRelative = await nextSpecDocumentPath({
    root,
    specsDir,
    bucket: "done",
    title,
    fallbackSlug: inferSpecFileName(title)
  });
  const target = path.join(root, targetRelative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const text = cleanDoneArchiveText(markArchivedStatus(sourceText));
  const doneText = [
    text.trimEnd(),
    "",
    "## 归档记录",
    "",
    `- 完成时间：${nowIso()}`,
    input.note ? `- 备注：${input.note}` : "- 备注：verified by user/Codex",
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
        : ["Warning: 未提供给用户审查的完整最终行为契约；必须补充整个功能的所有已知正常、失败、边界、权限、状态、异常、空值和默认行为，模型自行采用的默认策略也要写清。该 done 记录不可作为真实行为事实。"])
    ]
  };
}
