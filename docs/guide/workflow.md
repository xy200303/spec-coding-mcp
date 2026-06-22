# 工作流

Spec Coding MCP 的核心约束是：开发前先有一份明确的 spec，开发后把已完成的 spec 归档。

## 旧系统审查

1. 调用 `spec_generate_from_source`。
2. 阅读 `specs/review/source-inventory.md`。
3. 逐个审查 `specs/review/*.md`。
4. 把反推出来的源码事实修正成真实业务规则。
5. 把要开发的内容移动或复制到 `specs/active/`。

`review/` 里的内容不是最终需求，它只是帮助用户看清当前代码。

## 新功能开发

1. 调用 `spec_create`，根据用户描述创建 active spec。
2. 用户修改 `specs/active/*.md`。
3. 如需拆分执行步骤，调用 `spec_todo` 或在 spec 里写 `## 执行清单`。
4. 调用 `spec_context`，让 AI 获取实现上下文。
5. AI 按 spec 和未勾选 TODO 修改代码和测试。
6. 阶段性完成后调用 `spec_checkpoint`，记录已完成清单、变更文件、验证结果、风险和阻塞。
7. 如果需要更正式的阶段交接，调用 `spec_review_result`。
8. 验证通过后调用 `spec_done`。

`spec_context` 会输出 guidance 索引和轻量推荐，要求 AI 在需要时读取 `engineering`、`ui-ux`、`spec-writing` 或 `quality-review`。复杂任务可以先用 `spec_skills_search` 搜索 skills.sh；UI/UX 任务默认用 `spec_skills_install` 安装或确认 `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` 中的 `ui-ux-pro-max` 已在对应编程工具的全局 skills 目录中可用。`ui-ux` guidance 只负责路由到指定 skill，不再展开本地 UI/UX 设计原则或 checklist。

## 修改已有功能

修改已有功能时，不需要维护 change log。直接修改对应 spec：

```text
用户编辑 spec -> AI 调用 spec_context -> AI 更新代码和测试
```

如果当前代码还没有完全实现旧 spec，AI 应以最新 spec 为准继续实现。

## 执行清单驱动

TODO 适合表达“这轮请按这些步骤做”：

```text
specs/todo/user-disabled-state.md
```

```md
- [ ] 定位用户详情接口。
- [ ] 增加禁用态字段。
- [ ] 更新测试并运行验证。
```

AI 调用 `spec_context` 后，应按未勾选 TODO 顺序执行。完成的任务勾选为 `[x]`；未完成的任务保持 `[ ]`，并写清原因。

## 进度记录闭环

复杂项目不一定一次完成。每完成一组相关任务后，AI 应调用：

```text
spec_checkpoint
```

它会把实现摘要、变更文件、验证结果、风险和阻塞写回对应 spec 或 TODO，并自动勾选匹配到的已完成清单项。写回内容会出现在 `## 进度记录` 下。

## 删除功能

删除功能同样用 spec 表达：

```text
specs/active/remove-legacy-login.md
```

删除 spec 需要写清楚：

- 删除哪些用户入口
- 删除哪些接口或命令
- 哪些数据需要保留或迁移
- 哪些测试应该被移除或改写

## 完成定义

一个 spec 进入 `done/` 前，至少应满足：

- 代码实现符合 spec
- 相关测试已更新或补充
- 本地验证命令通过
- 用户确认需求没有继续变化
- UI/网页任务已完成匹配风险的质量审查；Web 页面应确认端口服务的是当前项目，桌面和移动端首屏无串项目、空白、遮挡或错位。
