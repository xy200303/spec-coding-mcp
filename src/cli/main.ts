/* CLI entrypoint for starting the MCP server and registering it with coding tools. */
import { cancel, intro, isCancel, multiselect, note, outro, spinner } from "@clack/prompts";
import { fileURLToPath } from "node:url";
import { bootstrapProject, listSpecs } from "../spec/scaffold.js";
import { renderSpecResult } from "../mcp/render-spec.js";
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

function printBootstrapHelp(): void {
  console.log([
    `${APP_NAME} bootstrap`,
    "",
    "Usage:",
    "  specc bootstrap [options]",
    "",
    "Options:",
    "  --project-root <path>       Project root. Default: current working directory.",
    "  --specs-dir <path>          Specs directory. Default: specs.",
    "  --project-name <name>       Project display name. Default: inferred from project root.",
    "  --project-kind <kind>       auto, new, or existing. Default: auto.",
    "  --initial-prompt <text>     Starter prompt for new projects.",
    "  --overwrite                 Overwrite existing generated files.",
    "  -h, --help                  Show bootstrap help."
  ].join("\n"));
}

function printStatusHelp(): void {
  console.log([
    `${APP_NAME} status`,
    "",
    "Usage:",
    "  specc status [options]",
    "",
    "Options:",
    "  --project-root <path>       Project root. Default: current working directory.",
    "  --specs-dir <path>          Specs directory. Default: specs.",
    "  -h, --help                  Show status help."
  ].join("\n"));
}

function optionValue(args: string[], name: string): string | undefined {
  const equalsPrefix = `${name}=`;
  const inlineValue = args.find((arg) => arg.startsWith(equalsPrefix));
  if (inlineValue) return inlineValue.slice(equalsPrefix.length);

  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function projectKindFromArgs(args: string[]): "auto" | "new" | "existing" {
  const value = optionValue(args, "--project-kind") ?? "auto";
  if (value === "auto" || value === "new" || value === "existing") return value;
  throw new Error("--project-kind must be one of: auto, new, existing");
}

async function runBootstrap(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printBootstrapHelp();
    return;
  }

  const projectRoot = optionValue(args, "--project-root") ?? process.cwd();
  const specsDir = optionValue(args, "--specs-dir") ?? "specs";
  const projectName = optionValue(args, "--project-name");
  const initialPrompt = optionValue(args, "--initial-prompt");
  const overwrite = hasFlag(args, "--overwrite");
  const projectKind = projectKindFromArgs(args);
  const result = await bootstrapProject({
    projectRoot,
    specsDir,
    projectName,
    projectKind,
    initialPrompt,
    overwrite
  });

  console.log(renderSpecResult("Spec Coding 项目引导完成", result));
}

function statusNextStep(input: { active: number; todo: number; review: number }): string {
  if (input.active || input.todo || input.review) {
    return "Call spec_context in your AI tool before changing code or docs.";
  }
  return "Run specc bootstrap --project-root <path> --project-kind auto.";
}

async function runStatus(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printStatusHelp();
    return;
  }

  const projectRoot = optionValue(args, "--project-root") ?? process.cwd();
  const specsDir = optionValue(args, "--specs-dir") ?? "specs";
  const specs = await listSpecs({ projectRoot, specsDir });
  console.log([
    `${APP_NAME} status`,
    "",
    `Version: ${APP_VERSION}`,
    `Project: ${specs.projectRoot}`,
    `Specs: ${specs.specsDir}`,
    "",
    "Workflow State:",
    `  active specs: ${specs.active.length}`,
    `  todo specs: ${specs.todo.length}`,
    `  review specs: ${specs.review.length}`,
    `  done specs: ${specs.done.length}`,
    "",
    `Next Step: ${statusNextStep({ active: specs.active.length, todo: specs.todo.length, review: specs.review.length })}`
  ].join("\n"));
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
