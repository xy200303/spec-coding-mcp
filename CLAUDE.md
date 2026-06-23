---
name: 'claude'
version: '1.4.0'
title: 'CLAUDE.md'
type: 'agent-protocol'
status: 'reference'
source: 'spec-coding-mcp'
description: 'Startup protocol for Claude-style agents — safe for all collaborators.'
category: 'workflow'
triggers:
  - startup
  - claude
  - spec-context
  - guidance
appliesTo:
  - agents
  - model-startup
  - workflow-routing
updated: '2026-06-23'
---

# CLAUDE.md

Project: Spec Coding MCP

## 项目约定（所有人适用）

- 改动小而聚焦，不做无关重构
- 不要猜测业务规则，不确定时先确认
- 不要覆盖他人已做的修改
- 提交前验证

## Spec Coding MCP（可选增强）

本项目支持 spec-coding-mcp 工具提供增强开发流程。

**检测方法**：查看可用工具列表中是否有 `spec_context`。

### ◆ 如果你有 `spec_context` 工具

按以下硬性协议执行：

1. 写任何代码前，先调用 `spec_context` 获取当前任务上下文。
2. 只执行 spec/TODO 中列出的任务，不从对话历史推导。
3. 按清单自上而下执行 → `spec_checkpoint` 记录进度 → 验证 → `spec_done` 归档。
4. UI/UX 任务使用 `ui-ux-pro-max` skill。
5. 需要原则指导时调用 `spec_guidance_read`。

常见错误（不要做）：不调 spec_context 就写代码 / 跳过验证直接 done / 监听型 TODO 自己标完成。

### ◆ 如果你没有 `spec_context` 工具

跳过本节。按项目常规开发流程工作：读需求 → 写代码 → 测试 → 提交。
不要尝试调用 spec_context、spec_checkpoint、spec_done 等不存在的工具。

## Guidance 索引（仅 MCP 用户）

需要原则时调用 `spec_guidance_read`：

| Name | 用途 | 何时读 |
|---|---|---|
| `engineering` | 工程规范、业务确认 | 实现/重构 |
| `ui-ux` | UI/UX skill 路由 | 前端/页面 |
| `spec-writing` | spec 工作流、验证器 | 创建/执行 spec |
| `git-commit` | 安全提交流程 | 用户要求 commit |
| `pr-submit` | PR 创建流程 | 用户要求 PR |
| `quality-review` | 质量自检清单 | done/commit/PR 前 |

## Hard Stop（所有人适用）

Ask the user before implementing unclear or high-risk business rules involving money, permissions, state machines, concurrency, idempotency, retries, rollback, compliance, or role differences.


## Boundaries（所有人适用）

- Do not guess business rules.
- Do not use stale conversation context over selected specs or open TODOs.
- Do not overwrite user edits or make unrelated reshuffles.
- Keep changes small, focused, and verified.

## Shared Memory / Vault（仅 MCP 用户）

`specs/` 目录作为持久化 Vault，在不同会话之间共享上下文：

```
specs/
├── README.md          # vault 索引与约定
├── active/            # 当前工作进行中
├── todo/              # 轻量执行清单
├── done/              # 已完成 spec + 最终行为契约
├── review/            # 源码审查任务
└── guidance/          # 可编辑 Agent 指导性提示词
```

无 MCP 工具时，`specs/` 目录退化为普通项目文档目录。