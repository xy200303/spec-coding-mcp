import path from "node:path";
import type { BlockChange, DocBlock } from "./types.js";
import { createImplementationTask, renderTaskMarkdown } from "./planner.js";
import { scanProject } from "./core.js";
import { listTextFiles, relativePosix, unique } from "./utils.js";

export interface DocsImplementationContext {
  projectRoot: string;
  docsDir: string;
  changeCount: number;
  changedBlocks: Array<{
    type: string;
    file: string;
    titlePath: string[];
    startLine: number;
    endLine: number;
    kind: string;
    similarity?: number;
    reasons?: string[];
    text?: string;
    previous?: {
      file: string;
      titlePath: string[];
      startLine: number;
      endLine: number;
      kind: string;
    };
  }>;
  nearbyContext: Array<{
    file: string;
    titlePath: string[];
    startLine: number;
    endLine: number;
    kind: string;
    text: string;
  }>;
  codeSearch: {
    keywords: string[];
    candidateFiles: string[];
    suggestedAreas: string[];
  };
  testGuidance: string[];
  implementationInstructions: string[];
  markdown: string;
}

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".cs",
  ".php",
  ".rb",
  ".sql",
  ".prisma",
  ".graphql",
  ".gql",
  ".vue",
  ".svelte",
  ".dart",
  ".md"
]);

const SOURCE_EXCLUDES = [
  "node_modules",
  ".git",
  ".docs-code",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "vendor",
  "target",
  ".venv",
  "__pycache__"
];

function blockLocation(change: BlockChange): {
  file: string;
  titlePath: string[];
  startLine: number;
  endLine: number;
  kind: string;
} {
  const block = change.block ?? change.previous;
  return {
    file: block?.file ?? "unknown",
    titlePath: block?.titlePath ?? [],
    startLine: block?.startLine ?? 0,
    endLine: block?.endLine ?? 0,
    kind: block?.kind ?? "section"
  };
}

function trimText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}\n\n...（已截断，调用方可按文件和行号读取完整文档）`;
}

function keywordScore(file: string, keywords: string[]): number {
  const lower = file.toLowerCase();
  return keywords.reduce((score, keyword) => {
    const normalized = keyword.toLowerCase();
    if (normalized.length < 2) return score;
    return lower.includes(normalized) ? score + Math.min(normalized.length, 12) : score;
  }, 0);
}

function candidateAreaFromFile(file: string): string {
  const lower = file.toLowerCase();
  if (/(test|spec|__tests__|e2e)/.test(lower)) return "tests";
  if (/(route|controller|api|endpoint|handler|resolver|server)/.test(lower)) return "backend/API";
  if (/(component|page|screen|view|ui|frontend|client|web|ios|android)/.test(lower)) return "frontend/client";
  if (/(schema|model|migration|repository|entity|dao|prisma|database|db)/.test(lower)) return "data/database";
  return "domain/application code";
}

async function findCandidateFiles(root: string, keywords: string[], limit: number): Promise<string[]> {
  const files = await listTextFiles(root, {
    maxFiles: 1500,
    excludeDirs: SOURCE_EXCLUDES,
    extensions: SOURCE_EXTENSIONS,
    includeNames: new Set(["package.json", "pyproject.toml", "go.mod", "Cargo.toml"])
  });
  return files
    .map((absolute) => relativePosix(root, absolute))
    .filter((file) => !file.startsWith("docs/"))
    .map((file) => ({ file, score: keywordScore(file, keywords) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))
    .slice(0, limit)
    .map((item) => item.file);
}

function collectKeywords(changes: BlockChange[]): string[] {
  const raw = changes.flatMap((change) => {
    const block = change.block;
    const previous = change.previous;
    return [
      ...(block?.keywords ?? []),
      ...(previous?.keywords ?? []),
      ...(block?.titlePath ?? previous?.titlePath ?? []).flatMap((item) => item.match(/[\p{L}\p{N}_-]{2,}/gu) ?? [])
    ];
  });
  return unique(raw)
    .filter((item) => item.length >= 2 && !["docs", "code", "test", "实现", "规则", "功能", "文档"].includes(item))
    .slice(0, 80);
}

function parentBlocksForChange(change: BlockChange, allBlocks: DocBlock[], maxChars: number): Array<{
  file: string;
  titlePath: string[];
  startLine: number;
  endLine: number;
  kind: string;
  text: string;
}> {
  if (!change.block) return [];
  const block = change.block;
  return allBlocks
    .filter((candidate) => {
      if (candidate.file !== block.file) return false;
      if (candidate.startLine >= block.startLine) return false;
      if (candidate.endLine < block.endLine) return false;
      return candidate.titlePath.length < block.titlePath.length;
    })
    .sort((a, b) => b.titlePath.length - a.titlePath.length)
    .slice(0, 2)
    .map((candidate) => ({
      file: candidate.file,
      titlePath: candidate.titlePath,
      startLine: candidate.startLine,
      endLine: candidate.endLine,
      kind: candidate.kind,
      text: trimText(candidate.text, maxChars)
    }));
}

function renderContextMarkdown(context: Omit<DocsImplementationContext, "markdown">, planMarkdown: string): string {
  const blockSections = context.changedBlocks.map((block, index) => [
    `### ${index + 1}. ${block.type} ${block.file}:${block.startLine}`,
    "",
    `- 类型：${block.kind}`,
    `- 标题：${block.titlePath.join(" > ") || "unknown"}`,
    block.similarity === undefined ? "" : `- 相似度：${block.similarity.toFixed(2)}`,
    block.reasons?.length ? `- 原因：${block.reasons.join("、")}` : "",
    "",
    "```md",
    block.text ?? "（删除的文档块没有当前正文，请查看 previous 信息）",
    "```"
  ].filter(Boolean).join("\n"));

  const nearby = context.nearbyContext.map((item) => [
    `### ${item.file}:${item.startLine} ${item.titlePath.join(" > ")}`,
    "",
    "```md",
    item.text,
    "```"
  ].join("\n"));

  return [
    "# Docs-Is-Code Model Context",
    "",
    "本上下文由 MCP 自动生成，用于让大模型按 Markdown 文档增量修改代码和测试。",
    "",
    "## Implementation Plan",
    "",
    planMarkdown,
    "",
    "## Changed Blocks Full Text",
    "",
    blockSections.length ? blockSections.join("\n\n") : "当前没有未实现文档增量。",
    "",
    "## Nearby Parent Context",
    "",
    nearby.length ? nearby.join("\n\n") : "无额外父级上下文。",
    "",
    "## Code Search",
    "",
    "### Keywords",
    "",
    context.codeSearch.keywords.length ? context.codeSearch.keywords.map((item) => `- ${item}`).join("\n") : "- 无",
    "",
    "### Candidate Files",
    "",
    context.codeSearch.candidateFiles.length ? context.codeSearch.candidateFiles.map((item) => `- \`${item}\``).join("\n") : "- MCP 没有仅凭文件名找到候选代码，调用方应按关键词搜索源码内容。",
    "",
    "### Suggested Areas",
    "",
    context.codeSearch.suggestedAreas.map((item) => `- ${item}`).join("\n"),
    "",
    "## Test Guidance",
    "",
    context.testGuidance.map((item) => `- ${item}`).join("\n"),
    "",
    "## Required Completion",
    "",
    context.implementationInstructions.map((item) => `- ${item}`).join("\n")
  ].join("\n");
}

export async function createModelContext(input: {
  projectRoot: string;
  docsDir?: string;
  maxBlocks?: number;
  maxBlockChars?: number;
  candidateFileLimit?: number;
  includeFullText?: boolean;
}): Promise<DocsImplementationContext> {
  const docsDir = input.docsDir ?? "docs";
  const root = path.resolve(input.projectRoot);
  const maxBlocks = input.maxBlocks ?? 20;
  const maxBlockChars = input.maxBlockChars ?? 6000;
  const candidateFileLimit = input.candidateFileLimit ?? 40;
  const includeFullText = input.includeFullText ?? true;

  const scan = await scanProject(root, docsDir);
  const actionable = scan.changes.filter((change) => change.type !== "unchanged").slice(0, maxBlocks);
  const limitedScan = { ...scan, changes: actionable };
  const task = createImplementationTask(limitedScan);
  const planMarkdown = renderTaskMarkdown(task);
  const keywords = collectKeywords(actionable);
  const candidateFiles = await findCandidateFiles(root, keywords, candidateFileLimit);
  const suggestedAreas = unique([
    ...task.suggestedFiles,
    ...candidateFiles.map(candidateAreaFromFile)
  ]);

  const changedBlocks = actionable.map((change) => {
    const loc = blockLocation(change);
    return {
      type: change.type,
      file: loc.file,
      titlePath: loc.titlePath,
      startLine: loc.startLine,
      endLine: loc.endLine,
      kind: loc.kind,
      similarity: change.similarity,
      reasons: change.reasons,
      text: includeFullText && change.block ? trimText(change.block.text, maxBlockChars) : undefined,
      previous: change.previous
        ? {
            file: change.previous.file,
            titlePath: change.previous.titlePath,
            startLine: change.previous.startLine,
            endLine: change.previous.endLine,
            kind: change.previous.kind
          }
        : undefined
    };
  });

  const nearbyContext = unique(actionable.flatMap((change) => parentBlocksForChange(change, scan.blocks, Math.floor(maxBlockChars / 2))).map((item) => JSON.stringify(item))).map((item) => JSON.parse(item) as DocsImplementationContext["nearbyContext"][number]);

  const testGuidance = unique([
    ...task.testTargets,
    "从文档的测试要求、决策表、异常与失败分支、不变量生成或更新测试。",
    "优先运行受影响层的最小测试，再根据影响范围运行类型检查、lint 或集成测试。"
  ]);

  const implementationInstructions = [
    "把当前 Markdown 文档作为行为源头；不要只根据聊天记录编码。",
    "先读取 changedBlocks 中每个文档块及 nearbyContext，再定位代码。",
    "按候选文件和关键词搜索源码；如果候选为空，仍需用关键词全文搜索。",
    "更新后端、前端、客户端、数据库和测试中实际受影响的最小范围。",
    "如果遇到金额、权限、安全、隐私、删除、扣费、结算等高风险待确认规则，先停止并要求确认。",
    "验证通过后调用 docs_code_mark_synced，把当前文档状态记录为已实现。"
  ];

  const base = {
    projectRoot: root,
    docsDir,
    changeCount: actionable.length,
    changedBlocks,
    nearbyContext,
    codeSearch: {
      keywords,
      candidateFiles,
      suggestedAreas
    },
    testGuidance,
    implementationInstructions
  };

  return {
    ...base,
    markdown: renderContextMarkdown(base, planMarkdown)
  };
}
