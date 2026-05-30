#!/usr/bin/env bash
# 给本仓库装 git pre-commit hook，让终端 git commit 也触发 §48 codex review
# 用途：用户不通过 Claude Code（如 PowerShell / IDE）commit 时，Stop hook 不会触发，
# pre-commit hook 是额外的入口。
#
# 用法：
#   bash scripts/install-pre-commit.sh
#
# 卸载：
#   rm .git/hooks/pre-commit

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$REPO_ROOT" ] && { echo "Not in a git repo"; exit 1; }
cd "$REPO_ROOT"

HOOK=".git/hooks/pre-commit"

if [ -f "$HOOK" ]; then
  echo "⚠️  $HOOK 已存在。备份到 ${HOOK}.bak"
  cp "$HOOK" "${HOOK}.bak"
fi

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# §48 codex-bridge pre-commit trigger + 铁律 #12 本地 eval gate (v3.13 A3)

# 铁律 #12（本地硬约束）：改 agent 配置但无 evals/ 配套 → 警告（STRICT 模式阻止）。
# 背景：此前铁律 #12 仅靠 PR eval.yml 兜底；不开 PR 直接 push（branch-guard 只拦 main 上 Edit
# 不拦 push）则可绕过。本地 pre-commit 补这层。默认警告不阻塞；CTO_EVAL_GATE_STRICT=1 则阻止。
STAGED=$(git diff --cached --name-only 2>/dev/null)
CONFIG=$(echo "$STAGED" | grep -E '\.claude/commands/|\.claude/agents/|\.claude/skills/|\.agents/skills/.*SKILL|^CLAUDE\.md$|playbook/handbook\.md' || true)
EVALS=$(echo "$STAGED" | grep -E '^evals/' || true)
if [ -n "$CONFIG" ] && [ -z "$EVALS" ]; then
  echo "⚠️ 铁律 #12：本次 commit 改了 agent 配置但无 evals/ 配套（§35 无 eval 不进 main）。"
  echo "   改的配置："; echo "$CONFIG" | sed 's/^/     /'
  echo "   建议补 golden trajectory，或确认现有 eval 已覆盖。"
  if [ "${CTO_EVAL_GATE_STRICT:-0}" = "1" ] && [ "${CTO_EVAL_GATE_ACK:-0}" != "1" ]; then
    echo "   🛑 STRICT 模式 → 阻止 commit。补 eval 或 export CTO_EVAL_GATE_ACK=1 单次放行。"
    exit 1
  fi
fi

# §48 codex-bridge：异步后台跑 — 不阻塞 commit
RUN_SH=".agents/skills/codex-bridge/run.sh"
if [ -x "$RUN_SH" ]; then
  ( bash "$RUN_SH" HEAD &> /dev/null & disown 2>/dev/null ) || true
fi
exit 0
EOF
chmod +x "$HOOK"

echo "✓ git pre-commit hook 已安装到 $HOOK"
echo ""
echo "下次 git commit 时（无论通过 Claude Code 还是终端），"
echo "都会异步触发 codex-bridge review，结果写入 docs/ai-cto/REVIEW-QUEUE.md"
echo ""
echo "卸载：rm $HOOK"
