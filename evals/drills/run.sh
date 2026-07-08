#!/usr/bin/env bash
# evals/drills/run.sh — 季度 fallback 演练 runner（§43 ARE / QUARTERLY-DRILLS.md）。
#
# 背景：QUARTERLY-DRILLS.md 4 场景此前全 TBD（"headless 无法真模拟"）。实际其中 3 场景 +
#   引擎兜底可脚本化 —— 本目录把它们变成每季度可一键跑的可执行演练，真断言 fallback 链接上；
#   真需外部/会话状态的（场景 3）如实 SKIP-manual，不伪造。
#
# 用法：
#   bash evals/drills/run.sh              # 跑全部演练
#   DRILL_VERBOSE=1 bash evals/drills/run.sh   # 显示每条演练完整输出
#
# 判定：任一演练 RESULT: FAIL → 整体 FAILED（exit 1）。SKIP / SKIP-manual 不算失败。
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"
DIR="evals/drills"

PASS=0; FAIL=0; SKIP=0; MANUAL=0
FAILED_LIST=""

for f in "$DIR"/[0-9][0-9]-*.sh; do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  out=$(bash "$f" 2>&1)
  [ "${DRILL_VERBOSE:-0}" = "1" ] && { echo "── $name ──"; echo "$out"; }
  verdict=$(printf '%s\n' "$out" | grep -E '^RESULT:' | tail -1)
  reason="${verdict#RESULT:* }"
  case "$verdict" in
    RESULT:\ PASS*)        PASS=$((PASS+1));   echo "✓ PASS         $name" ;;
    RESULT:\ SKIP-manual*) MANUAL=$((MANUAL+1)); echo "⊘ SKIP-manual  $name — ${reason#SKIP-manual }" ;;
    RESULT:\ SKIP*)        SKIP=$((SKIP+1));   echo "⊘ SKIP         $name — ${reason#SKIP }" ;;
    RESULT:\ FAIL*)        FAIL=$((FAIL+1)); FAILED_LIST="$FAILED_LIST $name"
                           echo "✗ FAIL         $name — ${reason#FAIL }" ;;
    *)                     FAIL=$((FAIL+1)); FAILED_LIST="$FAILED_LIST $name(no-verdict)"
                           echo "✗ FAIL         $name (无 RESULT 行)"
                           printf '%s\n' "$out" | sed 's/^/               /' ;;
  esac
done

echo "─────────────────────────────────────"
[ -n "$FAILED_LIST" ] && echo "failed:$FAILED_LIST"
# 用 ok=/skipped= 计数（避免 fail=N 字样误触上层 eval-runner 的 fail 判定；真失败靠 exit + 下行标记）
echo "DRILLS summary: ok=$PASS skipped=$SKIP manual=$MANUAL failed=$FAIL"
if [ "$FAIL" = "0" ]; then
  echo "DRILLS: PASS"
  exit 0
else
  echo "DRILLS: FAILED"
  exit 1
fi
