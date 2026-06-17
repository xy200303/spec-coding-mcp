import { promises as fs } from "node:fs";
import path from "node:path";
import {
  aiProtocol,
  docsReadme,
  featureDocFromPrompt,
  featureDocFromSource,
  glossary,
  indexContent,
  sharedApiConventions,
  sharedUiRules,
  sourceOverview,
  systemArchitecture
} from "../templates/spec-docs.js";
import { ensureDir, listTextFiles, nowIso, pathExists, relativePosix, slugifyAscii, unique } from "../shared/utils.js";

export interface GeneratedSpecFile {
  path: string;
  status: "created" | "updated" | "skipped";
  reason?: string;
}

export interface GenerateSpecsResult {
  projectRoot: string;
  docsDir: string;
  mode: "prompt" | "source";
  files: GeneratedSpecFile[];
  featureDocs: string[];
  nextSteps: string[];
}

export interface SourceScanSummary {
  totalFiles: number;
  manifests: string[];
  apiFiles: string[];
  uiFiles: string[];
  dataFiles: string[];
  testFiles: string[];
  routeHints: string[];
  componentHints: string[];
  modelHints: string[];
}

const DEFAULT_EXCLUDES = [
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

const CODE_EXTENSIONS = new Set([
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
  ".dart"
]);

const MANIFEST_NAMES = new Set([
  "package.json",
  "pnpm-workspace.yaml",
  "yarn.lock",
  "package-lock.json",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "cargo.toml",
  "pom.xml",
  "build.gradle",
  "settings.gradle",
  "composer.json",
  "gemfile",
  "pubspec.yaml"
]);

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractPromptKeywords(prompt: string): string[] {
  const matches = prompt.match(/[\p{L}\p{N}_-]{2,}/gu) ?? [];
  const stop = new Set(["一个", "这个", "系统", "需要", "可以", "用户", "功能", "实现", "开发", "根据", "以及", "进行", "the", "and", "with"]);
  return unique(matches.map(normalizeLine).filter((item) => !stop.has(item)).slice(0, 24));
}

function inferProjectName(projectRoot: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  return path.basename(projectRoot) || "未命名系统";
}

function inferFeatureCandidates(prompt: string, projectName: string): Array<{ domain: string; name: string; title: string; reason: string }> {
  const normalized = normalizeLine(prompt);
  const candidates: Array<{ domain: string; name: string; title: string; reason: string }> = [];
  const domainRules: Array<[RegExp, string, string, string]> = [
    [/计费|扣费|支付|账单|余额|结算|billing|payment/i, "billing", "billing", "计费与支付"],
    [/订单|下单|购买|购物车|order|checkout/i, "order", "order", "订单处理"],
    [/登录|注册|账号|权限|角色|认证|auth|login|user/i, "auth", "auth", "账号与权限"],
    [/通知|消息|邮件|短信|推送|notification|message/i, "notification", "notification", "通知消息"],
    [/文件|上传|下载|导入|导出|file|upload|export/i, "file", "file", "文件处理"],
    [/报表|统计|看板|分析|dashboard|report|analytics/i, "analytics", "analytics", "数据分析"],
    [/审批|流程|工单|任务|workflow|ticket|approval/i, "workflow", "workflow", "流程协作"]
  ];

  for (const [pattern, domain, name, title] of domainRules) {
    if (pattern.test(normalized)) {
      candidates.push({ domain, name, title, reason: "根据用户描述中的业务关键词推断" });
    }
  }

  if (candidates.length === 0) {
    const keyword = extractPromptKeywords(prompt)[0] ?? projectName;
    const slug = slugifyAscii(keyword, "core");
    candidates.push({ domain: "core", name: slug, title: `${projectName}核心能力`, reason: "根据用户输入生成的默认核心功能" });
  }

  return unique(candidates.map((item) => `${item.domain}/${item.name}`)).map((key) => candidates.find((item) => `${item.domain}/${item.name}` === key)!);
}

async function writeFileIfChanged(root: string, relativeFile: string, content: string, overwrite: boolean, files: GeneratedSpecFile[]): Promise<void> {
  const absolute = path.join(root, relativeFile);
  await ensureDir(path.dirname(absolute));
  const normalized = content.trimEnd() + "\n";
  if (await pathExists(absolute)) {
    const old = await fs.readFile(absolute, "utf8");
    if (old === normalized) {
      files.push({ path: relativePosix(root, absolute), status: "skipped", reason: "内容未变化" });
      return;
    }
    if (!overwrite) {
      files.push({ path: relativePosix(root, absolute), status: "skipped", reason: "文件已存在且 overwrite=false" });
      return;
    }
    await fs.writeFile(absolute, normalized, "utf8");
    files.push({ path: relativePosix(root, absolute), status: "updated" });
    return;
  }
  await fs.writeFile(absolute, normalized, "utf8");
  files.push({ path: relativePosix(root, absolute), status: "created" });
}

async function writeBaseDocs(root: string, docsDir: string, projectName: string, overwrite: boolean, files: GeneratedSpecFile[], source?: SourceScanSummary): Promise<void> {
  const base = docsDir;
  await writeFileIfChanged(root, path.join(base, "README.md"), docsReadme(projectName), overwrite, files);
  await writeFileIfChanged(root, path.join(base, "_system", "architecture.md"), systemArchitecture(projectName, source), overwrite, files);
  await writeFileIfChanged(root, path.join(base, "_system", "glossary.md"), glossary(projectName, []), overwrite, files);
  await writeFileIfChanged(root, path.join(base, "_system", "ai-implementation-protocol.md"), aiProtocol(), overwrite, files);
  await writeFileIfChanged(root, path.join(base, "_shared", "api-conventions.md"), sharedApiConventions(), overwrite, files);
  await writeFileIfChanged(root, path.join(base, "_shared", "ui", "interaction-rules.md"), sharedUiRules(), overwrite, files);
}

export async function generateSpecsFromPrompt(input: {
  projectRoot: string;
  docsDir?: string;
  prompt: string;
  projectName?: string;
  overwrite?: boolean;
}): Promise<GenerateSpecsResult> {
  const root = path.resolve(input.projectRoot);
  const docsDir = input.docsDir ?? "docs";
  const overwrite = input.overwrite ?? false;
  const projectName = inferProjectName(root, input.projectName);
  const files: GeneratedSpecFile[] = [];

  await ensureDir(path.join(root, docsDir));
  await ensureDir(path.join(root, ".docs-code"));
  await writeBaseDocs(root, docsDir, projectName, overwrite, files);

  const features = inferFeatureCandidates(input.prompt, projectName);
  const featureDocs: string[] = [];
  for (const feature of features) {
    const relativeFile = path.join(docsDir, "features", feature.domain, `${feature.name}.md`);
    featureDocs.push(relativePosix(root, path.join(root, relativeFile)));
    await writeFileIfChanged(
      root,
      relativeFile,
      featureDocFromPrompt({ ...feature, projectName, prompt: input.prompt, keywords: extractPromptKeywords(input.prompt).slice(0, 12) }),
      overwrite,
      files
    );
  }

  await writeFileIfChanged(
    root,
    path.join(docsDir, "indexes", "feature-index.md"),
    indexContent(features.map((feature) => ({
      title: feature.title,
      path: `${docsDir}/features/${feature.domain}/${feature.name}.md`,
      source: "用户输入生成"
    }))),
    overwrite,
    files
  );

  return {
    projectRoot: root,
    docsDir,
    mode: "prompt",
    files,
    featureDocs,
    nextSteps: [
      "让用户审阅并直接修改生成的中文规格文档。",
      "调用 docs_code_scan 查看新增文档块。",
      "调用 docs_code_context 获取大模型实现上下文。",
      "代码和测试实现完成并验证通过后，调用 docs_code_mark_synced。"
    ]
  };
}

function shouldIncludeSourceFile(relativeFile: string, includePatterns: string[], excludePatterns: string[]): boolean {
  const posix = relativeFile.replace(/\\/g, "/");
  if (excludePatterns.some((pattern) => posix.includes(pattern.replace(/\\/g, "/")))) return false;
  if (includePatterns.length === 0) return true;
  return includePatterns.some((pattern) => posix.includes(pattern.replace(/\\/g, "/")));
}

function classifyFile(relativeFile: string): "manifest" | "api" | "ui" | "data" | "test" | "code" | "other" {
  const lower = relativeFile.toLowerCase().replace(/\\/g, "/");
  const base = path.basename(lower);
  if (MANIFEST_NAMES.has(base)) return "manifest";
  if (/(^|\/)(__tests__|tests?|specs?|e2e)(\/|$)|\.(test|spec)\./i.test(lower)) return "test";
  if (/(route|routes|controller|controllers|api|endpoint|server|handler|resolver)/i.test(lower)) return "api";
  if (/(component|components|page|pages|screen|screens|view|views|app\/|ui\/)|\.(tsx|jsx|vue|svelte)$/i.test(lower)) return "ui";
  if (/(schema|model|models|migration|migrations|repository|repositories|entity|entities|dao|prisma|database|db\/)/i.test(lower)) return "data";
  if (CODE_EXTENSIONS.has(path.extname(lower))) return "code";
  return "other";
}

function routeHintsFromContent(relativeFile: string, content: string): string[] {
  const hints = new Set<string>();
  const routeRegexes = [
    /\b(app|router|route)\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
    /\b(GET|POST|PUT|PATCH|DELETE)\s+([/\w:.-]+)/g,
    /@(Get|Post|Put|Patch|Delete)\s*\(\s*["'`]([^"'`]*)["'`]/gi,
    /\b(method|path)\s*:\s*["'`]([^"'`]+)["'`]/gi
  ];
  for (const regex of routeRegexes) {
    for (const match of content.matchAll(regex)) {
      hints.add(`${relativeFile} ${normalizeLine(match[0]).slice(0, 140)}`);
      if (hints.size >= 12) break;
    }
  }
  return [...hints];
}

function componentHintsFromContent(relativeFile: string, content: string): string[] {
  const hints = new Set<string>();
  const regexes = [
    /export\s+(default\s+)?function\s+([A-Z][A-Za-z0-9_]*)/g,
    /function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g,
    /class\s+([A-Z][A-Za-z0-9_]*)/g,
    /name\s*:\s*["'`]([A-Z][A-Za-z0-9_-]+)["'`]/g
  ];
  for (const regex of regexes) {
    for (const match of content.matchAll(regex)) {
      hints.add(`${relativeFile} ${match[2] ?? match[1]}`);
      if (hints.size >= 12) break;
    }
  }
  return [...hints];
}

function modelHintsFromContent(relativeFile: string, content: string): string[] {
  const hints = new Set<string>();
  const regexes = [
    /\b(model|table|entity|class|interface|type)\s+([A-Z][A-Za-z0-9_]*)/g,
    /CREATE\s+TABLE\s+["`]?([A-Za-z0-9_]+)/gi,
    /\bmodel\s+([A-Z][A-Za-z0-9_]*)\s*\{/g
  ];
  for (const regex of regexes) {
    for (const match of content.matchAll(regex)) {
      hints.add(`${relativeFile} ${match[2] ?? match[1]}`);
      if (hints.size >= 12) break;
    }
  }
  return [...hints];
}

async function scanSource(root: string, includePatterns: string[], excludePatterns: string[], maxFiles: number): Promise<SourceScanSummary> {
  const all = await listTextFiles(root, {
    maxFiles,
    excludeDirs: DEFAULT_EXCLUDES,
    extensions: CODE_EXTENSIONS,
    includeNames: MANIFEST_NAMES
  });
  const files = all.filter((file) => shouldIncludeSourceFile(relativePosix(root, file), includePatterns, excludePatterns));
  const summary: SourceScanSummary = {
    totalFiles: files.length,
    manifests: [],
    apiFiles: [],
    uiFiles: [],
    dataFiles: [],
    testFiles: [],
    routeHints: [],
    componentHints: [],
    modelHints: []
  };

  for (const absolute of files) {
    const relative = relativePosix(root, absolute);
    const kind = classifyFile(relative);
    if (kind === "manifest") summary.manifests.push(relative);
    if (kind === "api") summary.apiFiles.push(relative);
    if (kind === "ui") summary.uiFiles.push(relative);
    if (kind === "data") summary.dataFiles.push(relative);
    if (kind === "test") summary.testFiles.push(relative);
    if (["api", "ui", "data", "code"].includes(kind)) {
      let content = "";
      try {
        content = await fs.readFile(absolute, "utf8");
      } catch {
        continue;
      }
      if (kind === "api" || kind === "code") summary.routeHints.push(...routeHintsFromContent(relative, content));
      if (kind === "ui" || kind === "code") summary.componentHints.push(...componentHintsFromContent(relative, content));
      if (kind === "data" || kind === "code") summary.modelHints.push(...modelHintsFromContent(relative, content));
    }
  }

  summary.manifests = unique(summary.manifests).slice(0, 30);
  summary.apiFiles = unique(summary.apiFiles).slice(0, 80);
  summary.uiFiles = unique(summary.uiFiles).slice(0, 80);
  summary.dataFiles = unique(summary.dataFiles).slice(0, 80);
  summary.testFiles = unique(summary.testFiles).slice(0, 80);
  summary.routeHints = unique(summary.routeHints).slice(0, 40);
  summary.componentHints = unique(summary.componentHints).slice(0, 40);
  summary.modelHints = unique(summary.modelHints).slice(0, 40);
  return summary;
}

function domainFromFile(file: string, fallback: string): string {
  const parts = file.split(/[\\/]/).filter(Boolean);
  const ignored = new Set(["src", "app", "pages", "components", "routes", "controllers", "api", "server", "client", "ui", "lib"]);
  const chosen = parts.find((part) => !ignored.has(part.toLowerCase()) && !part.includes("."));
  return slugifyAscii(chosen ?? fallback, fallback);
}

function featureCandidatesFromSource(summary: SourceScanSummary): Array<{ domain: string; name: string; title: string; evidence: string[]; routes: string[]; components: string[]; models: string[]; tests: string[] }> {
  const candidates: Array<{ domain: string; name: string; title: string; evidence: string[]; routes: string[]; components: string[]; models: string[]; tests: string[] }> = [];
  const routeGroups = new Map<string, string[]>();
  for (const hint of summary.routeHints) {
    const file = hint.split(" ")[0];
    const domain = domainFromFile(file, "api");
    const list = routeGroups.get(domain) ?? [];
    list.push(hint);
    routeGroups.set(domain, list);
  }
  for (const [domain, routes] of routeGroups) {
    const relatedFiles = unique(routes.map((item) => item.split(" ")[0]));
    candidates.push({
      domain,
      name: "api",
      title: `${domain} API 能力`,
      evidence: relatedFiles,
      routes,
      components: summary.componentHints.filter((item) => relatedFiles.some((file) => item.startsWith(file))).slice(0, 8),
      models: summary.modelHints.filter((item) => item.includes(domain)).slice(0, 8),
      tests: summary.testFiles.filter((item) => item.toLowerCase().includes(domain)).slice(0, 8)
    });
  }

  if (candidates.length === 0 && summary.uiFiles.length) {
    const domain = domainFromFile(summary.uiFiles[0], "ui");
    candidates.push({
      domain,
      name: "ui",
      title: `${domain} 界面能力`,
      evidence: summary.uiFiles.slice(0, 12),
      routes: [],
      components: summary.componentHints.slice(0, 12),
      models: [],
      tests: summary.testFiles.filter((item) => /ui|component|frontend|web/i.test(item)).slice(0, 8)
    });
  }

  if (candidates.length === 0 && summary.dataFiles.length) {
    const domain = domainFromFile(summary.dataFiles[0], "data");
    candidates.push({
      domain,
      name: "data",
      title: `${domain} 数据能力`,
      evidence: summary.dataFiles.slice(0, 12),
      routes: [],
      components: [],
      models: summary.modelHints.slice(0, 12),
      tests: summary.testFiles.filter((item) => /data|model|db|repository/i.test(item)).slice(0, 8)
    });
  }

  if (candidates.length === 0) {
    const evidence = unique([...summary.apiFiles, ...summary.uiFiles, ...summary.dataFiles]).slice(0, 12);
    candidates.push({
      domain: "core",
      name: "source-overview",
      title: "源码核心能力概览",
      evidence,
      routes: summary.routeHints.slice(0, 12),
      components: summary.componentHints.slice(0, 12),
      models: summary.modelHints.slice(0, 12),
      tests: summary.testFiles.slice(0, 8)
    });
  }

  return candidates.slice(0, 12);
}

export async function generateSpecsFromSource(input: {
  projectRoot: string;
  docsDir?: string;
  projectName?: string;
  overwrite?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFiles?: number;
}): Promise<GenerateSpecsResult & { source: SourceScanSummary }> {
  const root = path.resolve(input.projectRoot);
  const docsDir = input.docsDir ?? "docs";
  const overwrite = input.overwrite ?? false;
  const projectName = inferProjectName(root, input.projectName);
  const includePatterns = input.includePatterns ?? [];
  const excludePatterns = input.excludePatterns ?? [];
  const maxFiles = input.maxFiles ?? 800;
  const files: GeneratedSpecFile[] = [];

  await ensureDir(path.join(root, docsDir));
  await ensureDir(path.join(root, ".docs-code"));
  const summary = await scanSource(root, includePatterns, excludePatterns, maxFiles);
  await writeBaseDocs(root, docsDir, projectName, overwrite, files, summary);
  await writeFileIfChanged(root, path.join(docsDir, "indexes", "source-overview.md"), sourceOverview(summary, nowIso()), overwrite, files);

  const features = featureCandidatesFromSource(summary);
  const featureDocs: string[] = [];
  for (const feature of features) {
    const relativeFile = path.join(docsDir, "features", feature.domain, `${feature.name}.md`);
    featureDocs.push(relativePosix(root, path.join(root, relativeFile)));
    await writeFileIfChanged(
      root,
      relativeFile,
      featureDocFromSource({ ...feature, projectName }),
      overwrite,
      files
    );
  }

  await writeFileIfChanged(
    root,
    path.join(docsDir, "indexes", "feature-index.md"),
    indexContent(features.map((feature) => ({
      title: feature.title,
      path: `${docsDir}/features/${feature.domain}/${feature.name}.md`,
      source: "源码静态扫描生成"
    }))),
    overwrite,
    files
  );

  return {
    projectRoot: root,
    docsDir,
    mode: "source",
    files,
    featureDocs,
    source: summary,
    nextSteps: [
      "审阅 docs/indexes/source-overview.md 和生成的 feature 文档，补充源码无法推断的业务规则。",
      "用户后续只需要直接编辑文档。",
      "调用 docs_code_context 让大模型获得未实现文档块和源码线索。",
      "代码和测试实现完成并验证通过后，调用 docs_code_mark_synced。"
    ]
  };
}
