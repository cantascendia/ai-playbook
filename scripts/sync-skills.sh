#!/usr/bin/env bash
# 跨平台 skill 单源同步（v3.13 O9 / SOTA team 审计）
#
# 背景：5 个跨平台 skill 在 .claude/skills 与 .agents/skills 字节级重复，无自动同步 → drift 必然发生。
# 决策：**.claude/skills/<name>/SKILL.md 是唯一源（SSOT）**，本脚本同步到 .agents/skills/。
# learned rule 2026-05-12 教训：共同内容多处维护必漂移 → 单源 + 校验器。
#
# 用法：
#   bash scripts/sync-skills.sh          # 同步（.claude → .agents 镜像）
#   bash scripts/sync-skills.sh --check  # 只校验一致，不同 exit 1（CI / eval 用）
set -uo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# 跨平台共享 skill 清单（两侧同名 + 字节级镜像）
SHARED="accessibility-checklist design-system-enforcement i18n-enforcement release-readiness ux-quality-checklist"
MODE="${1:-sync}"
drift=0

for s in $SHARED; do
  SRC=".claude/skills/$s/SKILL.md"
  DST=".agents/skills/$s/SKILL.md"
  if [ ! -f "$SRC" ]; then
    echo "🛑 源缺失（SSOT）: $SRC"; drift=$((drift+1)); continue
  fi
  if [ "$MODE" = "--check" ]; then
    if ! diff -q "$SRC" "$DST" >/dev/null 2>&1; then
      echo "🛑 漂移: $s（.agents/skills 与 .claude/skills 源不一致）"; drift=$((drift+1))
    fi
  else
    mkdir -p ".agents/skills/$s"
    cp "$SRC" "$DST" && echo "✓ synced $s（.claude → .agents）"
  fi
done

if [ "$MODE" = "--check" ]; then
  if [ "$drift" = "0" ]; then
    echo "✅ 跨平台 skill 全部一致（5/5）"
  else
    echo "❌ $drift 处漂移 — 跑 \`bash scripts/sync-skills.sh\` 从 .claude/skills 同步"
    exit 1
  fi
fi
exit 0
