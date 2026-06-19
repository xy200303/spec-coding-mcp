# 提交部署发布

## Meta

- status: todo
- source: user-prompt

## 用户原始描述

提交当前已完成的 spec-coding-mcp 项目改动。
推送到 GitHub 并触发 CI/CD。
部署官网更新。
发布 npm 新版本，使用 NPM_TOKEN 方案，不使用 Trusted Publishing/OIDC。
发布前运行必要验证并记录结果。

## TODO

- [x] 提交当前已完成的 spec-coding-mcp 项目改动。
- [x] 推送到 GitHub 并触发 CI/CD。
- [x] 部署官网更新。
- [x] 发布 npm 新版本，使用 NPM_TOKEN 方案，不使用 Trusted Publishing/OIDC。
- [x] 发布前运行必要验证并记录结果。

## 执行要求

- AI 必须按未勾选 TODO 从上到下执行。
- 完成任务后把对应项改成 `[x]`。
- 无法完成的任务保持 `[ ]`，并在任务下方写明阻塞原因。

## 工程质量约束

这些规则是强制约束，不是建议。

- KISS + YAGNI：先做最简单可用的方案，不为尚未发生的需求预埋复杂度。
- Clean Code：命名自解释、函数短小、低嵌套、DRY、显式优于隐式、注释只解释为什么。
- Clean Architecture：领域、应用、接口、基础设施分层清晰，依赖向内，按业务能力组织模块。
- DDD：业务规则放在领域模型里，用统一语言表达实体、值对象和规则。
- SOLID + SoC + 组合优于继承：职责单一，关注点分离，依赖抽象而不是实现。
- Fail Fast：尽早校验输入、依赖和前置条件，发现无效状态就立即报错。
- 测试优先：核心逻辑必须可单测，优先写可测、确定性的代码。
- 代码必须简单、清晰、可读、可测试，围绕业务语义保持高内聚低耦合。
- 高内聚低耦合：文件和目录按业务语义拆分，避免单文件堆砌和目录平铺。
- 向后兼容：小步修改，尽量不破坏已有 API、数据和行为契约。
- 成熟库优先：能用成熟库解决的就不要手搓轮子；引入新依赖前先确认必要性。
- 风险先确认：不明确、影响面大或高风险的方案必须先问用户，不要自行拍板。
- 文件顶部必须写文件注释，复杂逻辑必须写说明性注释，但不要写废话。
- UI/交互必须符合人类直觉，状态完整、文案简洁、布局清楚。
- 遵循现有项目风格、命名、框架和目录约定；优先复用项目已有命令并记录验证结果。
- Boy Scout Rule：每次修改都顺手清理一点，但不要借机做无关的大重构。
- 禁止在一个文件里混合 UI、业务、数据访问逻辑；禁止在领域层引用 Web / DB 框架。
- 禁止为了模式而模式：不要无故引入接口、工厂、泛型、抽象层。
- 修改已有代码时：优先局部小步重构，不改无关逻辑，不重排无意义的代码结构。
- 性能与资源：避免不必要的高复杂度；必要时先说明原因并补测试，不阻塞主线程，不泄露连接、内存或文件句柄。

## Checkpoint

- at: 2026-06-19T17:17:56.055Z
- summary: 完成 0.2.1 发布：提交主改动 3d42adc，推送 main 到 origin，创建并推送 tag v0.2.1 触发 npm 发布；官网部署后 https://spec.xyun.dev/ 返回 200 且包含新首页文案；npm registry 已显示 @dev_xiaoyun/spec-coding-mcp 最新版本为 0.2.1。

### Summary

- 完成 0.2.1 发布：提交主改动 3d42adc，推送 main 到 origin，创建并推送 tag v0.2.1 触发 npm 发布；官网部署后 https://spec.xyun.dev/ 返回 200 且包含新首页文案；npm registry 已显示 @dev_xiaoyun/spec-coding-mcp 最新版本为 0.2.1。

### Completed TODOs

- 提交当前已完成的 spec-coding-mcp 项目改动。
- 推送到 GitHub 并触发 CI/CD。
- 部署官网更新。
- 发布 npm 新版本，使用 NPM_TOKEN 方案，不使用 Trusted Publishing/OIDC。
- 发布前运行必要验证并记录结果。

### Changed Files

- `specs/todo/2026-06-19-todo.md`
- `specs/done/2026-06-19-todo-2.md`
- `.github/workflows/deploy-docs.yml`
- `package.json`
- `package-lock.json`

### Verification

- passed `npm run verify`：build、unit、smoke、release:check 全部通过。
- passed `npm run docs:build`：官网 VitePress 构建通过。
- passed `git diff --check && git diff --cached --check`：提交前补丁空白检查通过。
- passed `npm audit --omit=dev --audit-level=high`：生产依赖无 high 级漏洞。
- passed `npm view @dev_xiaoyun/spec-coding-mcp version --json`：返回 0.2.1。
- passed `Invoke-WebRequest https://spec.xyun.dev/`：返回 200，页面包含新 hero 文案。

### Risks

- GitHub Actions API 匿名访问被 rate limit，无法直接读取 workflow run 状态；已通过 npm registry 和线上官网进行结果验证。
- VitePress 1.6.4 的 devDependency audit 仍报告 dev-server 相关漏洞且暂无 registry 可升级版本；生产依赖 audit 通过。

### Blockers

- 无

## Done

- doneAt: 2026-06-19T17:18:04.607Z
- note: 0.2.1 已提交、推送、打 tag、发布到 npm，并确认官网部署上线。
