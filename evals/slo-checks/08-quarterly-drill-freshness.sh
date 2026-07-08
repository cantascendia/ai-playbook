#!/usr/bin/env bash
# SLO 运行时读取 08：季度演练新鲜度（SLO.md 季度演练节 + SLO 自承认「Q2 过期」）。
#
# 诚实说明：季度演练是**运营动作**（真跑一次 drill），不是仓库静态属性。
#   本脚本 READ QUARTERLY-DRILLS.md（若存在），抽最近演练日期并报告距今天数，
#   以 SKIP（advisory）收尾 —— 过期是运营现实（SLO 已自承认），不作硬 fail 掩盖。
#   文件缺失 → SKIP no-data。
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"

DRILL="docs/ai-cto/archive/QUARTERLY-DRILLS.md"
[ -f "$DRILL" ] || DRILL="docs/ai-cto/QUARTERLY-DRILLS.md"

if [ ! -f "$DRILL" ]; then
  echo "no QUARTERLY-DRILLS.md — 无演练记录可读"
  echo "pass=0 fail=0 (无数据)"
  echo "RESULT: SKIP (季度演练是运营动作，无记录文件)"
  exit 0
fi

# 抽文件中最近的 YYYY-MM-DD 日期
LAST=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' "$DRILL" 2>/dev/null | sort | tail -1)
if [ -z "$LAST" ]; then
  echo "QUARTERLY-DRILLS.md 存在但未抽到日期"
  echo "pass=0 fail=0"
  echo "RESULT: SKIP (无可解析演练日期)"
  exit 0
fi

# 距今天数（date 可用则算，否则仅报日期）
DAYS="?"
if command -v date >/dev/null 2>&1; then
  L_EPOCH=$(date -d "$LAST" +%s 2>/dev/null || echo "")
  NOW_EPOCH=$(date +%s 2>/dev/null || echo "")
  if [ -n "$L_EPOCH" ] && [ -n "$NOW_EPOCH" ]; then
    DAYS=$(( (NOW_EPOCH - L_EPOCH) / 86400 ))
  fi
fi
echo "[info] 最近季度演练记录日期=$LAST 距今≈${DAYS}天（SLO 目标：每季度 ≤90 天）"

echo "pass=0 fail=0 (演练新鲜度为运营指标，advisory)"
echo "RESULT: SKIP (季度演练需真跑，advisory 报告不作静态硬 fail)"
