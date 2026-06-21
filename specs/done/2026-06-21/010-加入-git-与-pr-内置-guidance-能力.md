# 加入 Git 与 PR 内置 guidance 能力

## Meta

- status: done
- source: user-prompt

## 用户原始描述

用户要求：查看现有 auto-git-commit 与 auto-pr-submit skills，将这些工具的 skill 内容提取出来，作为 spec 的内置工具能力。

目标：
- 在默认 guidance 中新增 git 提交与 PR 提交两类可编辑指导提示词。
- 内容提炼自 auto-git-commit 与 auto-pr-submit skill，保留触发条件、流程、安全规则、输出要求。
- spec_guidance_list/read、缺失自动补齐、当前 specs/guidance 文件和文档都能体现新增能力。
- 更新测试，确保新增 guidance 名称、默认文件、关键内容和 unknown 提示保持正确。
- 运行 build/unit/smoke/release check 等验证。

## TODO

- [x] 在默认 guidance 中新增 git 提交与 PR 提交两类可编辑指导提示词。
- [x] 内容提炼自 auto-git-commit 与 auto-pr-submit skill，保留触发条件、流程、安全规则、输出要求。
- [x] spec_guidance_list/read、缺失自动补齐、当前 specs/guidance 文件和文档都能体现新增能力。
- [x] 更新测试，确保新增 guidance 名称、默认文件、关键内容和 unknown 提示保持正确。
- [x] 运行 build/unit/smoke/release check 等验证。

## 实际行为记录

- 记录来源：只能记录已阅读代码、已修改代码、测试结果或用户确认的事实。
- 分支条件：完成后补充实际存在的正常、失败、边界、权限和状态分支。
- 默认参数行为：完成后补充源码里的默认值、配置来源和覆盖规则。
- 边界处理结果：完成后补充异常、空值、权限、状态等处理结果。
- 验证结果：完成后记录验证命令、结果和关联文件。
- 禁止事项：不要把猜测、常识或“看起来合理”的行为写成事实。

## Done

- doneAt: 2026-06-21T13:22:37.818Z
- note: 已完成 git-commit/pr-submit 内置 guidance 能力并通过验证。

## 最终行为契约

1. 列出内置 guidance 提示词
  - 条件：调用 spec_guidance_list 并提供 projectRoot/specsDir。
  - 结果：模型可以按 name 读取 Git 提交或 PR 提交工作流提示词。
  - 默认行为：specsDir 未传时使用 RootSchema 默认 specs。
  - 边界处理：guidance 目录缺失、为空或缺少新文件时自动补齐；已有用户编辑文件保持不变。
  - 验证：bun test/smoke.ts 覆盖 guidance list 输出新增 name 和文件路径。
  - 关联文件：
    - `src/templates/guidance.ts`
    - `src/spec/guidance.ts`
    - `src/mcp/register-read-tools.ts`
    - `test/smoke.ts`

2. 读取 Git 提交 guidance
  - 条件：调用 spec_guidance_read，name 为 git-commit。
  - 结果：模型在用户明确要求提交时可按该 guidance 执行安全提交。
  - 默认行为：没有用户指定提交语言时 guidance 建议默认中文；用户给精确提交信息时原样使用。
  - 边界处理：无关脏文件保持未暂存；疑似 secret 或相关性不清楚时先询问。
  - 验证：bun test/unit.ts 断言 git-commit guidance 包含触发规则、git diff --cached --check 和短 hash 报告。
  - 关联文件：
    - `src/templates/guidance.ts`
    - `specs/guidance/git-commit.md`
    - `test/unit.ts`

3. 读取 PR 提交 guidance
  - 条件：调用 spec_guidance_read，name 为 pr-submit。
  - 结果：模型可在用户要求 PR 时按 guidance 准备或创建 PR，并在工具不可用时给出手动创建信息。
  - 默认行为：没有模板且用户未指定语言时使用默认英文 PR 格式。
  - 边界处理：base branch 或 remote 无法安全推断时先问用户；禁止无授权 force push。
  - 验证：bun test/smoke.ts 断言 pr-submit guidance read 包含模板发现、gh pr create 和 compare URL。
  - 关联文件：
    - `src/templates/guidance.ts`
    - `specs/guidance/pr-submit.md`
    - `test/smoke.ts`
