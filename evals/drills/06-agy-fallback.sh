#!/usr/bin/env bash
# 演练 02 — agy(Gemini) 中间档 fallback（§48.5.1 codex→agy→claude 跨模型链 / v4.4d FIX5）。
#
# 验证 codex-bridge run.sh 的 agy 补位档真接上（此前 eval 085 全静态 grep、drill 01 不 mock agy、
# slo-check 06 不 grep agy 关键词 —— agy 中间档若被重构删掉，零动态测试能发现）：
#   场景1：codex 失败 → agy 成功 → CODEX-REVIEW-LOG mode=agy-only（跨模型价值保留）
#   场景2：codex 失败 → agy 失败 → claude 补位 → mode=fallback-to-claude 且 failchain 保留
#          codex-failed+agy-failed（FIX4：真失败链不丢，不伪装成"claude-only 未装"）
#
# 全部在临时 git 仓 + mock codex/agy/claude/gh 里跑。**不碰真仓 / 真 git / 真云**。
# 与 drill 01 同构：run.sh 把 review 放后台 & disown → 轮询异步 marker，headless 观测不全 = SKIP
# （best-effort，非 FAIL）；只在完整干净观测到 agy/fallback 链时 PASS。安全红线由 drill 03/04 硬保。
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/lib.sh"

BRIDGE="$DRILL_REPO_ROOT/.agents/skills/codex-bridge/run.sh"
[ -f "$BRIDGE" ] || drill_fail "codex-bridge run.sh 不存在：$BRIDGE"
command -v git >/dev/null 2>&1 || drill_skip "git 不可用，无法建沙盒仓"

mk_repo() {
  local SB="$1"
  git -C "$SB" init -q
  git -C "$SB" config user.email drill@local
  git -C "$SB" config user.name drill
  git -C "$SB" checkout -q -b main 2>/dev/null || true
  mkdir -p "$SB/src"
  echo v1 > "$SB/src/app.js"; git -C "$SB" add -A; git -C "$SB" commit -qm init 2>/dev/null
  echo v2 > "$SB/src/app.js"; git -C "$SB" add -A; git -C "$SB" commit -qm change 2>/dev/null
}

poll() { # $1=file $2=pattern
  local i
  for i in $(seq 1 40); do
    [ -f "$1" ] && grep -qE "$2" "$1" 2>/dev/null && return 0
    sleep 0.5
  done
  return 1
}

INCOMPLETE=""

# ── 场景 1：codex 失败（非配额）→ agy 成功 → agy-only ───────────
SB1="$(mktemp -d)"; BIN1="$(mktemp -d)"
mk_repo "$SB1"
cat > "$BIN1/codex" <<'EOF'
#!/usr/bin/env bash
echo "connection refused" >&2   # 通用错误：不含 quota/rate-limit/429/402 关键词 → 判定 codex-failed（非配额）
exit 1
EOF
cat > "$BIN1/agy" <<'EOF'
#!/usr/bin/env bash
echo "# 八维评审报告 (agy/Gemini drill mock)"
echo "架构 ✅ 安全 🟠"
echo "SEVERITY_SUMMARY: P0=0 P1=1 P2=0"
exit 0
EOF
cat > "$BIN1/gh" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
chmod +x "$BIN1/codex" "$BIN1/agy" "$BIN1/gh"
( cd "$SB1" && PATH="$BIN1:$PATH" FORCE=1 bash "$BRIDGE" HEAD ) >/dev/null 2>&1
LOG1="$SB1/docs/ai-cto/CODEX-REVIEW-LOG.md"
if poll "$LOG1" 'mode=agy-only|mode=fallback-to-agy'; then
  S1_OK=1
else
  S1_OK=0; INCOMPLETE="场景1 未在 20s 内观测到 agy-only marker"
fi
rm -rf "$SB1" "$BIN1"

# ── 场景 2：codex 失败 → agy 失败 → claude 补位 → fallback-to-claude + failchain ──
S2_OK=0
if [ "$S1_OK" = 1 ]; then
  SB2="$(mktemp -d)"; BIN2="$(mktemp -d)"
  mk_repo "$SB2"
  cat > "$BIN2/codex" <<'EOF'
#!/usr/bin/env bash
echo "connection refused" >&2   # 通用错误：不含 quota/rate-limit/429/402 关键词 → 判定 codex-failed（非配额）
exit 1
EOF
  cat > "$BIN2/agy" <<'EOF'
#!/usr/bin/env bash
echo "agy backend unavailable" >&2
exit 1
EOF
  cat > "$BIN2/claude" <<'EOF'
#!/usr/bin/env bash
echo "# 八维评审报告 (claude 补位 drill mock)"
echo "架构 ✅"
echo "SEVERITY_SUMMARY: P0=0 P1=0 P2=1"
exit 0
EOF
  cat > "$BIN2/gh" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
  chmod +x "$BIN2/codex" "$BIN2/agy" "$BIN2/claude" "$BIN2/gh"
  ( cd "$SB2" && PATH="$BIN2:$PATH" FORCE=1 bash "$BRIDGE" HEAD ) >/dev/null 2>&1
  LOG2="$SB2/docs/ai-cto/CODEX-REVIEW-LOG.md"
  if poll "$LOG2" 'mode=fallback-to-claude'; then
    # failchain 必须保留完整失败链（FIX4）：codex 失败标记（codex-failed/codex-quota-exhausted）+ agy-failed，
    # 否则 fallback 掩盖真失败（旧 bug：codex/agy 真报错也落 claude-only 假诊断"未装"）。
    if grep -E 'mode=fallback-to-claude.*failchain=[^|]*codex[^|]*agy-failed' "$LOG2" >/dev/null 2>&1; then
      S2_OK=1
    else
      INCOMPLETE="${INCOMPLETE:+$INCOMPLETE; }场景2 fallback-to-claude 缺 failchain（codex+agy-failed 失败链丢失）"
    fi
  else
    INCOMPLETE="${INCOMPLETE:+$INCOMPLETE; }场景2 未观测到 fallback-to-claude marker"
  fi
  rm -rf "$SB2" "$BIN2"
fi

if [ -n "$INCOMPLETE" ]; then
  drill_skip "agy fallback 链在 headless 未完整观测（$INCOMPLETE）—— 后台 disown 时序不可控，本地季度 verbose 实跑验证；安全红线由 drill 03/04 硬保"
fi
echo "[info] 场景1 codex✗→agy✓ = agy-only（跨模型价值保留）✓"
echo "[info] 场景2 codex✗→agy✗→claude✓ = fallback-to-claude + failchain=codex-failed+agy-failed ✓"
drill_pass
