/* Spec-related MCP response rendering helpers. */
import type { AgentFileResult, ReviewResult, SpecItem, SpecResult } from "../spec/types.js";
import { code, fileStatus } from "./render-core.js";

const DEFAULT_LIST_LIMIT = 20;

function limitedLines<T>(items: T[], render: (item: T) => string, empty: string, limit = DEFAULT_LIST_LIMIT): string[] {
  const visibleItems = items.slice(0, limit);
  const hiddenCount = items.length - visibleItems.length;
  if (!visibleItems.length) return [empty];
  return [
    ...visibleItems.map(render),
    ...(hiddenCount > 0 ? [`- 其余 ${hiddenCount} 项未展开；需要详情请读取对应文件或目录。`] : [])
  ];
}

export function renderSpecResult(title: string, result: SpecResult): string {
  const created = result.files.filter((file) => file.status === "created").length;
  const updated = result.files.filter((file) => file.status === "updated").length;
  const skipped = result.files.filter((file) => file.status === "skipped").length;
  return [
    `# ${title}`,
    "",
    `项目：${code(result.projectRoot)}`,
    `Specs：${code(result.specsDir)}`,
    `文件变更：创建 ${created} 个，更新 ${updated} 个，跳过 ${skipped} 个。`,
    "",
    "## 文件",
    "",
    ...limitedLines(result.files, fileStatus, "- 无文件变更"),
    "",
    "## Specs",
    "",
    ...limitedLines(result.specs, (file) => `- ${code(file)}`, "- 无"),
    "",
    "## 下一步",
    "",
    ...result.nextSteps.map((step) => `- ${step}`)
  ].filter(Boolean).join("\n");
}

export function renderSpecItems(title: string, items: SpecItem[], limit = DEFAULT_LIST_LIMIT): string[] {
  const visibleItems = items.slice(0, limit);
  const hiddenCount = items.length - visibleItems.length;
  return [
    `## ${title}`,
    "",
    ...(visibleItems.length
      ? visibleItems.map((item) => `- ${code(item.file)}：${item.title}（status: ${item.status}, source: ${item.source}）`)
      : ["- 无"]),
    ...(hiddenCount > 0 ? [`- 其余 ${hiddenCount} 个未展开；需要详情请读取对应 specs 目录。`] : [])
  ];
}

export function renderReviewResult(title: string, result: ReviewResult): string {
  return [
    `# ${title}`,
    "",
    `文件：${code(result.file)}`,
    `摘要：${result.summary}`,
    "",
    "## Completed TODOs",
    "",
    ...limitedLines(result.completedTodos, (item) => `- ${item}`, "- 无"),
    "",
    "## Incomplete TODOs",
    "",
    ...limitedLines(result.incompleteTodos, (item) => `- ${item}`, "- 无"),
    "",
    "## Changed Files",
    "",
    ...limitedLines(result.changedFiles, (item) => `- \`${item}\``, "- 未记录"),
    "",
    "## Verification",
    "",
    ...limitedLines(result.verification, (item) => `- ${item.status} \`${item.command}\`${item.note ? `（${item.note}）` : ""}`, "- 无"),
    "",
    "## Risks",
    "",
    ...limitedLines(result.risks, (item) => `- ${item}`, "- 无"),
    "",
    "## Blockers",
    "",
    ...limitedLines(result.blockers, (item) => `- ${item}`, "- 无")
  ].join("\n");
}

export function renderAgentFileResult(title: string, result: AgentFileResult): string {
  return [
    `# ${title}`,
    "",
    `项目：${code(result.projectRoot)}`,
    `文件：${code(result.file)}`,
    "",
    "## 文件",
    "",
    ...limitedLines(result.files, fileStatus, "- 无文件变更"),
    "",
    "## 下一步",
    "",
    ...result.nextSteps.map((step) => `- ${step}`)
  ].join("\n");
}
