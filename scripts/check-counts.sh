#!/usr/bin/env bash
# check-counts.sh — COUNTS.md SSOT enforcer（v3.13 / 提案 R1）
#
# 背景：SOTA team 审计发现 COUNTS.md 自称"唯一计数源 + CI gate"，但本脚本一直不存在
# （vaporware，违反铁律 #2），且 COUNTS 自己把 hooks 写成 9（实际 10）。没 enforcer →
# 计数必然漂移。本脚本让 COUNTS.md 成为**真**被强制的 SSOT：
#   TIER 1（硬 gate，exit 1）：COUNTS.md 表里的数字必须 == 文件系统实际数量
#   TIER 2（软警告）：扫 README/CLAUDE.md/handbook 里已知会漂移的散落数字
#
# 用法：
#   bash scripts/check-counts.sh          # 全检，TIER1 不符 exit 1
#   CHECK_COUNTS_STRICT=1 ...             # TIER2 警告也升级为 exit 1
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
COUNTS="docs/ai-cto/COUNTS.md"

FAIL=0
WARN=0

if [ ! -f "$COUNTS" ]; then
  echo "🛑 $COUNTS 不存在 — 无 SSOT 可校验"
  exit 1
fi

# 从 COUNTS.md 某行（按 label 定位）抽出第一个 **N** 数字
counts_value() {
  local label="$1"
  grep -F "$label" "$COUNTS" 2>/dev/null | head -1 | grep -oE '\*\*[0-9]+\*\*' | head -1 | tr -d '*'
}

# TIER 1：COUNTS 表 vs 文件系统
# 格式：assert_count "COUNTS 行 label" 实际数量 "描述"
assert_count() {
  local label="$1" actual="$2" desc="$3"
  local claimed
  claimed=$(counts_value "$label")
  if [ -z "$claimed" ]; then
    echo "⚠️  TIER1: COUNTS.md 找不到 '$label' 的 **N** 数字（行格式变了？）"
    WARN=$((WARN+1))
    return
  fi
  if [ "$claimed" = "$actual" ]; then
    echo "✓ $desc: $actual（COUNTS=$claimed）"
  else
    echo "🛑 $desc: 实际 $actual ≠ COUNTS.md 写的 $claimed —— SSOT 漂移，改 $COUNTS"
    FAIL=$((FAIL+1))
  fi
}

echo "=== TIER 1：COUNTS.md vs 文件系统（硬 gate）==="

# hooks：.claude/hooks/*.sh（lib/common.sh 在 lib/ 子目录，不被 *.sh 匹配，正确不计入）
HOOKS_N=$(ls .claude/hooks/*.sh 2>/dev/null | wc -l | tr -d ' ')
assert_count "hooks (.sh)" "$HOOKS_N" "hooks (.sh)"

# 安全红线必查：5 个 guard 缺任一直接 fail（与 cto-init/cto-doctor 一致）
for g in immutable forbidden branch destructive-action mcp-guard; do
  if [ ! -f ".claude/hooks/${g}-guard.sh" ] && [ ! -f ".claude/hooks/${g}.sh" ]; then
    echo "🛑 安全红线缺失：.claude/hooks/${g}*.sh 不存在"
    FAIL=$((FAIL+1))
  fi
done

CMD_N=$(ls .claude/commands/cto-*.md 2>/dev/null | wc -l | tr -d ' ')
assert_count "cto-* commands" "$CMD_N" "cto-* commands"

AGENT_N=$(ls .claude/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
assert_count "sub-agents" "$AGENT_N" "sub-agents"

EVAL_N=$(ls evals/golden-trajectories/*.yaml 2>/dev/null | wc -l | tr -d ' ')
assert_count "evals" "$EVAL_N" "evals (golden-trajectories)"

SKILL_C_N=$(ls -d .claude/skills/*/ 2>/dev/null | wc -l | tr -d ' ')
assert_count "skills (.claude)" "$SKILL_C_N" "skills (.claude)"

SKILL_A_N=$(ls -d .agents/skills/*/ 2>/dev/null | wc -l | tr -d ' ')
assert_count "skills (.agents)" "$SKILL_A_N" "skills (.agents)"

echo ""
echo "=== TIER 2：散落过时数字扫描（软警告）==="
# 已知会漂移的硬编码数字。命中即提示改为引用 COUNTS.md。
scan_stale() {
  local file="$1" pattern="$2" note="$3"
  [ -f "$file" ] || return
  if grep -qiE "$pattern" "$file" 2>/dev/null; then
    echo "⚠️  $file 含可能过时的硬编码计数（$note）→ 建议改为引用 COUNTS.md"
    WARN=$((WARN+1))
  fi
}
scan_stale "README.md" '(^|[^0-9])21 ?(个)?( cto)?( )?(命令|commands)' "commands 实 ${CMD_N}"
scan_stale "CLAUDE.md" '(^|[^0-9])17 ?(个)?(命令|commands)' "commands 实 ${CMD_N}"
# v3.13 O3：防 eval 门禁硬编码数字回潮（门禁应"全部可执行 eval pass"，数量引 COUNTS.md）
scan_stale "playbook/handbook.md" '12\+ *(trajectory|golden)' "eval 门禁不应硬编码数字"
scan_stale ".claude/commands/cto-eval.md" '总计：12 条' "eval 报告模板不应硬编码 12 条"

echo ""
echo "═══════════════════════════════════════"
if [ "$FAIL" -gt 0 ]; then
  echo "❌ check-counts: $FAIL 处 SSOT 漂移（TIER1 硬错）+ $WARN 处警告"
  echo "   修 docs/ai-cto/COUNTS.md 使其匹配文件系统，或修文件系统使其匹配 COUNTS。"
  exit 1
fi
if [ "$WARN" -gt 0 ] && [ "${CHECK_COUNTS_STRICT:-0}" = "1" ]; then
  echo "❌ check-counts: TIER1 全过，但 $WARN 处 TIER2 警告（STRICT 模式升级为错）"
  exit 1
fi
echo "✅ check-counts: TIER1 全部一致（$WARN 处 TIER2 软警告）"
echo "═══════════════════════════════════════"
exit 0
