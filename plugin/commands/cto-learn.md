---
description: 把一次真实事故写成教训（lesson），进 ai-playbook 的 plugin/lessons/，以后每个会话都能看到索引
argument-hint: "<事故描述，或留空从本次会话提取>"
---
# Learn

事故：$ARGUMENTS（留空 = 回顾本次会话里花了最多往返的那个坑）

## 门槛

只收**真实发生过**的事故：有 commit、日志或可复现步骤。以下不收：
- 假设性风险、"最佳实践"、通用建议
- 只适用于一个项目的业务细节（写进那个项目的 CLAUDE.md）
- 已有教训能覆盖的（去更新那条，别新建）

## 写法

在 ai-playbook 仓库（`C:/projects/ai-playbook`）新建分支，加 `plugin/lessons/<YYYY-MM-DD>-<slug>.md`：

```markdown
# <一句话：什么情况下会出什么事>

**教训**：<发生了什么，根因是什么 —— 具体到命令和文件>

## 什么时候想起这条
- <触发场景：文件类型、命令、任务类型>

## 怎么做
1. <可执行步骤>

## 别这么做
- ❌ <实际犯过的错>

## 来源
- <项目 + 日期 + commit / 日志>
```

再往 `plugin/lessons/INDEX.md` 加**一行**：`- **<触发场景>** → <要点>。\`<文件名>\``。
索引是每个会话都注入的，一行写不下说明要点没提炼好。

同时把两个清单里的 `version` 加一（`plugin/.claude-plugin/plugin.json` 与 `.claude-plugin/marketplace.json`）。
提交、推送、开 PR。合并后在各机器上 `git pull` 并运行 `node scripts/install.mjs` —— 它同时更新 Claude plugin 和 Codex 的副本
（只跑 `claude plugin update` 的话 Codex 读到的还是旧教训）。重启会话后生效。
