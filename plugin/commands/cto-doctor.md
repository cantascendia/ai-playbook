---
description: 体检：guard 是否真在拦、hook 有没有重复注册、开场上下文有多大
---
# Doctor

逐项实测，报告 ✅ / ❌ + 修法。不要只读配置就下结论。

## 1. guard 单测

```bash
node --test "<plugin 根>/hooks/engine/guard.test.mjs"
```

plugin 根 = 本命令文件往上两级（`${CLAUDE_PLUGIN_ROOT}`）。

## 2. guard 活体测试

真实调用一次（应被拒绝，不会真的执行）：

- Bash：`git push origin main --dry-run`（当前在 main 以外的分支时也应被拒 —— refspec 指向 main）
- Bash：`terraform destroy -help`

两条都应返回 deny。没被拦 → plugin 未启用或 hook 未加载。

## 3. 重复注册

检查 `~/.claude/settings.json` 与项目 `.claude/settings.json` 的 `hooks`：
引用 `hooks/*-guard.sh`、`vibe-prompt-guard`、`eval-gate`、`trajectory-logger` 的条目都是 v4 残留，
会和 plugin 的 guard **重复执行**。发现就报，给出要删的具体条目。

## 4. 上下文预算

- `~/.claude/CLAUDE.md` + `~/.claude/rules/**` + 项目 `CLAUDE.md` + `.claude/rules/**` 的总字节数
- 目标：常驻 < 15KB。超了就列出最大的 3 个文件
- `claude plugin details cto` 可看 plugin 自身的 token 成本

## 5. 跨模型通道

`codex --version`、`agy --version` 是否可用（`/cto-review` 依赖其一）。
