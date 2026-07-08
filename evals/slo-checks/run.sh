#!/usr/bin/env bash
# evals/slo-checks/run.sh — 机器可执行 SLO 断言 runner。
#
# 背景：SLO.md 的可靠性目标此前只靠人工 + agent-logs 人核（backlog P1）。本目录把
# **能从仓库静态状态判定**的 SLO 转为断言脚本；**真需运行时数据**的（FP-rate、季度演练）
# READ agent-logs / 记录文件后 SKIP-with-reason（诚实，不伪造 pass）。
#
# 用法：
#   bash evals/slo-checks/run.sh            # 跑全部
#   SLO_VERBOSE=1 bash evals/slo-checks/run.sh   # 显示每个 check 完整输出
#
# 判定：任一 check RESULT: FAIL → 整体 FAIL（exit 1）。SKIP 不算失败。
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"
DIR="evals/slo-checks"

PASS=0; FAIL=0; SKIP=0
FAILED_LIST=""

for f in "$DIR"/[0-9][0-9]-*.sh; do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  out=$(bash "$f" 2>&1)
  [ "${SLO_VERBOSE:-0}" = "1" ] && { echo "── $name ──"; echo "$out"; }
  # 末行 RESULT 判定
  verdict=$(printf '%s\n' "$out" | grep -E '^RESULT:' | tail -1)
  case "$verdict" in
    RESULT:\ PASS*) PASS=$((PASS+1)); echo "✓ PASS  $name" ;;
    RESULT:\ SKIP*) SKIP=$((SKIP+1)); echo "⊘ SKIP  $name — ${verdict#RESULT: SKIP }" ;;
    RESULT:\ FAIL*) FAIL=$((FAIL+1)); FAILED_LIST="$FAILED_LIST $name"
                    echo "✗ FAIL  $name"; printf '%s\n' "$out" | grep -vE '^(RESULT:|pass=)' | sed 's/^/       /' ;;
    *)              FAIL=$((FAIL+1)); FAILED_LIST="$FAILED_LIST $name(no-verdict)"
                    echo "✗ FAIL  $name (无 RESULT 行)" ;;
  esac
done

echo "─────────────────────────────────────"
[ -n "$FAILED_LIST" ] && echo "failed:$FAILED_LIST"
# 汇总用 ok= 计数（避免 fail=N 触发上层 eval 判定误伤；真失败靠下方 exit + FAILED 标记）
echo "SLO-CHECKS summary: ok=$PASS skipped=$SKIP failed=$FAIL"
if [ "$FAIL" = "0" ]; then
  echo "SLO-CHECKS: PASS"
  exit 0
else
  echo "SLO-CHECKS: FAILED"
  exit 1
fi
