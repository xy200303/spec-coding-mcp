---
name: 'todo-spec'
version: '1.1.0'
title: '同步普通 Markdown 文档的新正文结构术语'
type: done-spec
status: done
source: 'user-prompt'
description: 'Lightweight executable TODO spec for ordered task execution and checkpoint recording.'
category: done
triggers:
  - 'todo'
  - 'task-list'
  - 'checkpoint'
  - 'verification'
appliesTo:
  - 'todo-specs'
  - 'task-execution'
  - 'checkpoints'
updated: '2026-06-21'
---

# 同步普通 Markdown 文档的新正文结构术语

## 任务说明

优化 README、docs、specs README 以及对应生成模板里的普通说明文字，让它们和 YAML 元信息后的新 spec 正文结构一致。要求：
- 不给普通 README/docs 增加 YAML 元信息。
- 将文档中的 `## TODO`、`Checkpoint`、`行为规则/验收标准/实际行为记录` 等旧说法调整为“执行清单”“进度记录”“行为约定/完成标准/执行记录”等新术语。
- 保留对旧 `## Meta` / `- status:` / `- source:` 的兼容说明，但明确新生成正文不再重复这些字段。
- 更新生成 specs README/AGENTS 相关模板，使新项目文档也使用新术语。
- npm run verify 通过。
- git diff --check 通过。

## 执行清单

- [x] 不给普通 README/docs 增加 YAML 元信息。
- [x] 将文档中的 `## TODO`、`Checkpoint`、`行为规则/验收标准/实际行为记录` 等旧说法调整为“执行清单”“进度记录”“行为约定/完成标准/执行记录”等新术语。
- [x] 保留对旧 `## Meta` / `- status:` / `- source:` 的兼容说明，但明确新生成正文不再重复这些字段。
- [x] 更新生成 specs README/AGENTS 相关模板，使新项目文档也使用新术语。
- [x] npm run verify 通过。
- [x] git diff --check 通过。

## 执行协议

- 开始前必须先调用 `spec_context`，确认当前 TODO 上下文。
- AI 必须按未勾选 TODO 从上到下执行。
- 完成任务后把对应项改成 `[x]`。
- 无法完成的任务保持 `[ ]`，并在任务下方写明阻塞原因。
- 阶段完成后调用 `spec_checkpoint`，记录实际行为、验证结果、风险和阻塞。

## 执行记录

- 记录来源：只能记录已阅读代码、已修改代码、测试结果或用户确认的事实。
- 功能全过程：按功能点记录触发入口、输入与前置状态、执行步骤、输出结果和副作用。
- 分支条件：完成后补充实际存在的正常、失败、边界、权限和状态分支，不只写一句结果。
- 默认参数行为：完成后补充源码里的默认值、配置来源、覆盖规则以及未传参数时的完整流程。
- 边界处理结果：完成后补充异常、空值、权限、状态等输入如何进入分支、在哪里返回、是否产生副作用。
- 验证结果：完成后记录验证命令、覆盖的流程分支和关联文件。
- 禁止事项：不要把猜测、常识或“看起来合理”的行为写成事实。

## Done

- doneAt: 2026-06-22T03:50:17.224Z
- note: 普通 Markdown 文档和生成模板术语已与新正文结构同步。

## 最终行为契约

本节用于给用户审查功能完整行为；必须覆盖所有已知正常、失败、边界、权限、状态、异常、空值和默认行为。模型自行采用的默认策略也必须写清楚。

1. 普通说明文档术语同步
  - 条件：README、VitePress docs、specs README 描述 spec 工作流
  - 触发入口：用户阅读安装、工作流、工具或目录结构文档
  - 输入与前置状态：现有普通 Markdown 文档，不应加入 SKILL/spec YAML 元信息
  - 执行过程：
    1. 扫描普通文档中的旧术语
    2. 将用户可见的 TODO 清单、Checkpoint、行为规则、验收标准、实际行为记录等表述改为执行清单、进度记录、行为约定、完成标准、执行记录
    3. 保留工具名 spec_todo/spec_checkpoint/spec_done 和目录名 todo/done
    4. 保留旧 Meta 兼容说明
  - 输出结果：普通文档不新增 YAML；术语与新生成 spec 正文结构一致
  - 副作用：只修改说明文档和生成模板，不改变运行时解析逻辑
  - 默认行为：旧文件继续兼容；新项目生成的 AGENTS/specs README 使用新术语
  - 边界处理：TODO 解析器仍保留旧标题词和新标题词作为结构标题过滤，避免误提取
  - 结果摘要：文档语言不再和新模板割裂，仍能解释旧 ## Meta 兼容路径
  - 验证：npm run verify、npm run docs:build、git diff --check
  - 关联文件：
    - `README.md`
    - `docs/index.md`
    - `docs/guide/getting-started.md`
    - `docs/guide/mcp-tools.md`
    - `docs/guide/workflow.md`
    - `docs/reference/spec-structure.md`
    - `specs/README.md`
    - `src/templates/agents.ts`
    - `src/templates/guidance.ts`
    - `src/templates/prompt-documents.ts`
    - `src/templates/prompt-protocol.ts`
