#!/usr/bin/env bash
# v3.9 红线层：拦截 AI 改 Constitution / 14 铁律 / SSOT
# OWASP Agentic Top 10 (2025-12) Rogue Agent + AIVSS v0.8 self-modification = risk amplifier
# Anthropic Constitutional AI: constitution 不可妥协
# 共识：所有商业 agent 都把学到的写进显式 markdown，绝不改 system prompt
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

read_hook_input
maybe_run_override "immutable-guard"

[ -z "$HOOK_FILE_PATH" ] && exit 0

CWD="${HOOK_CWD:-.}"
REL="${HOOK_FILE_PATH#$CWD/}"

# 红线 1：CLAUDE.md 14 铁律段
# 检测 old_string 含"## 铁律"标题 或 "铁律 #N" 引用
if [ "$REL" = "CLAUDE.md" ] || echo "$REL" | grep -qE "/CLAUDE\.md$"; then
  if echo "${HOOK_OLD_STRING:-}" | grep -qE "## 铁律|铁律 #[0-9]+"; then
    if [ "${CTO_CONSTITUTION_AMEND:-0}" = "1" ]; then
      audit_log "constitution-amend-allowed" "file=$REL section=铁律 amend_env=1"
      exit 0
    fi
    audit_log "immutable-blocked" "file=$REL section=铁律"
    block_with_reason "🛑 v3.9 IMMUTABLE: CLAUDE.md 铁律段不可由 AI 修改

参考：
- OWASP Agentic Top 10 (2025-12) Rogue Agent
- AIVSS v0.8: self-modification = risk amplifier
- Anthropic Constitutional AI: constitution 不可妥协
- 共识：Cursor / Cline / Aider / Devin 都不让 agent 改 system prompt

允许的进化路径（不改铁律本身）：
  1. 加新 hook / skill / rule（守同一铁律的实施层）
  2. 在 .claude/rules/learned/ 写 learned rule（Bugbot 模式 — Cursor 44k 验证）
  3. 真要改铁律？必须人决策 + amendment proposal + 双签：
     export CTO_CONSTITUTION_AMEND=1（极端情况，audit 永久记录）"
  fi
fi

# 红线 2：CONSTITUTION.md
if echo "$REL" | grep -qE "docs/ai-cto/CONSTITUTION\.md$"; then
  if [ "${CTO_CONSTITUTION_AMEND:-0}" = "1" ]; then
    audit_log "constitution-amend-allowed" "file=$REL amend_env=1"
    exit 0
  fi
  audit_log "immutable-blocked" "file=$REL"
  block_with_reason "🛑 v3.9 IMMUTABLE: CONSTITUTION.md 不可由 AI 单方面修改

走 /cto-constitution review 流程：人决策 + 双签 + amendment 记录。
极端情况：export CTO_CONSTITUTION_AMEND=1 单次解锁，audit 永久记录。"
fi

# 红线 3：forbidden-paths.txt — 只允许加，不允许删（防 AI 放开高危路径）
if echo "$REL" | grep -qE "scripts/forbidden-paths\.txt$"; then
  if [ -n "${HOOK_OLD_STRING:-}" ]; then
    # JSON 里的 \n 经 sed 提取后是字面量两字符，转成真换行
    OLD_RAW=$(printf '%b' "${HOOK_OLD_STRING//\\n/$'\n'}")
    NEW_RAW=$(printf '%b' "${HOOK_NEW_STRING//\\n/$'\n'}")
    # 提取 old / new 中的非注释、非空行
    OLD_PATHS=$(echo "$OLD_RAW" | grep -vE '^\s*(#|$)' || true)
    NEW_PATHS=$(echo "$NEW_RAW" | grep -vE '^\s*(#|$)' || true)

    REMOVED=""
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      # 用固定字符串行精确匹配
      if ! echo "$NEW_PATHS" | grep -qF -x "$line" 2>/dev/null; then
        REMOVED="$REMOVED$line "
      fi
    done <<< "$OLD_PATHS"

    if [ -n "$REMOVED" ]; then
      if [ "${CTO_FORBIDDEN_REMOVE:-0}" = "1" ]; then
        audit_log "forbidden-removal-allowed" "removed=$REMOVED env=1"
        exit 0
      fi
      audit_log "forbidden-removal-blocked" "removed=$REMOVED"
      block_with_reason "🛑 v3.9 IMMUTABLE: forbidden-paths.txt 不允许删除条目

试图删除：$REMOVED

只允许加新路径（扩大保护范围），不允许删（缩小保护 = 放开高危）。
极端情况：export CTO_FORBIDDEN_REMOVE=1 单次解锁，audit 永久记录。"
    fi
  fi
fi

# 红线 4：handbook.md §32 / §33 / §35（基础理论 — 反模式 / 红线 / EDD）
# 这些章节定义了什么是 vibe shipping / forbidden / eval gate，不允许 AI 改义
if echo "$REL" | grep -qE "playbook/handbook\.md$"; then
  if echo "${HOOK_OLD_STRING:-}" | grep -qE "^## 32\. AI 代码生成|^## 33\. Vibe Coding|^## 35\. Eval-Driven"; then
    if [ "${CTO_CONSTITUTION_AMEND:-0}" = "1" ]; then
      audit_log "handbook-core-amend-allowed" "amend_env=1"
      exit 0
    fi
    audit_log "immutable-blocked" "file=$REL section=§32/§33/§35"
    block_with_reason "🛑 v3.9 IMMUTABLE: handbook §32/§33/§35 是基础理论框架，不可由 AI 修改

§32 反模式定义 / §33 vibe 红线 / §35 EDD = ai-playbook 的"宪法"层。
允许：加新章节（§50+）/ 扩 §32.X 子节
禁止：改既有 §32-§35 的核心定义

极端情况：export CTO_CONSTITUTION_AMEND=1"
  fi
fi

exit 0
