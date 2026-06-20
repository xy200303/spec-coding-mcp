/* Smoke test for the spec-coding MCP package.
 * This file stays outside src/ so the production TypeScript build only covers application code,
 * while npm test can still run a full end-to-end verification against the compiled dist entrypoint.
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { specContext } from "../src/spec/context.js";
import { businessConfirmationBullets, currentTaskInstructionBullets, engineeringConstraintBullets } from "../src/templates/markdown.js";
import { bootstrapProject, createSpecFromPrompt, createTodoFromPrompt, generateAgentsFile, generateSpecsFromSource, initSpecs, listSpecs } from "../src/spec/scaffold.js";
import { markSpecDone } from "../src/spec/done-writer.js";
import { recordSpecCheckpoint } from "../src/spec/checkpoint-writer.js";
import { recordSpecReviewResult } from "../src/spec/review-result-writer.js";
import { detectProgrammingTools } from "../src/cli/registry-detect.js";
import { registerClaude, registerCodex, registerContinue, registerCursor, registerOpenCode, registerWindsurf, upsertCodexConfig, upsertOpenCodeConfig } from "../src/cli/registry-write.js";
import { runCli } from "../src/cli/main.js";
import { APP_VERSION } from "../src/shared/meta.js";
import { SPEC_CONTEXT_REQUIRED_MESSAGE, createSessionGuard, markSpecContextSeen, requireSpecContext } from "../src/mcp/session-guard.js";
import { registerReadTools } from "../src/mcp/register-read-tools.js";
import { registerWriteTools } from "../src/mcp/register-write-tools.js";

type RegisteredToolHandler = (input: Record<string, unknown>) => Promise<{ content: Array<{ type: "text"; text: string }> }>;

function createToolHarness() {
  const handlers = new Map<string, RegisteredToolHandler>();
  const descriptions = new Map<string, string>();
  return {
    registerTool(name: string, definition: { description?: string }, handler: RegisteredToolHandler): void {
      descriptions.set(name, definition.description ?? "");
      handlers.set(name, handler);
    },
    async call(name: string, input: Record<string, unknown>) {
      const handler = handlers.get(name);
      if (!handler) {
        throw new Error(`Missing test handler for ${name}`);
      }
      return handler(input);
    },
    description(name: string): string {
      return descriptions.get(name) ?? "";
    }
  };
}

function assertIncludesAll(text: string, expected: string[], message: string): void {
  const missing = expected.filter((item) => !text.includes(item));
  if (!missing.length) return;
  throw new Error(`${message}: ${missing.join(", ")}`);
}

function assertToolDescriptionRequiresSpecContext(text: string): void {
  assertIncludesAll(text, [
    "spec_context must be called first.",
    "This session has not read model-ready context yet.",
    "Write operations are blocked until spec_context unlocks the session."
  ], "Expected write tool description to mention the spec_context guard");
}

const root = await mkdtemp(path.join(os.tmpdir(), "spec-coding-mcp-"));

try {
  await mkdir(path.join(root, "src", "routes"), { recursive: true });
  await mkdir(path.join(root, "src", "components"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "source-demo", scripts: { test: "node --test" } }, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(root, "src", "routes", "users.ts"),
    [
      "import { Router } from 'express';",
      "export const router = Router();",
      "router.get('/users/:id', async (req, res) => res.json({ id: req.params.id }));"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(root, "src", "components", "UserProfile.tsx"),
    "export function UserProfile() { return <section>User</section>; }\n",
    "utf8"
  );
  await writeFile(path.join(root, "tests", "users.test.ts"), "test('users route', () => {});\n", "utf8");

  const init = await initSpecs({ projectRoot: root, specsDir: "specs", projectName: "用户系统" });
  if (!init.files.some((file) => file.path.endsWith("specs/README.md"))) {
    throw new Error("Expected spec init to create specs README.");
  }

  const emptyWorkflowRoot = await mkdtemp(path.join(os.tmpdir(), "spec-coding-empty-workflow-"));
  await initSpecs({ projectRoot: emptyWorkflowRoot, specsDir: "specs", projectName: "空项目" });
  const emptyWorkflowContext = await specContext({ projectRoot: emptyWorkflowRoot, specsDir: "specs" });
  assertIncludesAll(emptyWorkflowContext.markdown, [
    "当前没有可执行任务",
    "Recommended Next Step",
    "nextTool: `spec_bootstrap`",
    "alternatives: `spec_todo`, `spec_create`",
    "arguments:",
    `"projectRoot":"${emptyWorkflowRoot.replace(/\\/g, "\\\\")}"`,
    "\"projectKind\":\"auto\"",
    "当前没有可执行任务，不能直接实现代码",
    "优先生成 AGENTS、specs 和可执行入口"
  ], "Expected empty spec_context to render a structured next step instead of stopping at a warning");
  await rm(emptyWorkflowRoot, { recursive: true, force: true });

  const generated = await generateSpecsFromSource({ projectRoot: root, specsDir: "specs", projectName: "用户系统" });
  if (!generated.source?.routeHints.length || !generated.specs.some((file) => file.includes("review"))) {
    throw new Error("Expected source generation to create review specs with route hints.");
  }
  const generatedReviewText = await readFile(path.join(root, generated.specs[0]), "utf8");
  assertIncludesAll(generatedReviewText, [
    "source-review/needs-ai-summary",
    "它不是业务结论，只是交给 AI 阅读源码的任务单",
    "禁止把下面的静态线索当成业务事实",
    "AI 必须打开并阅读相关源码、测试和配置",
    "AI 阅读源码后填写"
  ], "Expected source generation to produce AI-guided review tasks instead of business conclusions");

  const existingBootstrap = await bootstrapProject({ projectRoot: root, specsDir: "boot-existing", projectName: "用户系统", projectKind: "existing" });
  if (!existingBootstrap.specs.some((file) => file.includes("boot-existing/review")) || !existingBootstrap.files.some((file) => file.path.endsWith("AGENTS.md"))) {
    throw new Error("Expected existing project bootstrap to create AGENTS and review tasks.");
  }

  const newProjectRoot = await mkdtemp(path.join(os.tmpdir(), "spec-coding-new-project-"));
  const newBootstrap = await bootstrapProject({
    projectRoot: newProjectRoot,
    specsDir: "specs",
    projectName: "新项目",
    projectKind: "new",
    initialPrompt: "创建一个简单 CLI 项目。"
  });
  if (!newBootstrap.specs.some((file) => file.includes("specs/active")) || !newBootstrap.files.some((file) => file.path.endsWith("AGENTS.md"))) {
    throw new Error("Expected new project bootstrap to create AGENTS and a starter active spec.");
  }
  const starterSpec = await readFile(path.join(newProjectRoot, newBootstrap.specs[0]), "utf8");
  assertIncludesAll(starterSpec, [
    "创建一个简单 CLI 项目",
    "- status: active",
    "## AI 实现计划"
  ], "Expected new project bootstrap to create a starter active spec from the initial prompt");
  await rm(newProjectRoot, { recursive: true, force: true });

  const agents = await generateAgentsFile({ projectRoot: root, projectName: "用户系统" });
  if (agents.file !== "AGENTS.md" || !agents.files.some((file) => file.path.endsWith("AGENTS.md"))) {
    throw new Error("Expected AGENTS.md to be generated at the project root.");
  }
  const agentsText = await readFile(path.join(root, "AGENTS.md"), "utf8");
  if (!agentsText.includes("Before any code or documentation change, call `spec_context`") || !engineeringConstraintBullets().every((item) => agentsText.includes(item)) || !businessConfirmationBullets().every((item) => agentsText.includes(item))) {
    throw new Error("Expected AGENTS.md to include project engineering principles.");
  }
  const packageReadmeText = await readFile(path.join(process.cwd(), "README.md"), "utf8");
  const packageAgentsText = await readFile(path.join(process.cwd(), "AGENTS.md"), "utf8");
  assertIncludesAll(packageReadmeText, [
    "src/templates/constraints.ts",
    "src/templates/prompt-protocol.ts",
    "src/templates/markdown.ts",
    "Hard Rules",
    "Recommended Practices",
    "Business Confirmation Rules",
    "Current Task Protocol"
  ], "Expected README to point to the shared template source of truth");
  assertIncludesAll(packageAgentsText, [
    "Before any code or documentation change, call `spec_context`",
    "Engineering Principles",
    "Business Confirmation Rules"
  ], "Expected root AGENTS.md to match the shared rule output shape");
  if (typeof registerClaude !== "function" || typeof registerOpenCode !== "function" || typeof detectProgrammingTools !== "function") {
    throw new Error("Expected registry helpers to stay available after registry refactor.");
  }
  const guard = createSessionGuard();
  const harness = createToolHarness();
  registerReadTools(harness as never, guard);
  registerWriteTools(harness as never, guard);
  assertIncludesAll(harness.description("spec_bootstrap"), ["PRIMARY ENTRYPOINT", "Use this before spec_init"], "Expected spec_bootstrap to be the primary tool entrypoint");
  assertIncludesAll(harness.description("spec_init"), ["Advanced setup helper", "Prefer spec_bootstrap"], "Expected spec_init to be marked as an advanced helper");
  assertIncludesAll(harness.description("spec_generate_from_source"), ["Advanced existing-project helper", "Prefer spec_bootstrap"], "Expected source generation to be marked as an advanced helper");
  assertIncludesAll(harness.description("spec_generate_agents"), ["Advanced maintenance helper", "Prefer spec_bootstrap"], "Expected AGENTS generation to be marked as an advanced helper");
  assertIncludesAll(harness.description("spec_done"), ["Archive only fully implemented and verified specs", "Do not use for partial work"], "Expected spec_done to reject partial-work usage");
  assertToolDescriptionRequiresSpecContext(harness.description("spec_create"));
  assertToolDescriptionRequiresSpecContext(harness.description("spec_done"));
  let blockedMessage = "";
  try {
    await harness.call("spec_create", {
      projectRoot: root,
      specsDir: "specs",
      prompt: "先确认护栏是否阻止写操作",
      title: "护栏校验"
    });
  } catch (error) {
    blockedMessage = error instanceof Error ? error.message : String(error);
  }
  if (blockedMessage !== SPEC_CONTEXT_REQUIRED_MESSAGE) {
    throw new Error(`Expected a hard spec_context guard message, got: ${blockedMessage}`);
  }
  const contextResult = await harness.call("spec_context", {
    projectRoot: root,
    specsDir: "specs",
    files: []
  });
  if (!contextResult.content[0]?.text.includes("Spec Coding Context")) {
    throw new Error("Expected spec_context tool to return model-ready context.");
  }
  if (contextResult.content[0].text.includes("Source Signals")) {
    throw new Error("Expected default spec_context mode to omit source scan output.");
  }
  assertIncludesAll(contextResult.content[0].text, [
    `Spec Coding MCP：\`${APP_VERSION}\``,
    "Workflow State",
    "active specs: 0",
    "todo specs: 0",
    "review specs:",
    "done specs:",
    "selected specs:",
    "open TODOs: 0",
    "source-review/needs-ai-summary",
    "它不是业务结论，只是交给 AI 阅读源码的任务单",
    "未发现未完成 TODO；请按 selected specs 的目标、行为规则和验收标准执行。",
    "Recommended Next Step",
    "nextTool: `spec_create`",
    "alternatives:",
    "arguments:",
    `"projectRoot":"${root.replace(/\\/g, "\\\\")}"`,
    "\"specsDir\":\"specs\"",
    "\"prompt\":\"<confirmed behavior summary from review>\"",
    "\"title\":\"<business capability name>\"",
    "reason:",
    "afterwards:"
  ], "Expected review-only spec_context to stop direct implementation and recommend creating an active spec");

  const unmatchedContext = await harness.call("spec_context", {
    projectRoot: root,
    specsDir: "specs",
    files: ["specs/active/not-found.md"]
  });
  assertIncludesAll(unmatchedContext.content[0]?.text ?? "", [
    "Requested Specs",
    "requested: `specs/active/not-found.md`",
    "matched: 无",
    "unmatched: `specs/active/not-found.md`",
    "selected specs: 0"
  ], "Expected spec_context to show unmatched requested files");

  const partialContext = await harness.call("spec_context", {
    projectRoot: root,
    specsDir: "specs",
    files: [generated.specs[0], "missing-review.md"]
  });
  assertIncludesAll(partialContext.content[0]?.text ?? "", [
    "Requested Specs",
    `requested: \`${generated.specs[0]}\`, \`missing-review.md\``,
    `matched: \`${generated.specs[0]}\``,
    "unmatched: `missing-review.md`"
  ], "Expected spec_context to show partially unmatched requested files");

  const doneOnlyWorkflowRoot = await mkdtemp(path.join(os.tmpdir(), "spec-coding-done-only-workflow-"));
  await mkdir(path.join(doneOnlyWorkflowRoot, "specs", "done"), { recursive: true });
  await writeFile(path.join(doneOnlyWorkflowRoot, "specs", "done", "finished.md"), "# Finished\n\n## Meta\n\n- status: done\n", "utf8");
  const doneOnlyList = await harness.call("spec_list", { projectRoot: doneOnlyWorkflowRoot, specsDir: "specs" });
  assertIncludesAll(doneOnlyList.content[0]?.text ?? "", [
    "done specs: 1",
    "Recommended Next Step",
    "nextTool: `spec_todo`",
    "alternatives: `spec_create`",
    "当前只有 done 历史记录，没有待执行任务"
  ], "Expected spec_list to create new work instead of bootstrapping done-only projects");
  if ((doneOnlyList.content[0]?.text ?? "").includes("nextTool: `spec_bootstrap`")) {
    throw new Error("Expected done-only spec_list to avoid recommending spec_bootstrap.");
  }
  const doneOnlyContext = await harness.call("spec_context", { projectRoot: doneOnlyWorkflowRoot, specsDir: "specs" });
  assertIncludesAll(doneOnlyContext.content[0]?.text ?? "", [
    "done specs: 1",
    "当前没有待执行 spec；项目已有 done 历史记录",
    "当前没有 open TODO；项目只有 done 历史记录",
    "Recommended Next Step",
    "nextTool: `spec_todo`",
    "alternatives: `spec_create`",
    "当前没有待执行任务，已有 done 记录说明项目已接入"
  ], "Expected spec_context to create new work instead of bootstrapping done-only projects");
  const doneOnlyContextText = doneOnlyContext.content[0]?.text ?? "";
  if (doneOnlyContextText.includes("当前没有可执行任务：优先调用 spec_bootstrap") || doneOnlyContextText.includes("nextTool: `spec_bootstrap`")) {
    throw new Error("Expected done-only spec_context to avoid empty-project bootstrap guidance.");
  }
  await rm(doneOnlyWorkflowRoot, { recursive: true, force: true });

  const createdAfterContext = await harness.call("spec_create", {
    projectRoot: root,
    specsDir: "specs",
    prompt: "先确认护栏是否阻止写操作",
    title: "护栏校验"
  });
  if (!createdAfterContext.content[0]?.text.includes("已创建 Active Spec")) {
    throw new Error("Expected write tool to work after spec_context.");
  }
  markSpecContextSeen(guard);
  requireSpecContext(guard);
  const fileCommentTargets = [
    "src/server.ts",
    "src/cli/compatibility-contract.ts",
    "src/spec/scaffold.ts",
    "src/templates/agents.ts",
    "src/templates/prompt-protocol.ts",
    "src/templates/spec-documents.ts",
    "src/templates/prompt-documents.ts",
    "src/templates/markdown.ts",
    "src/templates/constraints.ts",
    "src/spec/types.ts",
    "src/mcp/render-core.ts",
    "src/mcp/render-spec.ts",
    "src/mcp/session-guard.ts",
    "src/mcp/register-tools.ts",
    "src/mcp/register-read-tools.ts",
    "src/mcp/register-write-tools.ts",
    "src/mcp/tool-schema.ts",
    "src/mcp/write-schemas.ts",
    "src/shared/meta.ts",
    "src/spec/spec-files.ts",
    "src/spec/todo-files.ts",
    "src/spec/spec-reader.ts",
    "src/spec/context.ts",
    "src/spec/context-source.ts",
    "src/spec/context-markdown.ts",
    "src/spec/behavior-record.ts",
    "src/spec/checkpoint-writer.ts",
    "src/spec/review-result-writer.ts",
    "src/spec/done-writer.ts"
  ];
  for (const relativeFile of fileCommentTargets) {
    const text = await readFile(path.join(process.cwd(), relativeFile), "utf8");
    if (!text.startsWith("/*")) {
      throw new Error(`Expected file-top comment in ${relativeFile}.`);
    }
  }

  const created = await createSpecFromPrompt({
    projectRoot: root,
    specsDir: "specs",
    title: "用户详情增加禁用态",
    prompt: "用户详情页需要展示用户是否被禁用，禁用用户不能继续发起敏感操作。"
  });
  if (!created.specs[0]?.includes("specs/active")) {
    throw new Error("Expected prompt-created spec under specs/active.");
  }
  const createdSpecText = await readFile(path.join(root, created.specs[0]), "utf8");
  assertIncludesAll(createdSpecText, [
    "## AI 实现计划",
    "## 实际行为记录",
    "分支处理",
    "默认值/配置"
  ], "Expected active spec template to guide implementation planning and behavior recording");

  const todo = await createTodoFromPrompt({
    projectRoot: root,
    specsDir: "specs",
    title: "用户详情 TODO",
    prompt: [
      "目标：",
      "- 补充禁用态字段",
      "- 更新用户详情测试",
      "验收：",
      "- `bun run build` 通过。",
      "- [x] 已确认不需要迁移"
    ].join("\n")
  });
  if (!todo.specs[0]?.includes("specs/todo")) {
    throw new Error("Expected prompt-created TODO under specs/todo.");
  }
  const todoSpecText = await readFile(path.join(root, todo.specs[0]), "utf8");
  assertIncludesAll(todoSpecText, [
    "## 实际行为记录",
    "分支条件",
    "默认参数行为",
    "边界处理结果",
    "- [ ] 补充禁用态字段",
    "- [ ] 更新用户详情测试",
    "- [ ] `bun run build` 通过。",
    "- [x] 已确认不需要迁移"
  ], "Expected TODO spec template to guide final behavior recording");
  if (todoSpecText.includes("- [ ] 目标：") || todoSpecText.includes("- [ ] 验收：")) {
    throw new Error("Expected TODO spec generation to skip section titles.");
  }

  const listed = await listSpecs({ projectRoot: root, specsDir: "specs" });
  if (listed.active.length !== 1 || listed.todo.length !== 1 || listed.review.length === 0) {
    throw new Error("Expected active, todo, and review specs to be listed.");
  }
  const listedText = await harness.call("spec_list", { projectRoot: root, specsDir: "specs" });
  assertIncludesAll(listedText.content[0]?.text ?? "", [
    `Spec Coding MCP：${APP_VERSION}`,
    "Workflow State",
    "active specs: 1",
    "todo specs: 1",
    "review specs:",
    "done specs:",
    "selected specs: 0",
    "open TODOs: 0",
    "Recommended Next Step",
    "nextTool: `spec_context`",
    "alternatives:",
    "arguments:",
    `"projectRoot":"${root.replace(/\\/g, "\\\\")}"`,
    "\"specsDir\":\"specs\"",
    "reason:",
    "when:",
    "afterwards:"
  ], "Expected spec_list to recommend spec_context before implementation");

  const context = await specContext({ projectRoot: root, specsDir: "specs" });
  const firstOpenTodoFile = context.todos.find((item) => !item.checked)?.file;
  if (!firstOpenTodoFile) {
    throw new Error("Expected spec context to include at least one open TODO.");
  }
  assertIncludesAll(context.markdown, [
    "Workflow State",
    "active specs: 1",
    "todo specs: 1",
    "selected specs: 2",
    "open TODOs:",
    "Open TODOs",
    "Recommended Next Step",
    "nextTool: `spec_checkpoint`",
    "alternatives:",
    "arguments:",
    `"projectRoot":"${root.replace(/\\/g, "\\\\")}"`,
    "\"specsDir\":\"specs\"",
    `"file":"${firstOpenTodoFile}"`,
    "\"completedTodos\":\"<completed TODO text>\"",
    "\"verification\":\"<commands and status>\"",
    "当前有 open TODO",
    "先读本次 `spec_context`；没有上下文不得实现或改文档。",
    "selected specs 和 open TODOs 是唯一需求源，不按旧对话扩范围。",
    "Engineering Constraints",
    "Business Confirmation Rules",
    "Current Task Protocol",
    "Context mode：`workflow`",
    ...engineeringConstraintBullets(),
    ...businessConfirmationBullets(),
    ...currentTaskInstructionBullets(),
    "高风险业务描述不完整时，停止实现"
  ], "Expected spec context to include required engineering constraints");
  if (context.markdown.includes("Source Signals") || context.markdown.includes("Suggested Search Targets")) {
    throw new Error("Expected workflow mode to omit source scan and search target output.");
  }

  const contextWithHints = await specContext({ projectRoot: root, specsDir: "specs", contextMode: "full" });
  assertIncludesAll(contextWithHints.markdown, [
    "Context mode：`full`",
    "Source Signals",
    "Suggested Search Targets",
    "这些条目只是搜索线索，不是源码事实",
    "Source Hints",
    "package scripts"
  ], "Expected full spec context to include source hints as non-authoritative search targets");

  const checkpoint = await recordSpecCheckpoint({
    projectRoot: root,
    specsDir: "specs",
    file: todo.specs[0],
    summary: "完成用户详情禁用态第一步",
    completedTodos: ["补充禁用态字段"],
    changedFiles: ["src/routes/users.ts", "tests/users.test.ts"],
    verification: [{ command: "npm test", status: "passed", note: "smoke" }],
    behaviorRecords: [{
      scenario: "禁用用户",
      condition: "用户 disabled 为 true",
      result: "不能发起敏感操作",
      defaultBehavior: "未禁用用户保持原流程",
      edgeCase: "缺少禁用态字段时按未禁用处理",
      verification: "npm test",
      relatedFiles: ["src/routes/users.ts", "tests/users.test.ts"]
    }],
    risks: ["禁用态敏感操作仍需后续覆盖"]
  });
  if (!checkpoint.nextSteps.some((step) => step.includes("已勾选 1 个 TODO"))) {
    throw new Error("Expected checkpoint to mark one TODO.");
  }
  const checkpointText = await readFile(path.join(root, todo.specs[0]), "utf8");
  if (!checkpointText.includes("- [x] 补充禁用态字段") || !checkpointText.includes("## Checkpoint") || !checkpointText.includes("### Summary") || !checkpointText.includes("passed `npm test`") || !checkpointText.includes("用户 disabled 为 true") || !checkpointText.includes("不能发起敏感操作") || !checkpointText.includes("| 场景 | 条件 | 结果 | 默认行为 | 边界处理 | 验证 | 关联文件 |")) {
    throw new Error("Expected checkpoint to update TODO and append verification.");
  }

  const reviewResult = await recordSpecReviewResult({
    projectRoot: root,
    specsDir: "specs",
    file: todo.specs[0],
    summary: "完成禁用态第一阶段并留下后续项",
    completedTodos: ["补充禁用态字段"],
    incompleteTodos: ["更新用户详情测试"],
    changedFiles: ["src/routes/users.ts"],
    verification: [{ command: "npm test", status: "passed" }],
    behaviorRecords: [{
      scenario: "默认禁用态",
      condition: "接口未返回禁用态",
      result: "按 false 处理",
      verification: "npm test"
    }],
    blockers: ["测试覆盖待补齐"]
  });
  if (reviewResult.incompleteTodos.length !== 1 || reviewResult.completedTodos.length !== 1) {
    throw new Error("Expected review result to return structured TODO lists.");
  }
  const reviewText = await readFile(path.join(root, todo.specs[0]), "utf8");
  if (!reviewText.includes("## Review Result") || !reviewText.includes("### Incomplete TODOs") || !reviewText.includes("测试覆盖待补齐") || !reviewText.includes("接口未返回禁用态") || !reviewText.includes("按 false 处理")) {
    throw new Error("Expected review result to append structured review output.");
  }

  const done = await markSpecDone({
    projectRoot: root,
    specsDir: "specs",
    file: created.specs[0],
    note: "smoke verified",
    behaviorRecords: [{
      scenario: "权限不足",
      condition: "当前用户没有敏感操作权限",
      result: "返回可理解错误",
      edgeCase: "不产生未声明副作用",
      verification: "npm test",
      relatedFiles: ["src/routes/users.ts"]
    }]
  });
  if (!done.specs[0]?.includes("specs/done")) {
    throw new Error("Expected done spec to move under specs/done.");
  }
  const doneText = await readFile(path.join(root, done.specs[0]), "utf8");
  if (!doneText.includes("- status: done") || !doneText.includes("## 最终行为契约") || !doneText.includes("当前用户没有敏感操作权限") || !doneText.includes("返回可理解错误")) {
    throw new Error("Expected archived spec meta status to be done.");
  }
  const listedAfterDone = await listSpecs({ projectRoot: root, specsDir: "specs" });
  if (listedAfterDone.done[0]?.status !== "done") {
    throw new Error("Expected done spec list status to be done.");
  }

  const originalLog = console.log;
  const versionLines: string[] = [];
  console.log = (...args: unknown[]) => {
    versionLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "--version"]);
  } finally {
    console.log = originalLog;
  }
  if (versionLines[0] !== APP_VERSION) {
    throw new Error(`Expected CLI version output, got: ${versionLines.join(" | ")}`);
  }

  const helpLines: string[] = [];
  console.log = (...args: unknown[]) => {
    helpLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc"]);
  } finally {
    console.log = originalLog;
  }
  if (!helpLines.join("\n").includes("Usage:") || !helpLines.join("\n").includes("specc serve")) {
    throw new Error(`Expected default CLI help output, got: ${helpLines.join(" | ")}`);
  }
  if (!helpLines.join("\n").includes("specc init") || !helpLines.join("\n").includes("specc --version")) {
    throw new Error("Expected CLI help to mention init and version commands.");
  }
  if (!helpLines.join("\n").includes("specc bootstrap")) {
    throw new Error("Expected CLI help to mention bootstrap command.");
  }
  if (!helpLines.join("\n").includes("specc status")) {
    throw new Error("Expected CLI help to mention status command.");
  }
  if (!helpLines.join("\n").includes("specc bootstrap --help")) {
    throw new Error("Expected CLI help to mention bootstrap command help.");
  }
  if (!helpLines.join("\n").includes("specc init --help")) {
    throw new Error("Expected CLI help to mention init command help.");
  }

  const initHelpLines: string[] = [];
  console.log = (...args: unknown[]) => {
    initHelpLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "init", "--help"]);
  } finally {
    console.log = originalLog;
  }
  const initHelpText = initHelpLines.join("\n");
  if (!initHelpText.includes("specc init [options]") || !initHelpText.includes("-h, --help")) {
    throw new Error(`Expected init help to describe options, got: ${initHelpText}`);
  }
  const initHelpWithUnknownLines: string[] = [];
  console.log = (...args: unknown[]) => {
    initHelpWithUnknownLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "init", "--unknown-option", "--help"]);
  } finally {
    console.log = originalLog;
  }
  if (!initHelpWithUnknownLines.join("\n").includes("specc init [options]")) {
    throw new Error("Expected init --help to take priority over unknown option validation.");
  }
  let unknownInitOptionMessage = "";
  try {
    await runCli(["node", "specc", "init", "--unknown-option"]);
  } catch (error) {
    unknownInitOptionMessage = error instanceof Error ? error.message : String(error);
  }
  if (!unknownInitOptionMessage.includes("Unknown option: --unknown-option")) {
    throw new Error(`Expected unknown init option to fail fast, got: ${unknownInitOptionMessage}`);
  }

  const cliStatusEmptyRoot = await mkdtemp(path.join(os.tmpdir(), "spec-coding-cli-status-empty-"));
  const emptyStatusLines: string[] = [];
  console.log = (...args: unknown[]) => {
    emptyStatusLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "status", "--project-root", cliStatusEmptyRoot]);
  } finally {
    console.log = originalLog;
  }
  const emptyStatusText = emptyStatusLines.join("\n");
  if (!emptyStatusText.includes("Version:") || !emptyStatusText.includes("active specs: 0") || !emptyStatusText.includes("open TODOs: 0") || !emptyStatusText.includes("Next Step: Run specc bootstrap")) {
    throw new Error(`Expected empty CLI status to recommend bootstrap, got: ${emptyStatusText}`);
  }
  const emptyStatusJsonLines: string[] = [];
  console.log = (...args: unknown[]) => {
    emptyStatusJsonLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "status", "--project-root", cliStatusEmptyRoot, "--json"]);
  } finally {
    console.log = originalLog;
  }
  const emptyStatusJson = JSON.parse(emptyStatusJsonLines.join("\n")) as {
    schemaVersion: number;
    version: string;
    projectRoot: string;
    workflowState: { active: number; todo: number; review: number; done: number; openTodos: number };
    nextStep: string;
    recommendation: { nextTool: string; alternatives: string[]; arguments: Record<string, string>; reason: string; when: string; afterwards: string };
  };
  if (
    emptyStatusJson.version !== APP_VERSION ||
    emptyStatusJson.schemaVersion !== 1 ||
    emptyStatusJson.workflowState.active !== 0 ||
    emptyStatusJson.workflowState.openTodos !== 0 ||
    !emptyStatusJson.nextStep.includes("specc bootstrap") ||
    emptyStatusJson.recommendation.nextTool !== "spec_bootstrap" ||
    !emptyStatusJson.recommendation.alternatives.includes("spec_todo") ||
    emptyStatusJson.recommendation.arguments.projectRoot !== emptyStatusJson.projectRoot ||
    emptyStatusJson.recommendation.arguments.specsDir !== "specs" ||
    emptyStatusJson.recommendation.arguments.projectKind !== "auto" ||
    !emptyStatusJson.recommendation.when ||
    !emptyStatusJson.recommendation.afterwards
  ) {
    throw new Error(`Expected empty CLI status JSON to recommend bootstrap, got: ${JSON.stringify(emptyStatusJson)}`);
  }
  const doneOnlyRoot = await mkdtemp(path.join(os.tmpdir(), "spec-coding-cli-status-done-"));
  await mkdir(path.join(doneOnlyRoot, "specs", "done"), { recursive: true });
  await writeFile(path.join(doneOnlyRoot, "specs", "done", "finished.md"), "# Finished\n\n## Meta\n\n- status: done\n", "utf8");
  const doneOnlyStatusLines: string[] = [];
  console.log = (...args: unknown[]) => {
    doneOnlyStatusLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "status", "--project-root", doneOnlyRoot]);
  } finally {
    console.log = originalLog;
  }
  const doneOnlyStatusText = doneOnlyStatusLines.join("\n");
  if (!doneOnlyStatusText.includes("done specs: 1") || !doneOnlyStatusText.includes("No open work items") || doneOnlyStatusText.includes("Run specc bootstrap")) {
    throw new Error(`Expected done-only CLI status to recommend creating new work, got: ${doneOnlyStatusText}`);
  }
  const doneOnlyStatusJsonLines: string[] = [];
  console.log = (...args: unknown[]) => {
    doneOnlyStatusJsonLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "status", "--project-root", doneOnlyRoot, "--json"]);
  } finally {
    console.log = originalLog;
  }
  const doneOnlyStatusJson = JSON.parse(doneOnlyStatusJsonLines.join("\n")) as {
    schemaVersion: number;
    workflowState: { active: number; todo: number; review: number; done: number; openTodos: number };
    nextStep: string;
    recommendation: { nextTool: string; alternatives: string[]; arguments: Record<string, string>; reason: string; when: string; afterwards: string };
  };
  if (
    doneOnlyStatusJson.workflowState.done !== 1 ||
    doneOnlyStatusJson.schemaVersion !== 1 ||
    !doneOnlyStatusJson.nextStep.includes("No open work items") ||
    doneOnlyStatusJson.nextStep.includes("specc bootstrap") ||
    doneOnlyStatusJson.recommendation.nextTool !== "spec_todo" ||
    !doneOnlyStatusJson.recommendation.alternatives.includes("spec_create") ||
    doneOnlyStatusJson.recommendation.arguments.projectRoot !== doneOnlyRoot ||
    doneOnlyStatusJson.recommendation.arguments.specsDir !== "specs" ||
    !doneOnlyStatusJson.recommendation.arguments.prompt ||
    !doneOnlyStatusJson.recommendation.arguments.title ||
    !doneOnlyStatusJson.recommendation.when ||
    !doneOnlyStatusJson.recommendation.afterwards
  ) {
    throw new Error(`Expected done-only CLI status JSON to recommend creating new work, got: ${JSON.stringify(doneOnlyStatusJson)}`);
  }
  await rm(doneOnlyRoot, { recursive: true, force: true });

  const reviewOnlyStatusRoot = await mkdtemp(path.join(os.tmpdir(), "spec-coding-cli-status-review-"));
  const reviewSpecPath = path.join(reviewOnlyStatusRoot, "specs", "review", "source-inventory.md");
  await mkdir(path.dirname(reviewSpecPath), { recursive: true });
  await writeFile(reviewSpecPath, "# Source Inventory\n\n## Meta\n\n- status: review\n", "utf8");
  const reviewOnlyStatusJsonLines: string[] = [];
  console.log = (...args: unknown[]) => {
    reviewOnlyStatusJsonLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "status", "--project-root", reviewOnlyStatusRoot, "--json"]);
  } finally {
    console.log = originalLog;
  }
  const reviewOnlyStatusJson = JSON.parse(reviewOnlyStatusJsonLines.join("\n")) as {
    workflowState: { review: number; openTodos: number };
    recommendation: { nextTool: string; arguments: Record<string, string>; when: string; afterwards: string };
  };
  if (
    reviewOnlyStatusJson.workflowState.review !== 1 ||
    reviewOnlyStatusJson.workflowState.openTodos !== 0 ||
    reviewOnlyStatusJson.recommendation.nextTool !== "spec_context" ||
    reviewOnlyStatusJson.recommendation.arguments.files !== "specs/review/source-inventory.md" ||
    !reviewOnlyStatusJson.recommendation.when ||
    !reviewOnlyStatusJson.recommendation.afterwards
  ) {
    throw new Error(`Expected review-only CLI status JSON to use the real review spec path, got: ${JSON.stringify(reviewOnlyStatusJson)}`);
  }
  await rm(reviewOnlyStatusRoot, { recursive: true, force: true });

  const statusHelpLines: string[] = [];
  console.log = (...args: unknown[]) => {
    statusHelpLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "status", "--project-root", cliStatusEmptyRoot, "--json", "--help"]);
  } finally {
    console.log = originalLog;
  }
  const statusHelpText = statusHelpLines.join("\n");
  if (!statusHelpText.includes("specc status [options]") || !statusHelpText.includes("--specs-dir <path>") || !statusHelpText.includes("--json")) {
    throw new Error(`Expected status help to describe options, got: ${statusHelpText}`);
  }
  let unknownStatusOptionMessage = "";
  try {
    await runCli(["node", "specc", "status", "--project-rooot", cliStatusEmptyRoot]);
  } catch (error) {
    unknownStatusOptionMessage = error instanceof Error ? error.message : String(error);
  }
  if (!unknownStatusOptionMessage.includes("Unknown option: --project-rooot")) {
    throw new Error(`Expected unknown status option to fail fast, got: ${unknownStatusOptionMessage}`);
  }
  await rm(cliStatusEmptyRoot, { recursive: true, force: true });

  const cliBootstrapHelpRoot = await mkdtemp(path.join(os.tmpdir(), "spec-coding-cli-bootstrap-help-"));
  const bootstrapHelpLines: string[] = [];
  console.log = (...args: unknown[]) => {
    bootstrapHelpLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "bootstrap", "--project-root", cliBootstrapHelpRoot, "--help"]);
  } finally {
    console.log = originalLog;
  }
  const bootstrapHelpText = bootstrapHelpLines.join("\n");
  if (!bootstrapHelpText.includes("specc bootstrap [options]") || !bootstrapHelpText.includes("--project-kind <kind>") || !bootstrapHelpText.includes("Default: auto")) {
    throw new Error(`Expected bootstrap help to describe options and defaults, got: ${bootstrapHelpText}`);
  }
  const bootstrapHelpSpecs = await listSpecs({ projectRoot: cliBootstrapHelpRoot, specsDir: "specs" });
  if (bootstrapHelpSpecs.active.length || bootstrapHelpSpecs.todo.length || bootstrapHelpSpecs.review.length || bootstrapHelpSpecs.done.length) {
    throw new Error("Expected bootstrap --help to avoid writing spec files.");
  }
  const bootstrapHelpWithUnknownLines: string[] = [];
  console.log = (...args: unknown[]) => {
    bootstrapHelpWithUnknownLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "bootstrap", "--unknown-option", "--help"]);
  } finally {
    console.log = originalLog;
  }
  if (!bootstrapHelpWithUnknownLines.join("\n").includes("specc bootstrap [options]")) {
    throw new Error("Expected bootstrap --help to take priority over unknown option validation.");
  }
  await rm(cliBootstrapHelpRoot, { recursive: true, force: true });

  const cliBootstrapRoot = await mkdtemp(path.join(os.tmpdir(), "spec-coding-cli-bootstrap-"));
  const bootstrapLines: string[] = [];
  console.log = (...args: unknown[]) => {
    bootstrapLines.push(args.map(String).join(" "));
  };
  try {
    await runCli([
      "node",
      "specc",
      "bootstrap",
      "--project-root",
      cliBootstrapRoot,
      "--project-kind",
      "new",
      "--initial-prompt",
      "创建 CLI 引导测试项目。"
    ]);
  } finally {
    console.log = originalLog;
  }
  const cliAgentsText = await readFile(path.join(cliBootstrapRoot, "AGENTS.md"), "utf8");
  const cliSpecs = await listSpecs({ projectRoot: cliBootstrapRoot, specsDir: "specs" });
  if (!bootstrapLines.join("\n").includes("Spec Coding 项目引导完成") || !cliAgentsText.includes("Current Task Protocol") || cliSpecs.active.length !== 1) {
    throw new Error("Expected CLI bootstrap to generate AGENTS.md and a starter active spec.");
  }
  const activeStatusLines: string[] = [];
  console.log = (...args: unknown[]) => {
    activeStatusLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "status", "--project-root", cliBootstrapRoot]);
  } finally {
    console.log = originalLog;
  }
  const activeStatusText = activeStatusLines.join("\n");
  if (!activeStatusText.includes("active specs: 1") || !activeStatusText.includes("open TODOs:") || !activeStatusText.includes("Next Step: Call spec_context and execute open TODOs in order")) {
    throw new Error(`Expected active CLI status to recommend open TODO execution, got: ${activeStatusText}`);
  }
  const activeStatusJsonLines: string[] = [];
  console.log = (...args: unknown[]) => {
    activeStatusJsonLines.push(args.map(String).join(" "));
  };
  try {
    await runCli(["node", "specc", "status", "--project-root", cliBootstrapRoot, "--json"]);
  } finally {
    console.log = originalLog;
  }
  const activeStatusJson = JSON.parse(activeStatusJsonLines.join("\n")) as {
    schemaVersion: number;
    workflowState: { active: number; openTodos: number };
    nextStep: string;
    recommendation: { nextTool: string; alternatives: string[]; arguments: Record<string, string>; reason: string; when: string; afterwards: string };
  };
  if (
    activeStatusJson.workflowState.active !== 1 ||
    activeStatusJson.schemaVersion !== 1 ||
    activeStatusJson.workflowState.openTodos < 1 ||
    !activeStatusJson.nextStep.includes("open TODOs") ||
    activeStatusJson.recommendation.nextTool !== "spec_context" ||
    activeStatusJson.recommendation.alternatives.length !== 0 ||
    activeStatusJson.recommendation.arguments.projectRoot !== cliBootstrapRoot ||
    activeStatusJson.recommendation.arguments.specsDir !== "specs" ||
    !activeStatusJson.recommendation.when ||
    !activeStatusJson.recommendation.afterwards
  ) {
    throw new Error(`Expected active CLI status JSON to recommend open TODO execution, got: ${JSON.stringify(activeStatusJson)}`);
  }
  await rm(cliBootstrapRoot, { recursive: true, force: true });

  let invalidProjectKindMessage = "";
  try {
    await runCli(["node", "specc", "bootstrap", "--project-kind", "legacy"]);
  } catch (error) {
    invalidProjectKindMessage = error instanceof Error ? error.message : String(error);
  }
  if (!invalidProjectKindMessage.includes("--project-kind must be one of: auto, new, existing")) {
    throw new Error(`Expected invalid project kind to fail fast, got: ${invalidProjectKindMessage}`);
  }
  let unknownBootstrapOptionMessage = "";
  try {
    await runCli(["node", "specc", "bootstrap", "--project-rooot", cliBootstrapRoot]);
  } catch (error) {
    unknownBootstrapOptionMessage = error instanceof Error ? error.message : String(error);
  }
  if (!unknownBootstrapOptionMessage.includes("Unknown option: --project-rooot")) {
    throw new Error(`Expected unknown bootstrap option to fail fast, got: ${unknownBootstrapOptionMessage}`);
  }

  const expectedServer = { command: process.execPath, args: [path.resolve("dist", "index.js"), "serve"] };
  const codexConfig = upsertCodexConfig("[model]\nname = \"gpt-5\"\n", expectedServer);
  if (!codexConfig.includes("[mcp_servers.spec-coding]") || !codexConfig.includes(process.execPath.replace(/\\/g, "\\\\"))) {
    throw new Error("Expected Codex config upsert to add spec-coding MCP server.");
  }
  const opencodeConfig = JSON.parse(upsertOpenCodeConfig("{}", expectedServer));
  if (opencodeConfig.mcp["spec-coding"].type !== "local" || opencodeConfig.mcp["spec-coding"].command[0] !== process.execPath) {
    throw new Error("Expected OpenCode config upsert to add spec-coding MCP server.");
  }
  const registeredClaude = await registerClaude(expectedServer, true);
  if (registeredClaude.tool !== "claude" || registeredClaude.status !== "registered") {
    throw new Error("Expected Claude registration helper to stay available after registry refactor.");
  }
  const whereOutput = await new Promise<string>((resolve, reject) => {
    execFile("where.exe", ["claude"], { windowsHide: true }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.toString());
    });
  }).catch(() => "");
  if (whereOutput && !whereOutput.toLowerCase().includes("claude")) {
    throw new Error("Expected where.exe claude to resolve a Claude command path.");
  }

  const registryRoot = await mkdtemp(path.join(os.tmpdir(), "spec-coding-registry-"));
  try {
    const detected = await detectProgrammingTools({
      homeDir: registryRoot,
      codexConfig: path.join(registryRoot, ".codex", "config.toml"),
      opencodeConfig: path.join(registryRoot, ".config", "opencode", "opencode.json"),
      cursorConfig: path.join(registryRoot, ".cursor", "mcp.json"),
      continueConfig: path.join(registryRoot, ".continue", "config.yaml"),
      windsurfConfig: path.join(registryRoot, ".codeium", "mcp_config.json")
    });
    if (detected.length !== 6) {
      throw new Error("Expected six detectable tools.");
    }

    const registryPaths = {
      homeDir: registryRoot,
      codexConfig: path.join(registryRoot, ".codex", "config.toml"),
      opencodeConfig: path.join(registryRoot, ".config", "opencode", "opencode.json"),
      cursorConfig: path.join(registryRoot, ".cursor", "mcp.json"),
      continueConfig: path.join(registryRoot, ".continue", "config.yaml"),
      windsurfConfig: path.join(registryRoot, ".codeium", "mcp_config.json")
    };
    const codexResult = await registerCodex(registryPaths, expectedServer);
    const openCodeResult = await registerOpenCode(registryPaths, expectedServer);
    const cursorResult = await registerCursor(registryPaths, expectedServer);
    const continueResult = await registerContinue(registryPaths, expectedServer);
    const windsurfResult = await registerWindsurf(registryPaths, expectedServer);
    if ([codexResult, openCodeResult, cursorResult, continueResult, windsurfResult].some((result) => result.status !== "registered")) {
      throw new Error("Expected registry writes to succeed.");
    }
  } finally {
    await rm(registryRoot, { recursive: true, force: true });
  }

  console.log("spec-coding MCP smoke test passed");
} finally {
  await rm(root, { recursive: true, force: true });
}
