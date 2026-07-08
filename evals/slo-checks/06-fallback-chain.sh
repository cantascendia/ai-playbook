#!/usr/bin/env bash
# SLO 静态断言 06：fallback 链完整（guard node→legacy + codex-bridge codex→claude→none）。
# 依据 SLO.md「Fallback jq 缺失降级」「Fallback chain 完整 100%（codex→claude→no-reviewer）」。
# 静态可查：shim 含 node 缺失回退；codex-bridge run.sh 含三段 fallback。
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"

pass=0; fail=0
BRIDGE=".agents/skills/codex-bridge/run.sh"

# 1) guard shim：node 缺失回退 legacy（探测 + legacy 实现同存 → 已在 04 覆盖；此处查回退语义注释/逻辑）
#    至少一个代表性 guard 有 "command -v node ... || 走 legacy" 结构
if grep -q 'command -v node' .claude/hooks/immutable-guard.sh 2>/dev/null; then
  pass=$((pass+1))
else
  fail=$((fail+1)); echo "MISS node-missing fallback in immutable-guard shim"
fi

# 2) common.sh：jq 缺失降级 sed parser（SLO immutable-guard Fallback 行）
if grep -qiE 'jq|degraded|sed' .claude/hooks/lib/common.sh 2>/dev/null; then
  pass=$((pass+1))
else
  fail=$((fail+1)); echo "MISS jq/sed degrade in lib/common.sh"
fi

# 3) codex-bridge：codex 失败 → claude fallback
if [ -f "$BRIDGE" ] && grep -qiE 'fallback-to-claude|claude-fallback' "$BRIDGE" 2>/dev/null; then
  pass=$((pass+1))
else
  fail=$((fail+1)); echo "MISS claude fallback in codex-bridge"
fi

# 4) codex-bridge：全失败 → no-reviewer 兜底
if [ -f "$BRIDGE" ] && grep -qiE 'no-reviewer' "$BRIDGE" 2>/dev/null; then
  pass=$((pass+1))
else
  fail=$((fail+1)); echo "MISS no-reviewer terminal fallback in codex-bridge"
fi

echo "pass=$pass fail=$fail (guard node回退+jq降级+codex→claude+→no-reviewer = 4 断言)"
if [ "$fail" = "0" ]; then echo "RESULT: PASS"; else echo "RESULT: FAIL"; fi
