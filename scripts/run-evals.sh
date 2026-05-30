#!/usr/bin/env bash
# v3.12 真 eval executor（飞轮第 7-8 轮 team 发现"铁律 #12 eval 空壳"修复）
#
# 业界对标：AlphaEvolve evaluator-grounded / DGM eval-driven。
# ai-playbook 之前 eval-runner "不实际跑" + CI 只 count yaml → eval-gaming 自我实现。
# 本脚本复用每个 golden-trajectory 的 verification_command 字段，真执行 + 判定。
#
# 用法：
#   bash scripts/run-evals.sh            # 跑全部
#   bash scripts/run-evals.sh 023 032    # 跑指定 id 前缀
#   EVAL_VERBOSE=1 bash scripts/run-evals.sh   # 显示每个 command 输出
#
# 判定约定：
#   verification_command 执行后，stdout 含 "FAIL" 或 "fail=[1-9]" → FAIL
#   含 "PASS" 或 "pass=" 且无 fail → PASS
#   无 verification_command → SKIP（trajectory 类，需真跑 Claude，本地静态跳过）
set -uo pipefail

# v3.12 防递归安全网：meta-eval (036) 的 verification_command 会再调本脚本（测 executor 自身）。
# 正常 meta-eval 只用隔离 temp yaml + 过滤子集（不含自己）→ 最大深度 1。
# 此处 ≥3 纯属兜底，防未来误写"全量跑"的 meta-eval 把 CI 卡死。
EVAL_DEPTH="${EVAL_DEPTH:-0}"
if [ "$EVAL_DEPTH" -ge 3 ]; then
  echo "⊘ eval recursion depth limit ($EVAL_DEPTH) — 跳过嵌套全量跑（防 meta-eval 无限递归）"
  exit 0
fi
export EVAL_DEPTH=$((EVAL_DEPTH+1))

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
EVAL_DIR="evals/golden-trajectories"
FILTER="${*:-}"

PASS=0; FAIL=0; SKIP=0
NOMARK=0
FAILED_LIST=""
NOMARK_LIST=""

extract_vc() {
  # 提取 verification_command: | 之后的缩进块（awk）
  awk '
    /^verification_command:[[:space:]]*\|/ { grab=1; next }
    grab {
      # 块结束：遇到非缩进行（顶格 key）
      if ($0 ~ /^[^[:space:]]/ && $0 != "") { exit }
      # 去掉前导 2 空格缩进
      sub(/^  /, "")
      print
    }
  ' "$1"
}

for f in "$EVAL_DIR"/*.yaml; do
  id=$(basename "$f" .yaml)
  # filter
  if [ -n "$FILTER" ]; then
    match=0
    for pat in $FILTER; do
      case "$id" in "$pat"*) match=1 ;; esac
    done
    [ "$match" = "0" ] && continue
  fi

  vc=$(extract_vc "$f")
  if [ -z "$vc" ]; then
    SKIP=$((SKIP+1))
    [ "${EVAL_VERBOSE:-0}" = "1" ] && echo "⊘ SKIP  $id (no verification_command — trajectory 类需真跑 Claude)"
    continue
  fi

  # 执行 verification_command（子 shell 隔离）
  # </dev/null：防 hang — eval 里某个 guard 若漏管道 stdin 会阻塞等终端输入；
  # 给 /dev/null 让它立即 EOF。带自己管道的 guard 调用（printf|bash guard）不受影响。
  out=$(cd "$REPO_ROOT" && bash -c "$vc" </dev/null 2>&1)
  rc=$?

  if echo "$out" | grep -qE 'FAIL|fail=[1-9]'; then
    FAIL=$((FAIL+1)); FAILED_LIST="$FAILED_LIST $id"
    echo "✗ FAIL  $id"
    [ "${EVAL_VERBOSE:-0}" = "1" ] && echo "$out" | sed 's/^/        /'
  elif echo "$out" | grep -qE 'PASS|pass=[0-9]'; then
    PASS=$((PASS+1))
    echo "✓ PASS  $id"
    [ "${EVAL_VERBOSE:-0}" = "1" ] && echo "$out" | sed 's/^/        /'
  elif [ "$rc" != "0" ]; then
    # 命令崩了又无断言标记 → 真失败
    FAIL=$((FAIL+1)); FAILED_LIST="$FAILED_LIST $id"
    echo "✗ FAIL  $id (exit $rc)"
    [ "${EVAL_VERBOSE:-0}" = "1" ] && echo "$out" | sed 's/^/        /'
  else
    # v3.13 O5：exit 0 但**无任何 pass=/fail=/PASS/FAIL 断言标记** → 不再当 PASS。
    # 否则 typo 命令 / no-op / 被 guard 拦后 2>&1 吞掉 都会无声过门（§32.5 反模式 #6 eval-gaming）。
    # 视为"未断言"→ 计 SKIP + 汇总警告，提示补显式标记。
    SKIP=$((SKIP+1)); NOMARK=$((NOMARK+1)); NOMARK_LIST="$NOMARK_LIST $id"
    echo "⊘ SKIP  $id (vc exit 0 但无 pass=/fail=/PASS/FAIL 断言标记 — 请补显式断言)"
    [ "${EVAL_VERBOSE:-0}" = "1" ] && echo "$out" | sed 's/^/        /'
  fi
done

echo ""
echo "═══════════════════════════════════════"
echo "Eval 执行结果：$PASS PASS / $FAIL FAIL / $SKIP SKIP（共 $((PASS+FAIL+SKIP))）"
echo "  PASS = verification_command 真执行通过"
echo "  SKIP = trajectory 类（无 verification_command，需真跑 Claude 评估）"
[ -n "$FAILED_LIST" ] && echo "  失败：$FAILED_LIST"
[ "$NOMARK" -gt 0 ] && echo "  ⚠️ 无断言标记（计入 SKIP，建议补 pass=/fail=）：$NOMARK_LIST"
echo "═══════════════════════════════════════"

# 退出码：有 FAIL → 1（CI gate 用）
[ "$FAIL" -gt 0 ] && exit 1
exit 0
