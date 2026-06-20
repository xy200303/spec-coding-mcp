/* Init CLI command for registering the MCP server with supported coding tools. */
import { cancel, intro, isCancel, multiselect, note, outro, spinner } from "@clack/prompts";
import { detectProgrammingTools } from "./registry-detect.js";
import { registerClaude, registerCodex, registerContinue, registerCursor, registerOpenCode, registerWindsurf } from "./registry-write.js";
import type { RegisterResult, ToolId } from "./registry-types.js";

export async function runInit(): Promise<void> {
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
