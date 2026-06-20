/* Focused unit tests for spec parsing, progress writing, MCP guard, and registry compatibility contracts. */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { APP_VERSION } from "../src/shared/meta.js";
import { todoSpec } from "../src/templates/prompt-documents.js";
import { recordSpecCheckpoint } from "../src/spec/checkpoint-writer.js";
import { markSpecDone } from "../src/spec/done-writer.js";
import { extractTodos, markCompletedTodos } from "../src/spec/todo-files.js";
import { createSessionGuard, SPEC_CONTEXT_REQUIRED_MESSAGE, markSpecContextSeen, requireSpecContext } from "../src/mcp/session-guard.js";
import { CLI_HELP_LINES, MCP_DIST_ENTRY, MCP_SERVER_NAME, MCP_START_COMMAND, SUPPORTED_TOOL_IDS } from "../src/cli/compatibility-contract.js";
import { serverCommand, upsertCodexConfig, upsertContinueConfig, upsertJsonMcpServers, upsertOpenCodeConfig } from "../src/cli/registry-write.js";
import { STATUS_JSON_SCHEMA_VERSION, decideStatusRecommendation } from "../src/cli/status-recommendation.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(text: string, expected: string, message: string): void {
  assert(text.includes(expected), `${message}: missing ${expected}`);
}

async function testTodoParsing(): Promise<void> {
  const todos = extractTodos("specs/todo/demo.md", [
    "- [ ] 补充字段",
    "- [x] 更新测试",
    "- TODO: 记录风险",
    "- 普通列表"
  ].join("\n"));
  assert(todos.length === 3, "Expected checkbox and plain TODO items to be parsed.");
  assert(todos[0]?.line === 1 && !todos[0].checked, "Expected first TODO to stay open.");
  assert(todos[1]?.checked, "Expected checked TODO to be marked checked.");

  const marked = markCompletedTodos("- [ ] 补充字段\n- [ ] 更新测试\n", ["补充字段"]);
  assertIncludes(marked.text, "- [x] 补充字段", "Expected matched TODO to be checked.");
  assertIncludes(marked.text, "- [ ] 更新测试", "Expected unmatched TODO to stay open.");
  assert(marked.matched.length === 1, "Expected exactly one matched TODO.");
}

async function testTodoSpecTaskExtraction(): Promise<void> {
  const text = todoSpec("优化任务提取", [
    "优化 spec_todo 任务提取质量。要求：",
    "",
    "# Goals",
    "目标：",
    "- 过滤结构标题。",
    "- 保留真正任务。",
    "- `bun run build` 通过。",
    "",
    "Requirements:",
    "验收：",
    "- [x] 已完成的用户任务",
    "- [ ] 未完成的用户任务",
    "- `git diff --check` 通过。"
  ].join("\n"));

  assertIncludes(text, "- [ ] 过滤结构标题。", "Expected actionable bullet to become TODO.");
  assertIncludes(text, "- [ ] 保留真正任务。", "Expected actionable bullet to stay in TODO.");
  assertIncludes(text, "- [x] 已完成的用户任务", "Expected checked user TODO to stay checked.");
  assertIncludes(text, "- [ ] 未完成的用户任务", "Expected unchecked user TODO to stay unchecked.");
  assertIncludes(text, "- [ ] `bun run build` 通过。", "Expected verification command to stay executable.");
  assertIncludes(text, "- [ ] `git diff --check` 通过。", "Expected git verification command to stay executable.");
  assert(!text.includes("- [ ] # Goals"), "Expected markdown heading to stay out of generated TODOs.");
  assert(!text.includes("- [ ] 目标："), "Expected section title to stay out of generated TODOs.");
  assert(!text.includes("- [ ] Requirements:"), "Expected English section title to stay out of generated TODOs.");
  assert(!text.includes("- [ ] 验收："), "Expected acceptance title to stay out of generated TODOs.");

  const plainText = todoSpec("纯文本任务", "优化 spec_todo 任务提取质量。要求：");
  assert(!plainText.includes("- [ ] 优化 spec_todo 任务提取质量。要求："), "Expected trailing requirement label to be removed.");
  assertIncludes(plainText, "- [ ] 优化 spec_todo 任务提取质量。", "Expected plain task to keep business text.");
}

async function testCheckpointWriter(): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "spec-coding-unit-"));
  try {
    const file = path.join(root, "specs", "todo", "demo.md");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "# Demo\n\n- [ ] 补充字段\n- [ ] 更新测试\n", "utf8");
    const result = await recordSpecCheckpoint({
      projectRoot: root,
      specsDir: "specs",
      file: "specs/todo/demo.md",
      summary: "完成字段补充",
      completedTodos: ["补充字段", "不存在的 TODO"],
      changedFiles: ["src/demo.ts"],
      verification: [{ command: "npm test", status: "passed" }],
      behaviorRecords: [{
        scenario: "字段补充",
        condition: "字段存在",
        result: "返回新值",
        defaultBehavior: "字段缺失时保持旧行为",
        verification: "npm test",
        relatedFiles: ["src/demo.ts"]
      }],
      risks: ["剩余测试待补"]
    });
    const nextText = await readFile(file, "utf8");
    assertIncludes(nextText, "- [x] 补充字段", "Expected checkpoint to mark matched TODO.");
    assertIncludes(nextText, "- [ ] 更新测试", "Expected checkpoint to preserve open TODO.");
    assertIncludes(nextText, "### 实际行为记录", "Expected checkpoint to include behavior records.");
    assertIncludes(nextText, "| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |", "Expected checkpoint behavior records to render as a table.");
    assertIncludes(nextText, "字段缺失时保持旧行为", "Expected checkpoint to record actual behavior.");
    assert(result.nextSteps.some((step) => step.includes("未匹配")), "Expected unmatched TODO next step.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function testSessionGuard(): Promise<void> {
  const guard = createSessionGuard();
  let blockedMessage = "";
  try {
    requireSpecContext(guard);
  } catch (error) {
    blockedMessage = error instanceof Error ? error.message : String(error);
  }
  assert(blockedMessage === SPEC_CONTEXT_REQUIRED_MESSAGE, "Expected write guard to fail before spec_context.");
  markSpecContextSeen(guard);
  requireSpecContext(guard);
}

async function testDoneWriterAvoidsOverwrites(): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "spec-coding-done-"));
  try {
    const todoFile = path.join(root, "specs", "todo", "demo.md");
    const existingDoneFile = path.join(root, "specs", "done", "demo.md");
    await mkdir(path.dirname(todoFile), { recursive: true });
    await mkdir(path.dirname(existingDoneFile), { recursive: true });
    await writeFile(todoFile, "# New Demo\n\n## Meta\n\n- status: todo\n- source: user-prompt\n", "utf8");
    await writeFile(existingDoneFile, "# Existing Demo\n", "utf8");

    const result = await markSpecDone({
      projectRoot: root,
      specsDir: "specs",
      file: "specs/todo/demo.md",
      note: "unit",
      behaviorRecords: [{
        scenario: "默认配置",
        condition: "未传配置",
        result: "使用系统默认值",
        verification: "unit"
      }]
    });

    const existingDoneText = await readFile(existingDoneFile, "utf8");
    const archivedText = await readFile(path.join(root, "specs", "done", "demo-2.md"), "utf8");
    assert(existingDoneText === "# Existing Demo\n", "Expected existing done spec to be preserved.");
    assertIncludes(archivedText, "# New Demo", "Expected new done spec to use a collision-free name.");
    assertIncludes(archivedText, "- status: done", "Expected archived spec meta status to be done.");
    assertIncludes(archivedText, "## 最终行为契约", "Expected archived spec to include final behavior contract.");
    assertIncludes(archivedText, "未传配置", "Expected archived spec to preserve behavior condition.");
    assertIncludes(archivedText, "使用系统默认值", "Expected archived spec to preserve behavior result.");
    assert(result.nextSteps.some((step) => step.includes("最终行为契约已记录")), "Expected done result to confirm behavior contract.");
    assert(result.specs[0] === "specs/done/demo-2.md", "Expected result to report collision-free done path.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function testRegistryContracts(): Promise<void> {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

  assert(SUPPORTED_TOOL_IDS.join(",") === "codex,claude,opencode,cursor,continue,windsurf", "Expected supported tool order to stay stable.");
  assert(CLI_HELP_LINES.some((line) => line.includes("specc serve")), "Expected CLI help contract to include serve.");
  assert(CLI_HELP_LINES.some((line) => line.includes("specc status")), "Expected CLI help contract to include status.");
  assert(CLI_HELP_LINES.some((line) => line.includes("specc bootstrap")), "Expected CLI help contract to include bootstrap.");
  assert(CLI_HELP_LINES.some((line) => line.includes("specc bootstrap --help")), "Expected CLI help contract to include bootstrap help.");
  assert(CLI_HELP_LINES.some((line) => line.includes("specc init --help")), "Expected CLI help contract to include init help.");
  assert(MCP_SERVER_NAME === "spec-coding", "Expected stable MCP server name.");
  assert(MCP_DIST_ENTRY === "dist/index.js", "Expected stable dist entry.");
  assert(MCP_START_COMMAND === "serve", "Expected stable MCP start command.");
  assert(APP_VERSION === packageJson.version, "Expected APP_VERSION to come from package.json.");

  const server = { command: "node", args: ["dist/index.js", "serve"] };
  assertIncludes(upsertCodexConfig("", server), "[mcp_servers.spec-coding]", "Expected Codex config block.");
  assert(JSON.parse(upsertOpenCodeConfig("{}", server)).mcp["spec-coding"].command[2] === "serve", "Expected OpenCode command array.");
  assert(JSON.parse(upsertJsonMcpServers("{}", server)).mcpServers["spec-coding"].args[1] === "serve", "Expected JSON MCP server args.");
  assertIncludes(upsertContinueConfig("", server), "name: spec-coding", "Expected Continue config server name.");

  const resolved = await serverCommand(server);
  assert(resolved.command === "node" && resolved.args[1] === "serve", "Expected explicit server command to be preserved.");
}

async function testStatusRecommendationDecisions(): Promise<void> {
  const base = { projectRoot: "C:/demo", specsDir: "specs" };
  assert(STATUS_JSON_SCHEMA_VERSION === 1, "Expected status JSON schema version to stay at 1.");

  const empty = decideStatusRecommendation({
    ...base,
    workflowState: { active: 0, todo: 0, review: 0, done: 0, openTodos: 0 }
  });
  assert(empty.nextTool === "spec_bootstrap", "Expected empty status to recommend bootstrap.");
  assert(empty.arguments.projectKind === "auto", "Expected bootstrap recommendation to include projectKind.");

  const doneOnly = decideStatusRecommendation({
    ...base,
    workflowState: { active: 0, todo: 0, review: 0, done: 1, openTodos: 0 }
  });
  assert(doneOnly.nextTool === "spec_todo", "Expected done-only status to recommend a new TODO.");
  assert(doneOnly.arguments.prompt !== undefined && doneOnly.arguments.title !== undefined, "Expected done-only recommendation placeholders.");

  const active = decideStatusRecommendation({
    ...base,
    workflowState: { active: 1, todo: 0, review: 0, done: 0, openTodos: 0 }
  });
  assert(active.nextTool === "spec_context", "Expected active status to recommend spec_context.");
  assert(Object.keys(active.arguments).join(",") === "projectRoot,specsDir", "Expected spec_context recommendation to keep minimal arguments.");

  const reviewOnly = decideStatusRecommendation({
    ...base,
    workflowState: { active: 0, todo: 0, review: 1, done: 0, openTodos: 0 }
  });
  assert(reviewOnly.nextTool === "spec_context", "Expected review-only status to recommend spec_context.");
  assert(reviewOnly.arguments.files === "review-1.md", "Expected review-only status to reuse workflow review arguments.");

  const openTodo = decideStatusRecommendation({
    ...base,
    workflowState: { active: 1, todo: 0, review: 0, done: 0, openTodos: 2 }
  });
  assert(openTodo.nextStep.includes("open TODOs"), "Expected open TODO status to keep the open TODO nextStep.");
}

await testTodoParsing();
await testTodoSpecTaskExtraction();
await testCheckpointWriter();
await testSessionGuard();
await testDoneWriterAvoidsOverwrites();
await testRegistryContracts();
await testStatusRecommendationDecisions();

console.log("spec-coding unit tests passed");
