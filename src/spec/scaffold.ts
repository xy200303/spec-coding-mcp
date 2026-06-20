/* Spec scaffold generation for README, templates, prompt specs, TODO specs, and source-derived review specs. */
import { promises as fs } from "node:fs";
import path from "node:path";
import { agentsMd, specsReadme } from "../templates/agents.js";
import { reviewIndex, sourceInventory, sourceReviewSpec, specTemplate } from "../templates/spec-documents.js";
import { todoSpec, userPromptSpec } from "../templates/prompt-documents.js";
import type { AgentFileResult, GeneratedFile, SpecItem, SpecResult } from "./types.js";
import { scanSource, specCandidatesFromSource } from "./source-scan.js";
import { inferProjectName, inferSpecFileName, inferTitle, inferTodoFileName, listSpecsIn, timestampedMarkdownFile } from "./spec-files.js";
import { writeTextFile } from "./file-writers.js";
import { nowIso, relativePosix } from "../shared/utils.js";

type BootstrapProjectKind = "auto" | "new" | "existing";

function mergeSpecResults(results: SpecResult[]): Pick<SpecResult, "files" | "specs"> {
  return {
    files: results.flatMap((result) => result.files),
    specs: results.flatMap((result) => result.specs)
  };
}

function hasImplementationFiles(summary: Awaited<ReturnType<typeof scanSource>>): boolean {
  return summary.totalFiles > summary.manifests.length;
}

export async function initSpecs(input: { projectRoot: string; specsDir?: string; projectName?: string; overwrite?: boolean }): Promise<SpecResult> {
  const root = path.resolve(input.projectRoot);
  const specsDir = input.specsDir ?? "specs";
  const overwrite = input.overwrite ?? false;
  const projectName = inferProjectName(root, input.projectName);
  const files: GeneratedFile[] = [];

  await writeTextFile(root, path.join(specsDir, "README.md"), specsReadme(projectName), overwrite, files);
  await writeTextFile(root, path.join(specsDir, "templates", "feature.md"), specTemplate("feature"), overwrite, files);
  await writeTextFile(root, path.join(specsDir, "templates", "bugfix.md"), specTemplate("bugfix"), overwrite, files);
  await writeTextFile(root, path.join(specsDir, "templates", "removal.md"), specTemplate("removal"), overwrite, files);

  return {
    projectRoot: root,
    specsDir,
    files,
    specs: [],
    nextSteps: [
      `在 ${specsDir}/active/ 中创建或修改 spec，也可以把短任务放到 ${specsDir}/todo/。`,
      "调用 spec_context 让 Codex 按 active specs 和未完成 TODO 修改代码和测试。"
    ]
  };
}

export async function bootstrapProject(input: {
  projectRoot: string;
  specsDir?: string;
  projectName?: string;
  projectKind?: BootstrapProjectKind;
  initialPrompt?: string;
  overwrite?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFiles?: number;
}): Promise<SpecResult> {
  const root = path.resolve(input.projectRoot);
  const specsDir = input.specsDir ?? "specs";
  const projectName = inferProjectName(root, input.projectName);
  const requestedKind = input.projectKind ?? "auto";
  const summary = requestedKind === "new"
    ? undefined
    : await scanSource({
        root,
        includePatterns: input.includePatterns,
        excludePatterns: input.excludePatterns,
        maxFiles: input.maxFiles
      });
  const projectKind = requestedKind === "auto" && summary && hasImplementationFiles(summary) ? "existing" : requestedKind === "auto" ? "new" : requestedKind;
  const base = await initSpecs({ projectRoot: root, specsDir, projectName, overwrite: input.overwrite });
  const agents = await generateAgentsFile({ projectRoot: root, projectName, overwrite: input.overwrite });

  if (projectKind === "existing") {
    const source = await generateSpecsFromSource({
      projectRoot: root,
      specsDir,
      projectName,
      overwrite: input.overwrite,
      includePatterns: input.includePatterns,
      excludePatterns: input.excludePatterns,
      maxFiles: input.maxFiles
    });
    const merged = mergeSpecResults([base, { ...source, files: [...agents.files, ...source.files] }]);
    return {
      projectRoot: root,
      specsDir,
      files: merged.files,
      specs: merged.specs,
      source: source.source,
      nextSteps: [
        "已按旧项目流程初始化：生成 AGENTS、specs 基础文件和 AI 源码审查任务。",
        `先让 AI 阅读 ${specsDir}/review/*.md 中列出的源码和测试，补全真实业务行为。`,
        `需要开发时，把已补全的 spec 放到 ${specsDir}/active/，再调用 spec_context。`
      ]
    };
  }

  const prompt = input.initialPrompt?.trim() || [
    `为 ${projectName} 建立项目起步 spec。`,
    "请先明确项目目标、核心模块、目录结构、验证命令和第一批可交付功能。",
    "不要直接开始写代码；先让用户确认目标和范围。"
  ].join("\n");
  const spec = await createSpecFromPrompt({
    projectRoot: root,
    specsDir,
    prompt,
    title: "项目起步规划",
    overwrite: input.overwrite
  });
  const merged = mergeSpecResults([base, { ...spec, files: [...agents.files, ...spec.files] }]);
  return {
    projectRoot: root,
    specsDir,
    files: merged.files,
    specs: merged.specs,
    nextSteps: [
      "已按新项目流程初始化：生成 AGENTS、specs 基础文件和起步 active spec。",
      `先审阅并补全 ${spec.specs[0] ?? `${specsDir}/active/*.md`}，确认项目目标、结构和验收标准。`,
      "确认后调用 spec_context，让 AI 按 active spec 开始开发。"
    ]
  };
}

export async function generateSpecsFromSource(input: {
  projectRoot: string;
  specsDir?: string;
  projectName?: string;
  overwrite?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFiles?: number;
}): Promise<SpecResult> {
  const root = path.resolve(input.projectRoot);
  const specsDir = input.specsDir ?? "specs";
  const overwrite = input.overwrite ?? false;
  const projectName = inferProjectName(root, input.projectName);
  const files: GeneratedFile[] = [];

  await initSpecs({ projectRoot: root, specsDir, projectName, overwrite });
  const summary = await scanSource({
    root,
    includePatterns: input.includePatterns,
    excludePatterns: input.excludePatterns,
    maxFiles: input.maxFiles
  });
  const candidates = specCandidatesFromSource(summary);
  await writeTextFile(root, path.join(specsDir, "review", "source-inventory.md"), sourceInventory(summary, nowIso()), overwrite, files);
  await writeTextFile(root, path.join(specsDir, "review", "index.md"), reviewIndex(specsDir, candidates), overwrite, files);

  const specs: string[] = [];
  for (const candidate of candidates) {
    const relative = path.join(specsDir, "review", `${candidate.domain}-${candidate.name}.md`);
    specs.push(relativePosix(root, path.join(root, relative)));
    await writeTextFile(root, relative, sourceReviewSpec(projectName, candidate), overwrite, files);
  }

  return {
    projectRoot: root,
    specsDir,
    files,
    specs,
    source: summary,
    nextSteps: [
      `审阅 ${specsDir}/review/source-inventory.md 和 ${specsDir}/review/index.md。`,
      `让 AI 打开并阅读 ${specsDir}/review/*.md 中列出的源码、测试和配置线索，补全真实业务行为。`,
      `开发时把已补全的目标 spec 放到 ${specsDir}/active/，再调用 spec_context。`
    ]
  };
}

export async function createSpecFromPrompt(input: {
  projectRoot: string;
  specsDir?: string;
  prompt: string;
  title?: string;
  overwrite?: boolean;
}): Promise<SpecResult> {
  const root = path.resolve(input.projectRoot);
  const specsDir = input.specsDir ?? "specs";
  const title = input.title?.trim() || inferTitle(input.prompt);
  const slug = inferSpecFileName(title);
  const files: GeneratedFile[] = [];
  await initSpecs({ projectRoot: root, specsDir });
  const relative = path.join(specsDir, "active", timestampedMarkdownFile(new Date(), slug));
  await writeTextFile(root, relative, userPromptSpec(title, input.prompt), input.overwrite ?? false, files);
  return {
    projectRoot: root,
    specsDir,
    files,
    specs: [relativePosix(root, path.join(root, relative))],
    nextSteps: [
      `审阅并修改 ${relative}。`,
      "调用 spec_context 让 Codex 按该 spec 修改代码和测试。"
    ]
  };
}

export async function createTodoFromPrompt(input: {
  projectRoot: string;
  specsDir?: string;
  prompt: string;
  title?: string;
  overwrite?: boolean;
}): Promise<SpecResult> {
  const root = path.resolve(input.projectRoot);
  const specsDir = input.specsDir ?? "specs";
  const title = input.title?.trim() || inferTitle(input.prompt);
  const slug = inferTodoFileName(title);
  const files: GeneratedFile[] = [];
  await initSpecs({ projectRoot: root, specsDir });
  const relative = path.join(specsDir, "todo", timestampedMarkdownFile(new Date(), slug));
  await writeTextFile(root, relative, todoSpec(title, input.prompt), input.overwrite ?? false, files);
  return {
    projectRoot: root,
    specsDir,
    files,
    specs: [relativePosix(root, path.join(root, relative))],
    nextSteps: [
      `审阅并修改 ${relative}。`,
      "调用 spec_context 让 Codex 按未完成 TODO 顺序执行任务。"
    ]
  };
}

export async function generateAgentsFile(input: { projectRoot: string; projectName?: string; overwrite?: boolean }): Promise<AgentFileResult> {
  const root = path.resolve(input.projectRoot);
  const projectName = inferProjectName(root, input.projectName);
  const files: GeneratedFile[] = [];
  await writeTextFile(root, "AGENTS.md", agentsMd(projectName), input.overwrite ?? false, files);
  return {
    projectRoot: root,
    file: "AGENTS.md",
    files,
    nextSteps: [
      "把 AGENTS.md 放在项目根目录，作为模型的默认工程规范入口。",
      "必要时继续维护 specs/ 和 AGENTS.md 的一致性。"
    ]
  };
}

export async function listSpecs(input: { projectRoot: string; specsDir?: string }): Promise<{ projectRoot: string; specsDir: string; active: SpecItem[]; review: SpecItem[]; todo: SpecItem[]; done: SpecItem[] }> {
  const root = path.resolve(input.projectRoot);
  const specsDir = input.specsDir ?? "specs";
  return {
    projectRoot: root,
    specsDir,
    active: await listSpecsIn(root, specsDir, "active"),
    review: await listSpecsIn(root, specsDir, "review"),
    todo: await listSpecsIn(root, specsDir, "todo"),
    done: await listSpecsIn(root, specsDir, "done")
  };
}
