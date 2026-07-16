#!/usr/bin/env bash
# scripts/agy-delegate.sh — Antigravity CLI (agy) 委派一键化（v4.4）
#
# 背景（2026-07-16 实测，agy v1.1.3 / winget Google.AntigravityCLI）：
#   agy -p（print 模式）headless 可用，纯文本 prompt 往返仅 ~7s ——
#   没有 codex exec 的 37s/shell 进程 Windows 沙箱税（learned rule 2026-07-10），
#   也不要求目标目录是 git 仓库。
#   模型阵容（`agy models` 实测 2026-07-16）：Gemini 3.5 Flash (Low/Medium/High) /
#   Gemini 3.1 Pro (Low/High) / Claude Sonnet 4.6 (Thinking) / Claude Opus 4.6 (Thinking) /
#   GPT-OSS 120B。
#
# 适才适用（与 codex-delegate.sh 分工，手册 §5.1 / §48.5.1）：
#   - 写作型多文件产出（apply_patch 语义）      → codex-delegate.sh（gpt-5.5）
#   - 快速问答 / 摘要 / 草稿 / 跨模型二审（自包含）→ 本脚本（Gemini，秒级往返）
#   - codex 配额耗尽时的跨模型 review 补位        → 本脚本（Gemini ≠ GPT ≠ Claude，保留跨模型价值）
#   - Claude Code 会话内委派 codex               → 仍首选 MCP codex 通道（常驻 server 无进程税）
#
# 用法：
#   bash scripts/agy-delegate.sh "<自包含 prompt>" [工作目录=当前]
#   AGY_MODEL="Gemini 3.1 Pro (High)" bash scripts/agy-delegate.sh "..."   # 指定模型
#   AGY_TIMEOUT=10m bash scripts/agy-delegate.sh "..."                      # print 超时（默认 5m）
#
# 自包含三要素（print 模式无交互授权界面，脚本会 lint 提醒）：
#   1. 所需上下文（diff / 文件内容）直接贴入 prompt —— 工具调用可能因等授权而挂到超时
#   2. 只要文本产出：review / 分析 / 草稿类任务最稳
#   3. 验证外置：产物由 orchestrator 事后验证（eval / 人审）
set -uo pipefail

PROMPT="${1:-}"
WORKDIR="${2:-$(pwd)}"
[ -z "$PROMPT" ] && { echo "用法: bash scripts/agy-delegate.sh \"<自包含 prompt>\" [工作目录]"; exit 1; }

# 前置检查
command -v agy >/dev/null 2>&1 || { echo "✗ agy CLI 不在 PATH（winget install Google.AntigravityCLI）"; exit 1; }
[ -d "$WORKDIR" ] || { echo "✗ 工作目录不存在: $WORKDIR"; exit 1; }

# 自包含 lint（警告不阻断）
warn() { echo "⚠️  $1"; }
echo "$PROMPT" | grep -qiE '先读|读取.*文件|read the|修改.*文件|edit the|跑测试|run.*test|执行.*命令' && \
  warn "prompt 疑似要求「读/改文件/跑命令」—— print 模式无交互授权，工具调用可能挂到超时。改为自包含（贴入 diff/文件内容）+ 只要文本产出"
[ "${#PROMPT}" -lt 200 ] && \
  warn "prompt 偏短（${#PROMPT} 字符）—— 委派应贴入全部所需上下文，避免 agent 缺上下文瞎写（§32.5 Context Starvation）"

MODEL="${AGY_MODEL:-}"
TIMEOUT="${AGY_TIMEOUT:-5m}"
echo "→ agy -p [model=${MODEL:-default}] [timeout=$TIMEOUT] @ $WORKDIR"
T0=$(date +%s)
if [ -n "$MODEL" ]; then
  OUT=$(cd "$WORKDIR" && agy -p "$PROMPT" --model "$MODEL" --print-timeout "$TIMEOUT" </dev/null 2>&1)
else
  OUT=$(cd "$WORKDIR" && agy -p "$PROMPT" --print-timeout "$TIMEOUT" </dev/null 2>&1)
fi
RC=$?
T1=$(date +%s)
DUR=$((T1-T0))
echo "$OUT"
echo "─────────────────────────────────────"
echo "agy exit=$RC · 耗时 ${DUR}s"

# 用量入账：agy print 模式不输出 token 数（2026-07-16 实测）→ 以时长入 telemetry 统一账本
# （与 codex.token.usage 同构 JSONL，report.mjs 可按 metric 聚合）
DATA_DIR="${TELEMETRY_DATA_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)/telemetry/data}"
if [ "$RC" -eq 0 ]; then
  mkdir -p "$DATA_DIR"
  # JSON 安全：字段只保留安全字符集（防引号/反斜杠/换行破坏 JSONL）
  REPO_NAME=$(basename "$(git -C "$WORKDIR" rev-parse --show-toplevel 2>/dev/null || echo "$WORKDIR")" | tr -cd 'A-Za-z0-9._-')
  MODEL_SAFE=$(printf '%s' "${MODEL:-default}" | tr -cd 'A-Za-z0-9._() -' | tr ' ' '_')
  TS=$(date -Iseconds 2>/dev/null || date)
  printf '{"ts":"%s","metric":"agy.cli.duration","value":%s,"unit":"seconds","attrs":{"model":"%s","tool":"agy-cli"},"resource":{"repo":"%s"}}\n' \
    "$TS" "$DUR" "$MODEL_SAFE" "$REPO_NAME" >> "$DATA_DIR/metrics-$(date +%Y-%m-%d).jsonl"
  echo "📊 agy 用量已入账: ${DUR}s → telemetry (repo=$REPO_NAME)"
else
  echo "📊 agy 非零退出（不入账）"
fi
exit $RC
