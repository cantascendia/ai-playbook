#!/usr/bin/env bash
# 演练 02 — 场景 2：jq 卸载 → sed fallback（common.sh 在无 jq 环境降级解析 JSON）。
#
# 验证：无 jq 时，immutable-guard 仍能用 sed parser 正确解析 hook JSON 并拦截红线
#       （exit 2），而不是解析失败静默 fail-open（exit 0）。
#
# 平台说明（诚实）：本机 / Windows git-bash 默认**无 jq** —— sed fallback 就是生产路径，
#   本演练直接跑真实降级路径。若某 CI 装了 jq 且与 /usr/bin 混住无法安全屏蔽 → SKIP + 理由。
# 只读 guard，沙盒内运行，不 mutate 真仓。
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/lib.sh"

RUN_PATH="$PATH"
NOTE="jq 本机默认缺失（Windows git-bash）—— sed fallback 即生产路径"
if command -v jq >/dev/null 2>&1; then
  # CI 装了 jq：尝试把 jq 所在独立目录移出 PATH
  JQ_DIR="$(dirname "$(command -v jq)")"
  MASKED="$(drill_path_without_dir "$JQ_DIR")"
  if [ -z "$MASKED" ]; then
    drill_skip "jq 位于共享目录 $JQ_DIR，无法在不破坏工具链前提下屏蔽；sed fallback 路径请在无-jq 机器（如 Windows git-bash）跑"
  fi
  RUN_PATH="$MASKED"
  NOTE="已从 PATH 移除 jq 目录 $JQ_DIR 以强制 sed fallback"
fi

SB="$(drill_make_self_sandbox)"
trap 'rm -rf "$SB"' EXIT

IN='{"tool_name":"Write","tool_input":{"file_path":"scripts/forbidden-paths.txt","content":"# gutted\npayment/"},"cwd":"'"$SB"'"}'

# 在屏蔽 jq 的 PATH 下跑；先确认 jq 确实不可见，再跑 legacy guard
OUT=$(printf '%s' "$IN" | PATH="$RUN_PATH" bash -c '
  command -v jq >/dev/null 2>&1 && { echo "JQ_STILL_VISIBLE"; exit 0; }
  CTO_GUARD_ENGINE=legacy bash "'"$SB"'/.claude/hooks/immutable-guard.sh"
' 2>&1)
RC=$?

echo "$OUT" | grep -q 'JQ_STILL_VISIBLE' && drill_skip "屏蔽后 jq 仍可见，无法强制 sed fallback（本平台）"
[ "$RC" = "2" ] || drill_fail "sed fallback 下 guard 未拦截红线删除（exit=$RC，期望 2 —— 疑似解析失败静默 fail-open）"

echo "[info] $NOTE"
echo "[info] 无 jq → sed parser 解析 hook JSON → 仍拦截 forbidden-paths 删除（exit 2） ✓"
drill_pass
