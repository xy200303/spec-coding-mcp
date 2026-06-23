---
name: 'ui-ux'
version: '1.1.0'
title: 'UI/UX Skill 路由原则'
description: 'UI/UX routing guidance that tells models to use the designated ui-ux-pro-max skill instead of maintaining local design rules.'
category: 'ui-ux'
triggers:
  - 'ui'
  - 'ux'
  - 'website'
  - 'component'
  - 'interaction'
  - 'copywriting'
  - 'visual-design'
appliesTo:
  - 'frontend'
  - 'website'
  - 'components'
  - 'layout'
  - 'copy'
  - 'interaction'
  - 'responsive-design'
updated: '2026-06-21'
---

# UI/UX Skill 路由原则


> **⚠️ 触发条件**
> - 如果你有 `spec_context` 工具：以下规则是硬性约束，必须遵守。
> - 如果你没有 `spec_context` 工具：以下规则退化为通用最佳实践，跳过所有 MCP 工具调用（spec_context、spec_checkpoint、spec_done 等）。

## 使用场景

- 前端、页面、组件、交互、视觉、文案和响应式任务读取。
- 本文件只负责把 UI/UX 工作路由到指定 skill，不在本地维护另一套设计原则。

## 执行方式

- UI/UX 任务默认先使用 `ui-ux-pro-max` skill。
- 如需安装或确认安装命令，调用 `spec_skills_install`；如需查找其他专项能力，调用 `spec_skills_search`。
- skill 建议不能覆盖当前 spec、用户要求、项目事实和已阅读源码。
- 用户可以直接编辑本文件；工具会读取项目里的当前内容。

## Skill 路由

- UI/UX 设计、实现、评审、修复和优化任务默认使用 `ui-ux-pro-max` skill。
- 默认来源：`https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`。
- 默认安装：先调用 `spec_skills_install`；不传参数时会使用随包安装的 official skills CLI，并在缺失或执行失败时回退到 `npx skills add`。
- 需要确认命令但不写入全局目录时，调用 `spec_skills_install` 并传 `dryRun: true`。
- 需要查找其他 UI/UX 专项能力时，先调用 `spec_skills_search` 搜索 skills.sh，再按用户或任务需要安装。

## 输出要求

- 本文件只负责路由；不要在本文件内继续维护视觉、文案、首屏、官网结构或验收 checklist。
- 模型不要基于本 guidance 自行设计 UI/UX 规则；读取并使用 `ui-ux-pro-max` skill 的说明完成设计判断。
- 如果 `ui-ux-pro-max` skill 与当前用户要求或当前 spec 冲突，以用户要求和当前 spec 为准，并在 checkpoint 或最终回复中说明取舍。
- 如果 skill 未安装且当前环境不能安装，明确报告阻塞或使用 `dryRun` 给出安装命令，不要伪造已使用 skill。
