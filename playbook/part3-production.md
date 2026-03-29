# CTO-PLAYBOOK Part 3 — Skill 生态与生产就绪（§21-§28）

> 本文件是 CTO-PLAYBOOK 操作手册的第三部分。
> 完整目录和快速回忆区见入口文件。
> Part 1（§1-§13）见：`https://raw.githubusercontent.com/loveil381/ai-playbook/main/playbook/part1-core.md`
> Part 2（§14-§20）见：`https://raw.githubusercontent.com/loveil381/ai-playbook/main/playbook/part2-extend.md`

---
## 21. Agent Skills 开放标准与 Skill 生态

### 21.1 开放标准：agentskills.io

Agent Skills（https://agentskills.io/specification）是一个开放规格，定义了跨 Agent 的技能包格式。Antigravity 和 Codex 均原生支持该标准，Skill 一次编写、两个平台共用。

**标准目录结构：**

```text
skill-name/
├── SKILL.md          # 必需：YAML frontmatter + Markdown 指令
├── scripts/          # 可选：可执行脚本（Python/Bash/JS）
├── references/       # 可选：参考文档
└── assets/           # 可选：模板、图表、数据
```
SKILL.md 必填字段：

字段	约束
name	1-64 字符，小写字母+数字+连字号，必须匹配父目录名
description	1-1024 字符，描述用途和触发条件（影响 Agent 是否自动激活）
可选字段： license、compatibility（环境要求，≤500 字符）、metadata（自定义键值对）、allowed-tools（预批准工具列表，实验性）

渐进式披露架构（两个平台均遵守）：

元数据扫描（~100 tokens）：Agent 启动时只读 name + description，判断相关性
完整指令加载（<5000 tokens 推荐）：Agent 认为相关时加载完整 SKILL.md body
资源按需加载：scripts/、references/、assets/ 仅在执行时读取
编写准则：

SKILL.md 正文保持 500 行以内
详细参考资料移入 references/ 子目录
每个 Skill 聚焦单一职责
description 要写清「何时触发」和「何时不应触发」
验证工具： npx skills-ref validate ./my-skill（来自 github.com/agentskills/agentskills）

21.2 两平台的 Skill 发现路径
范围	路径	Antigravity	Codex
项目级	.agents/skills/<name>/SKILL.md	✅ 自动发现	✅ 自动发现
项目级（子目录）	<subdir>/.agents/skills/	✅	✅（从 CWD 向上扫描到仓库根）
用户级	~/.gemini/antigravity/skills/	✅	❌
用户级	$HOME/.agents/skills/	❌	✅
系统级	/etc/codex/skills/	❌	✅（管理员部署）
内置	随工具发行	✅	✅
共用原则：

项目共用 Skill 统一放 .agents/skills/，两个平台都能读取
Codex 特有的 agents/openai.yaml（UI 元数据、调用策略、工具依赖）Antigravity 会忽略，不冲突
用户级个人 Skill 按平台分别放各自目录
Skill 名称全项目唯一，不允许同名 Skill 出现在不同路径
21.3 Codex 的 Skill 额外能力
Codex 的 Skill 支持 agents/openai.yaml 配置文件，可定义：

interface:
  display_name: "用户可见名称"
  short_description: "用户可见描述"
  icon_small: "./assets/icon.svg"
  brand_color: "#3B82F6"
  default_prompt: "默认使用提示"

policy:
  allow_implicit_invocation: false  # 设为 false 则 AI 不会自动激活，只能 $skill-name 显式调用

dependencies:
  tools:
    - type: "mcp"
      value: "server-name"
      description: "依赖的 MCP 服务器"
      transport: "streamable_http"
      url: "https://..."
Codex 内置 $skill-creator 可交互式创建新 Skill；$skill-installer <name> 可从社区安装 Skill。

21.4 Antigravity 的 Skill 额外能力
Antigravity 的 Skill 与 Workflows 配合：

Skill 封装单一操作流程
Workflow 编排多个 Skill 的执行顺序（/workflow-name 调用）
Skill 稳定后 → Codex 侧可转为 Automation（定时自动执行）
Antigravity 还支持 @filename 在 Rules/Skills 中引用文件，以及 Knowledge Items 自动持久化关键发现。

21.5 新 Skill 创建流程
当识别到可复用的操作模式时：

CTO 在指令中描述 Skill 目标和触发条件
Agent 在 .agents/skills/<skill-name>/ 下创建 SKILL.md
如需脚本辅助，创建 scripts/ 子目录
验证：两个平台分别测试 Skill 是否被正确发现和执行
稳定后纳入项目标准 Skill 集合
CTO 决策准则：

手动执行同类操作超过 2 次 → 创建 Skill
Skill 只含指令（instruction-only）为默认选择，除非需要确定性行为才加 scripts
每个 Skill 的 description 必须足够精确，避免误触发
## 22. 社区 Skill 推荐清单
22.1 Anthropic 官方 Skills
仓库：https://github.com/anthropics/skills （Apache 2.0）

遵循 Agent Skills 开放标准，虽然设计给 Claude，但 SKILL.md 格式通用，instruction-only 类型可直接复制到 .agents/skills/ 供 Antigravity / Codex 使用。

推荐按需安装：

Skill	用途	适用场景
frontend-design	避免 AI 生成通用美学，做大胆设计决策（React + Tailwind）	有前端的项目
webapp-testing	用 Playwright 测试本地 Web 应用，生成截图验证	需要 UI 回归测试
mcp-builder	创建高质量 MCP 服务器的完整指导	需要自建 MCP 集成
docx / pdf / pptx / xlsx	创建/编辑/分析 Office 文档	需要生成报告/文档
canvas-design	用设计哲学创建 .png/.pdf 视觉艺术	需要生成图形资产
skill-creator	交互式引导创建新 Skill（Q&A 方式）	批量创建项目 Skill
安装方式（复制 SKILL.md 到项目）：

# 方式 1：直接从 GitHub 下载单个 Skill
mkdir -p .agents/skills/frontend-design
curl -o .agents/skills/frontend-design/SKILL.md \
  https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md

# 方式 2：克隆整个仓库后按需复制
git clone https://github.com/anthropics/skills.git /tmp/anthropic-skills
cp -r /tmp/anthropic-skills/skills/webapp-testing .agents/skills/
22.2 obra/superpowers（社区最佳实践库）
仓库：https://github.com/obra/superpowers

提供 20+ 经实战检验的 Skill，核心亮点：

TDD 驱动开发工作流
/brainstorm → /write-plan → /execute-plan 端到端流程
调试、协作模式、技能搜索
适合提取其中的 SKILL.md 思路，改写为本项目的 .agents/skills/
22.3 Trail of Bits 安全 Skills
仓库：https://github.com/trailofbits/skills

提供：CodeQL/Semgrep 静态分析指导、变体分析、代码审计流程、漏洞检测模式。

适用场景： 项目涉及用户数据、支付、认证等安全敏感功能时，将相关 SKILL.md 复制到 .agents/skills/security-audit/。

**社区审核版：** `https://github.com/trailofbits/skills-curated`

Trail of Bits 维护的经过社区审核的安全 Skill 市场，每个 Skill 和来源市场都经过质量和安全审查。适合对安全 Skill 来源有严格要求的项目，优先从此仓库安装。

22.4 OpenAI 官方 Skills
仓库：https://github.com/openai/skills

Codex 原生支持。在 Codex 中执行 $skill-installer <skill-name> 安装。

也可手动复制 SKILL.md 到 .agents/skills/ 供 Antigravity 使用（instruction-only 类型兼容）。

22.5 Google Stitch Skills
仓库：https://github.com/google-labs-code/stitch-skills

安装方式和详细说明见第 5.1 章 ⑧ Google Stitch 集成。

22.6 社区 Skill 安全准则
只从可信来源安装：优先选择上述官方/知名仓库
安装前必须审查：阅读完整 SKILL.md 和所有 scripts/ 内容
警惕脚本类 Skill：scripts/ 中的代码会被 Agent 执行，有权限风险
先在非生产环境测试：新 Skill 先在 feature 分支验证
定期审计：每月检查已安装 Skill 是否有更新或已知漏洞

---

## 23. CI/CD 流水线

### 23.1 为什么需要 CI/CD

AI Agent 每轮产出代码后，只有 commit + push 和人工验证。没有自动化质量关卡，意味着：测试可能跑不通但没人知道、构建可能失败但下一轮继续写、多轮改动之间可能互相冲突。CI/CD 是防止"在废墟上盖楼"的唯一机制。

### 23.2 最小可用流水线（第零轮必须搭建）

CTO 在第零轮的指令中，必须包含搭建基础 CI 的任务。最小配置：

**GitHub Actions 示例（Flutter 项目）：**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, improve/*, feat/*, fix/*]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: 'stable'
      - run: flutter pub get
      - run: flutter analyze --fatal-infos
      - run: flutter test
      - run: flutter build apk --debug  # 验证构建不崩
```

最小要求：

- `flutter analyze`（或对应语言的 lint）— 每次 push 触发
- `flutter test` — 每次 push 触发
- 构建验证 — 每次 push 触发
- PR 合并到 `main` 必须 CI 绿灯

### 23.3 进阶流水线（项目成熟后添加）

- 集成测试 / 端到端测试（`integration_test/`）
- 代码覆盖率报告（`--coverage` + Codecov / Coveralls）
- 自动构建测试包（APK / IPA）上传到分发平台（Firebase App Distribution / TestFlight）
- 自动生成 CHANGELOG
- 版本号自动递增

### 23.4 CTO 职责

- 第零轮：指令中包含创建 `.github/workflows/ci.yml` 的任务
- 每轮：检查用户回传的 CI 状态（通过/失败）；CI 失败则优先修复，不发新任务
- Agent 犯错导致 CI 红 → 写入 Rules 防再犯
- 每 3 轮审视：CI 流水线是否需要加新步骤

## 24. 发布管理

### 24.1 版本号规范

遵循语义化版本（Semantic Versioning）：`MAJOR.MINOR.PATCH`

- MAJOR：不兼容的 API / 数据格式变更
- MINOR：向后兼容的新功能
- PATCH：向后兼容的问题修复

Flutter 项目同时维护 `version` 字段（`pubspec.yaml`）和 `versionCode/buildNumber`。CTO 在发布指令中明确指定版本号。

### 24.2 发布前检查清单

CTO 在发出"发布"指令前，必须逐项确认：

功能层面：

- 所有计划功能已实现且通过验收（非硬编码占位）
- 核心用户流程的端到端测试全部通过
- 已知 bug 列表中无 🔴 Critical 和 🟠 Major 项

技术层面：

- CI 流水线全绿（lint + test + build）
- 无 TODO / FIXME / HACK 残留在即将发布的代码中
- 环境配置已切换到生产环境（API 地址、密钥、功能开关）
- ProGuard / 代码混淆已配置（如适用）
- App 签名证书配置正确

应用商店层面：

- App 图标、启动画面已替换为正式版
- 商店截图（各尺寸）已准备
- 应用描述、关键词、分类已填写
- 隐私政策 URL 已上线且可访问
- 权限使用说明已填写（摄像头、定位、通知等为什么需要）
- 年龄分级已填写
- Apple 审核指南 / Google Play 政策自查通过

可观测性层面：

- 崩溃监控 SDK 已集成并验证（详见 §25）
- 关键埋点已部署（详见 §25）

### 24.3 灰度发布策略

不建议首次上线就全量推送：

- Google Play：使用分阶段发布（先 5% → 20% → 50% → 100%）
- iOS：使用 Phased Release（7 天逐步推出）
- 监控灰度阶段的崩溃率和用户反馈，有严重问题立即暂停

### 24.4 CTO 职责

- 当产品完成度达到发布标准时，主动提醒用户准备发布
- 输出发布指令时附带完整检查清单（上方）
- 在 `docs/ai-cto/STATUS.md` 中记录每次发布的版本号、日期、变更摘要
- 发布后关注 §25 的监控数据，72 小时内快速迭代修复线上问题

## 25. 可观测性

### 25.1 为什么在开发阶段就要集成

崩溃监控和性能分析不是"上线后再加"的东西。原因：

- 开发阶段就能捕获 Agent 代码中的隐藏崩溃（测试未覆盖的路径）
- 性能基线需要在开发阶段就建立，否则无法判断"变快了还是变慢了"
- 用户行为埋点直接影响产品决策，越早集成数据越完整

### 25.2 最小可用集成（第零轮或第一轮必须搭建）

崩溃监控（必选其一）：

- Firebase Crashlytics（免费，Flutter 原生支持）
- Sentry（开源可自建，支持 Flutter / React Native / 全平台）

性能监控（建议）：

- Firebase Performance Monitoring（免费）
- 自建关键指标采集：冷启动时间、页面加载时间、帧率

用户行为分析（建议）：

- Firebase Analytics（免费，和 Crashlytics 同一套 SDK）
- 关键埋点：核心功能使用率、用户路径、留存相关事件

### 25.3 关键埋点清单

CTO 在第零轮产品愿景理解后，必须列出需要埋点的事件：

| 类别 | 示例事件 | 作用 |
|---|---|---|
| 启动 | `app_open`、`cold_start_time` | 性能基线 |
| 认证 | `login_success`、`login_fail`、`signup_complete` | 转化漏斗 |
| 核心功能 | `feature_x_used`、`feature_x_complete`、`feature_x_error` | 功能活跃度 |
| 付费（如适用） | `purchase_start`、`purchase_success`、`purchase_fail` | 营收追踪 |
| 错误 | `api_error`、`timeout`、`unhandled_exception` | 稳定性预警 |

### 25.4 CTO 职责

- 第零轮：在技术愿景中评估应选择的监控方案
- 第一轮或第二轮：指令中包含集成崩溃监控 SDK 的任务
- 发布前：确认崩溃监控已验证（故意触发一次 crash 确认上报成功）
- 每轮回传中增加关注：CI 日志中是否有未捕获异常
- 如果项目已上线：每 3 轮从监控后台提取崩溃率和性能指标，纳入状态报告
instruction-only 优先：纯指令型 Skill 安全性远高于含脚本的 Skill
---

## 26. 设计系统

### 26.1 为什么需要设计系统

AI Agent 没有审美一致性。如果没有统一的设计系统，Agent 每次写 UI 都会自己决定颜色、字号、间距、圆角，导致同一个 App 里每个页面风格不同。设计系统是解决"看着不专业"的根本方案。

### 26.2 设计系统文件

在项目仓库根目录或 `docs/` 下维护一个 `DESIGN.md`（或 `.stitch/DESIGN.md`），包含：

**品牌色（Color Palette）：**
- 主色、辅色、强调色、背景色、文字色、错误色、成功色、警告色
- 每种颜色的具体 HEX / RGB 值
- 浅色模式和深色模式各一套

**字体体系（Typography）：**
- 标题字体、正文字体、代码字体
- 各级标题的字号、字重、行高
- 正文、标注、按钮文字的字号规范

**间距体系（Spacing）：**
- 基础单元（如 4px / 8px）
- 组件内边距、组件间距、页面边距的标准值
- 遵循 4 的倍数或 8 的倍数体系

**圆角体系（Border Radius）：**
- 按钮圆角、卡片圆角、输入框圆角、弹窗圆角

**组件规范（Component Specs）：**
- 按钮（主要/次要/文字/危险）的颜色、大小、状态
- 输入框（正常/聚焦/错误/禁用）的样式
- 卡片、列表项、导航栏、标签页的标准布局
- 图标风格和大小规范

**动效规范（Animation）：**
- 页面过渡时长和曲线
- 元素出现/消失动画
- 加载动画标准

### 26.3 CTO 职责

- 第零轮：如果项目没有 DESIGN.md，在第一轮指令中让 Agent 创建（可通过 Stitch 的 `design-md` Skill 生成）
- 如果项目已有设计稿，指导 Agent 从设计稿提取 design tokens 写入 DESIGN.md
- 审核 Agent 的 UI 代码时，对比 DESIGN.md 检查一致性
- 发现偏离设计系统 → 返工 + 写入 Rules

### 26.4 代码中的落地

设计系统不能只是文档，必须转化为代码中的 theme / design tokens：

- **Flutter**：`ThemeData` + `ColorScheme` + `TextTheme`，所有 Widget 引用 theme 不硬编码
- **React**：CSS 变量 / Tailwind config / styled-components theme
- **通用**：禁止在组件中直接写 `Color(0xFF...)` 或 `fontSize: 14`，必须引用 theme 常量

CTO 在 Rules 中写入：所有颜色、字号、间距必须引用 theme，不得硬编码魔法数字。

---

## 27. 无障碍（Accessibility）

### 27.1 最低要求

以下是 App 上架和合规的最低无障碍要求，CTO 在审核中必须检查：

**语义标签：**
- 所有图片有 `semanticLabel`（Flutter）/ `alt`（Web）/ `contentDescription`（Android）
- 装饰性图片标记为 `excludeFromSemantics: true`
- 所有可交互元素有语义描述（按钮、链接、开关、滑块）

**对比度：**
- 正文文字与背景色对比度 ≥ 4.5:1（WCAG AA 级）
- 大号文字（≥18px 粗体或 ≥24px 常规）对比度 ≥ 3:1
- 可在 DESIGN.md 中预先验证所有颜色组合

**触控目标：**
- 所有可点击元素最小 48x48 dp（与 UX Skill 中的检查项一致）
- 相邻可点击元素间距 ≥ 8dp

**焦点与导航：**
- Tab / 方向键导航顺序合理（Web / 桌面端）
- 屏幕阅读器遍历顺序与视觉顺序一致
- 焦点状态有明显视觉反馈

**动态内容：**
- 支持系统级字体缩放（Flutter 的 `MediaQuery.textScaleFactor`）
- 动画可被系统"减少动态效果"设置关闭
- 加载状态对屏幕阅读器有语音提示

### 27.2 CTO 职责

- 第零轮八维审核中的 UX 维度覆盖无障碍基础检查
- 在 AGENTS.md / Rules 中写入无障碍规则
- 发布前检查清单中确认无障碍基础项通过

---

## 28. 隐私合规

### 28.1 基础要求

App 收集、存储、传输用户数据时必须合规。CTO 在第零轮分析产品愿景后，必须识别数据合规需求：

**数据收集告知：**
- App 首次启动或注册时明确告知用户收集了哪些数据
- 提供隐私政策链接（应用商店上架必填）
- 可选数据（如分析统计）需要用户明确同意（opt-in）

**数据存储安全：**
- 敏感数据（密码、Token、个人信息）不得明文存储
- 本地存储使用加密方案（Flutter: `flutter_secure_storage`）
- 服务端通信必须 HTTPS

**数据最小化：**
- 只收集产品功能必需的数据
- 不需要的权限不申请

**用户权利：**
- 提供数据导出功能（如适用）
- 提供账号/数据删除功能（Apple 审核硬性要求）
- 用户可撤回数据收集同意

### 28.2 应用商店合规映射

| 要求 | Apple App Store | Google Play |
|---|---|---|
| 隐私政策 | 必填 URL | 必填 URL |
| 数据收集声明 | App Privacy 营养标签 | 数据安全表单 |
| 删除账号 | 必须提供（2024 起强制） | 必须提供（2024 起强制） |
| 追踪透明度 | ATT 弹窗（IDFA） | 不强制但建议 |
| 儿童保护 | COPPA 合规（如面向儿童） | 家庭政策合规 |

### 28.3 CTO 职责

- 第零轮：分析产品涉及的用户数据类型，输出合规需求清单
- 在 SPEC.md 中明确数据处理方式
- 在发布前检查清单（§24.2）中确认隐私相关项通过
- 如果项目涉及敏感数据（健康、金融、儿童），标记为必须交叉审核（§19）