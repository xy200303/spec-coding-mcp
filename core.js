import { promises as fs } from "node:fs";
import path from "node:path";
import { diffBlocks } from "./diff.js";
import { createImplementationTask, renderTaskMarkdown } from "./planner.js";
import { scanDocs } from "./parser.js";
import { baselineState, loadState, markChangesImplemented, plansDir, saveState, statePath, automergePath } from "./state.js";
import { ensureDir, nowIso, pathExists } from "./utils.js";
export async function initProject(projectRoot, docsDir = "docs") {
    const root = path.resolve(projectRoot);
    await ensureDir(path.join(root, docsDir));
    await ensureDir(path.join(root, ".docs-code"));
    const readme = path.join(root, docsDir, "README.md");
    if (!(await pathExists(readme))) {
        await fs.writeFile(readme, [
            "# Docs-Is-Code",
            "",
            "本目录是系统规格源头。用户可以直接修改 Markdown 文档，MCP 会自动识别变更并生成实现计划。",
            "",
            "- 不要求手写稳定 ID。",
            "- 不要求手写 change-log。",
            "- 实现完成后由 MCP 更新 `.docs-code/index.automerge` 作为 CRDT 同步基线。",
            ""
        ].join("\n"), "utf8");
    }
    const blocks = await scanDocs(root, docsDir);
    const state = await baselineState(root, blocks, docsDir);
    return {
        projectRoot: root,
        docsDir,
        statePath: statePath(root),
        automergePath: automergePath(root),
        blocks: Object.keys(state.blocks).length
    };
}
export async function scanProject(projectRoot, docsDir = "docs") {
    const root = path.resolve(projectRoot);
    const blocks = await scanDocs(root, docsDir);
    const stateFile = statePath(root);
    const stateExists = await pathExists(stateFile);
    const state = await loadState(root, docsDir);
    const changes = diffBlocks(blocks, state.blocks, state.keyIndex);
    return { projectRoot: root, docsDir, blocks, changes, stateExists, statePath: stateFile };
}
export async function planImplementation(projectRoot, docsDir = "docs", writePlan = true) {
    const scan = await scanProject(projectRoot, docsDir);
    const task = createImplementationTask(scan);
    const markdown = renderTaskMarkdown(task);
    let planPath;
    if (writePlan) {
        const dir = plansDir(scan.projectRoot);
        await ensureDir(dir);
        planPath = path.join(dir, `implementation-plan-${nowIso().replace(/[:.]/g, "-")}.md`);
        await fs.writeFile(planPath, markdown, "utf8");
    }
    return {
        projectRoot: scan.projectRoot,
        docsDir,
        stateExists: scan.stateExists,
        statePath: scan.statePath,
        changes: task.changedBlocks.length,
        planPath,
        markdown
    };
}
export async function markProjectSynced(projectRoot, docsDir = "docs") {
    const root = path.resolve(projectRoot);
    const blocks = await scanDocs(root, docsDir);
    const previous = await loadState(root, docsDir);
    const changes = diffBlocks(blocks, previous.blocks, previous.keyIndex);
    const state = await markChangesImplemented(root, changes, docsDir);
    return {
        projectRoot: root,
        docsDir,
        statePath: statePath(root),
        automergePath: automergePath(root),
        blocks: Object.keys(state.blocks).length,
        syncedChanges: changes.length
    };
}
export async function resetState(projectRoot, docsDir = "docs") {
    const root = path.resolve(projectRoot);
    const blocks = await scanDocs(root, docsDir);
    const state = await baselineState(root, blocks, docsDir);
    await saveState(root, state);
    return {
        projectRoot: root,
        docsDir,
        statePath: statePath(root),
        automergePath: automergePath(root),
        blocks: Object.keys(state.blocks).length
    };
}
//# sourceMappingURL=core.js.map