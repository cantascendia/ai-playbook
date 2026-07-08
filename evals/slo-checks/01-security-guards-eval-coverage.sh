#!/usr/bin/env bash
# SLO 静态断言 01：每个安全红线 guard 必须 ≥1 覆盖 eval + guard 文件存在。
# 依据 SLO.md「Block accuracy 100%」+ check-counts.sh 安全红线必查 5 guard。
# 静态可查：从仓库状态（hooks/*.sh + evals/*.yaml）判定，无需运行时数据。
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"

pass=0; fail=0
EVAL_DIR="evals/golden-trajectories"

# guard slug -> 期望文件名前缀（与 check-counts.sh:59 的 5 红线一致）
for g in immutable forbidden branch destructive-action mcp; do
  # 1) guard 文件存在（*-guard.sh 或 *.sh）
  if [ -f ".claude/hooks/${g}-guard.sh" ] || [ -f ".claude/hooks/${g}.sh" ]; then
    pass=$((pass+1))
  else
    fail=$((fail+1)); echo "MISS guard file: .claude/hooks/${g}*.sh"
  fi
  # 2) ≥1 eval yaml 引用该 guard（大小写不敏感）
  # 用短 slug 匹配（destructive-action → destructive；mcp → mcp）
  slug="$g"; case "$g" in destructive-action) slug=destructive ;; esac
  n=$(grep -lri "$slug" "$EVAL_DIR"/*.yaml 2>/dev/null | wc -l | tr -d ' ')
  if [ "${n:-0}" -ge 1 ]; then
    pass=$((pass+1))
  else
    fail=$((fail+1)); echo "MISS eval coverage for guard: $g"
  fi
done

echo "pass=$pass fail=$fail (5 guards x [file+eval] = 10 断言)"
if [ "$fail" = "0" ]; then echo "RESULT: PASS"; else echo "RESULT: FAIL"; fi
