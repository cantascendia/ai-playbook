---
description: 审当前分支改动 —— 自审 + 跨模型独立审（Codex / Gemini），合并成一份按严重度排序的结论
argument-hint: "[base 分支，默认 main] [--self-only]"
---
# Review

参数：$ARGUMENTS（默认对比 `main`）

## 1. 取改动

```bash
git fetch origin --quiet; git diff --stat origin/<base>...HEAD; git log --oneline origin/<base>..HEAD
```

读完整 diff 和被改文件的上下文。只审**这次改动**，不顺手审全仓。

## 2. 自审（Claude）

按影响排序，只报真问题：

| 级别 | 含义 |
|---|---|
| 🔴 | 会出错 / 丢数据 / 安全问题 —— 合并前必须修 |
| 🟠 | 设计或可维护性问题 —— 建议这次修 |
| 🟡 | 小改进 —— 可以不修 |

每条：`文件:行` + 触发条件（什么输入 → 什么错误结果）+ 修法。没有触发条件的猜测不要报。

## 3. 跨模型独立审（除非 `--self-only`）

不同模型漏不同的东西。依次尝试，拿到一份就够：

1. **Codex**（ChatGPT 订阅）：`codex review --base origin/<base>` —— 原生 review，不跑 shell，无 Windows 沙箱开销
2. **Gemini**（Google 订阅）：把 diff 贴进 prompt（print 模式不能交互授权，别让它自己去读文件）：
   `agy -p "Review this diff for correctness bugs and security issues. Report file:line, trigger, fix. Only real issues.

$(git diff origin/<base>...HEAD)"`
3. 都不可用 → 用 Agent 工具起一个**独立**的 Opus 子代理，只给 diff，不给你的自审结论

PR 已开且仓库装了 Codex / Gemini 的 GitHub review 集成时，直接读 PR 上的 bot 评论即可。

## 4. 合并结论

- 两边都报的 → 高置信
- 只有一边报的 → 自己读代码核实，核实不了标「待确认」
- 最后一行给结论：**可以合并** / **修完 🔴 再合并**
