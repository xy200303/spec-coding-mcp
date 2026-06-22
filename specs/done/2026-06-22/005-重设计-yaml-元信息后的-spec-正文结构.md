---
name: 'todo-spec'
version: '1.1.0'
title: '重设计 YAML 元信息后的 Spec 正文结构'
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

# 重设计 YAML 元信息后的 Spec 正文结构

## 任务说明

基于已经使用 YAML front matter 承载机器元信息，重新设计生成的 spec/todo/review/done markdown 正文标题和结构。要求：
- 正文不再重复 `## Meta`、status、source 等已在 YAML 中存在的元信息。
- TODO spec 的正文标题更适合人读，例如用“任务说明”“执行清单”“执行记录”一类语义标题，避免机械的 `用户原始描述`、`TODO`、`实际行为记录` 堆叠。
- Active spec、模板 spec、source review spec、done/checkpoint 输出也同步调整标题风格，保持信息完整但减少重复和噪音。
- spec_context 仍能正确识别 status/source；open TODO 提取和 checkpoint/done 行为不破坏。
- 更新测试覆盖新标题和不再生成正文 Meta 区块。
- npm run verify 通过。
- git diff --check 通过。

## 执行清单

- [x] 正文不再重复 `## Meta`、status、source 等已在 YAML 中存在的元信息。
- [x] TODO spec 的正文标题更适合人读，例如用“任务说明”“执行清单”“执行记录”一类语义标题，避免机械的 `用户原始描述`、`TODO`、`实际行为记录` 堆叠。
- [x] Active spec、模板 spec、source review spec、done/checkpoint 输出也同步调整标题风格，保持信息完整但减少重复和噪音。
- [x] spec_context 仍能正确识别 status/source；open TODO 提取和 checkpoint/done 行为不破坏。
- [x] 更新测试覆盖新标题和不再生成正文 Meta 区块。
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

- doneAt: 2026-06-22T03:37:09.998Z
- note: YAML 元信息后的正文结构已重设计并验证。

## 最终行为契约

本节用于给用户审查功能完整行为；必须覆盖所有已知正常、失败、边界、权限、状态、异常、空值和默认行为。模型自行采用的默认策略也必须写清楚。

1. 新生成 TODO spec 正文结构
  - 条件：调用 todoSpec 或 spec_todo 生成轻量任务文档
  - 触发入口：用户给出小任务并创建 todo spec
  - 输入与前置状态：title 与 prompt，prompt 可包含普通文本、bullet 或 checkbox
  - 执行过程：
    1. 生成 YAML front matter，包含 status/source/type 等机器字段
    2. 正文直接渲染任务说明，不再生成 Meta 区块
    3. 从 prompt 提取 checkbox 到执行清单
    4. 渲染执行协议、Guidance 和执行记录
  - 输出结果：正文标题为任务说明、执行清单、执行协议、执行记录；不再重复 status/source
  - 副作用：生成 Markdown 文件；不改变旧文件解析兼容
  - 默认行为：空任务仍生成待补充任务；结构标题不会被误提取为 TODO
  - 边界处理：旧文件含 ## Meta 时仍可被 readMeta/listSpecsIn 识别状态
  - 结果摘要：减少 Meta 和机械标题造成的噪音，同时保留 TODO 提取能力
  - 验证：bun test/unit.ts、bun test/smoke.ts、npm run verify
  - 关联文件：
    - `src/templates/prompt-documents.ts`
    - `test/unit.ts`
    - `test/smoke.ts`

2. Active/review/checkpoint/done 标题同步
  - 条件：生成 active spec、source review spec，或记录 checkpoint/review/done
  - 触发入口：spec_create/spec_bootstrap/spec_checkpoint/spec_review_result/spec_done
  - 输入与前置状态：用户需求、源码扫描结果或结构化记录参数
  - 执行过程：
    1. active/template spec 使用目标结果、事实依据、行为约定、实现计划、完成标准
    2. source review 使用审查说明、阅读任务、总结模板、行为约定、执行记录、完成标准
    3. checkpoint/review result 使用进度记录/审查记录及中文子标题
    4. done 归档使用归档记录并追加最终行为契约
  - 输出结果：人读标题统一，正文不重复 YAML 状态字段；done 输出不包含 ## Meta 或 - status: done
  - 副作用：spec_done 会删除源 todo/active 文件并创建 done 文件；归档时会清理旧 Meta/进度/执行协议噪音
  - 默认行为：无 behaviorRecords 时仍渲染未验证行为占位并在 nextSteps 警告
  - 边界处理：历史文档中的 ## Meta、- status、- source 仍作为兼容输入被读取
  - 结果摘要：信息完整但更少重复噪音，YAML 负责机器检索，正文负责阅读
  - 验证：bun test/unit.ts、bun test/smoke.ts、npm run verify、git diff --check
  - 关联文件：
    - `src/templates/spec-documents.ts`
    - `src/spec/checkpoint-writer.ts`
    - `src/spec/review-result-writer.ts`
    - `src/spec/done-writer.ts`
    - `src/spec/context-markdown.ts`
