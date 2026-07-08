#!/usr/bin/env bash
# SLO 静态断言 03：核心质量闸在 CI 中真接线（check-counts + run-evals + engine 单测）。
# 依据 SLO.md「计数一致性」「Eval pass rate 真执行」+ eval.yml gate。
# 静态可查：只读 .github/workflows/eval.yml 文本（不修改 — forbidden 路径仅读）。
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"

pass=0; fail=0
CI=".github/workflows/eval.yml"

if [ ! -f "$CI" ]; then
  echo "pass=0 fail=1 ($CI 不存在)"
  echo "RESULT: FAIL"
  exit 0
fi

# 1) check-counts.sh 被 CI 调用（计数 SSOT gate）
grep -q 'check-counts\.sh' "$CI" && pass=$((pass+1)) || { fail=$((fail+1)); echo "MISS check-counts.sh in CI"; }

# 2) run-evals.sh 被 CI 调用（铁律 #12 真执行）
grep -q 'run-evals\.sh' "$CI" && pass=$((pass+1)) || { fail=$((fail+1)); echo "MISS run-evals.sh in CI"; }

# 3) guard engine 单测被 CI 调用（node --test guard.test.mjs）
grep -q 'guard\.test\.mjs' "$CI" && pass=$((pass+1)) || { fail=$((fail+1)); echo "MISS guard.test.mjs in CI"; }

# 4) eval.yml 触发路径覆盖 hooks + commands + CLAUDE.md（配置改动必跑 eval）
grep -q "\.claude/hooks/\*\*" "$CI" && pass=$((pass+1)) || { fail=$((fail+1)); echo "MISS hooks path trigger in CI"; }

# 5) 对应脚本本体真存在（非 vaporware CI 步骤）
[ -f scripts/check-counts.sh ] && [ -f scripts/run-evals.sh ] && pass=$((pass+1)) \
  || { fail=$((fail+1)); echo "MISS backing scripts on disk"; }

echo "pass=$pass fail=$fail (check-counts+run-evals+engine单测+触发路径+脚本存在 = 5 断言)"
if [ "$fail" = "0" ]; then echo "RESULT: PASS"; else echo "RESULT: FAIL"; fi
