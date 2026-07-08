#!/usr/bin/env bash
# 演练 05 — 场景 3：settings.local.json 关 hook → 仍能 audit（**genuinely manual**）。
#
# 为什么无法 headless 自动化（诚实说明，不做假 PASS）：
#   该场景要观察的核心是「用户在 settings.local.json 里清空 PreToolUse 后，**新起一个真 Claude
#   会话**时 SessionStart 能否比对 effective vs 配置的 hooks 并输出差异警告」。这需要：
#     1. 真实 Claude Code 会话（SessionStart hook 只在真会话启动时触发，headless 脚本起不了）；
#     2. 用户主动写 settings.local.json（本演练**不会**去写真仓的 settings.local.json）。
#
# 额外诚实发现（2026-07-08 脚本化时）：当前 .claude/settings.json 的 SessionStart 只做
#   「回显项目记忆 + 提示 enforcement 已部署」，**并未实现**「比对 effective vs settings.json
#   hooks 数并警告」这一步。所以场景 3 的期望审计行为目前尚未落地 —— 这是待补的运营/实现缺口，
#   不是脚本能验的东西。演练如实报 SKIP-manual，不伪装成通过。
#
# 本脚本能静态核对的前提（advisory，不足以自动化整个场景）：
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/lib.sh"

notes=""
# 前提 A：settings.local.json 已被 gitignore（用户关 hook 不会污染仓库）
if git -C "$DRILL_REPO_ROOT" check-ignore -q .claude/settings.local.json 2>/dev/null; then
  notes="$notes settings.local.json=gitignored✓"
else
  notes="$notes settings.local.json=未gitignore⚠"
fi
# 前提 B：SessionStart 是否含 effective-vs-configured 差异比对逻辑（诚实核对现状）
if grep -q 'effective' "$DRILL_REPO_ROOT/.claude/settings.json" 2>/dev/null; then
  notes="$notes SessionStart-diff=已实现"
else
  notes="$notes SessionStart-diff=未实现(需补)"
fi

echo "[precondition]$notes"
drill_skip_manual "需真实 Claude 会话观察 SessionStart（headless 起不了会话）；且 opt-out 差异警告逻辑当前未实现。运营手动跑：改 settings.local.json 清空 PreToolUse → 新开会话 → 确认差异警告 + git 可见。见 QUARTERLY-DRILLS.md 场景 3。"
