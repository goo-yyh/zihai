export const locales = ["en", "zh-CN"] as const;

export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE_NAME = "zihai_locale";

type TranslationValues = Record<string, string | number>;

const zhCN: Record<string, string> = {
  "AI products built in public": "公开打造的 AI 产品",
  "Discover independent AI products and support the builders behind them.":
    "发现独立 AI 产品，支持背后的创造者。",
  "Share your AI products": "分享你的 AI 产品",
  English: "English",
  Chinese: "中文",
  "Switch language": "切换语言",
  "Main navigation": "主导航",
  "zihAI home": "zihAI 首页",
  Explore: "探索",
  Submit: "提交",
  "Sign in": "登录",
  Admin: "管理后台",
  Dashboard: "控制台",
  Settings: "设置",
  "Finish setup": "完成设置",
  Account: "账户",
  "Sign out": "退出登录",
  Overview: "概览",
  "My projects": "我的项目",
  Profile: "个人资料",
  Projects: "项目",
  Iterations: "迭代",
  Users: "用户",
  "Audit log": "审计日志",
  "Built with AI. Shipped by humans.": "AI 辅助构建，由人类完成交付。",
  "Find the next useful thing.": "发现下一个真正有用的产品。",
  "A curated launchpad for independent AI products. Discover what builders are shipping, follow every iteration, and support the work you want to see win.":
    "一个精选的独立 AI 产品发布平台。发现创造者正在交付的产品，关注每一次迭代，并支持你希望脱颖而出的作品。",
  "Explore products": "探索产品",
  "Submit yours": "提交你的产品",
  "The zihAI standard": "zihAI 标准",
  "Real products": "真实产品",
  "A working website or public GitHub repository.":
    "提供可用的网站或公开的 GitHub 仓库。",
  "Human review": "人工审核",
  "Every launch and iteration is checked before publishing.":
    "每次产品发布和迭代都会在公开前经过审核。",
  "Visible progress": "进展可见",
  "Updates stay attached to the product that inspired them.":
    "所有更新都会保留在对应产品下，持续展示成长过程。",
  "Community picks": "社区精选",
  "Popular right now": "当前热门",
  "Fresh launches": "最新发布",
  "Latest products": "最新产品",
  Products: "产品",
  "{count} product": "共 {count} 个产品",
  "{count} products": "共 {count} 个产品",
  "Counting products…": "正在统计产品…",
  Latest: "最新",
  Hottest: "最热",
  "Project sorting": "项目排序",
  "Search project titles and descriptions": "搜索项目标题和描述",
  "Refresh projects": "刷新项目",
  "Loading projects…": "正在加载项目…",
  "Loading more projects…": "正在加载更多项目…",
  "All projects are loaded.": "已加载全部项目。",
  "No matching projects": "没有匹配的项目",
  "Try another keyword or switch the sorting mode.":
    "请尝试其他关键词或切换排序方式。",
  "Unable to load projects.": "无法加载项目。",
  "Invalid project filters.": "项目筛选条件无效。",
  "Recently approved by the zihAI review team.": "最近由 zihAI 审核团队批准。",
  "The launchpad is ready": "发布平台已经就绪",
  "No approved products yet. Be the first builder to submit one for review.":
    "目前还没有已批准的产品，成为第一个提交审核的创造者吧。",
  "Submit a project": "提交项目",
  "Welcome to zihAI": "欢迎来到 zihAI",
  "Sign in to submit and support independent AI products.":
    "登录后即可提交产品并支持独立 AI 创作者。",
  "Continue with GitHub": "使用 GitHub 继续",
  "Continue with Google": "使用 Google 继续",
  "Sign in with GitHub or Google.": "请使用 GitHub 或 Google 登录。",
  Username: "用户名",
  "Sign in failed.": "登录失败。",
  "One last step": "最后一步",
  "Create your builder identity": "创建你的创造者身份",
  "Choose a public username, confirm your avatar, and verify a private contact email.":
    "选择公开用户名、确认头像，并确认一个私密联系邮箱。",
  "Your public avatar": "你的公开头像",
  "Use the zihAI default avatar or upload a custom image.":
    "使用 zihAI 默认头像，或上传自定义图片。",
  Avatar: "头像",
  "Your profile will be /u/username.": "你的个人主页地址将是 /u/username。",
  "Contact email": "联系邮箱",
  "GitHub did not provide an email. Add one for review and account communications.":
    "GitHub 未提供邮箱，请填写一个邮箱用于审核和账户沟通。",
  "Using your Google email. It is private and used only for review and account communications.":
    "默认使用你的 Google 邮箱。该邮箱不会公开，仅用于审核和账户沟通。",
  "Using your OAuth email. It is private and used only for review and account communications.":
    "默认使用 OAuth 返回的邮箱。该邮箱不会公开，仅用于审核和账户沟通。",
  "Setting up your account…": "正在设置账户…",
  "Nothing shipped here": "这里还没有内容",
  "This page does not exist, or the content is not publicly approved.":
    "该页面不存在，或相关内容尚未通过公开审核。",
  "Something went sideways": "出现了一些问题",
  "The request could not be completed. No changes were made.":
    "请求未能完成，未产生任何更改。",
  "Try again": "重试",
  "Project not found": "未找到项目",
  "Builder not found": "未找到创造者",
  Builder: "创造者",
  "View code": "查看代码",
  "Visit product": "访问产品",
  "Project screenshots": "项目截图",
  "Previous image": "上一张图片",
  "Next image": "下一张图片",
  "Go to image {number}": "查看第 {number} 张图片",
  "Image {current} of {total}": "第 {current} 张，共 {total} 张",
  "Build log": "构建日志",
  UPDATE: "更新",
  "Product update": "产品更新",
  Iteration: "迭代",
  Joined: "加入时间",
  Published: "发布时间",
  "Builder profile": "创造者主页",
  "Building here since {date}": "自 {date} 起在这里构建",
  "Published products": "已发布的产品",
  "{count} public launch": "{count} 个公开产品",
  "{count} public launches": "{count} 个公开产品",
  "Builder dashboard": "创造者控制台",
  "Welcome back, @{username}": "欢迎回来，@{username}",
  "Manage launches and share what changed next.":
    "管理产品发布，并分享下一次变化。",
  "New project": "新建项目",
  Approved: "已发布",
  "In review": "审核中",
  "Total likes": "获赞总数",
  "Recent projects": "最近项目",
  "View all": "查看全部",
  "Updated {date}": "更新于 {date}",
  "Your first launch starts here.": "从这里开始发布你的第一个产品。",
  "Create a project, add screenshots, then send it for review.":
    "创建项目、添加截图，然后提交审核。",
  "Create project": "创建项目",
  "Draft, submit, and keep every launch moving.":
    "保存草稿、提交审核，让每个产品持续推进。",
  "Updated {date} · {count} likes": "更新于 {date} · {count} 个赞",
  "Reviewer: {reason}": "审核意见：{reason}",
  Manage: "管理",
  "No projects yet": "还没有项目",
  "Create your first AI product listing and prepare it for review.":
    "创建你的第一个 AI 产品条目并准备提交审核。",
  "Created {date} · Public slug /p/{slug}":
    "创建于 {date} · 公开地址 /p/{slug}",
  "View public page": "查看公开页面",
  "Iteration submitted for review.": "迭代已提交审核。",
  "Reviewer feedback": "审核反馈",
  "This project is in review. You can still edit it, but changes remain private until approved.":
    "该项目正在审核中。你仍可编辑，但更改会在批准前保持私密。",
  Listing: "产品信息",
  "Saving an approved listing automatically returns it to review.":
    "保存已批准的产品信息后，会自动重新进入审核。",
  Screenshots: "截图",
  "Add between 1 and 3 images. The first image becomes the listing cover.":
    "添加 1–3 张图片，第一张将作为产品封面。",
  "Publish meaningful updates after the project itself is approved.":
    "项目获批后，可以发布有意义的更新。",
  "New iteration": "新建迭代",
  "Untitled update": "未命名更新",
  "No iterations yet.": "还没有迭代。",
  "Ready for review?": "准备好提交审核了吗？",
  "A project needs at least one screenshot and complete details.":
    "项目至少需要一张截图和完整信息。",
  "Delete this project, all iterations, and every uploaded image permanently?":
    "确定永久删除此项目、所有迭代和全部已上传图片吗？",
  Delete: "删除",
  "Submit for review": "提交审核",
  "Create an iteration": "创建迭代",
  "Capture what changed. You will add screenshots on the next screen.":
    "记录本次变化，你将在下一步添加截图。",
  "Update details": "更新详情",
  "Focus on meaningful product progress, not a changelog dump.":
    "聚焦有意义的产品进展，而不是简单堆砌变更日志。",
  "Untitled iteration": "未命名迭代",
  "For {project} · Created {date}": "所属项目 {project} · 创建于 {date}",
  "Iteration story": "迭代故事",
  "Editing an approved iteration sends it back to review.":
    "编辑已批准的迭代后，会重新进入审核。",
  "Add 1–3 images that make the improvement visible.":
    "添加 1–3 张能够直观展示改进的图片。",
  "Review controls": "审核操作",
  "Only approved parent projects can receive new iterations.":
    "只有已批准的上级项目才能添加新迭代。",
  "Delete this iteration and every uploaded image permanently?":
    "确定永久删除此迭代和全部已上传图片吗？",
  "New launch": "新产品发布",
  "Show us what you built": "展示你构建的产品",
  "Start with the story and destination. You will add 1–3 screenshots before submitting for human review.":
    "先填写产品故事和目标链接，提交人工审核前还需要添加 1–3 张截图。",
  "Project details": "项目详情",
  "Add a public website, a public GitHub repository, or both.":
    "请至少填写公开网站或公开 GitHub 仓库中的一个，也可以同时填写。",
  "Project name": "项目名称",
  "A sharp, memorable name": "一个鲜明、好记的名称",
  "What did you build?": "你构建了什么？",
  "Tell people what it does, who it helps, and what makes it interesting. Markdown is supported.":
    "介绍产品的功能、服务对象和独特之处。支持 Markdown。",
  "Markdown supported": "支持 Markdown",
  "10–4,000 characters": "10–4,000 个字符",
  "Add at least one destination": "请至少填写一个目标链接",
  "Website URL": "网站 URL",
  "GitHub repository": "GitHub 仓库",
  "Saving…": "保存中…",
  "Creating…": "创建中…",
  "Save project": "保存项目",
  "Version label": "版本标签",
  "(optional)": "（可选）",
  "v1.2, August update, New onboarding…": "v1.2、八月更新、全新引导…",
  "What changed?": "有哪些变化？",
  "Share the decisions, improvements, and lessons behind this iteration. Markdown is supported.":
    "分享本次迭代背后的决策、改进和经验。支持 Markdown。",
  "Save iteration": "保存迭代",
  "Create iteration": "创建迭代",
  "Action failed.": "操作失败。",
  "Image order updated.": "图片顺序已更新。",
  "Delete this image permanently?": "确定永久删除这张图片吗？",
  "Image deleted.": "图片已删除。",
  "Screenshot {number}": "截图 {number}",
  "Move left": "左移",
  "Move right": "右移",
  "Delete image": "删除图片",
  "You can upload at most {count} image.": "最多可以上传 {count} 张图片。",
  "You can upload at most {count} images.": "最多可以上传 {count} 张图片。",
  "{file}: JPEG, PNG, and WebP only.": "{file}：仅支持 JPEG、PNG 和 WebP。",
  "{file}: file is too large.": "{file}：文件过大。",
  "Uploading {current} / {total}": "正在上传 {current} / {total}",
  "Uploading {current} / {total} · {percentage}%":
    "正在上传 {current} / {total} · {percentage}%",
  "Saving {current} / {total}…": "正在保存 {current} / {total}…",
  "Upload authorization failed.": "上传授权失败。",
  "Avatar updated.": "头像已更新。",
  "Images uploaded.": "图片已上传。",
  "Upload failed.": "上传失败。",
  "Upload completion failed.": "上传完成信息保存失败。",
  "Upload image": "上传图片",
  "Add screenshots": "添加截图",
  "JPEG, PNG, or WebP · up to {size} MB each · {current}/{max} used":
    "JPEG、PNG 或 WebP · 每张不超过 {size} MB · 已使用 {current}/{max}",
  "Choose avatar": "选择头像",
  "Choose images": "选择图片",
  "Profile settings": "个人资料设置",
  "Control how your builder identity appears across zihAI.":
    "控制你的创造者身份在 zihAI 中的展示方式。",
  "Public identity": "公开身份",
  "Changing your username also changes your public profile URL.":
    "更改用户名也会改变你的公开个人主页地址。",
  "Lowercase letters, numbers, underscores, and hyphens.":
    "仅支持小写字母、数字、下划线和连字符。",
  "This email is private and used only for review and account communications.":
    "该邮箱不会公开，仅用于审核和账户沟通。",
  "Save profile": "保存个人资料",
  "Security settings": "安全设置",
  "Manage OAuth access and account data.": "管理 OAuth 登录和账户数据。",
  "OAuth-only sign-in": "仅使用 OAuth 登录",
  "Your account uses GitHub or Google. Password sign-in is disabled.":
    "你的账户使用 GitHub 或 Google 登录，密码登录已关闭。",
  "Delete account": "删除账户",
  "This permanently removes your profile, projects, iterations, likes, and uploaded Blob images.":
    "这会永久删除你的个人资料、项目、迭代、点赞和已上传的 Blob 图片。",
  "Type DELETE to confirm": "输入 DELETE 以确认",
  "Delete my account": "删除我的账户",
  "Review operations": "审核运营",
  "Admin overview": "管理概览",
  "Moderate launches, access, and platform safety.":
    "管理产品发布、访问权限和平台安全。",
  "All projects": "全部项目",
  "Pending projects": "待审核项目",
  "Pending iterations": "待审核迭代",
  Rejected: "已拒绝",
  "Open queue": "打开队列",
  "@{owner} · submitted {date}": "@{owner} · 提交于 {date}",
  pending: "待审核",
  "The project queue is clear.": "项目审核队列已清空。",
  "Project moderation": "项目审核",
  "Review every project state and its submission context.":
    "查看每个项目状态及其提交上下文。",
  all: "全部",
  approved: "已发布",
  rejected: "已拒绝",
  draft: "草稿",
  archived: "已归档",
  Project: "项目",
  Owner: "所有者",
  Status: "状态",
  Submitted: "提交时间",
  Action: "操作",
  Review: "审核",
  "No projects in this view.": "此视图中没有项目。",
  "Inspect website": "检查网站",
  "Inspect repository": "检查 GitHub 仓库",
  "Submission screenshot {number}": "提交截图 {number}",
  Description: "描述",
  "Approve for publication": "批准发布",
  "This immediately makes the project visible on the homepage, profile, and sitemap.":
    "批准后，项目会立即显示在首页、个人主页和站点地图中。",
  Approve: "批准",
  "Rejection reason:": "拒绝原因：",
  "Moderation history": "审核历史",
  "Iteration moderation": "迭代审核",
  "Keep published build logs useful, specific, and safe.":
    "确保公开的构建日志有用、具体且安全。",
  "for {project}": "所属项目 {project}",
  "No iterations in this view.": "此视图中没有迭代。",
  "Public project": "公开项目",
  "Iteration screenshot {number}": "迭代截图 {number}",
  "Approve iteration": "批准迭代",
  "This update will be added to the project’s public build log.":
    "此更新将添加到项目的公开构建日志中。",
  "Inspect access, linked providers, publishing activity, and bans.":
    "检查访问权限、关联登录提供商、发布活动和封禁状态。",
  "Search contact email or username": "搜索联系邮箱或用户名",
  Search: "搜索",
  User: "用户",
  Access: "权限",
  Providers: "登录提供商",
  "Setup incomplete": "设置未完成",
  banned: "已封禁",
  Inspect: "查看",
  "No users match this search.": "没有符合搜索条件的用户。",
  Banned: "已封禁",
  "Last updated": "最近更新",
  Onboarding: "账户设置",
  Complete: "已完成",
  Incomplete: "未完成",
  "Ban reason:": "封禁原因：",
  "Account controls": "账户控制",
  "Projects ({count})": "项目（{count}）",
  "Open project": "打开项目",
  "No projects.": "没有项目。",
  "Moderation and access-control events, newest first.":
    "审核和访问控制事件，按最新时间排序。",
  "Search action, target, admin, or reason": "搜索操作、目标、管理员或原因",
  "Target type": "目标类型",
  "All target types": "全部目标类型",
  Filter: "筛选",
  Target: "目标",
  Reason: "原因",
  Date: "日期",
  "deleted admin": "已删除的管理员",
  "No moderation actions recorded yet.": "还没有审核操作记录。",
  "Showing {count} result on this page": "本页显示 {count} 条结果",
  "Showing {count} results on this page": "本页显示 {count} 条结果",
  Pagination: "分页",
  Previous: "上一页",
  "First page": "第一页",
  Next: "下一页",
  "Reason for rejection": "拒绝原因",
  "Give the builder clear, actionable feedback.":
    "请向创造者提供清晰、可执行的反馈。",
  "Rejecting…": "正在拒绝…",
  Reject: "拒绝",
  "Administrator access": "管理员权限",
  "Admins can review content and manage users.":
    "管理员可以审核内容并管理用户。",
  "Admin access removed.": "管理员权限已移除。",
  "Admin access granted.": "管理员权限已授予。",
  "Remove admin": "移除管理员",
  "Make admin": "设为管理员",
  "Ban reason": "封禁原因",
  "Required when banning": "封禁时必填",
  "User unbanned.": "用户已解除封禁。",
  "User banned and sessions revoked.": "用户已封禁，相关会话已撤销。",
  "Unban user": "解除封禁",
  "Ban user": "封禁用户",
  admin: "管理员",
  user: "用户",
  "Please correct the highlighted fields.": "请修正标出的字段。",
  "Something went wrong. Please try again.": "出现问题，请重试。",
  "Username already taken.": "该用户名已被使用。",
  "Profile updated.": "个人资料已更新。",
  "Unable to update your profile.": "无法更新个人资料。",
  "Unable to finish onboarding.": "无法完成账户设置。",
  "Username must be at least 3 characters.": "用户名至少需要 3 个字符。",
  "Username must be at most 24 characters.": "用户名最多 24 个字符。",
  "Use only a-z, 0-9, _ or -.": "只能使用 a-z、0-9、_ 或 -。",
  "This username is reserved.": "该用户名不可用。",
  "Contact email must be at most 254 characters.": "联系邮箱最多 254 个字符。",
  "Enter a valid contact email.": "请输入有效的联系邮箱。",
  "Enter a valid website URL.": "请输入有效的网站 URL。",
  "Website URL must use http or https.": "网站 URL 必须使用 http 或 https。",
  "Enter a valid GitHub repository URL.": "请输入有效的 GitHub 仓库 URL。",
  "Use a GitHub repository URL such as https://github.com/owner/repo.":
    "请使用类似 https://github.com/owner/repo 的 GitHub 仓库 URL。",
  "Provide a Website URL, a GitHub URL, or both.":
    "网站 URL 和 GitHub URL 至少填写一个，也可以同时填写。",
  "Invalid website URL.": "网站 URL 无效。",
  "Invalid GitHub URL.": "GitHub URL 无效。",
  "Invalid project.": "项目无效。",
  "Project not found.": "未找到项目。",
  "Unable to create the project.": "无法创建项目。",
  "Changes saved and submitted for review. The public page is hidden until approval.":
    "更改已保存并提交审核，公开页面会在批准前保持隐藏。",
  "Project saved.": "项目已保存。",
  "Unable to save the project.": "无法保存项目。",
  "Invalid iteration.": "迭代无效。",
  "Iteration not found.": "未找到迭代。",
  "Iterations can only be added to approved projects.":
    "只能为已批准的项目添加迭代。",
  "Unable to create the iteration.": "无法创建迭代。",
  "Changes saved and submitted for review.": "更改已保存并提交审核。",
  "Iteration saved.": "迭代已保存。",
  "Unable to save the iteration.": "无法保存迭代。",
  "This feature is temporarily unavailable.": "此功能暂时不可用。",
  "Complete onboarding before continuing.": "请先完成账户设置。",
  Unauthorized: "未授权",
  Forbidden: "禁止访问",
  "Could not update your like.": "无法更新点赞状态。",
  "Only approved projects can be liked.": "只能点赞已批准的项目。",
  "Explore AI products built by @{username} on zihAI.":
    "探索 @{username} 在 zihAI 构建的 AI 产品。",
  "Upload denied.": "上传被拒绝。",
  "Invalid upload request.": "上传请求无效。",
  "Invalid request body.": "请求内容无效。",
  "Missing upload intent.": "缺少上传意图。",
  "Project is required.": "必须指定项目。",
  "A project can have at most 3 images.": "一个项目最多可以有 3 张图片。",
  "Iteration and project are required.": "必须指定迭代和项目。",
  "An iteration can have at most 3 images.": "一个迭代最多可以有 3 张图片。",
  "Complete onboarding first.": "请先完成账户设置。",
  "Upload intent is required.": "必须提供上传意图。",
  "Upload intent mismatch.": "上传意图不匹配。",
  "Uploaded file violates the image policy.": "上传文件不符合图片规则。",
  "Upload pathname mismatch.": "上传路径不匹配。",
  "User not found.": "未找到用户。",
  "Invalid image order.": "图片顺序无效。",
  "Project image not found.": "未找到项目图片。",
  "Iteration image not found.": "未找到迭代图片。",
  "Only pending content can be reviewed.": "只能审核待审核内容。",
  "Project rejected.": "项目已拒绝。",
  "Unable to reject the project.": "无法拒绝该项目。",
  "Iteration rejected.": "迭代已拒绝。",
  "Unable to reject the iteration.": "无法拒绝该迭代。",
  "At least one administrator is required.": "系统必须至少保留一名管理员。",
  "You cannot ban your own account.": "你不能封禁自己的账户。",
  "Transfer administrator access before deleting the final admin account.":
    "删除最后一个管理员账户前，请先转移管理员权限。",
  "Only draft or rejected projects can be submitted.":
    "只能提交草稿或已拒绝的项目。",
  "Only draft or rejected iterations can be submitted.":
    "只能提交草稿或已拒绝的迭代。",
  "Project must have between 1 and 3 images.": "项目必须包含 1–3 张图片。",
  "Iteration must have between 1 and 3 images.": "迭代必须包含 1–3 张图片。",
  "The project must be approved before submitting an iteration.":
    "提交迭代前，项目必须先获得批准。",
  "Project name must be at least 2 characters.": "项目名称至少需要 2 个字符。",
  "Project name must be at most 100 characters.": "项目名称最多 100 个字符。",
  "Description must be at least 10 characters.": "描述至少需要 10 个字符。",
  "Description must be at most 4,000 characters.": "描述最多 4,000 个字符。",
  "Version label must be at most 80 characters.": "版本标签最多 80 个字符。",
  "Rejection reason must be at least 3 characters.":
    "拒绝原因至少需要 3 个字符。",
  "Rejection reason must be at most 2,000 characters.":
    "拒绝原因最多 2,000 个字符。",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function localeFromAcceptLanguage(
  acceptLanguage: string | null | undefined,
): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  return acceptLanguage
    .split(",")
    .map((entry) => entry.trim().split(";")[0]?.toLowerCase())
    .some((language) => language === "zh" || language?.startsWith("zh-"))
    ? "zh-CN"
    : DEFAULT_LOCALE;
}

export function translate(
  locale: Locale,
  message: string,
  values: TranslationValues = {},
) {
  const template = locale === "zh-CN" ? (zhCN[message] ?? message) : message;
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}

export function createTranslator(locale: Locale) {
  return (message: string, values?: TranslationValues) =>
    translate(locale, message, values);
}
