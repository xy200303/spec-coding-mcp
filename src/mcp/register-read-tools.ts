/* Read-only MCP tools for spec inspection and context generation. */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bootstrapProject, generateSpecsFromSource, initSpecs, listSpecs } from "../spec/scaffold.js";
import { specContext } from "../spec/context.js";
import { workflowStateLines } from "../spec/context-markdown.js";
import { renderSpecItems, renderSpecResult } from "./render-spec.js";
import { textResult } from "./render-core.js";
import { RootSchema } from "./tool-schema.js";
import type { SessionGuardState } from "../spec/types.js";
import { markSpecContextSeen } from "./session-guard.js";
import { workflowRecommendationLines } from "../spec/workflow-next-step.js";
import { APP_VERSION } from "../shared/meta.js";

const SPEC_CONTEXT_GATE_DESCRIPTION = "This call unlocks write operations in the current session; non-trivial code or doc changes must call spec_context first, read this output, and only then start implementation. If you skip spec_context, write tools will fail fast with a clear guard error.";

const ReadContextSchema = RootSchema.extend({
  files: z.array(z.string()).default([]).describe("Optional spec files to include. Defaults to all specs/active/*.md."),
  maxSpecChars: z.number().int().positive().default(8000),
  candidateFileLimit: z.number().int().positive().default(40),
  contextMode: z.enum(["workflow", "hints", "full"]).default("workflow").describe("workflow omits source scans by default; hints adds lightweight search targets; full adds expanded source hints.")
});

export function registerReadTools(server: McpServer, guard: SessionGuardState): void {
  server.registerTool(
    "spec_bootstrap",
    {
      description: "PRIMARY ENTRYPOINT. Use this before spec_init/spec_generate_agents/spec_generate_from_source. New projects get AGENTS, specs, and a starter active spec; existing projects get AGENTS, specs, and AI source-review tasks.",
      inputSchema: RootSchema.extend({
        projectName: z.string().optional(),
        projectKind: z.enum(["auto", "new", "existing"]).default("auto"),
        initialPrompt: z.string().optional(),
        overwrite: z.boolean().default(false),
        includePatterns: z.array(z.string()).default([]),
        excludePatterns: z.array(z.string()).default([]),
        maxFiles: z.number().int().positive().default(800)
      })
    },
    async ({ projectRoot, specsDir, projectName, projectKind, initialPrompt, overwrite, includePatterns, excludePatterns, maxFiles }) =>
      textResult(renderSpecResult("Spec Coding 项目引导完成", await bootstrapProject({ projectRoot, specsDir, projectName, projectKind, initialPrompt, overwrite, includePatterns, excludePatterns, maxFiles })))
  );

  server.registerTool(
    "spec_init",
    {
      description: "Advanced setup helper. Prefer spec_bootstrap for normal project onboarding; use this only to create or refresh the specs directory and templates.",
      inputSchema: RootSchema.extend({
        projectName: z.string().optional(),
        overwrite: z.boolean().default(false)
      })
    },
    async ({ projectRoot, specsDir, projectName, overwrite }) =>
      textResult(renderSpecResult("Spec Coding 初始化完成", await initSpecs({ projectRoot, specsDir, projectName, overwrite })))
  );

  server.registerTool(
    "spec_generate_from_source",
    {
      description: "Advanced existing-project helper. Prefer spec_bootstrap for onboarding; use this only to regenerate AI source-review tasks from static code hints.",
      inputSchema: RootSchema.extend({
        projectName: z.string().optional(),
        overwrite: z.boolean().default(false),
        includePatterns: z.array(z.string()).default([]),
        excludePatterns: z.array(z.string()).default([]),
        maxFiles: z.number().int().positive().default(800)
      })
    },
    async ({ projectRoot, specsDir, projectName, overwrite, includePatterns, excludePatterns, maxFiles }) =>
      textResult(renderSpecResult("已生成 AI 源码审查任务", await generateSpecsFromSource({ projectRoot, specsDir, projectName, overwrite, includePatterns, excludePatterns, maxFiles })))
  );

  server.registerTool(
    "spec_list",
    {
      description: "Inspect current workflow state by listing review, active, todo, and done specs.",
      inputSchema: RootSchema
    },
    async ({ projectRoot, specsDir }) => {
      const result = await listSpecs({ projectRoot, specsDir });
      return textResult([
        "# Spec 列表",
        "",
        `Spec Coding MCP：${APP_VERSION}`,
        `项目：${projectRoot}`,
        `Specs：${specsDir}`,
        "",
        ...workflowStateLines({
          activeCount: result.active.length,
          todoCount: result.todo.length,
          reviewCount: result.review.length,
          doneCount: result.done.length,
          selectedCount: 0,
          openTodoCount: 0
        }),
        ...renderSpecItems("Active", result.active),
        "",
        ...renderSpecItems("TODO", result.todo),
        "",
        ...renderSpecItems("Review", result.review),
        "",
        ...renderSpecItems("Done", result.done),
        "",
        ...workflowRecommendationLines({
          projectRoot,
          specsDir,
          activeSpecs: result.active,
          reviewSpecs: result.review,
          todoSpecs: result.todo,
          openTodos: [],
          selectedSpecs: []
        }, "inspect")
      ].join("\n"));
    }
  );

  server.registerTool(
    "spec_context",
    {
      description: `REQUIRED BEFORE WRITES. Return model-ready context for active specs, selected review specs, and open TODOs. ${SPEC_CONTEXT_GATE_DESCRIPTION}`,
      inputSchema: ReadContextSchema
    },
    async ({ projectRoot, specsDir, files, maxSpecChars, candidateFileLimit, contextMode }) => {
      const context = await specContext({ projectRoot, specsDir, files, maxSpecChars, candidateFileLimit, contextMode });
      markSpecContextSeen(guard);
      return textResult(context.markdown);
    }
  );
}
