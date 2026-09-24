---
paths:
  - "plugin/hooks/**"
---

# 改 guard 引擎前必读（每条都是真实回归）

原文：`git show v4-final:.claude/rules/learned/<文件名>`。

1. **命令检测 guard 的归一化方向取决于「词是执行还是数据」。**
   destructive / branch：剥 heredoc 与引号内容再匹配（写 PR 正文里的 `DROP TABLE` 不是执行）。
   但 destructive 的引号内容要**保留**：`psql -c "DROP DATABASE"` 引号里的就是要执行的 SQL。
   bypass：剥掉引号/反斜杠**字符**（不是内容）再匹配 —— shell 执行前也会吃掉它们。
   （`2026-05-20-guard-scan-strip-noncode`）
2. **安全 guard 不做「读/写」「安全子类」的 carve-out。** `core.hooksPath` 读写区分经 3 轮对抗验证全部被击穿
   （引号包操作符值、`${IFS}`、续行）。宁可广义拦截，真需要读就走旁路（`git rev-parse --git-path hooks`）。
   （`2026-07-15-static-regex-cannot-separate-hookspath-rw`）
3. **enforcement 必须覆盖所有等价工具。** MCP（`execute_sql`、`delete_*`）、MCP filesystem 写（用 `tool_input.path`
   不是 `file_path`）、PowerShell 工具 —— 只 match `Bash` / `Edit|Write` 等于留了后门。
   （`2026-05-29-mcp-guardrail-not-just-bash`、`2026-05-29-mcp-filesystem-bypasses-all-fileguards`）
4. **hook 看不到 MCP 工具的 description**（stdin 只有 `tool_input` 参数）。别在 hook 里扫描工具描述投毒 —— 那是 no-op，
   只会制造虚假安全感。（`2026-05-30-mcp-description-poison-not-in-hook-stdin`）
5. **路径一律先归一化再比较**：反斜杠 → `/`、MSYS `/c/` → `C:/`、Windows 大小写不敏感、去尾斜杠。
   修一处就 grep 所有 guard 同类代码；测试矩阵必须有 Windows 反斜杠 case。
6. **改完跑** `node --test plugin/hooks/engine/guard.test.mjs`，新行为必须配新用例（先写会失败的用例，再改实现）。
   夹具一律 `CTO_AUDIT=0`，不许往真实 `.claude/agent-logs/` 写假事件。
