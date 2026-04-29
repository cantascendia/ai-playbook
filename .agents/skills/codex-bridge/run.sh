#!/usr/bin/env bash
# codex-bridge runner — 被 Stop hook 异步调用，跑 codex review 写入 REVIEW-QUEUE.md
# 文档：手册 §48 + .agents/skills/codex-bridge/SKILL.md
set +e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$REPO_ROOT" ] && exit 0
cd "$REPO_ROOT"

# 1. 安全前置：forbidden 路径过滤
TARGET="${1:-HEAD}"
FORBIDDEN=$(git diff --name-only "${TARGET}~1" "${TARGET}" 2>/dev/null | \
  grep -E '(auth|payment|secrets|migration|crypto|infra)/' || true)

if [ -n "$FORBIDDEN" ] && [ "${FORCE:-0}" != "1" ]; then
  mkdir -p docs/ai-cto
  echo "$(date -Iseconds 2>/dev/null || date) | sha=$(git rev-parse --short ${TARGET}) | mode=skipped-forbidden | files=${FORBIDDEN}" \
    >> docs/ai-cto/CODEX-REVIEW-LOG.md
  exit 0
fi

# 2. 业务路径过滤：只 review 业务代码（非纯文档/配置）
BUSINESS=$(git diff --name-only "${TARGET}~1" "${TARGET}" 2>/dev/null | \
  grep -E '^(src|app|lib|apps|packages)/' || true)
if [ -z "$BUSINESS" ] && [ "${FORCE:-0}" != "1" ]; then
  exit 0  # 仅文档改动，不浪费 token
fi

# 3. Debounce：同 commit 不重复 review
SHA=$(git rev-parse "$TARGET")
SHORT_SHA=$(echo "$SHA" | cut -c1-7)
if [ -f docs/ai-cto/CODEX-REVIEW-LOG.md ] && \
   grep -q "sha=${SHORT_SHA}.*mode=success" docs/ai-cto/CODEX-REVIEW-LOG.md 2>/dev/null; then
  exit 0  # 已 review 过
fi

# 4. 检测 codex 可用性
if ! command -v codex >/dev/null 2>&1; then
  mkdir -p docs/ai-cto
  echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=ci_pending | reason=codex_not_installed" \
    >> docs/ai-cto/CODEX-REVIEW-LOG.md
  exit 0
fi

# 5. 真正调用 codex review（异步在后台跑，不阻塞 Stop hook）
mkdir -p docs/ai-cto
{
  OUTPUT=$(codex review --commit "$SHA" --title "ai-playbook §48 cross-model review" 2>&1)
  STATUS=$?

  TS=$(date -Iseconds 2>/dev/null || date)

  if [ $STATUS -eq 0 ]; then
    {
      echo ""
      echo "## $TS — Codex review for $SHORT_SHA"
      echo "Mode: cli-review-commit | Status: success"
      echo ""
      echo "$OUTPUT"
      echo ""
      echo "---"
    } >> docs/ai-cto/REVIEW-QUEUE.md
    echo "$TS | sha=${SHORT_SHA} | mode=success | bytes=${#OUTPUT}" \
      >> docs/ai-cto/CODEX-REVIEW-LOG.md
  else
    echo "$TS | sha=${SHORT_SHA} | mode=failed | exit=$STATUS" \
      >> docs/ai-cto/CODEX-REVIEW-LOG.md
  fi
} &

# 后台运行，立即返回（Stop hook 不阻塞）
disown 2>/dev/null
exit 0
