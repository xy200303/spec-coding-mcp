/* Bootstrap CLI command that mirrors the MCP spec_bootstrap entrypoint. */
import { renderSpecResult } from "../mcp/render-spec.js";
import { bootstrapProject } from "../spec/scaffold.js";
import { APP_NAME } from "../shared/meta.js";
import { assertKnownOptions, hasFlag, optionValue } from "./cli-options.js";

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

function projectKindFromArgs(args: string[]): "auto" | "new" | "existing" {
  const value = optionValue(args, "--project-kind") ?? "auto";
  if (value === "auto" || value === "new" || value === "existing") return value;
  throw new Error("--project-kind must be one of: auto, new, existing");
}

export async function runBootstrap(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printBootstrapHelp();
    return;
  }
  assertKnownOptions(args, ["--project-root", "--specs-dir", "--project-name", "--project-kind", "--initial-prompt", "--overwrite", "--help"]);

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
