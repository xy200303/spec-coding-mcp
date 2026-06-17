import { cancel, intro, isCancel, multiselect, note, outro, spinner } from "@clack/prompts";
import { fileURLToPath } from "node:url";
import { detectProgrammingTools, registerTools, type ToolId } from "./registry.js";
import { serveStdio } from "../server.js";

function printHelp(): void {
  console.log([
    "dic",
    "",
    "Usage:",
    "  dic              Start the MCP server over stdio",
    "  dic serve        Start the MCP server over stdio",
    "  dic init         Register this MCP server with AI coding tools",
    "  dic --help       Show help"
  ].join("\n"));
}

async function runInit(): Promise<void> {
  intro("Docs-Is-Code MCP");
  const scan = spinner();
  scan.start("Scanning installed coding tools");
  const tools = await detectProgrammingTools();
  scan.stop("Detected coding tools");

  const selected = await multiselect<ToolId>({
    message: "Install Docs-Is-Code MCP for which tools?",
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
  if (!command || command === "serve") {
    await serveStdio();
    return;
  }
  if (command === "init") {
    await runInit();
    return;
  }
  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntry) {
  runCli(process.argv).catch((error) => {
    console.error("dic fatal error:", error);
    process.exit(1);
  });
}
