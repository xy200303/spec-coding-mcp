---
layout: home

hero:
  name: Spec Coding MCP
  text: 把 AI 开发收回到可审查的 spec 里
  tagline: 为 Codex、Claude Code、OpenCode 等编程工具提供同一套本地规格上下文：先看清需求，再执行清单，最后把实现结果写回项目。
  actions:
    - theme: brand
      text: 5 分钟接入
      link: /guide/getting-started
    - theme: alt
      text: 查看 MCP 工具
      link: /guide/mcp-tools
  image:
    src: /spec-flow.png
    alt: "Spec Coding MCP workflow: source, review, build, archive."

features:
  - title: 先对齐项目事实
    details: 从现有源码生成 review specs，把隐含结构、命令和边界摊开给人审查。
  - title: 按执行清单推进
    details: 模型读取 spec_context 后只处理未勾选任务，完成一项就回写一项。
  - title: 记录验证与风险
    details: 进度记录保存变更文件、验证命令、阻塞原因和剩余风险。
  - title: 多个 AI 工具共用
    details: Codex、Claude Code、OpenCode 等工具读取同一套 spec，而不是各说各话。
  - title: 完成后可追溯
    details: spec_done 归档需求、实现记录和验证结果，下一次修改能接上上下文。
---

<!-- 首页说明：文案强调工具的真实开发流程，避免空泛宣传。 -->

<section class="homepage-section homepage-section--compact">
  <div class="homepage-heading">
    <p class="homepage-kicker">给复杂项目留一条清楚的执行线</p>
    <h2>不是让 AI 多写文档，而是让它按同一份事实改代码。</h2>
  </div>

  <div class="contract-grid" aria-label="Spec Coding MCP 工作约定">
    <article class="contract-item">
      <span>Before</span>
      <h3>先读项目</h3>
      <p>扫描源码、命令和测试信号，生成能被人审查的 spec。</p>
    </article>
    <article class="contract-item">
      <span>During</span>
      <h3>按清单做</h3>
      <p>模型按未完成任务顺序实现，不靠聊天历史猜下一步。</p>
    </article>
    <article class="contract-item">
      <span>After</span>
      <h3>写回结果</h3>
      <p>完成项、关联文件、验证命令和风险都会回到 spec 里。</p>
    </article>
  </div>
</section>

<section class="homepage-section">
  <div class="homepage-heading">
    <p class="homepage-kicker">适合什么场景</p>
    <h2>当项目开始变大，需求就不能只留在对话框里。</h2>
  </div>

  <div class="usage-grid">
    <article class="usage-item">
      <h3>接手旧项目</h3>
      <p>先让工具从源码反推 review specs，再决定哪些事实需要修正。</p>
    </article>
    <article class="usage-item">
      <h3>连续开发功能</h3>
      <p>每次变更都有 active spec 和进度记录，长期迭代不会断线。</p>
    </article>
    <article class="usage-item">
      <h3>约束 AI 行为</h3>
      <p>工程原则、业务确认规则和验证结果会进入模型上下文。</p>
    </article>
    <article class="usage-item">
      <h3>多人或多工具协作</h3>
      <p>不同 AI 工具读取同一套 spec 文件，减少重复解释和口径漂移。</p>
    </article>
  </div>
</section>

<section class="install-strip" aria-label="安装命令">
  <div>
    <span>Start here</span>
    <strong>两条命令把 spec 流程放进项目</strong>
  </div>
  <pre><code>npm install -g @dev_xiaoyun/spec-coding-mcp
specc init</code></pre>
</section>
