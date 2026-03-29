# AI Playbook — CTO Agent 指挥系统

本仓库存放 AI CTO 指挥系统的操作手册和对话指令模板。

所有项目共用同一套手册，每个项目的记忆持久化在各自仓库的 `docs/ai-cto/` 目录中。

## 文件说明

| 文件 | 用途 |
|---|---|
| `CTO-PLAYBOOK.md` | 操作手册入口（快速回忆区 + 目录 + 阅读指引） |
| `playbook/part1-core.md` | 手册 Part 1：核心流程 §1-§13 |
| `playbook/part2-extend.md` | 手册 Part 2：决策框架与高级流程 §14-§20 |
| `playbook/part3-production.md` | 手册 Part 3：Skill 生态与生产就绪 §21-§28 |
| `prompts/01-first-session.md` | 新项目第一次对话时粘贴 |
| `prompts/02-resume-session.md` | 同项目开新对话时粘贴（对话断了/换会话）|
| `prompts/03-context-compressed.md` | 对话中途 Claude 退化时粘贴 |
| `prompts/04-refresh-handbook.md` | 快速一句话刷新 |
| `prompts/05-cold-start-with-state.md` | 带手动状态的完整冷启动模板 |
| `prompts/06-cross-review.md` | 交叉审核指令模板 |
| `prompts/07-spec-session.md` | Spec-Driven 开发启动模板 |
| `prompts/08-stitch-design.md` | Stitch UI 设计启动模板 |
| `prompts/09-skill-ecosystem.md` | Agent Skill 生态管理模板 |
| `prompts/10-self-audit.md` | Playbook 自审质检模板 |
| `prompts/11-model-update.md` | 模型列表更新模板 |
| `prompts/12-release-checklist.md` | 发布前全面检查模板 |
| `.agents/skills/ux-quality-checklist/SKILL.md` | UI 提交前 UX 质量检查清单 |
| `.agents/skills/i18n-enforcement/SKILL.md` | 国际化合规检查 |
| `.agents/skills/release-readiness/SKILL.md` | 发布就绪检查 |
| `.agents/skills/design-system-enforcement/SKILL.md` | 设计系统合规检查 |
| `.agents/skills/accessibility-checklist/SKILL.md` | 无障碍合规检查 |

## 为什么拆分？

CTO-PLAYBOOK 原始文件约 44KB / 18,700 tokens。大多数 AI 平台（包括 Genspark）的 URL 抓取有 ~10,000 token 上限，单次读取会被截断，导致 §14 之后的决策框架、快捷命令、记忆持久化、高级流程、Skill 生态、CI/CD、发布管理、可观测性等章节丢失。

拆分后入口 + Part 1 + Part 2 + Part 3 各自控制在更易抓取的体量内，任何平台均能单次完整读取。入口文件包含快速回忆区和模型速查，即使 CTO 只读了入口也不会选错模型。

## 使用方式

1. `loveil381` 已预填为 GitHub 用户名
2. 将 `[REPO]` 替换为目标项目仓库名
3. 将 `[BRANCH]` 替换为当前工作分支（如适用）

## 手册 Raw URL

- 入口：https://raw.githubusercontent.com/loveil381/ai-playbook/main/CTO-PLAYBOOK.md
- Part 1：https://raw.githubusercontent.com/loveil381/ai-playbook/main/playbook/part1-core.md
- Part 2：https://raw.githubusercontent.com/loveil381/ai-playbook/main/playbook/part2-extend.md
- Part 3：https://raw.githubusercontent.com/loveil381/ai-playbook/main/playbook/part3-production.md
