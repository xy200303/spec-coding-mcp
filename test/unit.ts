/* Focused unit tests for spec parsing, progress writing, MCP guard, and registry compatibility contracts. */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { APP_VERSION } from "../src/shared/meta.js";
import { todoSpec } from "../src/templates/prompt-documents.js";
import { recordSpecCheckpoint } from "../src/spec/checkpoint-writer.js";
import { markSpecDone } from "../src/spec/done-writer.js";
import { localDateDirectory } from "../src/spec/spec-files.js";
import { extractTodos, markCompletedTodos } from "../src/spec/todo-files.js";
import { createSessionGuard, SPEC_CONTEXT_REQUIRED_MESSAGE, markSpecContextSeen, requireSpecContext } from "../src/mcp/session-guard.js";
import { CLI_HELP_LINES, MCP_DIST_ENTRY, MCP_SERVER_NAME, MCP_START_COMMAND, SUPPORTED_TOOL_IDS } from "../src/cli/compatibility-contract.js";
import { serverCommand, upsertCodexConfig, upsertContinueConfig, upsertJsonMcpServers, upsertOpenCodeConfig } from "../src/cli/registry-write.js";
import { STATUS_JSON_SCHEMA_VERSION, decideStatusRecommendation } from "../src/cli/status-recommendation.js";
import { renderSpecResult } from "../src/mcp/render-spec.js";
import { ensureDefaultGuidanceFiles, guidanceItems, readGuidance } from "../src/spec/guidance.js";

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

  assert(!text.includes("- [ ] 优化 spec_todo 任务提取质量。"), "Expected prose intro to stay out of TODOs when bullet tasks exist.");
  assert(!text.includes("- [ ] 优化 spec_todo 任务提取质量。要求："), "Expected prose intro with trailing requirement label to stay out of TODOs.");
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
        trigger: "读取详情接口返回字段",
        input: "请求命中包含新增字段的数据对象",
        steps: ["读取原始对象", "补充响应字段", "返回序列化结果"],
        output: "响应体包含新字段",
        sideEffects: "不写入数据库",
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
    assertIncludes(nextText, "1. 字段补充", "Expected checkpoint behavior records to render as numbered text.");
    assertIncludes(nextText, "  - 条件：字段存在", "Expected checkpoint behavior record to include condition text.");
    assertIncludes(nextText, "  - 触发入口：读取详情接口返回字段", "Expected checkpoint behavior record to include trigger.");
    assertIncludes(nextText, "  - 输入与前置状态：请求命中包含新增字段的数据对象", "Expected checkpoint behavior record to include input.");
    assertIncludes(nextText, "    1. 读取原始对象", "Expected checkpoint behavior record to include execution steps.");
    assertIncludes(nextText, "  - 输出结果：响应体包含新字段", "Expected checkpoint behavior record to include output.");
    assertIncludes(nextText, "  - 副作用：不写入数据库", "Expected checkpoint behavior record to include side effects.");
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
    const day = localDateDirectory(new Date());
    const existingDoneFile = path.join(root, "specs", "done", day, "001-new-demo.md");
    await mkdir(path.dirname(todoFile), { recursive: true });
    await mkdir(path.dirname(existingDoneFile), { recursive: true });
    await writeFile(todoFile, [
      "# New Demo",
      "",
      "## Meta",
      "",
      "- status: todo",
      "- source: user-prompt",
      "",
      "## 目标",
      "",
      "保留真实业务目标。",
      "",
      "## 执行要求",
      "",
      "- 开始前必须先调用 spec_context。",
      "",
      "## 工程质量约束",
      "",
      "- KISS。",
      "",
      "## Checkpoint",
      "",
      "- summary: 过程记录不进入 done。",
      ""
    ].join("\n"), "utf8");
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
        trigger: "创建任务时未提供配置",
        input: "配置对象为空",
        steps: ["读取配置对象", "回退到系统默认值", "继续创建流程"],
        output: "返回带默认配置的任务",
        sideEffects: "只写入最终任务记录",
        verification: "unit"
      }]
    });

    const existingDoneText = await readFile(existingDoneFile, "utf8");
    const archivedPath = path.join(root, "specs", "done", day, "002-new-demo.md");
    const archivedText = await readFile(archivedPath, "utf8");
    assert(existingDoneText === "# Existing Demo\n", "Expected existing done spec to be preserved.");
    assertIncludes(archivedText, "# New Demo", "Expected new done spec to use a readable collision-free name.");
    assertIncludes(archivedText, "- status: done", "Expected archived spec meta status to be done.");
    assertIncludes(archivedText, "保留真实业务目标。", "Expected archived spec to keep business content.");
    assertIncludes(archivedText, "## 最终行为契约", "Expected archived spec to include final behavior contract.");
    assertIncludes(archivedText, "未传配置", "Expected archived spec to preserve behavior condition.");
    assertIncludes(archivedText, "触发入口：创建任务时未提供配置", "Expected archived spec to preserve behavior trigger.");
    assertIncludes(archivedText, "输入与前置状态：配置对象为空", "Expected archived spec to preserve behavior input.");
    assertIncludes(archivedText, "1. 读取配置对象", "Expected archived spec to preserve execution steps.");
    assertIncludes(archivedText, "输出结果：返回带默认配置的任务", "Expected archived spec to preserve behavior output.");
    assertIncludes(archivedText, "使用系统默认值", "Expected archived spec to preserve behavior result.");
    assert(!archivedText.includes("## 执行要求"), "Expected archived spec to omit execution template noise.");
    assert(!archivedText.includes("## 工程质量约束"), "Expected archived spec to omit engineering template noise.");
    assert(!archivedText.includes("## Checkpoint"), "Expected archived spec to omit checkpoint history.");
    assert(result.nextSteps.some((step) => step.includes("最终行为契约已记录")), "Expected done result to confirm behavior contract.");
    assert(result.specs[0] === `specs/done/${day}/002-new-demo.md`, "Expected result to report dated collision-free done path.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function testDoneWriterWarnsWhenBehaviorFactsAreMissing(): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "spec-coding-done-empty-behavior-"));
  try {
    const todoFile = path.join(root, "specs", "todo", "demo.md");
    await mkdir(path.dirname(todoFile), { recursive: true });
    await writeFile(todoFile, "# Missing Facts\n\n## Meta\n\n- status: todo\n", "utf8");

    const result = await markSpecDone({
      projectRoot: root,
      specsDir: "specs",
      file: "specs/todo/demo.md"
    });

    const archivedText = await readFile(path.join(root, result.specs[0]), "utf8");
    assert(result.nextSteps.some((step) => step.includes("不可作为真实行为事实")), "Expected missing behavior warning to be explicit.");
    assertIncludes(archivedText, "未提供已验证行为", "Expected final contract to show missing behavior facts.");
    assertIncludes(archivedText, "触发入口：未记录", "Expected final contract to show missing trigger.");
    assertIncludes(archivedText, "执行过程：未记录", "Expected final contract to show missing execution flow.");
    assertIncludes(archivedText, "不可作为真实行为事实", "Expected final contract to reject guessed behavior.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function testRendererLimitsToolOutput(): void {
  const files = Array.from({ length: 25 }, (_, index) => ({ path: `specs/done/demo-${index}.md`, status: "created" as const }));
  const specs = files.map((file) => file.path);
  const text = renderSpecResult("Many Files", {
    projectRoot: "C:/demo",
    specsDir: "specs",
    files,
    specs,
    nextSteps: ["读取对应文件查看详情。"]
  });

  assertIncludes(text, "其余 5 项未展开", "Expected tool result renderer to limit long file lists.");
  assert(!text.includes("demo-24.md"), "Expected hidden file entries to stay out of tool output.");
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

async function testGuidanceCreatesDefaultsAndPreservesProjectFiles(): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "spec-coding-guidance-"));
  try {
    const items = guidanceItems("docs/specs");
    assert(items.map((item) => item.name).join(",") === "engineering,ui-ux,spec-writing,git-commit,pr-submit", "Expected guidance names to stay stable.");
    assert(items[0]?.file === "docs/specs/guidance/engineering.md", "Expected guidance file paths to respect specsDir.");

    const created = await ensureDefaultGuidanceFiles(root, "specs");
    assert(created.filter((file) => file.status === "created").length === 5, "Expected empty guidance directory to be populated with defaults.");
    const createdAgain = await ensureDefaultGuidanceFiles(root, "specs");
    assert(createdAgain.every((file) => file.status === "skipped"), "Expected existing guidance files to be preserved.");

    const generated = await readGuidance({ projectRoot: root, specsDir: "specs", name: "engineering" });
    assert(generated.source === "project", "Expected generated default guidance to be read from the project file.");
    assert(generated.file === "specs/guidance/engineering.md", "Expected generated guidance path to be relative to root.");
    assertIncludes(generated.content, "工程与代码风格原则", "Expected generated engineering guidance content.");
    assertIncludes(generated.content, "### Hard Rules", "Expected generated engineering guidance to include full hard rules.");
    assertIncludes(generated.content, "### Recommended Practices", "Expected generated engineering guidance to include full recommended practices.");
    assertIncludes(generated.content, "业务不确定性强制确认", "Expected generated engineering guidance to include business confirmation rules.");

    const specWriting = await readGuidance({ projectRoot: root, specsDir: "specs", name: "spec-writing" });
    assertIncludes(specWriting.content, "## 当前任务协议", "Expected generated spec-writing guidance to include task protocol.");
    assertIncludes(specWriting.content, "## 行为记录要求", "Expected generated spec-writing guidance to include behavior recording rules.");
    assertIncludes(specWriting.content, "行为记录必须描述功能全过程", "Expected generated spec-writing guidance to include full behavior flow guidance.");

    const uiUx = await readGuidance({ projectRoot: root, specsDir: "specs", name: "ui-ux" });
    assertIncludes(uiUx.content, "Linear / Vercel", "Expected UI/UX guidance to include Linear/Vercel style direction.");
    assertIncludes(uiUx.content, "8pt grid", "Expected UI/UX guidance to include the 8pt grid rule.");
    assertIncludes(uiUx.content, "#0B0E14", "Expected UI/UX guidance to include the dark mode base color.");
    assertIncludes(uiUx.content, "Aether Vector", "Expected UI/UX guidance to include the brand vibe.");
    assertIncludes(uiUx.content, "loading / pending", "Expected UI/UX guidance to include loading states.");
    assertIncludes(uiUx.content, "undo", "Expected UI/UX guidance to include undo guidance.");

    const gitCommit = await readGuidance({ projectRoot: root, specsDir: "specs", name: "git-commit" });
    assertIncludes(gitCommit.content, "Git 提交工作流原则", "Expected git commit guidance content.");
    assertIncludes(gitCommit.content, "只有用户明确要求提交", "Expected git commit guidance to include trigger rules.");
    assertIncludes(gitCommit.content, "git diff --cached --check", "Expected git commit guidance to include staged diff checks.");
    assertIncludes(gitCommit.content, "短 hash", "Expected git commit guidance to include final report requirements.");

    const prSubmit = await readGuidance({ projectRoot: root, specsDir: "specs", name: "pr-submit" });
    assertIncludes(prSubmit.content, "PR 提交工作流原则", "Expected PR guidance content.");
    assertIncludes(prSubmit.content, "PR 模板发现顺序", "Expected PR guidance to include template discovery.");
    assertIncludes(prSubmit.content, "gh pr create", "Expected PR guidance to include GitHub CLI creation path.");
    assertIncludes(prSubmit.content, "compare URL", "Expected PR guidance to include fallback compare URL.");

    const projectGuidance = path.join(root, "specs", "guidance", "ui-ux.md");
    await mkdir(path.dirname(projectGuidance), { recursive: true });
    await writeFile(projectGuidance, "# Custom UI Guidance\n\n保持产品语境。\n", "utf8");
    await ensureDefaultGuidanceFiles(root, "specs");
    const project = await readGuidance({ projectRoot: root, specsDir: "specs", name: "ui-ux" });
    assert(project.source === "project", "Expected project guidance file to override built-in content.");
    assert(project.file === "specs/guidance/ui-ux.md", "Expected project guidance path to be relative to root.");
    assertIncludes(project.content, "Custom UI Guidance", "Expected edited project guidance content.");

    let unknownMessage = "";
    try {
      await readGuidance({ projectRoot: root, specsDir: "specs", name: "missing" });
    } catch (error) {
      unknownMessage = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(unknownMessage, "Available: engineering, ui-ux, spec-writing, git-commit, pr-submit", "Expected unknown guidance to fail fast with available names.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function testStatusRecommendationDecisions(): Promise<void> {
  const base = { projectRoot: "C:/demo", specsDir: "specs" };
  const spec = (file: string, status: string) => ({ file, title: file, status, source: "unit" });
  const todo = (file: string) => ({ file, text: "unit todo", checked: false, line: 1 });
  assert(STATUS_JSON_SCHEMA_VERSION === 1, "Expected status JSON schema version to stay at 1.");

  const empty = decideStatusRecommendation({
    ...base,
    activeSpecs: [],
    reviewSpecs: [],
    todoSpecs: [],
    doneSpecs: [],
    openTodos: []
  });
  assert(empty.nextTool === "spec_bootstrap", "Expected empty status to recommend bootstrap.");
  assert(empty.arguments.projectKind === "auto", "Expected bootstrap recommendation to include projectKind.");
  assert(empty.when.includes("项目首次接入"), "Expected status recommendation to expose workflow timing.");
  assert(empty.afterwards.includes("spec_context"), "Expected status recommendation to expose follow-up guidance.");

  const doneOnly = decideStatusRecommendation({
    ...base,
    activeSpecs: [],
    reviewSpecs: [],
    todoSpecs: [],
    doneSpecs: [spec("specs/done/finished.md", "done")],
    openTodos: []
  });
  assert(doneOnly.nextTool === "spec_todo", "Expected done-only status to recommend a new TODO.");
  assert(doneOnly.arguments.prompt !== undefined && doneOnly.arguments.title !== undefined, "Expected done-only recommendation placeholders.");

  const active = decideStatusRecommendation({
    ...base,
    activeSpecs: [spec("specs/active/demo.md", "active")],
    reviewSpecs: [],
    todoSpecs: [],
    doneSpecs: [],
    openTodos: []
  });
  assert(active.nextTool === "spec_context", "Expected active status to recommend spec_context.");
  assert(Object.keys(active.arguments).join(",") === "projectRoot,specsDir", "Expected spec_context recommendation to keep minimal arguments.");

  const reviewOnly = decideStatusRecommendation({
    ...base,
    activeSpecs: [],
    reviewSpecs: [spec("specs/review/source-inventory.md", "review")],
    todoSpecs: [],
    doneSpecs: [],
    openTodos: []
  });
  assert(reviewOnly.nextTool === "spec_context", "Expected review-only status to recommend spec_context.");
  assert(reviewOnly.arguments.files === "specs/review/source-inventory.md", "Expected review-only status to use the real review spec path.");

  const openTodo = decideStatusRecommendation({
    ...base,
    activeSpecs: [spec("specs/active/demo.md", "active")],
    reviewSpecs: [],
    todoSpecs: [],
    doneSpecs: [],
    openTodos: [todo("specs/active/demo.md"), todo("specs/active/demo.md")]
  });
  assert(openTodo.nextStep.includes("open TODOs"), "Expected open TODO status to keep the open TODO nextStep.");
}

await testTodoParsing();
await testTodoSpecTaskExtraction();
await testCheckpointWriter();
await testSessionGuard();
await testDoneWriterAvoidsOverwrites();
await testDoneWriterWarnsWhenBehaviorFactsAreMissing();
testRendererLimitsToolOutput();
await testRegistryContracts();
await testStatusRecommendationDecisions();
await testGuidanceCreatesDefaultsAndPreservesProjectFiles();

console.log("spec-coding unit tests passed");
