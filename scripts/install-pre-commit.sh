#!/usr/bin/env bash
# 给本仓库装 git hooks，让终端 git commit（不经 Claude Code）也走本地约束 + §48 codex review。
# 用途：用户不通过 Claude Code（如 PowerShell / IDE）commit 时，Stop hook 不会触发，本脚本装的
# git hooks 是额外入口。
#
# v4.2（PR #11 最小重放 + v3.13 A3 兼容拆分）：
#   - pre-commit  = 铁律 #12 本地 eval gate（必须在 commit **前**才拦得住 staged 内容）
#   - post-commit = §48 codex-bridge 异步触发（pre 阶段 HEAD 仍指向**上一个** commit，
#     review HEAD 会重复审旧 commit、新改动反而被跳过 —— PR #11 的发现；post 阶段 HEAD 已是
#     新 commit，review 对象正确）
#   PR #11 原方案是整体 pre→post，但那会把 v3.13 A3 的 eval gate 也搬到 commit 后（失去阻止
#   能力）——故拆分：gate 留 pre，codex 触发移 post。
#
# 用法：
#   bash scripts/install-pre-commit.sh
#
# 卸载：
#   rm .git/hooks/pre-commit .git/hooks/post-commit

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$REPO_ROOT" ] && { echo "Not in a git repo"; exit 1; }
cd "$REPO_ROOT"

PRE_HOOK=".git/hooks/pre-commit"
POST_HOOK=".git/hooks/post-commit"

# 清理旧版单文件 pre-commit（含 codex-bridge 触发 = review 对象错误的版本）
if [ -f "$PRE_HOOK" ] && grep -q "codex-bridge" "$PRE_HOOK" 2>/dev/null; then
  echo "⚠️  发现旧版 pre-commit（codex 触发在 pre 阶段 review 对象错误），备份到 ${PRE_HOOK}.bak 后重装"
  mv "$PRE_HOOK" "${PRE_HOOK}.bak"
elif [ -f "$PRE_HOOK" ]; then
  echo "⚠️  $PRE_HOOK 已存在。备份到 ${PRE_HOOK}.bak"
  cp "$PRE_HOOK" "${PRE_HOOK}.bak"
fi
if [ -f "$POST_HOOK" ]; then
  echo "⚠️  $POST_HOOK 已存在。备份到 ${POST_HOOK}.bak"
  cp "$POST_HOOK" "${POST_HOOK}.bak"
fi

# ── pre-commit：铁律 #12 本地 eval gate（v3.13 A3，逻辑原样保留）──
cat > "$PRE_HOOK" <<'EOF'
#!/usr/bin/env bash
# 铁律 #12 本地 eval gate (v3.13 A3) — 必须在 commit 前跑（拦 staged 内容）

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
exit 0
EOF
chmod +x "$PRE_HOOK"

# ── post-commit：§48 codex-bridge 异步触发（HEAD 已是新 commit，review 对象正确）──
cat > "$POST_HOOK" <<'EOF'
#!/usr/bin/env bash
# §48 codex-bridge post-commit trigger（PR #11 重放）
# 为什么在 post 而不是 pre：pre 阶段新 commit 尚未生成、HEAD 仍是上一个 commit，
# review HEAD 会审错对象。post 阶段 HEAD 已更新。异步后台跑 — 不阻塞。
RUN_SH=".agents/skills/codex-bridge/run.sh"
if [ -x "$RUN_SH" ]; then
  ( bash "$RUN_SH" HEAD &> /dev/null & disown 2>/dev/null ) || true
fi
exit 0
EOF
chmod +x "$POST_HOOK"

echo "✓ git hooks 已安装："
echo "    $PRE_HOOK  — 铁律 #12 本地 eval gate（commit 前拦 staged 配置无 eval）"
echo "    $POST_HOOK — §48 codex-bridge 异步 review（commit 后审新 HEAD）"
echo ""
echo "下次 git commit 时（无论通过 Claude Code 还是终端），"
echo "eval gate 先检查 staged，commit 落地后 codex-bridge 异步 review，结果写入 docs/ai-cto/REVIEW-QUEUE.md"
echo ""
echo "卸载：rm $PRE_HOOK $POST_HOOK"
