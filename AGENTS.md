# AGENTS.md

Project: Spec Coding MCP

## Startup Protocol

This file is only the model startup router. It should stay short.

Before code or documentation changes:

1. Call `spec_context` and read the current workflow state.
2. Treat selected specs and open TODOs as the only task source.
3. Execute open TODOs from top to bottom; when none exist, follow the selected spec.
4. If principles are unclear, call `spec_guidance_list`, then `spec_guidance_read` for the relevant name.
5. Record meaningful progress with `spec_checkpoint`.
6. Call `spec_done` only after implementation, TODO updates, verification, and final behavior records are complete.

## Guidance

- `engineering`：engineering, code style, architecture, and business confirmation rules.
- `ui-ux`：UI/UX design principles and the Aether Vector visual direction.
- `spec-writing`：spec workflow, TODO handling, checkpoint, done, and behavior records.
- `git-commit`：safe verification, staging, commit message, and final report workflow.
- `pr-submit`：PR template discovery, branch push, PR body, creation, and fallback workflow.

Read guidance only when needed; do not copy long guidance into normal context.

## Hard Stop

Ask the user before implementing unclear or high-risk business rules involving money, permissions, state machines, concurrency, idempotency, retries, rollback, compliance, or role differences.

## Boundaries

- Do not guess business rules.
- Do not use stale conversation context over selected specs or open TODOs.
- Do not overwrite user edits or make unrelated reshuffles.
- Keep changes small, focused, and verified.
