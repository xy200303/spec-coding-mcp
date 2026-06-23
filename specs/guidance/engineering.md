---
name: 'engineering'
version: '1.3.0'
title: '工程与代码风格原则'
description: 'Engineering rules for simple, maintainable, testable, boundary-conscious implementation.'
category: 'engineering'
triggers:
  - 'architecture'
  - 'implementation'
  - 'refactor'
  - 'business-rule'
  - 'error-handling'
  - 'testing'
appliesTo:
  - 'code'
  - 'tests'
  - 'architecture'
  - 'business-logic'
  - 'project-structure'
updated: '2026-06-23'
---

# 工程与代码风格原则


> **⚠️ 触发条件**
> - 如果你有 `spec_context` 工具：以下规则是硬性约束，必须遵守。
> - 如果你没有 `spec_context` 工具：以下规则退化为通用最佳实践，跳过所有 MCP 工具调用（spec_context、spec_checkpoint、spec_done 等）。

## 使用场景

- 实现、重构、错误处理、测试和架构边界不确定时读取。
- 目标是保持简单、可维护、可测试、边界清晰。

## 执行方式

- 先服从当前 spec、TODO、用户要求和真实源码；本文件只提供工程判断校准。
- 高风险或业务规则不清楚时停止实现，先向用户确认。
- 用户可以直接编辑本文件；工具会读取项目里的当前内容。

## 核心规则

这些规则是强制约束，不是建议。

### Hard Rules

- Fail Fast：尽早校验输入、依赖、前置条件和无效状态。
- 风险先确认：不明确、高影响或高风险决策先问用户。
- 文件注释：新建或重写文件保留顶部注释；复杂边界写为什么，不写废话。
- 禁止在一个文件里混合 UI、业务、数据访问逻辑；禁止在领域层引用 Web / DB 框架。
- 禁止为了模式而模式：不要无故引入接口、工厂、泛型、抽象层。
- 验证器优先：实现前先定义可衡量的成功标准（测试、基准、工作流）；没有验证机制的实现只是一厢情愿。
- 性能与资源：避免不必要高复杂度，不阻塞主线程，不泄露连接、内存或文件句柄。

### Recommended Practices

- KISS + YAGNI：优先最简单可用方案，不预埋未确认复杂度。
- Clean Code：业务意图命名，短函数，低嵌套，DRY，显式行为。
- Human Readable：按线性故事写代码，复杂逻辑拆成有语义的小步骤。
- Clean Architecture + DDD：按业务能力分层，领域规则不依赖框架、DB 或 Web。
- SOLID + SoC：职责单一，关注点分离，组合优于继承，依赖抽象。
- 测试优先：核心逻辑可单测，验证命令和结果必须记录。
- 向后兼容：小步修改，不破坏已有 API、数据和行为契约。
- 成熟库优先：已有成熟方案不手搓；新增依赖先确认必要性。
- 项目结构：按业务语义拆分目录和文件，避免单文件堆砌和目录平铺。
- UI/交互：符合直觉，状态完整，文案简洁，布局清楚。
- Boy Scout Rule：局部顺手清理，不做无关大重构。
- AI + Human：结构清晰、边界明确，便于 AI 修改和人类维护。

## 工具触达

来自 Codex 工具体系：不同工具适配不同任务边界，选对工具减少不必要的复杂度和副作用。

- @browser：侧边栏内浏览器，适合审查渲染页面、标注 UI 问题、预览静态 HTML。
- @chrome：获取浏览器登录态，适合需要账号认证的 Web 工作流（后台操作、OAuth 页面）。
- @computer：桌面 GUI 操作，适合只能通过图形界面完成且无 API 的任务。
- MCP 服务器：连接外部系统（Slack、数据库、API），适合跨系统读写和事件监听。
- Skills：固化重复工作流为可复用技能，适合频繁执行的标准化任务序列。
- 轻量优先：能用 `$browser` 不用 `@chrome`，能用命令行工具不用 `@computer`。
- 工具选择记录在 checkpoint 的验证部分，便于追溯和审计。
## 业务确认

这些规则是硬性约束，不是建议。

- 业务不确定性强制确认：金额、费率、结算、退款、折扣、税费、状态机、并发、幂等、重试、回滚、规则来源不明或角色差异，必须先问清楚。
- 禁止猜业务：不要用常识补规则，不要自行假设边界。
- 澄清格式：说明不清楚之处，给出 2 到 3 种可能解释，等待用户确认。
- 金钱与合规：涉及钱、合规、审计的实现必须有明确来源或产品确认注释。
