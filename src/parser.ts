import { promises as fs } from "node:fs";
import path from "node:path";
import type { BlockKind, DocBlock } from "./types.js";
import { listMarkdownFiles, normalizeText, relativePosix, semanticText, sha256, unique } from "./utils.js";

interface Heading {
  level: number;
  title: string;
  line: number;
}

const KIND_RULES: Array<[BlockKind, RegExp]> = [
  ["api", /\b(api|接口|请求|响应|endpoint|http|path)\b/i],
  ["rule", /\b(rule|规则|业务规则|不变量|约束|校验)\b/i],
  ["flow", /\b(flow|流程|链路|时序|journey|用户旅程)\b/i],
  ["data", /\b(data|数据|表|字段|schema|model|database|db)\b/i],
  ["ui", /\b(ui|页面|组件|界面|状态|前端|视觉)\b/i],
  ["interaction", /\b(interaction|交互|点击|拖拽|输入|提交|loading)\b/i],
  ["test", /\b(test|测试|验收|用例|e2e|unit|integration)\b/i],
  ["feature", /\b(feature|功能|能力|模块)\b/i]
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "into",
  "when",
  "then",
  "will",
  "shall",
  "must",
  "docs",
  "code",
  "test",
  "待补充",
  "待确认"
]);

export function inferKind(titlePath: string[], file: string): BlockKind {
  const haystack = [...titlePath, file].join(" ");
  for (const [kind, pattern] of KIND_RULES) {
    if (pattern.test(haystack)) return kind;
  }
  return titlePath.length <= 1 ? "document" : "section";
}

export function extractKeywords(text: string, titlePath: string[]): string[] {
  const source = semanticText(`${titlePath.join(" ")} ${text}`);
  const raw = source.match(/[\p{L}\p{N}_-]{2,}/gu) ?? [];
  return unique(raw.filter((word) => !STOP_WORDS.has(word)).slice(0, 80));
}

function parseHeadings(lines: string[]): Heading[] {
  const headings: Heading[] = [];
  lines.forEach((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      headings.push({ level: match[1].length, title: match[2].trim(), line: index + 1 });
    }
  });
  return headings;
}

function titlePathFor(headings: Heading[], index: number): string[] {
  const current = headings[index];
  return headings
    .slice(0, index + 1)
    .filter((candidate) => candidate.line <= current.line && candidate.level <= current.level)
    .reduce<Heading[]>((stack, candidate) => {
      while (stack.length && stack[stack.length - 1].level >= candidate.level) {
        stack.pop();
      }
      stack.push(candidate);
      return stack;
    }, [])
    .map((heading) => heading.title);
}

function blockEndLine(headings: Heading[], index: number, totalLines: number): number {
  const current = headings[index];
  const next = headings.slice(index + 1).find((heading) => heading.level <= current.level);
  return next ? next.line - 1 : totalLines;
}

function keyFor(file: string, titlePath: string[], text: string): string {
  const pathPart = `${file}#${titlePath.join(" > ")}`;
  return `${pathPart}::${sha256(semanticText(text)).slice(0, 12)}`;
}

export async function parseMarkdownFile(root: string, absoluteFile: string): Promise<DocBlock[]> {
  const file = relativePosix(root, absoluteFile);
  const raw = await fs.readFile(absoluteFile, "utf8");
  const normalizedFile = normalizeText(raw);
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const headings = parseHeadings(lines);

  if (headings.length === 0) {
    const title = path.basename(file);
    const titlePath = [title];
    const normalized = normalizeText(raw);
    const semantic = semanticText(raw);
    return [
      {
        key: keyFor(file, titlePath, raw),
        kind: "document",
        file,
        titlePath,
        title,
        level: 1,
        startLine: 1,
        endLine: lines.length,
        text: normalizedFile,
        normalizedText: normalized,
        hash: sha256(normalized),
        semanticHash: sha256(semantic),
        keywords: extractKeywords(raw, titlePath)
      }
    ];
  }

  return headings.map((heading, index) => {
    const endLine = blockEndLine(headings, index, lines.length);
    const text = lines.slice(heading.line - 1, endLine).join("\n");
    const titlePath = titlePathFor(headings, index);
    const normalized = normalizeText(text);
    const semantic = semanticText(text);
    return {
      key: keyFor(file, titlePath, text),
      kind: inferKind(titlePath, file),
      file,
      titlePath,
      title: heading.title,
      level: heading.level,
      startLine: heading.line,
      endLine,
      text: normalized,
      normalizedText: normalized,
      hash: sha256(normalized),
      semanticHash: sha256(semantic),
      keywords: extractKeywords(text, titlePath)
    };
  });
}

export async function scanDocs(root: string, docsDir = "docs"): Promise<DocBlock[]> {
  const docsRoot = path.resolve(root, docsDir);
  const files = await listMarkdownFiles(docsRoot);
  const blocks = await Promise.all(files.map((file) => parseMarkdownFile(root, file)));
  return blocks.flat().sort((a, b) => a.file.localeCompare(b.file) || a.startLine - b.startLine);
}
