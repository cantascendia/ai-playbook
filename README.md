# AI Playbook — CTO Agent 指挥系统

本仓库存放 AI CTO 指挥系统的操作手册和对话指令模板。

所有项目共用同一套手册，每个项目的记忆持久化在各自仓库的 `docs/ai-cto/` 目录中。

## 文件说明

| 文件 | 用途 |
|---|---|
| `CTO-PLAYBOOK.md` | 完整操作手册，Claude 通过 URL 抓取阅读 |
| `prompts/01-first-session.md` | 新项目第一次对话时粘贴 |
| `prompts/02-resume-session.md` | 同项目开新对话时粘贴（对话断了/换会话）|
| `prompts/03-context-compressed.md` | 对话中途 Claude 退化时粘贴 |
| `prompts/04-refresh-handbook.md` | 快速一句话刷新 |
| `prompts/05-cold-start-with-state.md` | 带手动状态的完整冷启动模板 |
| `prompts/06-save-codex-quota.md` | Codex 额度紧张时切换省额度模式 |

## 使用方式

1. `loveil381` 已预填为 GitHub 用户名
2. 将 `[REPO]` 替换为目标项目仓库名
3. 将 `[BRANCH]` 替换为当前工作分支（如适用）

## 🚀 快捷操作速查

| 场景 | 粘贴文件 / 命令 |
|---|---|
| 新项目第一次对话 | `prompts/01-first-session.md` |
| 已有项目开新对话 | `prompts/02-resume-session.md` |
| 对话中途 Claude 退化 | `prompts/03-context-compressed.md` |
| 一句话刷新手册 | `prompts/04-refresh-handbook.md` 或直接说 `刷新手册` |
| 带进度手动恢复 | `prompts/05-cold-start-with-state.md` |
| **Codex 额度紧张** | `prompts/06-save-codex-quota.md` 或直接说 `省codex` |

## 手册 Raw URL

https://raw.githubusercontent.com/loveil381/ai-playbook/main/CTO-PLAYBOOK.md