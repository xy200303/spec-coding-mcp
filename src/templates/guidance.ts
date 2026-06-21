/* Built-in editable guidance prompt templates for on-demand model reminders. */
import { businessConfirmationBullets, currentTaskInstructionBullets, engineeringRuleSections } from "./markdown.js";

export interface GuidanceTemplate {
  name: string;
  title: string;
  purpose: string;
  fileName: string;
  content: string;
}

function guidanceDocument(title: string, purpose: string, bodyLines: string[]): string {
  return [
    `# ${title}`,
    "",
    "## 用途",
    "",
    purpose,
    "",
    "## 使用方式",
    "",
    "- 当模型不确定相关原则、开始偏离约束或需要校准输出质量时，读取本文件。",
    "- 本文件是指导性提示词，不替代当前 spec、TODO、用户要求或代码事实。",
    "- 用户可以直接编辑本文件；工具会读取项目里的当前内容。",
    "",
    ...bodyLines
  ].join("\n");
}

function engineeringGuidance(): string {
  return guidanceDocument("工程与代码风格原则", "用于提醒模型保持简单、可维护、可测试、边界清晰的工程实现。", [
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
  return guidanceDocument("UI/UX 设计美学原则", "用于提醒模型在前端、页面、组件和交互任务中保持清晰、克制、可用的体验质量。", [
    "## 默认角色与风格",
    "",
    "- 以 Senior UI/UX Designer 的标准工作，参考 Linear / Vercel 的克制、精确、工程化审美。",
    "- 默认使用 8pt grid、Inter 字体和 Dark Mode 基底 `#0B0E14`。",
    "- 品牌气质采用 “Aether Vector”：minimal、precise、vector-inspired，少装饰，重结构、线条、对齐和清晰状态。",
    "",
    "## 视觉系统",
    "",
    "- 色彩比例遵循 60/30/10：约 60% 深色背景、30% 灰色 surfaces、10% 蓝色 accent。",
    "- CTA 必须高对比，主操作清晰可见；次要操作降低视觉重量但保持可发现。",
    "- 使用 CRAP 原则：Contrast、Repetition、Alignment、Proximity；间距、半径、边框、阴影和字体层级要一致。",
    "- 使用 Gestalt 原则组织界面：相关项目视觉上成组，跨组内容用背景、边界、留白或层级清楚分离。",
    "- 组件应贴合 dark surface：避免脏灰、低对比文字和无意义渐变；用边框、微妙背景差和蓝色 accent 建立层级。",
    "",
    "## 交互与状态",
    "",
    "- 所有异步操作要有 loading / pending 状态，避免用户误以为无响应。",
    "- 允许 undo 或可恢复路径；危险操作需要预防误触、确认或清晰后悔药。",
    "- 优先预防错误：禁用无效提交、即时校验输入、明确错误文案和恢复动作。",
    "- 交互反馈要及时但克制：hover、focus、active、disabled、empty、error、success 状态都要完整。",
    "",
    "## 原则",
    "",
    "- 先判断产品语境：工具型界面应信息密度高、导航清晰、视觉克制；展示型页面才需要更强叙事。",
    "- 首屏应直接承载真实体验或核心对象，不用空泛营销和装饰性布局替代功能。",
    "- 交互控件要符合直觉：图标按钮、开关、分段控件、菜单、标签页和输入组件各司其职。",
    "- 避免文字重叠、按钮挤压、卡片套卡片和只靠单一色相堆叠层次。",
    "- 固定格式元素要有稳定尺寸和响应式约束，避免 hover、加载和动态文本造成布局跳动。",
    "- 移动端和桌面都要检查信息层级、触控目标、可读性和空/加载/错误状态。",
    "- 优先使用已有设计系统和图标库；新增视觉风格要服务用户任务，不做无意义装饰。",
    "- 完成后用截图或实际运行检查关键视口，确认没有遮挡、空白、错位和不可读文本。"
  ]);
}

function specWritingGuidance(): string {
  return guidanceDocument("Spec 与行为记录原则", "用于提醒模型写清楚 spec、TODO、checkpoint 和最终行为契约。", [
    "## 当前任务协议",
    "",
    ...currentTaskInstructionBullets(),
    "",
    "## 行为记录要求",
    "",
    "- 行为记录必须描述功能全过程，不只写一句结果。",
    "- 记录触发入口：用户、接口、命令、事件、定时任务或内部调用从哪里进入。",
    "- 记录输入与前置状态：请求参数、配置、已有数据、权限、状态和环境条件。",
    "- 记录执行步骤：按真实代码路径写出关键判断、调用、读写和返回过程。",
    "- 记录输出结果：响应、页面状态、文件、日志、事件或可观察行为。",
    "- 记录副作用：数据库、文件、网络请求、缓存、队列、外部服务或无副作用。",
    "- 记录分支条件：正常、失败、边界、权限、状态、异常和空值分支。",
    "- 记录默认行为：默认参数、配置来源、覆盖规则以及未传参数时的完整流程。",
    "- 记录验证结果：命令、覆盖的流程分支、关联文件和已知风险。",
    "- 禁止把猜测、常识或静态线索写成实际行为；只能记录已读代码、已跑测试或用户确认的事实。"
  ]);
}

function gitCommitGuidance(): string {
  return guidanceDocument("Git 提交工作流原则", "用于提醒模型在用户要求提交代码时安全地验证、暂存、提交并汇报结果。", [
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
  return guidanceDocument("PR 提交工作流原则", "用于提醒模型在用户要求准备、创建或提交 PR 时安全地发现模板、提交变更、推送分支并生成 PR 内容。", [
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

export const guidanceTemplates: GuidanceTemplate[] = [
  {
    name: "engineering",
    title: "工程与代码风格原则",
    purpose: "用于提醒模型保持简单、可维护、可测试、边界清晰的工程实现。",
    fileName: "engineering.md",
    content: engineeringGuidance()
  },
  {
    name: "ui-ux",
    title: "UI/UX 设计美学原则",
    purpose: "用于提醒模型在前端、页面、组件和交互任务中保持清晰、克制、可用的体验质量。",
    fileName: "ui-ux.md",
    content: uiUxGuidance()
  },
  {
    name: "spec-writing",
    title: "Spec 与行为记录原则",
    purpose: "用于提醒模型写清楚 spec、TODO、checkpoint 和最终行为契约。",
    fileName: "spec-writing.md",
    content: specWritingGuidance()
  },
  {
    name: "git-commit",
    title: "Git 提交工作流原则",
    purpose: "用于提醒模型在用户要求提交代码时安全地验证、暂存、提交并汇报结果。",
    fileName: "git-commit.md",
    content: gitCommitGuidance()
  },
  {
    name: "pr-submit",
    title: "PR 提交工作流原则",
    purpose: "用于提醒模型在用户要求准备、创建或提交 PR 时安全地发现模板、提交变更、推送分支并生成 PR 内容。",
    fileName: "pr-submit.md",
    content: prSubmitGuidance()
  }
];

export function guidanceTemplateByName(name: string): GuidanceTemplate | undefined {
  return guidanceTemplates.find((item) => item.name === name);
}
