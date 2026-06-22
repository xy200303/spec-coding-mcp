# MCP 工具

Spec Coding MCP 提供一组面向 AI 编程的工具。它们不要求用户手写 ID，也不要求维护 change log。

| 工具 | 作用 | 常见时机 |
| --- | --- | --- |
| `spec_init` | 初始化 specs 目录和模板 | 项目第一次接入 |
| `spec_generate_from_source` | 从现有源码反推 review specs | 旧项目审查 |
| `spec_create` | 根据用户描述创建 active spec | 新需求开始 |
| `spec_todo` | 根据用户描述创建可执行清单 | 拆分轻量任务 |
| `spec_list` | 列出 review、active、todo、done specs | 查找当前规格 |
| `spec_context` | 返回 AI 实现代码需要的 spec 和 TODO 上下文 | 开始写代码前 |
| `spec_guidance_list` | 列出可编辑 guidance 提示词 | 需要校准原则时 |
| `spec_guidance_read` | 读取指定 guidance，例如 engineering、ui-ux、quality-review | 需要具体原则时 |
| `spec_skills_search` | 通过官方 skills CLI 搜索 skills.sh | 复杂任务前寻找专项 skill |
| `spec_skills_install` | 通过 `npx skills add` 安装 skill，默认全局安装 `ui-ux-pro-max` | UI/UX 或专项任务需要外部 skill 时 |
| `spec_checkpoint` | 记录实现结果、验证、风险和阻塞 | 阶段性完成后 |
| `spec_review_result` | 记录结构化阶段结果和未完成项 | 阶段回顾/交接 |
| `spec_done` | 验证通过后归档 spec | 功能完成后 |

## spec_context 的角色

`spec_context` 是真正给 AI 写代码前使用的工具。它应该返回：

- 当前 active spec 的完整内容
- `specs/todo/` 和 active spec 中的未完成 TODO
- guidance 索引和轻量推荐
- 相关 review spec 摘要
- 可能相关的源码路径
- package scripts、测试文件、路由、导出符号、引用关系
- 建议下一步工具和验证方向
- 完成后调用 `spec_checkpoint` 的提醒
- 完成后需要调用 `spec_done` 的提醒

`spec_context` 会要求 AI 按未勾选执行清单从上到下执行；完成后把任务改为 `[x]`，无法完成时保留未勾选并说明阻塞原因。

## spec_checkpoint 的角色

`spec_checkpoint` 用于在实现后把事实写回 spec 或 TODO：

- 自动勾选匹配到的已完成清单项
- 记录实现摘要和变更文件
- 记录验证命令的 passed、failed 或 not-run 状态
- 记录风险和阻塞项

复杂项目里建议每完成一组相关任务就记录一次进度记录，再继续下一组任务。

## spec_review_result 的角色

`spec_review_result` 适合回写一轮开发的结构化结果：

- 已完成清单
- 未完成清单
- 变更文件
- 验证结果
- 风险
- 阻塞

它比 checkpoint 更像一次正式交接，尤其适合复杂项目的阶段性收尾。

## Guidance 与质量约束

`spec_context` 默认保持紧凑，不展开长原则正文。它会列出 `specs/guidance/*.md` 索引，并根据当前 spec/TODO 推荐读取相关 guidance：

- `engineering`：工程边界、代码质量和业务确认规则。
- `ui-ux`：事实优先、语境驱动的 UI/UX 原则。
- `spec-writing`：执行清单、进度记录、done 归档和行为记录要求。
- `quality-review`：实现后自查代码、测试、架构、UI/交互和交付风险。

默认 guidance 文件顶部包含类似 SKILL.md 的 YAML 元信息：`name`、`version`、`title`、`description`、`category`、`triggers`、`appliesTo` 和 `updated`。`spec_guidance_list` 会输出这些摘要字段，`spec_guidance_read` 会在读取正文前显示同一组元信息，方便工具和模型按名称、版本、描述、触发词和适用对象检索。

YAML 元信息只用于需要被工具读取的文档，例如 AGENTS/CLAUDE、specs README、guidance、review specs、active specs、todo specs 和 done specs。普通 README 和 VitePress docs 页面不默认加入这套 SKILL/spec 风格元信息。新生成的 spec 正文不再重复 `## Meta`、`status` 或 `source`；工具读取 spec 状态时继续兼容旧的 `## Meta` / `- status:` / `- source:` 写法。

UI/UX guidance 不再维护本地设计原则、视觉约束、官网结构规则、AI 味 checklist、文案约束或首屏 checklist。它只负责引导模型安装并使用指定的 `ui-ux-pro-max` skill；具体设计判断交给该 skill 和当前 spec/用户要求。

## Skills 搜索与安装

复杂任务可以先调用 `spec_skills_search` 搜索 skills.sh，找到更适合当前任务的 skill。安装时调用 `spec_skills_install`，工具会使用官方命令 `npx skills add`；默认目标是所选编程工具的全局 skills 目录，默认 agent 是 `codex`。

`spec_skills_install` 不传 source 时，会默认使用 `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`，并安装其中的 `ui-ux-pro-max`。UI/UX 设计、实现、评审和修复任务默认优先使用这个 skill；但它只增强设计能力，不替代当前 spec、项目事实、用户语境和 `ui-ux` guidance。

安装工具支持 `dryRun: true`，用于让模型或用户先确认将执行的 `npx skills add ... --global --agent ... --skill ... --yes` 命令，不写入全局目录。

## 为什么不做复杂状态同步

复杂的文档状态同步很容易变成另一个系统。Spec Coding MCP 选择更小的边界：

- review 表示“从源码反推的当前事实”
- active 表示“接下来要实现的规格”
- todo 表示“本轮要按顺序执行的轻量任务”
- done 表示“已经实现并验证过的规格”

AI 不需要猜测所有历史变更，只需要围绕当前 spec 完成一次明确开发。
