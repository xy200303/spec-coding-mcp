import { unique } from "./utils.js";
function blockLabel(change) {
    const block = change.block;
    const previous = change.previous;
    if (block)
        return `${block.file}:${block.startLine} ${block.titlePath.join(" > ")}`;
    if (previous)
        return `${previous.file}:${previous.startLine} ${previous.titlePath.join(" > ")}`;
    return "unknown";
}
function suggestFilePatterns(change) {
    const block = change.block;
    const source = `${block?.file ?? change.previous?.file ?? ""} ${block?.titlePath.join(" ") ?? ""}`;
    const patterns = new Set();
    if (/api|接口|请求|响应|route|controller/i.test(source)) {
        patterns.add("routes/controllers/request schemas/API tests");
    }
    if (/rule|规则|业务|service|domain|不变量/i.test(source)) {
        patterns.add("domain services/application services/unit tests");
    }
    if (/ui|页面|组件|交互|frontend|web|ios|android/i.test(source)) {
        patterns.add("frontend/client screens/components/component tests");
    }
    if (/data|数据|表|schema|model|db/i.test(source)) {
        patterns.add("models/repositories/migrations/fixtures");
    }
    if (/test|测试|验收|e2e/i.test(source)) {
        patterns.add("unit/integration/frontend/e2e tests");
    }
    if (patterns.size === 0) {
        patterns.add("search codebase by feature terms and update matching implementation/tests");
    }
    return [...patterns];
}
export function createImplementationTask(scan) {
    const actionable = scan.changes.filter((change) => change.type !== "unchanged");
    const suggestedFiles = unique(actionable.flatMap(suggestFilePatterns));
    const testTargets = unique(actionable.map((change) => {
        const label = blockLabel(change);
        return `derive tests from documented behavior in ${label}`;
    }));
    const instructions = [
        "Treat the current Markdown docs as the behavior source of truth.",
        "Use the changed document blocks below as the implementation delta; no manual stable IDs or change log are required.",
        "Before editing code, read each changed block and nearby parent sections for context.",
        "Map each changed block to backend, frontend, client, database, and test files by searching existing code semantics.",
        "Update implementation and tests so observed behavior matches the docs.",
        "After tests pass, call docs_code_mark_synced to update the MCP baseline."
    ];
    return {
        summary: `${actionable.length} document block(s) require implementation in ${scan.projectRoot}.`,
        changedBlocks: actionable,
        suggestedFiles,
        testTargets,
        instructions
    };
}
export function renderTaskMarkdown(task) {
    const rows = task.changedBlocks.map((change) => {
        const label = blockLabel(change);
        const type = change.type;
        const similarity = change.similarity === undefined ? "" : change.similarity.toFixed(2);
        return `| ${type} | ${label} | ${similarity} |`;
    });
    return [
        `# Docs-Is-Code Implementation Plan`,
        "",
        task.summary,
        "",
        "## Changed Document Blocks",
        "",
        "| Change | Block | Similarity |",
        "|---|---|---|",
        rows.length ? rows.join("\n") : "| none | none | |",
        "",
        "## Suggested Implementation Areas",
        "",
        ...task.suggestedFiles.map((item) => `- ${item}`),
        "",
        "## Test Targets",
        "",
        ...task.testTargets.map((item) => `- ${item}`),
        "",
        "## Instructions",
        "",
        ...task.instructions.map((item) => `- ${item}`)
    ].join("\n");
}
//# sourceMappingURL=planner.js.map