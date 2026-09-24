---
description: 把当前项目接入 cto 工作流（CLAUDE.md + docs/STATUS.md），并清掉 v4 的逐项目 hook 副本
argument-hint: "[项目路径，默认当前目录]"
---
# Init

目标项目：$ARGUMENTS（默认当前目录）。先读项目，基于实际技术栈写，不套模板空话。

## 1. 清理 v4 残留（有才做）

v4 把 guard 复制进每个项目；v5 由 plugin 全局提供，逐项目副本会**重复执行**：

- `.claude/settings.json` 的 `hooks` 里引用 `.claude/hooks/*.sh` 的条目 → 删除（其他设置保留）
- `.claude/hooks/*-guard.sh`、`eval-gate.sh`、`trajectory-logger.sh`、`.claude/hooks/lib/`、`.claude/hooks/engine/` → 删除
- `.claude/commands/cto-*.md`、`.claude/agents/{eval-runner,harness-auditor,pattern-detector,reliability-auditor,vibe-checker}.md` → 删除
- `docs/ai-cto/` → 保留内容；把 `STATUS.md` 移到 `docs/STATUS.md`，其余不动
- `scripts/forbidden-paths.txt` → 移到 `.claude/forbidden-paths.txt`（guard 两处都认）

## 2. CLAUDE.md

没有就创建；已有就只补缺的段落，不覆盖用户写的内容。控制在 60 行内：

```markdown
# <项目名>
<一句话：这是什么、给谁用>

## 技术栈与命令
- 安装 / 开发 / 测试 / 构建 / 部署：<实际命令>

## 约定
- <从代码里读出来的真实约定：目录结构、命名、状态管理、i18n 方式……>

## 状态
进度和待办在 docs/STATUS.md，开工前读，收工前更新。
```

## 3. docs/STATUS.md

```markdown
# 状态
最后更新：<日期>

## 现在
<一段话：做到哪了>

## 下一步
- [ ] …

## 已知问题
- …
```

## 4. 高风险路径（可选）

默认清单：auth / payment / billing / secrets / keys / migration / crypto / infra / terraform / ansible / CI 定义。
项目不同就写 `.claude/forbidden-paths.txt`（每行一个路径片段，写了就**替换**默认清单）。

## 5. 收尾

在分支上 commit，报告改了什么。不要改业务代码。
