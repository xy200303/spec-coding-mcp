/* CLI entrypoint for starting the MCP server and registering it with coding tools. */
import { cancel, intro, isCancel, multiselect, note, outro, spinner } from "@clack/prompts";
import { fileURLToPath } from "node:url";
import { runBootstrap } from "./command-bootstrap.js";
import { runStatus } from "./command-status.js";
import { detectProgrammingTools } from "./registry-detect.js";
import { registerClaude, registerCodex, registerContinue, registerCursor, registerOpenCode, registerWindsurf } from "./registry-write.js";
import type { RegisterResult, ToolId } from "./registry-types.js";
import { CLI_HELP_LINES } from "./compatibility-contract.js";
import { serveStdio } from "../server.js";
import { APP_NAME, APP_VERSION } from "../shared/meta.js";

function printHelp(): void {
  console.log([
    `${APP_NAME} - Spec Coding MCP`,
    "",
    "Usage:",
    ...CLI_HELP_LINES.map((line) => `  ${line}`)
  ].join("\n"));
}

function printVersion(): void {
  console.log(APP_VERSION);
}

async function runInit(): Promise<void> {
  intro("Spec Coding MCP");
  const scan = spinner();
  scan.start("Scanning installed coding tools");
  const tools = await detectProgrammingTools();
  scan.stop("Detected coding tools");

  const selected = await multiselect<ToolId>({
    message: "Install Spec Coding MCP for which tools?",
    required: true,
    options: tools.map((tool) => ({
      value: tool.id,
      label: `${tool.label}${tool.detected ? "" : " (not detected)"}`,
      hint: tool.reason
    })),
    initialValues: tools.filter((tool) => tool.detected).map((tool) => tool.id)
  });

  if (isCancel(selected)) {
    cancel("Init cancelled");
    return;
  }

  const installing = spinner();
  installing.start("Registering MCP server");
  const results = await registerSelectedTools(selected);
  installing.stop("Registration complete");

  note(
    results.map((result) => {
      const suffix = result.path ? `\n  ${result.path}` : "";
      return `${result.tool}: ${result.status} - ${result.detail}${suffix}`;
    }).join("\n\n"),
    "Result"
  );
  outro("Restart the selected tools so they can load the new MCP server.");
}

async function registerSelectedTools(tools: ToolId[]): Promise<RegisterResult[]> {
  const results: RegisterResult[] = [];
  for (const tool of tools) {
    const result = await registerTool(tool);
    results.push(result);
  }
  return results;
}

async function registerTool(tool: ToolId): Promise<RegisterResult> {
  switch (tool) {
    case "codex":
      return registerCodex(undefined, undefined);
    case "claude":
      return registerClaude(undefined);
    case "opencode":
      return registerOpenCode(undefined, undefined);
    case "cursor":
      return registerCursor(undefined, undefined);
    case "continue":
      return registerContinue(undefined, undefined);
    case "windsurf":
      return registerWindsurf(undefined, undefined);
  }
}

export async function runCli(argv = process.argv): Promise<void> {
  const command = argv[2];
  if (!command || command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }
  if (command === "--version" || command === "-v" || command === "version") {
    printVersion();
    return;
  }
  if (command === "init") {
    await runInit();
    return;
  }
  if (command === "status") {
    await runStatus(argv.slice(3));
    return;
  }
  if (command === "bootstrap") {
    await runBootstrap(argv.slice(3));
    return;
  }
  if (command === "serve") {
    await serveStdio();
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntry) {
  runCli(process.argv).catch((error) => {
    console.error("specc fatal error:", error);
    process.exit(1);
  });
}
