---
layout: home
title: Spec Coding MCP
hero:
  name: Spec Coding
  text: "先写 spec，再让 AI 动代码"
  tagline: 把需求、TODO、验证命令和实际行为记录放回项目文件里，让不同编程工具按同一份上下文工作。
  image:
    src: /spec-flow.png
    alt: "Spec Coding MCP workflow: Source, Review, Build, Archive."
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: MCP 工具
      link: /guide/mcp-tools
    - theme: alt
      text: GitHub
      link: https://github.com/xy200303/spec-coding-mcp

features:
  - title: 从项目生成 review spec
    details: 扫描源码、命令、测试和文档，把隐含结构整理成可审查的项目线索。
  - title: 按 active 和 todo 执行
    details: 模型先读取 spec_context，再按未完成 TODO 顺序改代码、补测试、记录风险。
  - title: 进度写回项目
    details: checkpoint 保存完成项、变更文件、验证命令、阻塞信息和实际行为记录。
  - title: 多个编程工具共用
    details: Codex、Claude Code、OpenCode、Cursor、Continue 和 Windsurf 读取同一套 specs/ 文件。
  - title: Guidance 路由 skills
    details: 页面和交互任务可以通过 guidance 路由到指定 skill，复杂任务再搜索或安装专项 skill。
  - title: 完成后归档 done
    details: spec_done 把最终行为契约和验证结果归档，后续维护可以接上上下文。
---

<div class="install-block">
  <p class="install-title">两条命令把 spec 工作流放进项目</p>
  <div class="install-code">
    <code>npm install -g @dev_xiaoyun/spec-coding-mcp</code>
    <code><span>specc</span><span>init</span></code>
  </div>
</div>

<div class="workflow-block">
  <p class="workflow-eyebrow">Workflow</p>
  <h2>Source → Review → Build → Archive</h2>
  <p>这条线对应 specs/ 里的 review、active、todo 和 done。模型每次开始前先读取当前 spec，结束时把实际行为和验证结果写回。</p>
</div>
