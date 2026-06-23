---
name: 'quality-review'
version: '1.2.0'
title: '质量审查原则'
description: 'Post-implementation review checklist for code quality, tests, architecture, UI/UX, and delivery risk.'
category: 'quality'
triggers:
  - 'review'
  - 'self-check'
  - 'verification'
  - 'before-done'
  - 'before-commit'
  - 'before-pr'
appliesTo:
  - 'code-review'
  - 'tests'
  - 'ui-review'
  - 'risk-review'
  - 'delivery'
updated: '2026-06-23'
---

# 质量审查原则


> **⚠️ 触发条件**
> - 如果你有 `spec_context` 工具：以下规则是硬性约束，必须遵守。
> - 如果你没有 `spec_context` 工具：以下规则退化为通用最佳实践，跳过所有 MCP 工具调用（spec_context、spec_checkpoint、spec_done 等）。

## 使用场景

- 完成实现、准备 checkpoint、done、commit 或 PR 前读取。
- 跨模块、UI/交互、状态、权限、数据流或高风险改动必须审查。

## 执行方式

- 对照本文件快速检查真实改动、测试证据和剩余风险。
- 未验证或未确认的内容必须如实记录，不要把希望写成事实。
- 用户可以直接编辑本文件；工具会读取项目里的当前内容。

## 审查时机

- 完成一段实现、准备 checkpoint、准备 done、提交前或 PR 前读取本文件。
- 复杂项目、跨模块改动、UI/交互改动、状态/权限/数据流变更必须做质量审查。
- 小改动也应快速扫一遍相关项，避免把低质量实现归档或提交。

## 代码质量

- 代码是否符合现有项目结构和命名风格，是否避免无意义抽象和过度设计。
- 模块边界是否清楚，UI、业务、数据访问和基础设施逻辑是否分离。
- 错误、空值、异常、权限、状态和依赖失败是否 fail fast 且可理解。
- 是否保持向后兼容，没有破坏已有 API、数据结构、行为契约或用户流程。
- 是否存在重复逻辑、隐藏副作用、资源泄漏、阻塞主线程或不必要复杂度。

## 测试验证

- 是否运行了与改动风险匹配的 build、unit、smoke、lint 或手工验证。
- 正常、失败、边界、权限、状态、默认行为和回归风险是否至少有一种验证证据。
- 未运行的验证必须说明原因；禁止编造测试结果。

## UI/交互

- 如果本次涉及 UI/UX，是否已读取 `ui-ux` guidance 并使用指定的 `ui-ux-pro-max` skill。
- 如果 skill 未安装，是否调用 `spec_skills_install`；无法安装时是否用 `dryRun: true` 给出命令并说明阻塞。
- 是否记录实际使用的 skill、安装或 dry-run 结果，以及 skill 输出中被采纳的关键建议。
- 是否避免在本地 quality-review guidance 中自行补充另一套 UI/UX 设计 checklist。
- 是否对 UI 产出物进行了视觉验收（桌面和移动端截图、侧边栏审查），确认无错位、遮挡、空白和串项目。

## 视觉验收

- UI/前端改动必须产出视觉证据：桌面端截图（1440px 起）、移动端截图（390px 起），或用 Codex 侧边栏原地审查渲染页面。
- Codex 侧边栏支持四种审查模式，应优先使用而非导出文件后切换工具：
  - 检查生成文件：HTML 页面、PDF、幻灯片、表格在侧边栏直接预览。
  - 标注修改位置：在渲染页面上直接标记需要改的地方。
  - 操作网页界面：在侧边栏内交互、填表、点击，验证行为。
  - 审查代码变更：diff 视图与预览并排，边看代码边看效果。
- 截图必须确认：首屏无错位、无遮挡、无空白区域、无串项目、文本不溢出、响应式布局正常。
- 三维或 Canvas 场景需额外确认：场景非空白、正确帧渲染、交互响应、引用资源正常加载。
- 视觉验收结果记录在 checkpoint 的验证部分，附截图路径或审查记录。
- 未做视觉验收的 UI 改动不得 done、commit 或提 PR。
## 交付审查

- checkpoint/done 是否记录真实行为、默认行为、边界处理和验证结果。
- 是否还有未确认业务规则、残留 TODO、风险、阻塞或需要用户审查的问题。
- 提交或 PR 前是否只包含相关改动，并且最终报告能让用户快速理解结果。
