#!/usr/bin/env bash
# scripts/codex-delegate.sh — codex 委派的正确姿势一键化（v4.3）
#
# 背景（learned rule 2026-07-10-codex-exec-windows-sandbox-tax）：
#   codex exec 在 Windows 的 workspace-write 沙箱给每个 shell 进程加 ~37s 启动税（123×），
#   多 shell 步任务必超时零产出。本脚本固化「写作型委派」调用范式 + 解析用量入 telemetry。
#
# ⚡ 更优通道（2026-07-10 实测）：会话内优先用 codex MCP server（mcp__codex__codex 工具）——
#   MCP server 常驻进程复用沙箱，3 条 shell 命令 + 2 次模型往返仅 32s（CLI 税率下 >110s）。
#   本脚本服务于「终端手动委派」场景；Claude Code 会话内委派请直接走 MCP 工具。
#
# 用法：
#   bash scripts/codex-delegate.sh "<自包含 prompt>" [git仓库路径=当前仓库]
#   CODEX_SANDBOX=danger-full-access bash scripts/codex-delegate.sh "..."   # 确需 shell 的受控任务
#
# 写作型 prompt 三要素（脚本会 lint 提醒）：
#   1. 自包含：所需文件内容/上下文直接贴入 prompt，不要让 codex 读仓库
#   2. 只写：明确「只用 apply_patch 写文件，不要跑测试/不要执行 shell」
#   3. 验证外置：产物由 orchestrator 事后验证（eval / 人审）
set -uo pipefail

PROMPT="${1:-}"
REPO="${2:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
SANDBOX="${CODEX_SANDBOX:-workspace-write}"
[ -z "$PROMPT" ] && { echo "用法: bash scripts/codex-delegate.sh \"<prompt>\" [仓库路径]"; exit 1; }

# 前置检查
command -v codex >/dev/null 2>&1 || { echo "✗ codex CLI 不在 PATH"; exit 1; }
git -C "$REPO" rev-parse --show-toplevel >/dev/null 2>&1 || { echo "✗ $REPO 不是 git 仓库（codex exec 会直接拒绝）"; exit 1; }

# 写作型 lint（警告不阻断）
warn() { echo "⚠️  $1"; }
echo "$PROMPT" | grep -qiE '先读|读取.*文件|read the|自测|跑测试|run.*test|验证一下' && \
  warn "prompt 疑似含「读文件/自测」要求 —— Windows 沙箱 37s/shell命令，多步任务将超时零产出。改为自包含+只写（learned rule 2026-07-10）"
[ "${#PROMPT}" -lt 200 ] && \
  warn "prompt 偏短（${#PROMPT} 字符）—— 写作型委派应贴入全部所需上下文，避免 codex 去读仓库"
[ "$SANDBOX" = "danger-full-access" ] && \
  warn "danger-full-access：codex 子进程不经本仓 guard hook，仅用于受控 prompt + 产物走 staged+review 的任务"

echo "→ codex exec [$SANDBOX] @ $REPO"
T0=$(date +%s)
OUT=$(codex exec -s "$SANDBOX" -C "$REPO" -c service_tier=fast "$PROMPT" </dev/null 2>&1)
RC=$?
T1=$(date +%s)
echo "$OUT"
echo "─────────────────────────────────────"
echo "codex exit=$RC · 耗时 $((T1-T0))s"

# F3：解析 'tokens used N' → 并入 telemetry 统一账本（与 Claude Code OTel 数据同构 JSONL）
TOKENS=$(printf '%s\n' "$OUT" | grep -A1 '^tokens used' | tail -1 | tr -d ', ' | grep -E '^[0-9]+$' || true)
[ -z "$TOKENS" ] && TOKENS=$(printf '%s\n' "$OUT" | grep -oE 'tokens used[^0-9]*[0-9,]+' | grep -oE '[0-9,]+$' | tr -d ',' | head -1 || true)
DATA_DIR="${TELEMETRY_DATA_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)/telemetry/data}"
if [ -n "$TOKENS" ] && [ "$TOKENS" -gt 0 ] 2>/dev/null; then
  mkdir -p "$DATA_DIR"
  REPO_NAME=$(basename "$REPO")
  TS=$(date -Iseconds 2>/dev/null || date)
  printf '{"ts":"%s","metric":"codex.token.usage","value":%s,"unit":"tokens","attrs":{"model":"gpt-5.5","tool":"codex-cli","sandbox":"%s"},"resource":{"repo":"%s"}}\n' \
    "$TS" "$TOKENS" "$SANDBOX" "$REPO_NAME" >> "$DATA_DIR/metrics-$(date +%Y-%m-%d).jsonl"
  echo "📊 codex 用量已入账: $TOKENS tokens → telemetry (repo=$REPO_NAME)"
else
  echo "📊 未能从输出解析 tokens used（不入账）"
fi
exit $RC
