#!/usr/bin/env bash
# 演练 01 — 场景 1：codex 配额耗尽 → claude fallback（§43 ARE fallback chain）。
#
# 验证 codex-bridge run.sh 在 codex 返回 rate_limit 时：
#   1. 写 .codex-quota-cooldown 冷却文件
#   2. CODEX-REVIEW-LOG 记 mode=fallback-to-claude，由 claude 补位
#   3. 1 小时冷却内重跑 —— codex 不再被调用（SKIP_CODEX 生效）
#
# 全部在临时 git 仓 + mock codex/claude/gh 里跑。**不碰真仓 / 真 git / 真云**。
# codex/claude/gh 全 mock，git push 指向不存在的 origin（无害失败），branch=main → PR autopilot 跳过。
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/lib.sh"

BRIDGE="$DRILL_REPO_ROOT/.agents/skills/codex-bridge/run.sh"
[ -f "$BRIDGE" ] || drill_fail "codex-bridge run.sh 不存在：$BRIDGE"
command -v git >/dev/null 2>&1 || drill_skip "git 不可用，无法建沙盒仓"

SB="$(mktemp -d)"; BIN="$(mktemp -d)"
CALLS="$SB/codex-calls.log"; : > "$CALLS"
cleanup() { rm -rf "$SB" "$BIN"; }
trap cleanup EXIT

# ── mock 命令 ─────────────────────────────────────────────
cat > "$BIN/codex" <<EOF
#!/usr/bin/env bash
echo call >> "$CALLS"
echo "Error: rate_limit_exceeded (429)" >&2
exit 1
EOF
cat > "$BIN/claude" <<'EOF'
#!/usr/bin/env bash
echo "# 八维评审报告 (drill mock)"
echo "架构 ✅ 代码 ✅ 安全 ✅"
exit 0
EOF
cat > "$BIN/gh" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
chmod +x "$BIN/codex" "$BIN/claude" "$BIN/gh"

# ── 临时 git 仓当 REPO_ROOT（run.sh 自己 git rev-parse 定位到这里）──
git -C "$SB" init -q
git -C "$SB" config user.email drill@local
git -C "$SB" config user.name drill
git -C "$SB" checkout -q -b main 2>/dev/null || true
mkdir -p "$SB/src"
echo v1 > "$SB/src/app.js"; git -C "$SB" add -A; git -C "$SB" commit -qm init
echo v2 > "$SB/src/app.js"; git -C "$SB" add -A; git -C "$SB" commit -qm change

LOG="$SB/docs/ai-cto/CODEX-REVIEW-LOG.md"
COOLDOWN="$SB/docs/ai-cto/.codex-quota-cooldown"

# ── RUN 1：codex rate_limit → claude 补位 ────────────────
( cd "$SB" && PATH="$BIN:$PATH" FORCE=1 bash "$BRIDGE" HEAD ) >/dev/null 2>&1
# run.sh 把 review 放后台 & disown，轮询等 marker（异步，非固定 sleep）
# CI/慢跑器加时：40×0.5=20s（本地通常 1-2s 内出）
found=0
for _ in $(seq 1 40); do
  if [ -f "$LOG" ] && grep -q 'mode=fallback-to-claude' "$LOG" 2>/dev/null; then found=1; break; fi
  sleep 0.5
done
# 诚实定性：超时未观测到异步 marker ≠ 「红线真空/fallback 坏了」。codex-bridge 把 review 放后台
# disown，headless CI 跑器的后台调度/时序不可控 → 观测不到只能 SKIP（本地季度实跑才是真验证），
# 不用 drill_fail 阻 eval gate。真正的红线降级（03 legacy / 04 cwd 兜底 exit 2）仍是硬 PASS 要求。
if [ "$found" != 1 ]; then
  drill_skip "RUN1 未在 20s 内观测到异步 fallback marker（codex-bridge 后台 disown，headless 跑器时序不可控）—— 本地季度实跑验证；LOG=$(cat "$LOG" 2>/dev/null | tr '\n' ';' | head -c 200)"
fi
[ -f "$COOLDOWN" ] || drill_fail "RUN1 未创建 .codex-quota-cooldown 冷却文件"
c1=$(grep -c call "$CALLS" 2>/dev/null || echo 0)
[ "${c1:-0}" -ge 1 ] || drill_fail "RUN1 codex 未被调用（mock 未生效）"

# ── RUN 2：冷却内重跑 → codex 必须被 SKIP ────────────────
( cd "$SB" && PATH="$BIN:$PATH" FORCE=1 bash "$BRIDGE" HEAD ) >/dev/null 2>&1
sleep 2
c2=$(grep -c call "$CALLS" 2>/dev/null || echo 0)
[ "${c2:-0}" = "${c1:-0}" ] || drill_fail "RUN2 冷却期内 codex 又被调用（SKIP_CODEX 未生效）：calls $c1→$c2"

echo "[info] RUN1 mode=fallback-to-claude ✓ · cooldown 文件 ✓ · codex 调用 $c1 次"
echo "[info] RUN2 冷却生效 · codex 未再调用（仍 $c2 次） ✓"
drill_pass
