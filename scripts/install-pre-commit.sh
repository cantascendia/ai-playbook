#!/usr/bin/env bash
# 给本仓库装 git post-commit hook，让终端 git commit 也触发 §48 codex review
# 用途：用户不通过 Claude Code（如 PowerShell / IDE）commit 时，Stop hook 不会触发，
# post-commit hook 是额外的入口。
#
# 为什么是 post-commit 而不是 pre-commit：
#   pre-commit 阶段 HEAD 仍指向**上一个** commit（新 commit 尚未生成），
#   review HEAD 会重复审上一个 commit，新改动反而被跳过。
#   post-commit 在新 commit 写入后触发，HEAD 已是新 commit，review 对象正确。
#
# 用法：
#   bash scripts/install-pre-commit.sh
#
# 卸载：
#   rm .git/hooks/post-commit

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$REPO_ROOT" ] && { echo "Not in a git repo"; exit 1; }
cd "$REPO_ROOT"

HOOK=".git/hooks/post-commit"
LEGACY_HOOK=".git/hooks/pre-commit"

# 清理旧版 pre-commit（如曾装错位置）
if [ -f "$LEGACY_HOOK" ] && grep -q "codex-bridge" "$LEGACY_HOOK" 2>/dev/null; then
  echo "⚠️  发现旧版 pre-commit hook（review 对象错误），备份到 ${LEGACY_HOOK}.bak 后移除"
  mv "$LEGACY_HOOK" "${LEGACY_HOOK}.bak"
fi

if [ -f "$HOOK" ]; then
  echo "⚠️  $HOOK 已存在。备份到 ${HOOK}.bak"
  cp "$HOOK" "${HOOK}.bak"
fi

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# §48 codex-bridge post-commit trigger
# 异步后台跑 — 不阻塞用户
# 注意：post-commit 阶段 HEAD 已是新 commit，review 对象正确
RUN_SH=".agents/skills/codex-bridge/run.sh"
if [ -x "$RUN_SH" ]; then
  ( bash "$RUN_SH" HEAD &> /dev/null & disown 2>/dev/null ) || true
fi
exit 0
EOF
chmod +x "$HOOK"

echo "✓ git post-commit hook 已安装到 $HOOK"
echo ""
echo "下次 git commit 时（无论通过 Claude Code 还是终端），"
echo "都会异步触发 codex-bridge review，结果写入 docs/ai-cto/REVIEW-QUEUE.md"
echo ""
echo "卸载：rm $HOOK"
