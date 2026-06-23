/* Archive writer for completed specs. */
import { promises as fs } from "node:fs";
import path from "node:path";
import { inferSpecFileName, listSpecsIn, nextSpecDocumentPath, resolveInsideRoot, titleFromMarkdown } from "./spec-files.js";
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
  "## \u6267\u884C\u8981\u6C42",
  "## \u6267\u884C\u534F\u8BAE",
  "## Guidance",
  "## \u5DE5\u7A0B\u8D28\u91CF\u7EA6\u675F",
  "## \u4E1A\u52A1\u4E0D\u786E\u5B9A\u6027\u5F3A\u5236\u786E\u8BA4",
  "## Checkpoint",
  "## \u8FDB\u5EA6\u8BB0\u5F55",
  "## Done",
  "## \u5F52\u6863\u8BB0\u5F55",
  "## \u6700\u7EC8\u884C\u4E3A\u5951\u7EA6"
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
    "## \u5F52\u6863\u8BB0\u5F55",
    "",
    `- \u5B8C\u6210\u65F6\u95F4\uFF1A${nowIso()}`,
    input.note ? `- \u5907\u6CE8\uFF1A${input.note}` : "- \u5907\u6CE8\uFF1Averified by user/Codex",
    "",
    ...behaviorRecordLines("## \u6700\u7EC8\u884C\u4E3A\u5951\u7EA6", input.behaviorRecords)
  ].join("\n");
  await fs.writeFile(target, `${doneText}\n`, "utf8");
  await fs.rm(source);
  const [remainingActive, remainingTodo, remainingReview, remainingDone] = await Promise.all([
    listSpecsIn(root, specsDir, "active"),
    listSpecsIn(root, specsDir, "todo"),
    listSpecsIn(root, specsDir, "review"),
    listSpecsIn(root, specsDir, "done")
  ]);
  return {
    projectRoot: root,
    specsDir,
    files: [{ path: relativePosix(root, target), status: "created" }],
    specs: [relativePosix(root, target)],
    nextSteps: [
      "Spec \u5DF2\u5F52\u6863\u5230 done/\u3002",
      ...(hasBehaviorRecords(input.behaviorRecords)
        ? ["\u6700\u7EC8\u884C\u4E3A\u5951\u7EA6\u5DF2\u8BB0\u5F55\u3002"]
        : ["Warning: \u672A\u63D0\u4F9B\u7ED9\u7528\u6237\u5BA1\u67E5\u7684\u5B8C\u6574\u6700\u7EC8\u884C\u4E3A\u5951\u7EA6\uFF1B\u5FC5\u987B\u8865\u5145\u6574\u4E2A\u529F\u80FD\u7684\u6240\u6709\u5DF2\u77E5\u6B63\u5E38\u3001\u5931\u8D25\u3001\u8FB9\u754C\u3001\u6743\u9650\u3001\u72B6\u6001\u3001\u5F02\u5E38\u3001\u7A7A\u503C\u548C\u9ED8\u8BA4\u884C\u4E3A\uFF0C\u6A21\u578B\u81EA\u884C\u91C7\u7528\u7684\u9ED8\u8BA4\u7B56\u7565\u4E5F\u8981\u5199\u6E05\u3002\u8BE5 done \u8BB0\u5F55\u4E0D\u53EF\u4F5C\u4E3A\u771F\u5B9E\u884C\u4E3A\u4E8B\u5B9E\u3002"]),
      "",
      `\u5237\u65B0\u76EE\u5F55\u5BB9\u91CF\uFF1Aactive=${remainingActive.length}, todo=${remainingTodo.length}, review=${remainingReview.length}, done=${remainingDone.length}`
    ]
  };
}
