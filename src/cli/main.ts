import { cancel, intro, isCancel, multiselect, note, outro, spinner } from "@clack/prompts";
import { fileURLToPath } from "node:url";
import { detectProgrammingTools, registerTools, type ToolId } from "./registry.js";
import { serveStdio } from "../server.js";

const VERSION = "0.2.0";

function printHelp(): void {
  console.log([
    "specc - Spec Coding MCP",
    "",
    "Usage:",
    "  specc              Start the MCP server over stdio",
    "  specc serve        Start the MCP server over stdio",
    "  specc init         Register this MCP server with AI coding tools",
    "  specc --version    Print the CLI version",
    "  specc --help       Show help"
  ].join("\n"));
}

function printVersion(): void {
  console.log(VERSION);
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
  const results = await registerTools({ tools: selected });
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
