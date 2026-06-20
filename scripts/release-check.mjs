/* Release readiness checks for version, CLI, MCP, and documentation contracts. */
import { existsSync, readFileSync } from "node:fs";

function readText(file) {
  return readFileSync(file, "utf8");
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(text, expected, file) {
  assert(text.includes(expected), `${file} is missing: ${expected}`);
}

function assertVersionContract(packageJson, packageLock, metaText) {
  assertIncludes(metaText, "APP_VERSION = packageJson.version", "src/shared/meta.ts");
  assert(!/APP_VERSION\s*=\s*\"[^\"]+\"/.test(metaText), "APP_VERSION must read package.json instead of hardcoding a second version.");
  assert(packageLock.version === packageJson.version, "package-lock.json root version must match package.json.");
  assert(packageLock.packages?.[""]?.version === packageJson.version, "package-lock package version must match package.json.");
}

function assertScriptContract(packageJson) {
  const scripts = packageJson.scripts ?? {};
  assert(scripts["release:check"] === "bun scripts/release-check.mjs", "package.json must expose release:check.");
  assert(scripts["release:manual"] === "node scripts/release-manual.mjs", "package.json must expose release:manual.");
  assert(scripts.verify === "npm run build && npm run unit && npm run smoke && npm run release:check", "package.json verify must run build, unit, smoke, and release:check.");
  assert(scripts.test === "npm run verify", "package.json test must delegate to verify.");
  assert(scripts.prepack === "npm run verify", "package.json prepack must run verify.");
}

function assertCompatibilityContract(text) {
  assertIncludes(text, "MCP_SERVER_NAME = \"spec-coding\"", "src/cli/compatibility-contract.ts");
  assertIncludes(text, "MCP_DIST_ENTRY = \"dist/index.js\"", "src/cli/compatibility-contract.ts");
  assertIncludes(text, "MCP_START_COMMAND = \"serve\"", "src/cli/compatibility-contract.ts");
  for (const tool of ["codex", "claude", "opencode", "cursor", "continue", "windsurf"]) {
    assertIncludes(text, `"${tool}"`, "src/cli/compatibility-contract.ts");
  }
}

function assertDocumentationContract(readmeText, agentsText) {
  for (const phrase of [
    "specc serve",
    "specc status",
    "specc status --project-root . --json",
    "schemaVersion",
    "recommendation.nextTool",
    "recommendation.alternatives",
    "recommendation.arguments",
    "recommendation.reason",
    "recommendation.when",
    "recommendation.afterwards",
    "nextStep",
    "open TODO",
    "specc bootstrap",
    "specc bootstrap --help",
    "specc init --help",
    "--project-kind",
    "node dist/index.js serve",
    "Current Task Protocol",
    "src/templates/prompt-protocol.ts",
    "Recommended Next Step",
    "Workflow State",
    "空任务状态优先推荐 `spec_bootstrap`",
    "当前 Spec Coding MCP 版本号",
    "可安全推导的上下文值",
    "不替模型编造 prompt、title 或行为记录",
    "npm run release:check",
    "npm run release:manual",
    "npm run verify",
    "npm version",
    "git tag v",
    "git push origin v"
  ]) {
    assertIncludes(readmeText, phrase, "README.md");
  }
  for (const phrase of ["Hard Rules", "Recommended Practices", "Business Confirmation Rules", "Current Task Protocol"]) {
    assertIncludes(agentsText, phrase, "AGENTS.md");
  }
}

function assertWorkflowContract(ciText, publishText) {
  assertIncludes(ciText, "uses: oven-sh/setup-bun@v2", ".github/workflows/ci.yml");
  assertIncludes(ciText, "run: npm run verify", ".github/workflows/ci.yml");
  assertIncludes(ciText, "run: npm pack --dry-run", ".github/workflows/ci.yml");
  assertIncludes(publishText, "uses: oven-sh/setup-bun@v2", ".github/workflows/publish-npm.yml");
  assertIncludes(publishText, "run: npm run verify", ".github/workflows/publish-npm.yml");
  assertIncludes(publishText, "NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}", ".github/workflows/publish-npm.yml");
  assertIncludes(publishText, "npm publish --access public", ".github/workflows/publish-npm.yml");
  assert(!publishText.includes("--provenance"), "publish workflow must use NPM_TOKEN only, without provenance/OIDC publishing.");
  assert(!publishText.includes("run: npm run smoke"), "publish workflow must use verify instead of a partial smoke-only check.");
  assert(!existsSync(".github/workflows/prepare-npm-release.yml"), "prepare-npm-release workflow must stay removed; publish is triggered by pushed tags.");
}

function assertReadToolSourceContract(contextMarkdownText, registerReadToolsText, workflowNextStepText) {
  assertIncludes(contextMarkdownText, "APP_VERSION", "src/spec/context-markdown.ts");
  assertIncludes(contextMarkdownText, "workflowStateLines", "src/spec/context-markdown.ts");
  assertIncludes(contextMarkdownText, "projectRoot: input.root", "src/spec/context-markdown.ts");
  assertIncludes(contextMarkdownText, "specsDir: input.specsDir", "src/spec/context-markdown.ts");
  assertIncludes(registerReadToolsText, "workflowStateLines", "src/mcp/register-read-tools.ts");
  assertIncludes(registerReadToolsText, "projectRoot,", "src/mcp/register-read-tools.ts");
  assertIncludes(registerReadToolsText, "specsDir,", "src/mcp/register-read-tools.ts");
  assertIncludes(workflowNextStepText, "projectRoot: string", "src/spec/workflow-next-step.ts");
  assertIncludes(workflowNextStepText, "specsDir: string", "src/spec/workflow-next-step.ts");
  assertIncludes(workflowNextStepText, "projectArguments(state)", "src/spec/workflow-next-step.ts");
  assertIncludes(workflowNextStepText, "currentWorkFile(state", "src/spec/workflow-next-step.ts");
}

function assertManualReleaseContract(manualReleaseText) {
  assertIncludes(manualReleaseText, "Usage: npm run release:manual -- <version>", "scripts/release-manual.mjs");
  assertIncludes(manualReleaseText, "Worktree is not clean", "scripts/release-manual.mjs");
  assertIncludes(manualReleaseText, "\"version\", version, \"--no-git-tag-version\"", "scripts/release-manual.mjs");
  assertIncludes(manualReleaseText, "\"install\", \"--package-lock-only\", \"--ignore-scripts\"", "scripts/release-manual.mjs");
  assertIncludes(manualReleaseText, "\"run\", \"verify\"", "scripts/release-manual.mjs");
  assertIncludes(manualReleaseText, "\"pack\", \"--dry-run\"", "scripts/release-manual.mjs");
  assertIncludes(manualReleaseText, "\"push\", \"origin\", tag", "scripts/release-manual.mjs");
}

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const metaText = readText("src/shared/meta.ts");
const compatibilityText = readText("src/cli/compatibility-contract.ts");
const readmeText = readText("README.md");
const agentsText = readText("AGENTS.md");
const contextMarkdownText = readText("src/spec/context-markdown.ts");
const registerReadToolsText = readText("src/mcp/register-read-tools.ts");
const workflowNextStepText = readText("src/spec/workflow-next-step.ts");
const manualReleaseText = readText("scripts/release-manual.mjs");
const ciText = readText(".github/workflows/ci.yml");
const publishText = readText(".github/workflows/publish-npm.yml");

assertVersionContract(packageJson, packageLock, metaText);
assertScriptContract(packageJson);
assertCompatibilityContract(compatibilityText);
assertDocumentationContract(readmeText, agentsText);
assertReadToolSourceContract(contextMarkdownText, registerReadToolsText, workflowNextStepText);
assertManualReleaseContract(manualReleaseText);
assertWorkflowContract(ciText, publishText);

console.log("spec-coding release checks passed");
