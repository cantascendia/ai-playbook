#!/usr/bin/env bash
# SLO 静态断言 04：所有 guard shim 具备 engine 路径 + 保留 legacy 实现（零红线真空）。
# 依据 SLO.md「覆盖 guard bypass/destructive/mcp 全切换」+ eval 058 平价门结构断言。
# 静态可查：每个 .claude/hooks/*.sh 含 engine/guard.mjs exec 行 + legacy fallback 保留。
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"

pass=0; fail=0
total=0

for h in .claude/hooks/*.sh; do
  [ -f "$h" ] || continue
  total=$((total+1))
  b=$(basename "$h")
  # engine 路径：exec node engine/guard.mjs
  has_engine=0; grep -q 'engine/guard\.mjs' "$h" && has_engine=1
  # legacy 保留：node 缺失/CTO_GUARD_ENGINE=legacy 时走原地实现
  has_legacy=0; grep -qE 'CTO_GUARD_ENGINE|legacy' "$h" && has_legacy=1
  # node 探测（fallback 触发条件）
  has_detect=0; grep -q 'command -v node' "$h" && has_detect=1
  if [ "$has_engine" = "1" ] && [ "$has_legacy" = "1" ] && [ "$has_detect" = "1" ]; then
    pass=$((pass+1))
  else
    fail=$((fail+1)); echo "PARITY BREAK $b: engine=$has_engine legacy=$has_legacy detect=$has_detect"
  fi
done

# 期望 10 个 shim（与 eval 058 结构断言一致）；数量偏移不 fail（COUNTS 归 check-counts 管），
# 但至少要有 shim 存在。
if [ "$total" -lt 1 ]; then
  fail=$((fail+1)); echo "NO shim found under .claude/hooks/"
fi

echo "pass=$pass fail=$fail (共 $total 个 shim，每个须 engine+legacy+node探测三合一)"
if [ "$fail" = "0" ]; then echo "RESULT: PASS"; else echo "RESULT: FAIL"; fi
