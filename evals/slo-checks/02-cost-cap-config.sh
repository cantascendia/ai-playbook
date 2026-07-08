#!/usr/bin/env bash
# SLO 静态断言 02：月度 codex token cost cap 配置存在且 ≤ $20（2000 cents）。
# 依据 SLO.md「月度 codex token < $20 (cap)」+ cto-evolve.md cap_cents 配置。
# 静态可查：cto-evolve.md 声明 cap + codex-bridge run.sh 写回计量文件。
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"

pass=0; fail=0
EVOLVE=".claude/commands/cto-evolve.md"
BRIDGE=".agents/skills/codex-bridge/run.sh"

# 1) cto-evolve.md 声明 cap_cents（cost cap 存在）
if grep -q 'cap_cents' "$EVOLVE" 2>/dev/null; then
  pass=$((pass+1))
else
  fail=$((fail+1)); echo "MISS cap_cents in $EVOLVE"
fi

# 2) cap 值 ≤ 2000 cents（$20）—— 抽出 cap_cents 数字断言不超上限
CAP=$(grep -oE '"cap_cents"[[:space:]]*:[[:space:]]*[0-9]+' "$EVOLVE" 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ -n "$CAP" ] && [ "$CAP" -le 2000 ] 2>/dev/null; then
  pass=$((pass+1))
else
  fail=$((fail+1)); echo "MISS/OVER cap_cents ≤2000 (got '${CAP:-none}')"
fi

# 3) codex-bridge 写回 .evolve-cost-month.json（计量真存在，非 vaporware）
if grep -q '\.evolve-cost-month\.json' "$BRIDGE" 2>/dev/null; then
  pass=$((pass+1))
else
  fail=$((fail+1)); echo "MISS evolve-cost-month.json write in $BRIDGE"
fi

# 4) 退化模式声明（超 cap → 跳 codex）
if grep -qiE '超 cap|退化|exceeded' "$EVOLVE" 2>/dev/null; then
  pass=$((pass+1))
else
  fail=$((fail+1)); echo "MISS degradation-on-cap declaration in $EVOLVE"
fi

echo "pass=$pass fail=$fail (cap声明+值≤2000+计量回写+退化模式 = 4 断言)"
if [ "$fail" = "0" ]; then echo "RESULT: PASS"; else echo "RESULT: FAIL"; fi
