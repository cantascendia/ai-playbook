#!/usr/bin/env bash
# 演练 03 — guard 引擎缺 node → legacy bash 实现兜底（v4.0 引擎/shim 双层，零红线真空）。
#
# 验证 guard shim 的两条 fallback 杠杆都能让 legacy 实现接管并仍拦红线（exit 2）：
#   (a) CTO_GUARD_ENGINE=legacy —— 显式回滚杠杆（任何平台可测）
#   (b) PATH 屏蔽 node          —— 真「node 缺失」场景（node 在独立目录时可测）
# legacy 没接上 / 出现红线真空（exit 0）就是真问题。
# 只读 guard，沙盒内运行，不 mutate 真仓。
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/lib.sh"

SB="$(drill_make_self_sandbox)"
trap 'rm -rf "$SB"' EXIT
GUARD="$SB/.claude/hooks/immutable-guard.sh"
IN='{"tool_name":"Write","tool_input":{"file_path":"scripts/forbidden-paths.txt","content":"# gutted\npayment/"},"cwd":"'"$SB"'"}'

# (a) 显式 legacy 杠杆
RC_A=$(printf '%s' "$IN" | { CTO_GUARD_ENGINE=legacy bash "$GUARD" >/dev/null 2>&1; echo $?; })
[ "$RC_A" = "2" ] || drill_fail "(a) CTO_GUARD_ENGINE=legacy 未拦红线（exit=$RC_A，期望 2 —— legacy 兜底没接上）"

# (b) PATH 屏蔽 node（若 node 存在且在独立目录）
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -n "$NODE_BIN" ]; then
  NODE_DIR="$(dirname "$NODE_BIN")"
  MASKED="$(drill_path_without_dir "$NODE_DIR")"
  if [ -n "$MASKED" ]; then
    RC_B=$(printf '%s' "$IN" | PATH="$MASKED" bash -c '
      command -v node >/dev/null 2>&1 && { echo 0; exit 0; }   # 屏蔽失败 → 记 0 触发下方 fail
      bash "'"$GUARD"'" >/dev/null 2>&1; echo $?
    ')
    [ "$RC_B" = "2" ] || drill_fail "(b) 屏蔽 node 后 shim 未回退 legacy 拦红线（exit=$RC_B，期望 2）"
    echo "[info] (b) 已从 PATH 移除 $NODE_DIR，node 缺失 → shim 回退 legacy → 拦截（exit 2） ✓"
  else
    echo "[info] (b) node 位于共享目录，跳过 PATH 屏蔽子项；(a) 已覆盖 legacy 兜底"
  fi
else
  echo "[info] (b) 本机无 node → legacy 本就是默认路径；(a) 已覆盖"
fi

echo "[info] (a) CTO_GUARD_ENGINE=legacy → legacy 实现拦截红线（exit 2） ✓"
drill_pass
