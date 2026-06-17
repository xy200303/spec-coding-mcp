import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { ensureDir, pathExists } from "../shared/utils.js";

const execFileAsync = promisify(execFile);
const SERVER_NAME = "docs-is-code";
const DEFAULT_COMMAND = "dic";
const DEFAULT_ARGS = ["serve"];

export type ToolId = "codex" | "claude" | "opencode";

export interface ToolInfo {
  id: ToolId;
  label: string;
  detected: boolean;
  reason: string;
}

export interface RegistryPaths {
  homeDir?: string;
  codexConfig?: string;
  opencodeConfig?: string;
}

export interface ServerCommand {
  command: string;
  args: string[];
}

export interface RegisterOptions {
  tools: ToolId[];
  paths?: RegistryPaths;
  server?: ServerCommand;
  dryRun?: boolean;
}

export interface RegisterResult {
  tool: ToolId;
  status: "registered" | "skipped" | "failed";
  detail: string;
  path?: string;
}

function homeDir(paths?: RegistryPaths): string {
  return paths?.homeDir ?? os.homedir();
}

export function codexConfigPath(paths?: RegistryPaths): string {
  return paths?.codexConfig ?? path.join(homeDir(paths), ".codex", "config.toml");
}

export function opencodeConfigPath(paths?: RegistryPaths): string {
  const home = homeDir(paths);
  return paths?.opencodeConfig ?? (
    process.platform === "win32"
      ? path.join(process.env.APPDATA ?? path.join(home, "AppData", "Roaming"), "opencode", "opencode.json")
      : path.join(home, ".config", "opencode", "opencode.json")
  );
}

async function commandExists(command: string): Promise<boolean> {
  const checker = process.platform === "win32" ? "where.exe" : "sh";
  const args = process.platform === "win32" ? [command] : ["-c", `command -v ${JSON.stringify(command)}`];
  try {
    await execFileAsync(checker, args, { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function detectCodex(paths?: RegistryPaths): Promise<ToolInfo> {
  if (await commandExists("codex")) {
    return { id: "codex", label: "Codex", detected: true, reason: "detected codex command" };
  }
  if (await pathExists(codexConfigPath(paths))) {
    return { id: "codex", label: "Codex", detected: true, reason: "found ~/.codex/config.toml" };
  }
  return { id: "codex", label: "Codex", detected: false, reason: "codex command/config not found" };
}

async function detectClaude(): Promise<ToolInfo> {
  return (await commandExists("claude"))
    ? { id: "claude", label: "Claude Code", detected: true, reason: "detected claude command" }
    : { id: "claude", label: "Claude Code", detected: false, reason: "claude command not found" };
}

async function detectOpenCode(paths?: RegistryPaths): Promise<ToolInfo> {
  if ((await commandExists("opencode")) || (await commandExists("opencode-ai"))) {
    return { id: "opencode", label: "OpenCode", detected: true, reason: "detected opencode command" };
  }
  if (await pathExists(opencodeConfigPath(paths))) {
    return { id: "opencode", label: "OpenCode", detected: true, reason: "found opencode config" };
  }
  return { id: "opencode", label: "OpenCode", detected: false, reason: "opencode command/config not found" };
}

export async function detectProgrammingTools(paths?: RegistryPaths): Promise<ToolInfo[]> {
  return Promise.all([
    detectCodex(paths),
    detectClaude(),
    detectOpenCode(paths)
  ]);
}

function defaultServerCommand(): ServerCommand {
  if (process.platform === "win32") {
    return {
      command: "cmd",
      args: ["/c", DEFAULT_COMMAND, ...DEFAULT_ARGS]
    };
  }
  return {
    command: DEFAULT_COMMAND,
    args: DEFAULT_ARGS
  };
}

function serverCommand(input?: ServerCommand): ServerCommand {
  const fallback = defaultServerCommand();
  return {
    command: input?.command ?? fallback.command,
    args: input?.args ?? fallback.args
  };
}

function renderTomlString(value: string): string {
  return JSON.stringify(value);
}

export function upsertCodexConfig(content: string, server: ServerCommand): string {
  const normalized = content.replace(/\r\n/g, "\n").trimEnd();
  const block = [
    `[mcp_servers.${SERVER_NAME}]`,
    `command = ${renderTomlString(server.command)}`,
    `args = [${server.args.map(renderTomlString).join(", ")}]`
  ].join("\n");
  const pattern = new RegExp(`(?:^|\\n)\\[mcp_servers\\.${SERVER_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\][\\s\\S]*?(?=\\n\\[|$)`, "m");
  if (pattern.test(normalized)) {
    return normalized.replace(pattern, (match) => `${match.startsWith("\n") ? "\n" : ""}${block}`) + "\n";
  }
  return `${normalized ? `${normalized}\n\n` : ""}${block}\n`;
}

async function registerCodex(paths: RegistryPaths | undefined, server: ServerCommand, dryRun?: boolean): Promise<RegisterResult> {
  const configPath = codexConfigPath(paths);
  const existing = await pathExists(configPath) ? await fs.readFile(configPath, "utf8") : "";
  const next = upsertCodexConfig(existing, server);
  if (!dryRun) {
    await ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, next, "utf8");
  }
  return { tool: "codex", status: "registered", path: configPath, detail: `registered ${SERVER_NAME} in Codex config` };
}

function upsertOpenCodeConfigObject(value: unknown, server: ServerCommand): Record<string, unknown> {
  const root = value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
  const mcp = root.mcp && typeof root.mcp === "object" && !Array.isArray(root.mcp) ? { ...(root.mcp as Record<string, unknown>) } : {};
  mcp[SERVER_NAME] = {
    type: "local",
    command: [server.command, ...server.args]
  };
  root.$schema = typeof root.$schema === "string" ? root.$schema : "https://opencode.ai/config.json";
  root.mcp = mcp;
  return root;
}

export function upsertOpenCodeConfig(content: string, server: ServerCommand): string {
  const parsed = content.trim() ? JSON.parse(content) : {};
  return JSON.stringify(upsertOpenCodeConfigObject(parsed, server), null, 2) + "\n";
}

async function registerOpenCode(paths: RegistryPaths | undefined, server: ServerCommand, dryRun?: boolean): Promise<RegisterResult> {
  const configPath = opencodeConfigPath(paths);
  const existing = await pathExists(configPath) ? await fs.readFile(configPath, "utf8") : "";
  const next = upsertOpenCodeConfig(existing, server);
  if (!dryRun) {
    await ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, next, "utf8");
  }
  return { tool: "opencode", status: "registered", path: configPath, detail: `registered ${SERVER_NAME} in OpenCode config` };
}

async function registerClaude(server: ServerCommand, dryRun?: boolean): Promise<RegisterResult> {
  const args = ["mcp", "add", "--transport", "stdio", "--scope", "user", SERVER_NAME, "--", server.command, ...server.args];
  if (dryRun) {
    return { tool: "claude", status: "registered", detail: `would run: claude ${args.join(" ")}` };
  }
  try {
    await execFileAsync("claude", args, { windowsHide: true });
    return { tool: "claude", status: "registered", detail: `registered ${SERVER_NAME} with claude mcp add` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { tool: "claude", status: "failed", detail: message };
  }
}

export async function registerTools(options: RegisterOptions): Promise<RegisterResult[]> {
  const server = serverCommand(options.server);
  const results: RegisterResult[] = [];
  for (const tool of options.tools) {
    if (tool === "codex") {
      results.push(await registerCodex(options.paths, server, options.dryRun));
    } else if (tool === "opencode") {
      results.push(await registerOpenCode(options.paths, server, options.dryRun));
    } else {
      results.push(await registerClaude(server, options.dryRun));
    }
  }
  return results;
}
