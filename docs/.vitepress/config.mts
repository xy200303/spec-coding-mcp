export default {
  lang: "zh-CN",
  title: "Spec Coding MCP",
  description: "用 spec 驱动 AI 编程的本地 MCP 服务。",
  base: "/",
  cleanUrls: true,
  head: [
    ["link", { rel: "icon", href: "/favicon.svg" }],
    ["link", { rel: "stylesheet", href: "/site.css" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "Spec Coding MCP" }],
    [
      "meta",
      {
        property: "og:description",
        content: "从源码反推 spec，审查需求，再让 AI 按 spec 实现代码和测试。"
      }
    ],
    ["meta", { property: "og:url", content: "https://spec.xyun.dev/" }]
  ],
  themeConfig: {
    logo: "/favicon.svg",
    siteTitle: "Spec Coding MCP",
    nav: [
      { text: "指南", link: "/guide/getting-started" },
      { text: "MCP 工具", link: "/guide/mcp-tools" },
      { text: "Spec 结构", link: "/reference/spec-structure" },
      { text: "npm", link: "https://www.npmjs.com/package/@dev_xiaoyun/spec-coding-mcp" }
    ],
    sidebar: [
      {
        text: "开始",
        items: [
          { text: "快速开始", link: "/guide/getting-started" },
          { text: "工作流", link: "/guide/workflow" },
          { text: "MCP 工具", link: "/guide/mcp-tools" }
        ]
      },
      {
        text: "参考",
        items: [
          { text: "Spec 目录结构", link: "/reference/spec-structure" },
          { text: "部署官网", link: "/reference/deploy-site" }
        ]
      }
    ],
    search: {
      provider: "local"
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/xy200303/spec-coding-mcp" }
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright (c) 2026 dev_xiaoyun"
    }
  }
};
