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

# v3.14：排除 zzz-* 保留前缀（036 meta-eval 临时文件；被 session 限额杀死时会泄漏在此目录，
# 此前导致 49≠48 TIER1 误 fail）。真 eval 永不以 zzz- 开头。
EVAL_N=$(ls evals/golden-trajectories/*.yaml 2>/dev/null | grep -vc '/zzz-' | tr -d ' ')
assert_count "evals" "$EVAL_N" "evals (golden-trajectories)"

SKILL_C_N=$(ls -d .claude/skills/*/ 2>/dev/null | wc -l | tr -d ' ')
assert_count "skills (.claude)" "$SKILL_C_N" "skills (.claude)"

SKILL_A_N=$(ls -d .agents/skills/*/ 2>/dev/null | wc -l | tr -d ' ')
assert_count "skills (.agents)" "$SKILL_A_N" "skills (.agents)"

# v3.14：补 learned-rules 检查（此前漏检 → 4≠7 漂移未被发现，bold-audit 抓到）
LRULE_N=$(ls .claude/rules/learned/*.md 2>/dev/null | grep -vc 'README' | tr -d ' ')
assert_count "learned-rules" "$LRULE_N" "learned-rules"

echo ""
echo "=== TIER 1.5：AGENTS.md/GEMINI.md 单源漂移锁（硬 gate，v4.4）==="
# v4.3 造了 sync-agents-md.mjs 漂移锁但从未接 CI（全仓 grep 零命中）→ 摆设。
# v4.4 把「已提交模板 vs CLAUDE.md 铁律段+forbidden-paths.txt 生成物」的 --check 接进 CI 已跑的 check-counts。
# 关键：--check 只读比对已提交文件，绝不先 write（否则会像 eval 082 test#2 那样自愈屏蔽真漂移）。
if [ -f scripts/sync-agents-md.mjs ]; then
  if command -v node >/dev/null 2>&1; then
    if node scripts/sync-agents-md.mjs --check >/dev/null 2>&1; then
      echo "✓ AGENTS.md/GEMINI.md 与 CLAUDE.md 铁律段/forbidden-paths.txt 无漂移"
    else
      echo "❌ AGENTS.md/GEMINI.md 已漂移 —— 跑 'node scripts/sync-agents-md.mjs' 重新生成后提交"
      FAIL=$((FAIL+1))
    fi
  else
    echo "⚠️  node 缺失 — 跳过 AGENTS/GEMINI 漂移锁（legacy 环境；CI 有 node）"
    WARN=$((WARN+1))
  fi
else
  echo "⚠️  scripts/sync-agents-md.mjs 不存在 — 跳过漂移锁"
  WARN=$((WARN+1))
fi

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

# v4.4 N4：REVIEW-QUEUE.md 轮转是纯手动动作、无阈值告警 → 反复胀到 300KB+（本轮审计发现 349KB）。
# 加体积软警告：> 200KB 提示按季度轮转到 archive/（SessionStart 注入已限流不受影响，但人工审阅成本高）。
RQ="docs/ai-cto/REVIEW-QUEUE.md"
if [ -f "$RQ" ]; then
  RQ_BYTES=$(wc -c < "$RQ" | tr -d ' ')
  if [ "$RQ_BYTES" -gt 204800 ]; then
    echo "⚠️  $RQ 已达 $((RQ_BYTES/1024))KB（>200KB）→ 建议按季度轮转历史到 docs/ai-cto/archive/（手册记忆系统约定）"
    WARN=$((WARN+1))
  fi
fi

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
