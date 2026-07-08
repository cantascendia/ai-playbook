#!/usr/bin/env bash
# SLO 静态断言 05：MCP 红线层覆盖全 MCP server（matcher mcp__.*）+ mcp-guard 存在。
# 依据 SLO.md mcp-guard「覆盖面 matcher mcp__.* 全 MCP server」。
# 静态可查：只读 .claude/settings.json（不修改 — central-owned，仅 grep）。
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"

pass=0; fail=0
SETTINGS=".claude/settings.json"

# 1) mcp-guard.sh 存在
[ -f .claude/hooks/mcp-guard.sh ] && pass=$((pass+1)) || { fail=$((fail+1)); echo "MISS mcp-guard.sh"; }

# 2) settings.json 含 mcp__.* matcher（全 MCP server 覆盖）
if [ -f "$SETTINGS" ] && grep -q 'mcp__\.\*' "$SETTINGS" 2>/dev/null; then
  pass=$((pass+1))
else
  fail=$((fail+1)); echo "MISS mcp__.* matcher in $SETTINGS"
fi

# 3) settings.json 把该 matcher 路由到 mcp-guard（防挂空 matcher）
if [ -f "$SETTINGS" ] && grep -q 'mcp-guard' "$SETTINGS" 2>/dev/null; then
  pass=$((pass+1))
else
  fail=$((fail+1)); echo "MISS mcp-guard route in $SETTINGS"
fi

echo "pass=$pass fail=$fail (mcp-guard存在+matcher+路由 = 3 断言)"
if [ "$fail" = "0" ]; then echo "RESULT: PASS"; else echo "RESULT: FAIL"; fi
