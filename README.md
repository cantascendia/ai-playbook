# AI Playbook — CTO Agent 闭环指挥系统 v2.0

Claude Code 优先的 AI CTO 指挥系统。CTO 以 Claude Code 为主执行环境，直接读取本地项目代码，规划任务，按需委派给 Antigravity / Codex 等平台执行。

## 支持平台

| 平台 | 角色 | 适用场景 |
|---|---|---|
| **Claude Code** | 主平台（推荐） | CTO 规划、编码、审核、测试 — 大多数任务直接执行 |
| Antigravity | 辅助委派 | 浏览器验证 UI、Stitch UI 设计、AI 图像生成 |
| Codex App | 辅助委派 | 隔离并行 Worktree、定时 Automation、最强外部推理 |

## 快速开始

### Claude Code（推荐）

```bash
# 在目标项目中启动 CTO
/cto-start

# 恢复之前的会话
/cto-resume

# 更多命令
/cto-refresh    # 刷新手册
/cto-review     # 交叉审核
/cto-spec       # Spec-Driven 开发
/cto-release    # 发布检查
```

### 目标项目集成（一键自动化）

在 ai-playbook 仓库中打开 Claude Code，运行：

```bash
/cto-init C:\projects\your-project
```

自动完成：复制 CLAUDE.md（含正确路径）+ 斜杠命令 + Skills + 配置 + 检测技术栈。

<details>
<summary>手动集成（可选）</summary>

```bash
cp [ai-playbook-path]/templates/CLAUDE.md [your-project]/CLAUDE.md
# 编辑 CLAUDE.md，替换 [AI-PLAYBOOK-PATH] 为实际路径
```
</details>

## 文件说明

| 文件 | 用途 |
|---|---|
| `CTO-PLAYBOOK.md` | 操作手册入口（快速回忆区 + 目录 + 模型速查 + 版本历史） |
| `playbook/handbook.md` | 完整操作手册 §1-§37（环境、流程、决策、质量、生产就绪、安全、性能、Vibe Coding、Harness 设计、Eval-Driven、Self-Healing、Constitution） |
| `CLAUDE.md` | CTO 系统提示词（Claude Code 每次会话自动加载） |
| `templates/CLAUDE.md` | 目标项目用的精简 CTO 模板（复制到项目根目录使用） |
| `.claude/commands/cto-init.md` | **一键初始化**目标项目完整 CTO 系统 |
| `.claude/commands/cto-start.md` | 新项目第零轮启动 |
| `.claude/commands/cto-resume.md` | 恢复会话继续工作 |
| `.claude/commands/cto-refresh.md` | 刷新手册恢复行为规范 |
| `.claude/commands/cto-review.md` | 交叉审核关键改动 |
| `.claude/commands/cto-spec.md` | Spec-Driven 开发启动 |
| `.claude/commands/cto-design.md` | UI 设计流程 |
| `.claude/commands/cto-skills.md` | Skill 生态管理 |
| `.claude/commands/cto-audit.md` | Playbook 自审质检 |
| `.claude/commands/cto-models.md` | 模型列表更新 |
| `.claude/commands/cto-release.md` | 发布前全面检查 |
| `.claude/settings.json` | Claude Code 项目配置 |
| `.agents/skills/ux-quality-checklist/` | UI 提交前 UX 质量检查 |
| `.agents/skills/i18n-enforcement/` | 国际化合规检查 |
| `.agents/skills/release-readiness/` | 发布就绪检查 |
| `.agents/skills/design-system-enforcement/` | 设计系统合规检查 |
| `.agents/skills/accessibility-checklist/` | 无障碍合规检查 |

## 架构

```
ai-playbook/
├── CTO-PLAYBOOK.md              # 入口 + 目录 + 快速回忆
├── CLAUDE.md                     # CTO 系统提示词
├── playbook/
│   └── handbook.md              # 完整手册 §1-§37
├── templates/
│   └── CLAUDE.md                # 目标项目模板
├── .claude/
│   ├── settings.json            # 项目配置
│   └── commands/                # 11 个斜杠命令
│       ├── cto-init.md          # 一键初始化目标项目
│       ├── cto-start.md
│       ├── cto-resume.md
│       ├── cto-refresh.md
│       ├── cto-review.md
│       ├── cto-spec.md
│       ├── cto-design.md
│       ├── cto-skills.md
│       ├── cto-audit.md
│       ├── cto-models.md
│       └── cto-release.md
└── .agents/skills/              # 跨平台 Skills（Claude Code / AG / Codex 共用）
    ├── ux-quality-checklist/
    ├── i18n-enforcement/
    ├── design-system-enforcement/
    ├── accessibility-checklist/
    └── release-readiness/
```

## 记忆系统

每个目标项目中维护 `docs/ai-cto/` 目录，存储 CTO 的项目状态记忆：

- `PRODUCT-VISION.md` — 产品愿景理解
- `TECH-VISION.md` — 技术愿景
- `ARCHITECTURE.md` — 架构图 + 演进路线
- `STATUS.md` — 进度、质量评分、待办
- `DECISIONS.md` — ADR 风格决策记录
- `COMPETITOR-ANALYSIS.md` — 竞品分析
- `REVIEW-BACKLOG.md` — 审核问题列表
- `TECH-STACK.md` — 技术选型

新会话自动从 `docs/ai-cto/` 恢复上下文，无需从头分析。
