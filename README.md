# AI Playbook — CTO Agent 闭环指挥系统 v3.2

Claude Code 优先的 AI CTO 指挥系统。CTO 以 Claude Code 为主执行环境，直接读取本地项目代码，规划任务，按需委派给 Antigravity / Codex 等平台执行。

## 支持平台

| 平台 | 角色 | 旗舰模型 | 适用场景 |
|---|---|---|---|
| **Claude Code** | 主平台（推荐） | Claude Opus 4.6 | CTO 规划、编码、审核、测试 — 大多数任务直接执行 |
| Antigravity | 辅助委派 | Gemini 3.1 Pro High | 浏览器视频验证、Stitch 2.0 UI 设计、Manager Surface 多代理编排 |
| Codex App | 辅助委派 | gpt-5.5 | 隔离并行 Worktree、定时 Automation、Plugins 生态、Computer Use |

## 快速开始

### 在新项目中启用（一键自动化）

在 ai-playbook 仓库中打开 Claude Code，运行：

```bash
/cto-init C:\projects\your-project
```

自动完成：复制 CLAUDE.md（含正确路径）+ 全部 15 个斜杠命令 + Skills + 配置 + 检测技术栈。

<details>
<summary>手动集成（可选）</summary>

```bash
cp templates/CLAUDE.md [your-project]/CLAUDE.md
# 编辑 CLAUDE.md，替换 [AI-PLAYBOOK-PATH] 为实际路径
```
</details>

### 在已集成项目中使用

```bash
/cto-start              # 新项目第零轮
/cto-resume             # 恢复会话
/cto-spec specify [...] # 三段式 Spec-Driven
/cto-vibe-check         # Vibe Coding 红线审计
/cto-harness-audit      # Harness 设计自审
/cto-eval init          # 启动 Eval-Driven Development
```

完整命令清单见 [CTO-PLAYBOOK.md](CTO-PLAYBOOK.md#斜杠命令15-个) 的"斜杠命令"章节。

## 文件说明

| 文件 | 用途 |
|---|---|
| `CTO-PLAYBOOK.md` | 操作手册入口（快速回忆 + 目录 + 模型速查 + 命令清单 + 版本历史） |
| `CLAUDE.md` | CTO 系统提示词（Claude Code 每次会话自动加载，含 14 条铁律） |
| `playbook/handbook.md` | 完整操作手册 §1-§40 |
| `templates/CLAUDE.md` | 目标项目精简模板（复制到项目根使用） |
| `templates/AGENTS.md` | Codex App 项目规则模板 |
| `templates/GEMINI.md` | Antigravity Workspace 规则模板 |
| `.claude/settings.json` | Claude Code 项目配置 |
| `.claude/commands/cto-*.md` | 15 个斜杠命令 |
| `.agents/skills/*/SKILL.md` | 5 个跨平台 Skill |

## 架构

```
ai-playbook/
├── CTO-PLAYBOOK.md              # 入口 + 目录 + 快速回忆
├── CLAUDE.md                     # CTO 系统提示词（14 条铁律）
├── playbook/
│   └── handbook.md              # 完整手册 §1-§40
├── templates/
│   ├── CLAUDE.md                # 目标项目模板
│   ├── AGENTS.md                # Codex 模板
│   └── GEMINI.md                # Antigravity 模板
├── .claude/
│   ├── settings.json            # 项目配置
│   └── commands/                # 15 个斜杠命令
└── .agents/skills/              # 跨平台 Skills（Claude Code / AG / Codex 共用）
    ├── ux-quality-checklist/
    ├── i18n-enforcement/
    ├── design-system-enforcement/
    ├── accessibility-checklist/
    └── release-readiness/
```

## 记忆系统

每个目标项目维护 `docs/ai-cto/` 目录，存储 CTO 的项目状态记忆：

| 文件 | 内容 | 类型 |
|---|---|---|
| `CONSTITUTION.md` | 不可妥协的项目原则（§37）| Procedural |
| `PRODUCT-VISION.md` | 产品愿景理解 | Semantic |
| `TECH-VISION.md` | 技术愿景 | Semantic |
| `ARCHITECTURE.md` | 架构图 + 演进路线 | Semantic |
| `STATUS.md` | 进度、质量评分、待办 | Episodic |
| `DECISIONS.md` | ADR 风格决策记录 | Semantic |
| `COMPETITOR-ANALYSIS.md` | 竞品分析 | Semantic |
| `REVIEW-BACKLOG.md` | 审核问题列表 | Semantic |
| `TECH-STACK.md` | 技术选型 | Semantic |
| `HARNESS-CHANGELOG.md` | Harness 演进档案（§34）| Procedural |

详见手册 §17 仓库内记忆持久化（含 Episodic / Semantic / Procedural 三层映射）。

新会话自动从 `docs/ai-cto/` 恢复上下文，无需从头分析。

## 文档

完整入口：[CTO-PLAYBOOK.md](CTO-PLAYBOOK.md)
完整手册：[playbook/handbook.md](playbook/handbook.md)（§1-§40）
