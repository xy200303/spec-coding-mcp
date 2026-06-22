# Spec 目录结构

默认目录如下：

```text
specs/
  README.md
  review/
    source-inventory.md
    index.md
    *.md
  active/
    *.md
  todo/
    *.md
  done/
    *.md
```

需要被工具读取的 spec/guidance/agent 协议 Markdown 应有文件顶部 YAML 元信息，方便工具和模型检索；普通 README 和 VitePress docs 页面不默认加入这套元信息：

```yaml
---
name: todo-spec
version: 1.1.0
title: 用户详情执行清单
type: todo-spec
status: todo
source: user-prompt
description: Lightweight executable checklist spec for ordered task execution and progress recording.
category: todo
triggers:
  - todo
appliesTo:
  - todo-specs
updated: 2026-06-21
---
```

新生成的 spec 不再在正文重复 `## Meta`、`status` 或 `source`；这些机器可读字段由 YAML front matter 承载。读取器仍兼容旧文件里的 `## Meta`、`- status:`、`- source:`。

## review

`review/` 存放从源码反推的当前代码事实。

它适合回答：

- 系统现在有哪些入口
- 哪些模块可能对应业务功能
- 当前代码暴露了哪些 API、命令或页面
- 哪些行为需要用户确认

`review/` 不等于最终需求。用户审查后，可以把确认过的内容改写成 active spec。

## active

`active/` 存放准备实现或正在实现的 spec。

一个 active spec 通常包含：

- 任务说明
- 目标结果
- 范围
- 行为约定
- 接口或命令
- UI 与交互
- 数据影响
- 验证方式
- 完成标准

## todo

`todo/` 存放轻量可执行清单，适合把一个需求拆成按顺序执行的小任务。

执行清单使用 Markdown 任务列表：

```md
- [ ] 定位相关代码。
- [ ] 更新实现。
- [ ] 运行测试。
```

`spec_context` 会提取未勾选项，并要求 AI 按顺序执行。完成后应把对应任务改成 `[x]`；如果无法完成，保留 `[ ]` 并写清阻塞原因。

## progress

`spec_checkpoint` 会向 spec 或 TODO 文件追加 `## 进度记录`，记录：

- 完成摘要
- 已完成清单
- 变更文件
- 验证命令和结果
- 风险
- 阻塞项

它会自动把匹配到的未完成清单项改成 `[x]`。

## guidance

`guidance/` 存放可编辑的指导性提示词，例如工程、UI/UX 和 spec 写作原则。

`spec_context` 只显示 guidance 索引和必要执行护栏，不展开完整原则正文；需要细节时再调用 `spec_guidance_list` / `spec_guidance_read`。

如果 `guidance/` 不存在、为空或缺少默认文件，guidance 工具会自动补齐内置默认 Markdown，已有文件不会被覆盖。

## done

`done/` 存放已经实现并验证通过的 spec。

归档时保留实现结果和验证记录，方便之后回看为什么某个功能是这样做的。
