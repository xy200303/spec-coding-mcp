import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}

export function normalizeText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function semanticText(value: string): string {
  return normalizeText(value)
    .replace(/`[^`]+`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[|#>*_\-[\](){},.:;!?，。；：！？、]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
}

export async function listMarkdownFiles(root: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".git", ".docs-code"].includes(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(full);
      }
    }
  }

  await walk(root);
  return results.sort();
}

export interface ListTextFilesOptions {
  maxFiles?: number;
  excludeDirs?: string[];
  extensions?: Set<string>;
  includeNames?: Set<string>;
}

export async function listTextFiles(root: string, options: ListTextFilesOptions = {}): Promise<string[]> {
  const results: string[] = [];
  const maxFiles = options.maxFiles ?? 1000;
  const excludeDirs = new Set(options.excludeDirs ?? []);

  async function walk(dir: string): Promise<void> {
    if (results.length >= maxFiles) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (excludeDirs.has(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile()) {
        const lowerName = entry.name.toLowerCase();
        const ext = path.extname(lowerName);
        if (options.includeNames?.has(lowerName) || options.extensions?.has(ext)) {
          results.push(full);
        }
      }
    }
  }

  await walk(root);
  return results.sort();
}

export async function runGit(root: string, args: string[]): Promise<string[]> {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd: root, stdio: ["ignore", "pipe", "ignore"] });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    child.on("error", () => resolve([]));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve([]);
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8").split(/\r?\n/).filter(Boolean));
    });
  });
}

export function jaccard(a: string[], b: string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  if (left.size === 0 && right.size === 0) return 1;
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection || 1);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function relativePosix(root: string, target: string): string {
  return toPosix(path.relative(root, target));
}

export function slugifyAscii(value: string, fallback = "item"): string {
  const ascii = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii || fallback;
}
