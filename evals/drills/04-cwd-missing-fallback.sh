#!/usr/bin/env bash
# 演练 04 — 场景 4：immutable-guard 缺 cwd → fallback 到 "."（复演 codex 第 6 轮 dogfood P1）。
#
# 验证：hook input 不带 cwd 时，guard 用 CWD="." 兜底、从当前目录找 scripts/forbidden-paths.txt，
#       检测到红线条目被删仍拦截（exit 2），而不是因 cwd 缺失定位不到文件而静默放行。
# 沙盒内 cd 进去后跑（"." = 沙盒），不 mutate 真仓。
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/lib.sh"

SB="$(drill_make_self_sandbox)"
trap 'rm -rf "$SB"' EXIT

# 关键：input **不含 cwd 字段**，file_path 用相对路径 → guard 必须 CWD="." 兜底
IN='{"tool_name":"Write","tool_input":{"file_path":"scripts/forbidden-paths.txt","content":"# minimal\npayment/"}}'

RC=$(cd "$SB" && printf '%s' "$IN" | { CTO_GUARD_ENGINE=legacy bash .claude/hooks/immutable-guard.sh >/dev/null 2>&1; echo $?; })
[ "$RC" = "2" ] || drill_fail "缺 cwd 时 guard 未拦红线（exit=$RC，期望 2 —— cwd 兜底失效 → bypass 真空）"

# Windows 反斜杠路径变体（learned rule 2026-05-12 同源 bug）：绝对反斜杠 file_path，无 cwd
IN_WIN='{"tool_name":"Write","tool_input":{"file_path":"'"${SB//\//\\\\}"'\\scripts\\forbidden-paths.txt","content":"# minimal\npayment/"}}'
RC_W=$(cd "$SB" && printf '%s' "$IN_WIN" | { CTO_GUARD_ENGINE=legacy bash .claude/hooks/immutable-guard.sh >/dev/null 2>&1; echo $?; })
[ "$RC_W" = "2" ] || drill_fail "缺 cwd + Windows 反斜杠绝对路径未拦红线（exit=$RC_W，期望 2）"

echo "[info] 缺 cwd → CWD=\".\" 兜底 → 从当前目录定位 forbidden-paths.txt → 拦截（exit 2） ✓"
echo "[info] 缺 cwd + Windows 反斜杠绝对路径 → 同样拦截（exit 2） ✓"
drill_pass
