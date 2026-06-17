#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createModelContext } from "./context.js";
import { initProject, markProjectSynced, planImplementation, resetState, scanProject } from "./core.js";
import { generateSpecsFromPrompt, generateSpecsFromSource } from "./generator.js";

const server = new McpServer({
  name: "docs-is-code",
  version: "0.1.0"
});

const RootSchema = z.object({
  projectRoot: z.string().describe("Absolute or relative project root path."),
  docsDir: z.string().default("docs").describe("Docs directory relative to project root.")
});

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2)
      }
    ]
  };
}

server.registerTool(
  "docs_code_init",
  {
    description: "Initialize document-driven programming state for a project. Creates docs/README.md when missing and baselines .docs-code/state.json.",
    inputSchema: RootSchema
  },
  async ({ projectRoot, docsDir }) => textResult(await initProject(projectRoot, docsDir))
);

server.registerTool(
  "docs_code_generate_from_prompt",
  {
    description: "Generate an initial Chinese docs-is-code spec tree from a user's product idea or feature description. It creates docs but does not mark them implemented.",
    inputSchema: RootSchema.extend({
      prompt: z.string().min(1).describe("User product idea, feature request, business workflow, UI/client requirement, or system description."),
      projectName: z.string().optional().describe("Optional Chinese or English project name for generated docs."),
      overwrite: z.boolean().default(false).describe("Whether to overwrite existing generated docs when paths already exist.")
    })
  },
  async ({ projectRoot, docsDir, prompt, projectName, overwrite }) =>
    textResult(await generateSpecsFromPrompt({ projectRoot, docsDir, prompt, projectName, overwrite }))
);

server.registerTool(
  "docs_code_generate_from_source",
  {
    description: "Generate Chinese docs-is-code specs by statically scanning an existing project source tree. Marks inferred behavior as source-derived and pending confirmation.",
    inputSchema: RootSchema.extend({
      projectName: z.string().optional().describe("Optional Chinese or English project name for generated docs."),
      overwrite: z.boolean().default(false).describe("Whether to overwrite existing generated docs when paths already exist."),
      includePatterns: z.array(z.string()).default([]).describe("Optional path substrings to include, such as ['src', 'apps/api']. Empty means include all source-like files."),
      excludePatterns: z.array(z.string()).default([]).describe("Optional path substrings to exclude in addition to default generated/vendor directories."),
      maxFiles: z.number().int().positive().default(800).describe("Maximum source/config files to scan.")
    })
  },
  async ({ projectRoot, docsDir, projectName, overwrite, includePatterns, excludePatterns, maxFiles }) =>
    textResult(await generateSpecsFromSource({ projectRoot, docsDir, projectName, overwrite, includePatterns, excludePatterns, maxFiles }))
);

server.registerTool(
  "docs_code_scan",
  {
    description: "Scan Markdown docs, parse semantic document blocks, and report changes since the last synced baseline without requiring manual IDs or change logs.",
    inputSchema: RootSchema
  },
  async ({ projectRoot, docsDir }) => {
    const result = await scanProject(projectRoot, docsDir);
    return textResult({
      projectRoot: result.projectRoot,
      docsDir: result.docsDir,
      stateExists: result.stateExists,
      statePath: result.statePath,
      blocks: result.blocks.length,
      changes: result.changes.map((change) => ({
        type: change.type,
        file: change.block?.file ?? change.previous?.file,
        titlePath: change.block?.titlePath ?? change.previous?.titlePath,
        startLine: change.block?.startLine ?? change.previous?.startLine,
        endLine: change.block?.endLine ?? change.previous?.endLine,
        kind: change.block?.kind ?? change.previous?.kind,
        similarity: change.similarity
      }))
    });
  }
);

server.registerTool(
  "docs_code_plan",
  {
    description: "Generate an implementation plan from changed docs blocks. This is the main tool Codex should call before editing code.",
    inputSchema: RootSchema.extend({
      writePlan: z.boolean().default(true).describe("Write the plan to .docs-code/plans as Markdown.")
    })
  },
  async ({ projectRoot, docsDir, writePlan }) => textResult(await planImplementation(projectRoot, docsDir, writePlan))
);

server.registerTool(
  "docs_code_context",
  {
    description: "Return model-ready implementation context for changed docs: full Markdown blocks, nearby parent context, search keywords, candidate files, test guidance, and required completion steps.",
    inputSchema: RootSchema.extend({
      maxBlocks: z.number().int().positive().default(20).describe("Maximum changed document blocks to include."),
      maxBlockChars: z.number().int().positive().default(6000).describe("Maximum characters of Markdown text per changed block."),
      candidateFileLimit: z.number().int().positive().default(40).describe("Maximum candidate source files inferred from doc keywords."),
      includeFullText: z.boolean().default(true).describe("Include changed Markdown block text in the response.")
    })
  },
  async ({ projectRoot, docsDir, maxBlocks, maxBlockChars, candidateFileLimit, includeFullText }) =>
    textResult(await createModelContext({ projectRoot, docsDir, maxBlocks, maxBlockChars, candidateFileLimit, includeFullText }))
);

server.registerTool(
  "docs_code_mark_synced",
  {
    description: "Mark current docs as implemented after code and tests have been updated and verified.",
    inputSchema: RootSchema
  },
  async ({ projectRoot, docsDir }) => textResult(await markProjectSynced(projectRoot, docsDir))
);

server.registerTool(
  "docs_code_reset_state",
  {
    description: "Reset the docs baseline to the current Markdown content. Use only when intentionally accepting current docs as already implemented.",
    inputSchema: RootSchema
  },
  async ({ projectRoot, docsDir }) => textResult(await resetState(projectRoot, docsDir))
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("docs-is-code MCP fatal error:", error);
  process.exit(1);
});
