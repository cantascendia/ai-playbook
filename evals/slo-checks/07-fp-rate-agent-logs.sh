#!/usr/bin/env bash
# SLO 运行时读取 07：guard False-Positive rate（SLO 目标 <1%）。
# 依据 SLO.md「False positive rate <1%（合法操作不误拦）」。
#
# 诚实说明（铁律 #2/#9，不假 pass）：
#   真 FP-rate 需要对每次 block 做「这次拦对了吗」的人工/语义标注 —— agent-logs jsonl
#   不携带该标签。因此本 SLO 无法从仓库静态状态给出 PASS/FAIL 判定。
#   本脚本 READ agent-logs（若存在），输出可得的**代理信号**（block 次数 vs 事后放行/
#   紧急 override 次数）供人审，并以 SKIP 收尾（不伪造 pass）。无日志 → SKIP no-data。
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"

LOG_DIR=".claude/agent-logs"
if [ ! -d "$LOG_DIR" ] || ! ls "$LOG_DIR"/*.jsonl >/dev/null 2>&1; then
  echo "no agent-logs — 无运行时数据可读"
  echo "pass=0 fail=0 (无数据)"
  echo "RESULT: SKIP (no agent-logs — FP-rate 需运行时 trajectory 数据)"
  exit 0
fi

cnt() { grep -oh "\"event\":\"$1\"" "$LOG_DIR"/*.jsonl 2>/dev/null | wc -l | tr -d ' '; }

# 拦截事件 vs 事后放行/override 事件（代理信号，非真 FP）
imm_block=$(cnt immutable-blocked)
fb_block=$(cnt forbidden-blocked)
fb_allow=$(cnt forbidden-allowed)                 # 命中后人工放行 → FP 疑似上界
bypass_block=$(cnt bypass-blocked)
bypass_emerg=$(cnt bypass-allowed-emergency)      # 紧急 override → 疑似误拦上界
main_out=$(cnt main-edit-outside-repo-allowed)    # 仓库外正确放行（v4.0e 边界修）

echo "[proxy] immutable-blocked=$imm_block forbidden-blocked=$fb_block forbidden-allowed(override)=$fb_allow"
echo "[proxy] bypass-blocked=$bypass_block bypass-allowed-emergency(override)=$bypass_emerg main-edit-outside-repo-allowed=$main_out"

# forbidden 代理 override 比例（仅信息展示，不做 pass/fail 判定）
tot=$((fb_block + fb_allow))
if [ "$tot" -gt 0 ]; then
  ratio=$(awk "BEGIN{printf \"%.1f\", ($fb_allow*100.0)/$tot}")
  echo "[proxy] forbidden override-ratio ≈ ${ratio}% (SLO FP 目标 <1%；此为上界代理，非真 FP)"
fi

echo "pass=0 fail=0 (代理信号已输出，真 FP 需标注)"
echo "RESULT: SKIP (真 FP-rate 需 block 正确性标注，agent-logs 不携带 → 不伪造判定)"
