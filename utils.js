import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
export function toPosix(value) {
    return value.replace(/\\/g, "/");
}
export function normalizeText(value) {
    return value
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim();
}
export function semanticText(value) {
    return normalizeText(value)
        .replace(/`[^`]+`/g, " ")
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/[|#>*_\-[\](){},.:;!?，。；：！？、]/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase()
        .trim();
}
export function sha256(value) {
    return createHash("sha256").update(value, "utf8").digest("hex");
}
export function unique(items) {
    return [...new Set(items)];
}
export async function pathExists(target) {
    try {
        await fs.access(target);
        return true;
    }
    catch {
        return false;
    }
}
export async function ensureDir(target) {
    await fs.mkdir(target, { recursive: true });
}
export async function listMarkdownFiles(root) {
    const results = [];
    async function walk(dir) {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (["node_modules", ".git", ".docs-code"].includes(entry.name))
                    continue;
                await walk(full);
            }
            else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
                results.push(full);
            }
        }
    }
    await walk(root);
    return results.sort();
}
export async function listTextFiles(root, options = {}) {
    const results = [];
    const maxFiles = options.maxFiles ?? 1000;
    const excludeDirs = new Set(options.excludeDirs ?? []);
    async function walk(dir) {
        if (results.length >= maxFiles)
            return;
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (results.length >= maxFiles)
                return;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (excludeDirs.has(entry.name))
                    continue;
                await walk(full);
            }
            else if (entry.isFile()) {
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
export async function runGit(root, args) {
    return new Promise((resolve) => {
        const child = spawn("git", args, { cwd: root, stdio: ["ignore", "pipe", "ignore"] });
        const chunks = [];
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
export function jaccard(a, b) {
    const left = new Set(a);
    const right = new Set(b);
    if (left.size === 0 && right.size === 0)
        return 1;
    let intersection = 0;
    for (const item of left) {
        if (right.has(item))
            intersection += 1;
    }
    return intersection / (left.size + right.size - intersection || 1);
}
export function nowIso() {
    return new Date().toISOString();
}
export function relativePosix(root, target) {
    return toPosix(path.relative(root, target));
}
export function slugifyAscii(value, fallback = "item") {
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
//# sourceMappingURL=utils.js.map