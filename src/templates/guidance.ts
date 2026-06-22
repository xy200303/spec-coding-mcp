/* Built-in editable guidance prompt templates for on-demand model reminders. */
import { businessConfirmationBullets, currentTaskInstructionBullets, engineeringRuleSections } from "./markdown.js";

export interface GuidanceTemplate {
  name: string;
  title: string;
  purpose: string;
  fileName: string;
  version: string;
  description: string;
  category: string;
  triggers: string[];
  appliesTo: string[];
  content: string;
}

export interface GuidanceMetadata {
  name: string;
  version: string;
  title: string;
  description: string;
  category: string;
  triggers: string[];
  appliesTo: string[];
  updated: string;
}

const GUIDANCE_VERSION = "1.1.0";
const GUIDANCE_UPDATED = "2026-06-21";

const guidanceMetadatas = {
  engineering: {
    name: "engineering",
    version: GUIDANCE_VERSION,
    title: "工程与代码风格原则",
    description: "Engineering rules for simple, maintainable, testable, boundary-conscious implementation.",
    category: "engineering",
    triggers: ["architecture", "implementation", "refactor", "business-rule", "error-handling", "testing"],
    appliesTo: ["code", "tests", "architecture", "business-logic", "project-structure"],
    updated: GUIDANCE_UPDATED
  },
  "ui-ux": {
    name: "ui-ux",
    version: GUIDANCE_VERSION,
    title: "UI/UX Skill 路由原则",
    description: "UI/UX routing guidance that tells models to use the designated ui-ux-pro-max skill instead of maintaining local design rules.",
    category: "ui-ux",
    triggers: ["ui", "ux", "website", "component", "interaction", "copywriting", "visual-design"],
    appliesTo: ["frontend", "website", "components", "layout", "copy", "interaction", "responsive-design"],
    updated: GUIDANCE_UPDATED
  },
  "spec-writing": {
    name: "spec-writing",
    version: GUIDANCE_VERSION,
    title: "Spec 与行为记录原则",
    description: "Spec workflow rules for execution checklists, progress records, done archives, and behavior contracts.",
    category: "workflow",
    triggers: ["spec", "todo", "checkpoint", "done", "behavior-record", "handoff"],
    appliesTo: ["specs", "todos", "checkpoints", "behavior-records", "done-archives"],
    updated: GUIDANCE_UPDATED
  },
  "git-commit": {
    name: "git-commit",
    version: GUIDANCE_VERSION,
    title: "Git 提交工作流原则",
    description: "Safe commit workflow for verification, staging relevant files, commit messages, and final reports.",
    category: "git",
    triggers: ["commit", "git", "stage", "verify-before-commit"],
    appliesTo: ["git-status", "staging", "commit-message", "verification-report"],
    updated: GUIDANCE_UPDATED
  },
  "pr-submit": {
    name: "pr-submit",
    version: GUIDANCE_VERSION,
    title: "PR 提交工作流原则",
    description: "Pull request workflow for template discovery, commits, branch push, PR body, and fallback URLs.",
    category: "pull-request",
    triggers: ["pr", "pull-request", "merge-request", "branch-push", "gh-pr-create"],
    appliesTo: ["pull-requests", "branches", "pr-template", "review-notes"],
    updated: GUIDANCE_UPDATED
  },
  "quality-review": {
    name: "quality-review",
    version: GUIDANCE_VERSION,
    title: "质量审查原则",
    description: "Post-implementation review checklist for code quality, tests, architecture, UI/UX, and delivery risk.",
    category: "quality",
    triggers: ["review", "self-check", "verification", "before-done", "before-commit", "before-pr"],
    appliesTo: ["code-review", "tests", "ui-review", "risk-review", "delivery"],
    updated: GUIDANCE_UPDATED
  }
} satisfies Record<string, GuidanceMetadata>;

function yamlList(items: string[]): string[] {
  return items.map((item) => `  - ${yamlScalar(item)}`);
}

function yamlScalar(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function guidanceMetadataBlock(metadata: GuidanceMetadata): string[] {
  return [
    "---",
    `name: ${yamlScalar(metadata.name)}`,
    `version: ${yamlScalar(metadata.version)}`,
    `title: ${yamlScalar(metadata.title)}`,
    `description: ${yamlScalar(metadata.description)}`,
    `category: ${yamlScalar(metadata.category)}`,
    "triggers:",
    ...yamlList(metadata.triggers),
    "appliesTo:",
    ...yamlList(metadata.appliesTo),
    `updated: ${yamlScalar(metadata.updated)}`,
    "---"
  ];
}

function guidanceDocument(metadata: GuidanceMetadata, purpose: string, bodyLines: string[]): string {
  return [
    ...guidanceMetadataBlock(metadata),
    "",
    `# ${metadata.title}`,
    "",
    "## 用途",
    "",
    purpose,
    "",
    "## 使用方式",
    "",
    "- 当模型不确定相关原则、开始偏离约束或需要校准输出质量时，读取本文件。",
    "- 本文件是指导性提示词，不替代当前 spec、TODO、用户要求或代码事实。",
    ...(metadata.name === "ui-ux" ? [
      "- UI/UX 任务默认优先使用 `ui-ux-pro-max` skill：先用 `spec_skills_install` 确保 `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` 中的 `ui-ux-pro-max` 已安装到当前编程工具的全局 skills 目录；需要其他专项能力时先用 `spec_skills_search` 搜索 skills.sh。",
      "- 本 guidance 只负责路由到指定 skill，不再维护本地 UI/UX 设计原则或 checklist。"
    ] : []),
    "- 用户可以直接编辑本文件；工具会读取项目里的当前内容。",
    "",
    ...bodyLines
  ].join("\n");
}

function engineeringGuidance(): string {
  return guidanceDocument(guidanceMetadatas.engineering, "用于提醒模型保持简单、可维护、可测试、边界清晰的工程实现。", [
    "## 工程原则",
    "",
    "这些规则是强制约束，不是建议。",
    "",
    ...engineeringRuleSections(),
    "",
    "## 业务确认规则",
    "",
    "这些规则是硬性约束，不是建议。",
    "",
    ...businessConfirmationBullets()
  ]);
}

function uiUxGuidance(): string {
  return guidanceDocument(guidanceMetadatas["ui-ux"], "用于提醒模型在 UI/UX 任务中使用指定外部 skill，而不是在本 guidance 内展开设计原则。", [
    "## 指定 Skill",
    "",
    "- UI/UX 设计、实现、评审、修复和优化任务默认使用 `ui-ux-pro-max` skill。",
    "- 默认来源：`https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`。",
    "- 默认安装：先调用 `spec_skills_install`；不传参数时会通过 `npx skills add` 将 `ui-ux-pro-max` 安装到 Codex 全局 skills 目录。",
    "- 需要确认命令但不写入全局目录时，调用 `spec_skills_install` 并传 `dryRun: true`。",
    "- 需要查找其他 UI/UX 专项能力时，先调用 `spec_skills_search` 搜索 skills.sh，再按用户或任务需要安装。",
    "",
    "## 模型行为",
    "",
    "- 本文件只负责把 UI/UX 工作路由到指定 skill；不要在本文件内继续维护视觉、文案、首屏、官网结构或验收 checklist。",
    "- 模型不要基于本 guidance 自行设计 UI/UX 规则；读取并使用 `ui-ux-pro-max` skill 的说明来完成设计判断。",
    "- 如果 `ui-ux-pro-max` skill 与当前用户要求或当前 spec 冲突，以用户要求和当前 spec 为准，并在 checkpoint 或最终回复中说明取舍。",
    "- 如果 skill 未安装且当前环境不能安装，明确报告阻塞或使用 `dryRun` 给出安装命令，不要伪造已使用 skill。"
  ]);
}

function specWritingGuidance(): string {
  return guidanceDocument(guidanceMetadatas["spec-writing"], "用于提醒模型写清楚 spec、执行清单、进度记录和最终行为契约。", [
    "## 当前任务协议",
    "",
    ...currentTaskInstructionBullets(),
    "",
    "## 行为记录要求",
    "",
    "- 行为记录必须描述功能全过程，不只写一句结果。",
    "- `spec_done` 的 `## 最终行为契约` 是给用户审查的完整功能全景，不是模型内部摘要。",
    "- 最终行为契约必须覆盖所有已知情况：正常、失败、边界、权限、状态、异常、空值、默认参数和配置回退。",
    "- 模型自己采用的默认行为也必须写清楚，例如未传参数时怎么处理、缺字段时怎么回退、未覆盖配置时使用什么默认值、未改变的旧行为是什么。",
    "- 记录触发入口：用户、接口、命令、事件、定时任务或内部调用从哪里进入。",
    "- 记录输入与前置状态：请求参数、配置、已有数据、权限、状态和环境条件。",
    "- 记录执行步骤：按真实代码路径写出关键判断、调用、读写和返回过程。",
    "- 记录输出结果：响应、页面状态、文件、日志、事件或可观察行为。",
    "- 记录副作用：数据库、文件、网络请求、缓存、队列、外部服务或无副作用。",
    "- 记录分支条件：正常、失败、边界、权限、状态、异常和空值分支。",
    "- 记录默认行为：默认参数、配置来源、覆盖规则、模型选择的默认策略以及未传参数时的完整流程。",
    "- 记录验证结果：命令、覆盖的流程分支、关联文件和已知风险。",
    "- 禁止把猜测、常识或静态线索写成实际行为；只能记录已读代码、已跑测试或用户确认的事实。"
  ]);
}

function gitCommitGuidance(): string {
  return guidanceDocument(guidanceMetadatas["git-commit"], "用于提醒模型在用户要求提交代码时安全地验证、暂存、提交并汇报结果。", [
    "## 触发条件",
    "",
    "- 只有用户明确要求提交、帮我提交、commit、自动提交或等价表达时才使用本指导。",
    "- 不要因为完成了代码修改就自行提交；提交必须是用户意图或当前任务明确要求。",
    "- 提交前先完成用户要求的代码或文档工作，并确认没有未处理的阻塞。",
    "",
    "## 工作流",
    "",
    "1. 运行与本次变更风险匹配的验证；优先跑触达区域的测试，实际可行时同时跑 `git diff --check`。",
    "2. 查看 `git status --short` 和 `git diff --name-status`，确认工作区里哪些文件属于本次任务。",
    "3. 只暂存本次任务相关文件；无关脏文件保持未暂存，并在最终报告里说明。",
    "4. 如果用户要求继续提交剩余工作，可以提交所有确认属于当前任务的剩余变更，但跳过没有真实内容差异的文件。",
    "5. 提交信息语言遵循用户最新明确要求；没有指定时默认中文。用户给了精确提交信息时原样使用。",
    "6. 使用简洁、动作导向、具体的提交信息，避免 `更新代码` 这类空泛描述。",
    "7. 提交后报告短 hash、提交信息、验证命令与结果，以及工作区是否干净。",
    "",
    "## 安全规则",
    "",
    "- 禁止使用 `git reset --hard`、`git checkout --` 等破坏性命令准备提交，除非用户明确要求。",
    "- 不要把无关用户改动混进提交；如果相关性不清楚，先问一个简短问题。",
    "- 暂存未跟踪文件前必须看文件名和用途，跳过缓存、密钥、日志、构建产物和临时文件。",
    "- 如果文件里疑似包含 secret，不要在回复中引用；提交风险不清楚时先停止并询问。",
    "- 优先使用非交互式 git 命令，避免进入交互控制台。",
    "- 重要命令输出要在最终回复中总结，因为用户不一定能看到工具输出。",
    "",
    "## 暂存模式",
    "",
    "```powershell",
    "git add -- \"path/to/file\" \"path/to/other-file\"",
    "```",
    "",
    "删除已跟踪文件且属于本次任务时：",
    "",
    "```powershell",
    "git add -- \"path/to/deleted-file\"",
    "```",
    "",
    "提交前检查暂存快照：",
    "",
    "```powershell",
    "git diff --cached --name-status",
    "git diff --cached --check",
    "```",
    "",
    "## 提交信息",
    "",
    "- 默认中文提交信息使用“动作 + 主要对象”的短句，例如 `完善 guidance 提交工作流`。",
    "- 英文提交信息也保持短、具体、动作导向，例如 `Add guidance commit workflow`。",
    "- 不要把多个不相关主题塞进同一个提交信息。",
    "",
    "## 最终报告",
    "",
    "- 说明提交已完成。",
    "- 给出短 hash 和提交信息。",
    "- 列出实际通过的验证。",
    "- 只有存在剩余未暂存变更时才说明。"
  ]);
}

function prSubmitGuidance(): string {
  return guidanceDocument(guidanceMetadatas["pr-submit"], "用于提醒模型在用户要求准备、创建或提交 PR 时安全地发现模板、提交变更、推送分支并生成 PR 内容。", [
    "## 触发条件",
    "",
    "- 只有用户明确要求准备 PR、生成 PR、创建 Pull Request、提交 PR 或等价表达时才使用本指导。",
    "- 不要在没有用户授权时提交、amend、reset、rebase、force-push 或创建 PR。",
    "",
    "## 工作流",
    "",
    "1. 检查仓库状态：运行 `git status --short --branch`，识别当前分支、上游、remote URL 和可能的 base branch。",
    "2. 写 PR 正文或补交 commit 前，先查找项目 PR 模板。",
    "3. 同步决定 PR 语言和 commit 语言：用户指定优先；模板语言明显时跟随模板；否则默认英文。",
    "4. 如果当前 PR 工作还没提交，先按 Git 提交工作流安全提交；只提交属于该 PR 的变更。",
    "5. 检查分支是否已推送：没有 upstream 时用 `git push -u origin <branch>`；已有 upstream 且本地 ahead 时用 `git push`。",
    "6. 按发现的模板生成 PR 标题和正文；没有模板时使用默认英文格式。",
    "7. 工具可用时优先用 `gh pr create --title ... --body-file ...` 创建 PR，避免 shell 引号问题。",
    "8. 如果 `gh` 缺失或未认证，推送分支后提供 GitHub compare URL、标题和正文，供用户手动创建。",
    "",
    "## PR 模板发现顺序",
    "",
    "1. `.github/pull_request_template.md`",
    "2. `.github/PULL_REQUEST_TEMPLATE.md`",
    "3. `.github/PULL_REQUEST_TEMPLATE/*.md`",
    "4. `PULL_REQUEST_TEMPLATE.md`",
    "5. `pull_request_template.md`",
    "6. `docs/pull_request_template.md`",
    "7. `docs/PULL_REQUEST_TEMPLATE.md`",
    "",
    "可用搜索命令：",
    "",
    "```powershell",
    "rg --files | rg -i '(^|[\\\\/])(\\.github[\\\\/])?(pull_request_template|PULL_REQUEST_TEMPLATE)([\\\\/].*\\.md|\\.md)$'",
    "```",
    "",
    "- 如果找到多个模板，选与任务或分支最匹配的；没有明确选择时按上面的顺序取第一个确定路径并说明。",
    "- 保留模板标题、必需 checkbox 和必需措辞；占位符要替换成具体内容。",
    "",
    "## 默认 PR 格式",
    "",
    "没有项目模板时使用：",
    "",
    "```md",
    "## Summary",
    "-",
    "",
    "## Verification",
    "-",
    "",
    "## Notes",
    "-",
    "```",
    "",
    "- 默认英文，除非用户明确要求其他语言。",
    "- 标题要简洁、动作导向。",
    "- 只写实际运行过的验证；不要编造测试结果。",
    "- 没有 caveat、后续事项或手动步骤时省略 `Notes`。",
    "",
    "## Base Branch 与 Compare URL",
    "",
    "- base branch 推断顺序：用户指定、remote 默认分支、`main`、`master`。",
    "- GitHub remote 且不能创建 PR 时，提供 `https://github.com/<owner>/<repo>/compare/<base>...<branch>?expand=1`。",
    "- 非 GitHub remote 时，提供已推送分支、base branch、标题、正文，并说明需要在对应代码托管平台创建。",
    "",
    "## 安全规则",
    "",
    "- 不要在 PR 正文中包含 `.env`、日志、配置或命令输出里的 secret。",
    "- 工作区脏时，只提交属于当前 PR 的改动；无关文件保持未暂存并说明。",
    "- commit message 语言和 PR 语言保持一致。",
    "- 如果当前分支已有 open PR，能检测到时更新或报告已有 PR，不创建重复 PR。",
    "- 不要使用 `--force` 或 `--force-with-lease`，除非用户明确要求。",
    "- base branch 或 remote 无法安全推断时，先问一个简短问题。",
    "",
    "## 最终报告",
    "",
    "- 说明 PR 已创建还是仅准备好。",
    "- 给出 PR URL 或 compare URL。",
    "- 给出 PR 标题。",
    "- 如果本流程创建了 commit，给出 commit hash。",
    "- 说明使用的模板来源，或说明使用默认英文格式。",
    "- 列出实际运行的验证和剩余阻塞。"
  ]);
}

function qualityReviewGuidance(): string {
  return guidanceDocument(guidanceMetadatas["quality-review"], "用于提醒模型在实现后自查代码质量、测试覆盖、架构边界、UI/交互状态和交付风险。", [
    "## 使用时机",
    "",
    "- 完成一段实现、准备 checkpoint、准备 done、提交前或 PR 前读取本文件。",
    "- 复杂项目、跨模块改动、UI/交互改动、状态/权限/数据流变更必须做质量审查。",
    "- 小改动也应快速扫一遍相关项，避免把低质量实现归档或提交。",
    "",
    "## 代码质量自查",
    "",
    "- 代码是否符合现有项目结构和命名风格，是否避免无意义抽象和过度设计。",
    "- 模块边界是否清楚，UI、业务、数据访问和基础设施逻辑是否分离。",
    "- 错误、空值、异常、权限、状态和依赖失败是否 fail fast 且可理解。",
    "- 是否保持向后兼容，没有破坏已有 API、数据结构、行为契约或用户流程。",
    "- 是否存在重复逻辑、隐藏副作用、资源泄漏、阻塞主线程或不必要复杂度。",
    "",
    "## 测试与验证",
    "",
    "- 是否运行了与改动风险匹配的 build、unit、smoke、lint 或手工验证。",
    "- 正常、失败、边界、权限、状态、默认行为和回归风险是否至少有一种验证证据。",
    "- 未运行的验证必须说明原因；禁止编造测试结果。",
    "",
    "## UI 与交互质量",
    "",
    "- 如果本次涉及 UI/UX，是否已读取 `ui-ux` guidance 并使用指定的 `ui-ux-pro-max` skill。",
    "- 如果 skill 未安装，是否调用 `spec_skills_install`；无法安装时是否用 `dryRun: true` 给出命令并说明阻塞。",
    "- 是否记录实际使用的 skill、安装或 dry-run 结果，以及 skill 输出中被采纳的关键建议。",
    "- 是否避免在本地 quality-review guidance 中自行补充另一套 UI/UX 设计 checklist。",
    "",
    "## 交付前审查",
    "",
    "- checkpoint/done 是否记录真实行为、默认行为、边界处理和验证结果。",
    "- 是否还有未确认业务规则、残留 TODO、风险、阻塞或需要用户审查的问题。",
    "- 提交或 PR 前是否只包含相关改动，并且最终报告能让用户快速理解结果。"
  ]);
}

export const guidanceTemplates: GuidanceTemplate[] = [
  {
    ...guidanceMetadatas.engineering,
    purpose: "用于提醒模型保持简单、可维护、可测试、边界清晰的工程实现。",
    fileName: "engineering.md",
    content: engineeringGuidance()
  },
  {
    ...guidanceMetadatas["ui-ux"],
    purpose: "用于提醒模型在前端、页面、组件和交互任务中保持清晰、克制、可用的体验质量。",
    fileName: "ui-ux.md",
    content: uiUxGuidance()
  },
  {
    ...guidanceMetadatas["spec-writing"],
    purpose: "用于提醒模型写清楚 spec、执行清单、进度记录和最终行为契约。",
    fileName: "spec-writing.md",
    content: specWritingGuidance()
  },
  {
    ...guidanceMetadatas["git-commit"],
    purpose: "用于提醒模型在用户要求提交代码时安全地验证、暂存、提交并汇报结果。",
    fileName: "git-commit.md",
    content: gitCommitGuidance()
  },
  {
    ...guidanceMetadatas["pr-submit"],
    purpose: "用于提醒模型在用户要求准备、创建或提交 PR 时安全地发现模板、提交变更、推送分支并生成 PR 内容。",
    fileName: "pr-submit.md",
    content: prSubmitGuidance()
  },
  {
    ...guidanceMetadatas["quality-review"],
    purpose: "用于提醒模型在实现后自查代码质量、测试覆盖、架构边界、UI/交互状态和交付风险。",
    fileName: "quality-review.md",
    content: qualityReviewGuidance()
  }
];

export function guidanceTemplateByName(name: string): GuidanceTemplate | undefined {
  return guidanceTemplates.find((item) => item.name === name);
}
