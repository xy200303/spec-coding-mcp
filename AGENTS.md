---
name: 'agents'
version: '1.1.0'
title: 'AGENTS.md'
type: 'agent-protocol'
status: 'reference'
source: 'spec-coding-mcp'
description: 'Startup protocol for AI coding agents working on Spec Coding MCP.'
category: 'workflow'
triggers:
  - startup
  - coding-agent
  - spec-context
  - guidance
appliesTo:
  - agents
  - model-startup
  - workflow-routing
updated: '2026-06-21'
---

# AGENTS.md

Project: Spec Coding MCP

## Startup Protocol

This file is only the model startup router. It should stay short.

Before code or documentation changes:

1. Call `spec_context` and read the current workflow state.
2. Treat selected specs and open execution checklist items as the only task source.
3. Execute open checklist items from top to bottom; when none exist, follow the selected spec.
4. If principles are unclear, call `spec_guidance_list`, then `spec_guidance_read`: engineering rules use `engineering`, UI/UX rules use `ui-ux`.
5. Record meaningful progress with `spec_checkpoint`.
6. Call `spec_done` only after implementation, checklist updates, verification, and final behavior records are complete.

## Guidance

- `engineering`：engineering, code style, architecture, and business confirmation rules.
- `ui-ux`：fact-first, context-sensitive UI/UX design principles.
- `spec-writing`：spec workflow, execution checklist, progress records, done archives, and behavior records.
- `git-commit`：safe verification, staging, commit message, and final report workflow.
- `pr-submit`：PR template discovery, branch push, PR body, creation, and fallback workflow.
- `quality-review`：implementation self-review for code quality, tests, architecture, UI/UX states, and delivery risk.

Read guidance only when needed; do not copy long guidance into normal context.

## Hard Stop

Ask the user before implementing unclear or high-risk business rules involving money, permissions, state machines, concurrency, idempotency, retries, rollback, compliance, or role differences.

## Boundaries

- Do not guess business rules.
- Do not use stale conversation context over selected specs or open TODOs.
- Do not overwrite user edits or make unrelated reshuffles.
- Keep changes small, focused, and verified.
