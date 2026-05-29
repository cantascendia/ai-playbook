# Learned Rule: enforcement 必须覆盖 MCP 工具，不只 Bash

**学到的教训**: destructive-action-guard / bypass-guard 只 match "Bash" matcher，看不到任何 mcp__ 工具。但 agent 删生产库/项目最可能的通道恰是 MCP（execute_sql DROP / delete_branch / delete_project / r2_bucket_delete / deploy）。以"防 PocketOS 删库"为威胁模型却不覆盖 MCP = 形同虚设。architect-critic 飞轮第 8 轮发现。

## 触发场景

- 新增/审查任何 PreToolUse destructive/security guard 时
- 项目启用了 MCP server（Supabase / Vercel / Cloudflare / filesystem 等）
- 威胁模型涉及"防 agent 破坏外部资源"

## 应该怎么做

1. **guard 同时覆盖 Bash + mcp__.***：settings.json PreToolUse 加 `"matcher": "mcp__.*"` → mcp-guard.sh
2. **工具名语义检测**：_delete_ / _drop_ / destroy / delete_branch/project/bucket 等
3. **参数内容检测**：execute_sql 的 query/sql 参数含 DROP/TRUNCATE/DELETE-no-WHERE
4. **通用工具靠内容不靠名**：execute_sql 不能一律拦（SELECT 要放行），只看 query
5. **只读工具放行**：list_/get_/search_/query（只读）

## 避免什么

- ❌ guard 只写 "matcher": "Bash"（MCP 全绕过）
- ❌ execute_sql 工具名一律拦（SELECT 误拦）
- ❌ 假设 MCP 工具安全（它们权限往往比 Bash 更大 — 直连生产 DB/云）

## 来源

- architect-critic 飞轮第 8 轮 multi-agent team 审查（2026-05-29）
- OWASP Agentic Top 10 (2026) ASI04 / Least-Agency
- v3.11 mcp-guard.sh

## 冷却
- 创建日期: 2026-05-29
- 30 天内不重复提议同类 MCP guardrail
