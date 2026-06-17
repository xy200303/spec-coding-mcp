export interface SourceSummaryTemplateData {
  totalFiles: number;
  manifests: string[];
  apiFiles: string[];
  uiFiles: string[];
  dataFiles: string[];
  testFiles: string[];
  routeHints: string[];
  componentHints: string[];
  modelHints: string[];
}

export interface PromptFeatureTemplateData {
  projectName: string;
  prompt: string;
  domain: string;
  name: string;
  title: string;
  reason: string;
  keywords: string[];
}

export interface SourceFeatureTemplateData {
  projectName: string;
  domain: string;
  name: string;
  title: string;
  evidence: string[];
  routes: string[];
  components: string[];
  models: string[];
  tests: string[];
}

function upperIdPart(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
}

export function docsReadme(projectName: string): string {
  return [
    `# ${projectName} 规格文档`,
    "",
    "本目录是系统行为的源头。用户可以直接修改 Markdown，MCP 会扫描语义块变化，并把未实现的文档增量交给大模型翻译成代码和测试。",
    "",
    "## 阅读顺序",
    "",
    "1. 先看 `indexes/feature-index.md` 了解功能列表。",
    "2. 再看对应的 `features/<domain>/<feature>.md`，每个文件描述一个可独立实现的功能点。",
    "3. 涉及 API、数据、UI、客户端规则时，结合 `_shared/` 和 `experience/` 下的共享约定。",
    "4. 让大模型实现时，先调用 MCP 的 `docs_code_context` 获取未实现文档块和实现指令。",
    "",
    "## 约定",
    "",
    "- 文档使用中文描述业务语义。",
    "- API 路径、字段名、枚举值、代码标识符保留 ASCII。",
    "- 不要求用户手写稳定 ID 或 change-log；MCP 使用 `.docs-code/index.automerge` 跟踪增量。",
    "- 文档与代码冲突时，以文档为准，除非文档内部自相矛盾或涉及高风险未确认规则。"
  ].join("\n");
}

export function systemArchitecture(projectName: string, source?: SourceSummaryTemplateData): string {
  const sourceLines = source
    ? [
        "## 从源码识别到的结构",
        "",
        `- 源码文件数量：${source.totalFiles}`,
        `- Manifest：${source.manifests.length ? source.manifests.map((item) => `\`${item}\``).join("、") : "待确认"}`,
        `- API 相关文件：${source.apiFiles.length}`,
        `- UI 相关文件：${source.uiFiles.length}`,
        `- 数据相关文件：${source.dataFiles.length}`,
        `- 测试文件：${source.testFiles.length}`,
        "",
        "以上内容为 MCP 静态扫描推断，具体业务含义需要后续人工或大模型确认。"
      ]
    : [
        "## 初始架构假设",
        "",
        "- 前端、后端、数据库、客户端边界待实现时根据项目技术栈确定。",
        "- 功能文档描述业务闭环；代码实现应按现有工程分层落位。",
        "- 若后续发现实际架构不同，优先更新本文件再调整代码。"
      ];
  return [
    `# ${projectName} 系统架构`,
    "",
    "## 目标",
    "",
    "用文档描述系统边界、模块职责、数据流和外部依赖，让大模型实现时避免只凭对话上下文猜测。",
    "",
    ...sourceLines,
    "",
    "## 待确认",
    "",
    "- 部署形态、运行环境、鉴权方式、数据库类型、异步任务和第三方服务。"
  ].join("\n");
}

export function glossary(projectName: string, terms: string[]): string {
  const rows = [...new Set([projectName, ...terms])]
    .slice(0, 30)
    .map((term) => `| ${term} | 根据当前输入或源码推断，待补充精确定义 | 待确认 |`);
  return [
    "# 术语表",
    "",
    "| 术语 | 含义 | 状态 |",
    "|---|---|---|",
    ...(rows.length ? rows : ["| 待补充 | 待补充 | 待确认 |"])
  ].join("\n");
}

export function sharedApiConventions(): string {
  return [
    "# API 约定",
    "",
    "## 通用规则",
    "",
    "- 请求和响应字段名使用现有代码约定。",
    "- 成功响应应表达业务结果，失败响应应包含可定位的错误信息。",
    "- 涉及金额、权限、安全、隐私、删除、扣费、结算的行为必须在功能文档中明确写出。",
    "",
    "## 待确认",
    "",
    "- 统一响应包裹格式、分页格式、错误码命名、鉴权 header。"
  ].join("\n");
}

export function sharedUiRules(): string {
  return [
    "# UI 与交互共享规则",
    "",
    "## 页面状态",
    "",
    "| 状态 | 规则 |",
    "|---|---|",
    "| 初始 | 展示可理解的默认内容或入口 |",
    "| 加载 | 阻止重复提交，保留用户已输入内容 |",
    "| 空状态 | 说明当前没有可操作数据，并提供下一步入口 |",
    "| 错误 | 展示可恢复的错误信息，不泄露敏感内部细节 |",
    "| 成功 | 明确展示操作结果，并同步刷新相关数据 |",
    "",
    "## 交互",
    "",
    "- 表单提交、按钮点击、列表筛选、弹窗确认等交互应在功能文档中写出触发条件和结果。",
    "- 多端差异写入功能文档的“多端客户端规则”。"
  ].join("\n");
}

export function featureDocFromPrompt(input: PromptFeatureTemplateData): string {
  const domainUpper = upperIdPart(input.domain);
  const nameUpper = upperIdPart(input.name);
  return [
    `# ${input.title}`,
    "",
    "## 元信息",
    "",
    "| 字段 | 值 |",
    "|---|---|",
    `| Feature | \`FEAT-${domainUpper}-${nameUpper}\` |`,
    `| 来源 | 用户输入生成 |`,
    `| 生成依据 | ${input.reason} |`,
    "| 实现状态 | 待实现 |",
    "",
    "## 业务目标",
    "",
    `根据用户描述，本功能服务于 \`${input.projectName}\` 中的以下目标：`,
    "",
    `> ${input.prompt}`,
    "",
    "## 相关术语",
    "",
    input.keywords.length ? input.keywords.map((item) => `- ${item}`).join("\n") : "- 待补充",
    "",
    "## 用户操作入口",
    "",
    "- 待确认：入口页面、菜单、按钮、API 调用方或客户端触发方式。",
    "",
    "## 接口定义",
    "",
    "| API | 方法 | 路径 | 请求 | 响应 | 失败 |",
    "|---|---|---|---|---|---|",
    `| \`API-${domainUpper}-${nameUpper}-001\` | 待确认 | 待确认 | 待确认 | 待确认 | 待确认 |`,
    "",
    "## 完整请求链路",
    "",
    `1. 用户或外部系统触发 \`${input.title}\`。`,
    "2. 前端或客户端完成输入校验并发起请求。",
    "3. 后端校验鉴权、参数、业务规则和数据状态。",
    "4. 数据层执行查询或写入，并保证不变量。",
    "5. 后端返回业务结果。",
    "6. 前端或客户端刷新状态、展示成功、空状态或错误状态。",
    "",
    "## 业务规则",
    "",
    "| Rule | 条件 | 处理 |",
    "|---|---|---|",
    `| \`RULE-${domainUpper}-${nameUpper}-001\` | 输入满足业务前置条件 | 执行主流程，返回成功结果 |`,
    `| \`RULE-${domainUpper}-${nameUpper}-002\` | 输入不合法、权限不足、状态冲突或外部依赖失败 | 返回可恢复错误，不产生未定义副作用 |`,
    "",
    "## 决策表",
    "",
    "| 场景 | 前置条件 | 预期结果 |",
    "|---|---|---|",
    "| 正常 | 数据合法且权限满足 | 主流程成功 |",
    "| 参数错误 | 必填字段缺失或格式错误 | 拒绝请求并提示错误 |",
    "| 权限失败 | 当前用户无权操作 | 拒绝请求并记录安全相关上下文 |",
    "| 状态冲突 | 数据已被其他流程修改 | 返回冲突信息，前端刷新最新状态 |",
    "",
    "## 数据变化",
    "",
    "| Data | 对象 | 变化 | 约束 |",
    "|---|---|---|---|",
    `| \`DATA-${domainUpper}-${nameUpper}-001\` | 待确认 | 根据主流程新增、更新或查询 | 不产生重复、脏写或未授权数据变化 |`,
    "",
    "## 不变量",
    "",
    "- 失败分支不得产生文档未声明的持久化副作用。",
    "- 重复提交、网络重试、超时返回时，业务结果必须可解释且可恢复。",
    "",
    "## 页面与 UI 规则",
    "",
    "| UI | 区域 | 规则 |",
    "|---|---|---|",
    `| \`UI-${domainUpper}-${nameUpper}-001\` | 主界面 | 展示当前状态、可执行操作、加载态、空状态、错误态和成功反馈 |`,
    "",
    "## 交互逻辑",
    "",
    "| Interaction | 触发 | 结果 |",
    "|---|---|---|",
    `| \`IX-${domainUpper}-${nameUpper}-001\` | 用户提交或外部调用 | 禁止重复提交，等待后端结果并刷新界面状态 |`,
    "",
    "## 多端客户端规则",
    "",
    "- Web、iOS、Android、桌面、小程序、CLI 或 SDK 的差异待确认。",
    "- 如只有 API 服务，也需要描述调用方契约和错误处理。",
    "",
    "## 异常与失败分支",
    "",
    "| 失败 | 处理 |",
    "|---|---|",
    "| 参数错误 | 返回字段级错误或明确错误码 |",
    "| 权限失败 | 返回未授权或禁止访问，不泄露敏感数据 |",
    "| 外部依赖失败 | 返回可重试错误，必要时记录补偿任务 |",
    "| 超时 | 保证状态可查询，避免重复副作用 |",
    "",
    "## 测试要求",
    "",
    "| Test | 类型 | 断言 |",
    "|---|---|---|",
    `| \`TEST-${domainUpper}-${nameUpper}-001\` | 单元测试 | 业务规则正常和失败分支符合文档 |`,
    `| \`TEST-${domainUpper}-${nameUpper}-002\` | 集成或接口测试 | 请求链路、数据变化和错误响应符合文档 |`,
    `| \`TEST-${domainUpper}-${nameUpper}-003\` | 前端或客户端测试 | UI 状态和交互反馈符合文档 |`,
    "",
    "## 代码映射",
    "",
    "| 文档对象 | 代码位置 | 测试位置 | 状态 |",
    "|---|---|---|---|",
    `| \`FEAT-${domainUpper}-${nameUpper}\` | 待定位 | 待定位 | 待实现 |`,
    "",
    "## AI 实现要求",
    "",
    "- 实现前先调用 MCP 的 `docs_code_context` 获取本功能的变更块和上下文。",
    "- 只实现本文档声明的行为；低风险缺口可以按项目既有模式补齐，高风险缺口必须先确认。",
    "- 根据“测试要求”“决策表”“异常与失败分支”生成或更新测试。",
    "- 验证通过后调用 `docs_code_mark_synced`。"
  ].join("\n");
}

export function featureDocFromSource(input: SourceFeatureTemplateData): string {
  const domainUpper = upperIdPart(input.domain);
  const nameUpper = upperIdPart(input.name);
  const evidence = input.evidence.length ? input.evidence.map((item) => `- \`${item}\``).join("\n") : "- 待确认";
  const routes = input.routes.length ? input.routes.map((item) => `- \`${item}\``).join("\n") : "- 待确认";
  const components = input.components.length ? input.components.map((item) => `- \`${item}\``).join("\n") : "- 待确认";
  const models = input.models.length ? input.models.map((item) => `- \`${item}\``).join("\n") : "- 待确认";
  const tests = input.tests.length ? input.tests.map((item) => `- \`${item}\``).join("\n") : "- 待确认";
  return [
    `# ${input.title}`,
    "",
    "## 元信息",
    "",
    "| 字段 | 值 |",
    "|---|---|",
    `| Feature | \`FEAT-${domainUpper}-${nameUpper}\` |`,
    "| 来源 | 现有源码静态扫描生成 |",
    "| 实现状态 | 从源码推断，待人工确认 |",
    "",
    "## 源码证据",
    "",
    evidence,
    "",
    "## 业务目标",
    "",
    `从源码命名和结构推断，本功能属于 \`${input.projectName}\` 的 \`${input.title}\` 能力。具体业务语义待确认。`,
    "",
    "## 接口定义",
    "",
    routes,
    "",
    "## 完整请求链路",
    "",
    "1. 入口由源码证据中的路由、页面、组件或调用方触发。",
    "2. 应用层按现有代码路径处理请求。",
    "3. 数据层读取或写入相关模型、表或持久化对象。",
    "4. 返回结果后由 UI、客户端或 API 调用方处理成功与失败状态。",
    "",
    "## 业务规则",
    "",
    "| Rule | 规则 | 证据 | 状态 |",
    "|---|---|---|---|",
    `| \`RULE-${domainUpper}-${nameUpper}-001\` | 保持现有源码可观察行为 | 源码证据 | 从源码推断 |`,
    "",
    "## 数据变化",
    "",
    models,
    "",
    "## 页面与 UI 规则",
    "",
    components,
    "",
    "## 交互逻辑",
    "",
    `| \`IX-${domainUpper}-${nameUpper}-001\` | 交互由现有组件、事件处理器或客户端调用推断，待补充精确触发条件 |`,
    "",
    "## 异常与失败分支",
    "",
    "- 待从源码错误处理、测试用例和运行行为中补充。",
    "- 修改本功能前，应把隐含错误分支补写到本文档。",
    "",
    "## 测试要求",
    "",
    tests,
    "",
    "## 代码映射",
    "",
    "| 文档对象 | 代码位置 | 测试位置 | 状态 |",
    "|---|---|---|---|",
    `| \`FEAT-${domainUpper}-${nameUpper}\` | ${input.evidence.map((item) => `\`${item}\``).join("、") || "待定位"} | ${input.tests.map((item) => `\`${item}\``).join("、") || "待定位"} | 从源码推断 |`,
    "",
    "## AI 实现要求",
    "",
    "- 本文档由源码反推，不代表业务语义已经完整。",
    "- 若用户修改本文档，以修改后的文档为准更新代码和测试。",
    "- 实现前调用 `docs_code_context`，并结合源码证据定位变更点。",
    "- 验证通过后调用 `docs_code_mark_synced`。"
  ].join("\n");
}

export function indexContent(features: Array<{ title: string; path: string; source: string }>): string {
  return [
    "# 功能索引",
    "",
    "| 功能 | 文档 | 来源 | 状态 |",
    "|---|---|---|---|",
    ...(features.length
      ? features.map((item) => `| ${item.title} | \`${item.path}\` | ${item.source} | 待实现或待确认 |`)
      : ["| 待补充 | 待补充 | 待补充 | 待补充 |"])
  ].join("\n");
}

export function aiProtocol(): string {
  return [
    "# AI 按文档实现协议",
    "",
    "## 核心原则",
    "",
    "- Markdown 规格是行为源头。",
    "- 大模型实现前必须先获取 MCP 识别出的未实现文档增量。",
    "- 代码和测试应匹配文档，而不是匹配旧对话记忆。",
    "",
    "## 推荐 MCP 调用",
    "",
    "1. `docs_code_scan`：查看哪些文档块变了。",
    "2. `docs_code_context`：拿到模型可直接使用的实现上下文。",
    "3. 修改代码和测试。",
    "4. 运行相关验证。",
    "5. `docs_code_mark_synced`：验证通过后记录已实现基线。",
    "",
    "## 模糊规则",
    "",
    "- 金额、权限、安全、隐私、删除、扣费、结算、跨系统一致性等高风险内容标记为待确认时，不应直接编码。",
    "- 低风险 UI 文案、空状态、加载状态可按项目既有规范补齐，并回写文档。"
  ].join("\n");
}

export function sourceOverview(summary: SourceSummaryTemplateData, generatedAt: string): string {
  const section = (title: string, items: string[]) => [
    `## ${title}`,
    "",
    ...(items.length ? items.map((item) => `- \`${item}\``) : ["- 待确认"]),
    ""
  ].join("\n");
  return [
    "# 源码扫描概览",
    "",
    `生成时间：${generatedAt}`,
    "",
    `扫描到源码和配置文件 ${summary.totalFiles} 个。以下内容为静态启发式结果，用于帮助大模型从现有代码反推规格。`,
    "",
    section("Manifest", summary.manifests),
    section("API 文件", summary.apiFiles),
    section("UI 文件", summary.uiFiles),
    section("数据文件", summary.dataFiles),
    section("测试文件", summary.testFiles),
    section("路由线索", summary.routeHints),
    section("组件线索", summary.componentHints),
    section("模型线索", summary.modelHints)
  ].join("\n");
}
