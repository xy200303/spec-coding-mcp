/* Stable CLI, MCP, and registry compatibility contract for release checks. */
import type { ToolId } from "./registry-types.js";

export const SUPPORTED_TOOL_IDS: ToolId[] = ["codex", "claude", "opencode", "cursor", "continue", "windsurf"];

export const CLI_HELP_LINES = [
  "specc              Show help",
  "specc serve        Start the MCP server over stdio",
  "specc status       Show local version and spec workflow state",
  "specc bootstrap    Create AGENTS, specs, and the first workflow entrypoint",
  "specc bootstrap --help  Show bootstrap options",
  "specc init         Register this MCP server with AI coding tools",
  "specc --version    Print the CLI version",
  "specc --help       Show help"
];

export const MCP_SERVER_NAME = "spec-coding";
export const MCP_DIST_ENTRY = "dist/index.js";
export const MCP_START_COMMAND = "serve";
