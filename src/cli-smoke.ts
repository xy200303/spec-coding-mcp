import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createModelContext } from "./context.js";
import { initProject, markProjectSynced, planImplementation, scanProject } from "./core.js";
import { generateSpecsFromPrompt, generateSpecsFromSource } from "./generator.js";

const root = await mkdtemp(path.join(os.tmpdir(), "docs-is-code-mcp-"));
const promptRoot = await mkdtemp(path.join(os.tmpdir(), "docs-is-code-prompt-"));
const sourceRoot = await mkdtemp(path.join(os.tmpdir(), "docs-is-code-source-"));

try {
  await initProject(root);
  await mkdir(path.join(root, "docs", "features"), { recursive: true });
  await writeFile(
    path.join(root, "docs", "features", "billing.md"),
    [
      "# 网关计费",
      "",
      "## 支付超时",
      "",
      "- 网关超时时不能扣款。",
      "- 前端展示支付处理中。"
    ].join("\n"),
    "utf8"
  );
  const scan = await scanProject(root);
  if (scan.changes.length === 0) {
    throw new Error("Expected document changes after writing feature docs.");
  }
  const plan = await planImplementation(root, "docs", false);
  if (typeof plan.markdown !== "string" || !plan.markdown.includes("支付超时")) {
    throw new Error("Expected implementation plan to mention changed docs.");
  }
  const context = await createModelContext({ projectRoot: root, docsDir: "docs" });
  if (!context.markdown.includes("Changed Blocks Full Text") || context.changeCount === 0) {
    throw new Error("Expected model context to include changed block text.");
  }
  await markProjectSynced(root);
  const after = await scanProject(root);
  if (after.changes.length !== 0) {
    throw new Error(`Expected no changes after mark synced, got ${after.changes.length}.`);
  }

  const promptResult = await generateSpecsFromPrompt({
    projectRoot: promptRoot,
    docsDir: "docs",
    projectName: "网关系统",
    prompt: "网关计费需要支持支付超时、失败不扣款、前端展示处理中，并生成接口和前端测试要求。"
  });
  if (!promptResult.featureDocs.some((file) => file.includes("billing"))) {
    throw new Error("Expected prompt generation to create a billing feature doc.");
  }
  const promptContext = await createModelContext({ projectRoot: promptRoot, docsDir: "docs", maxBlocks: 50 });
  if (!promptContext.markdown.includes("计费与支付")) {
    throw new Error("Expected model context to include prompt-generated feature docs.");
  }

  await mkdir(path.join(sourceRoot, "src", "routes"), { recursive: true });
  await mkdir(path.join(sourceRoot, "src", "components"), { recursive: true });
  await mkdir(path.join(sourceRoot, "tests"), { recursive: true });
  await writeFile(
    path.join(sourceRoot, "package.json"),
    JSON.stringify({ name: "source-demo", scripts: { test: "node --test" } }, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(sourceRoot, "src", "routes", "users.ts"),
    [
      "import { Router } from 'express';",
      "export const router = Router();",
      "router.get('/users/:id', async (req, res) => res.json({ id: req.params.id }));"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(sourceRoot, "src", "components", "UserProfile.tsx"),
    "export function UserProfile() { return <section>User</section>; }\n",
    "utf8"
  );
  await writeFile(path.join(sourceRoot, "tests", "users.test.ts"), "test('users route', () => {});\n", "utf8");
  const sourceResult = await generateSpecsFromSource({
    projectRoot: sourceRoot,
    docsDir: "docs",
    projectName: "用户系统"
  });
  if (sourceResult.source.routeHints.length === 0) {
    throw new Error("Expected source generation to detect route hints.");
  }
  const sourceScan = await scanProject(sourceRoot, "docs");
  if (sourceScan.changes.length === 0) {
    throw new Error("Expected source-generated docs to be pending implementation.");
  }
  console.log("docs-is-code MCP smoke test passed");
} finally {
  await rm(root, { recursive: true, force: true });
  await rm(promptRoot, { recursive: true, force: true });
  await rm(sourceRoot, { recursive: true, force: true });
}
