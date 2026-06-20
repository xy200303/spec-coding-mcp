/* CLI entrypoint for starting the MCP server and registering it with coding tools. */
import { fileURLToPath } from "node:url";
import { runBootstrap } from "./command-bootstrap.js";
import { runInit } from "./command-init.js";
import { runStatus } from "./command-status.js";
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
