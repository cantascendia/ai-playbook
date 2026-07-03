#!/usr/bin/env bash
# v4.0: Node guard engine 优先；node 缺失或 CTO_GUARD_ENGINE=legacy → 下方 legacy 实现
# （v3.15 冻结，零红线真空 — v3.14 verdict Phase-1 硬条件）。引擎：engine/guard.mjs
GUARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${CTO_GUARD_ENGINE:-engine}" != "legacy" ] && command -v node >/dev/null 2>&1 && [ -f "$GUARD_DIR/engine/guard.mjs" ]; then
  exec node "$GUARD_DIR/engine/guard.mjs" branch-guard
fi
# ══ legacy fallback（v3.15 原实现，冻结不再演进）══
# 铁律 #8：先创建 Git 分支再动手 — PreToolUse(Edit|Write|MultiEdit)
# main / master branch 上直接 Edit → exit 2 阻止
# Opt-out: CTO_MAIN_EDIT_ALLOWED=1（仅 hotfix 紧急场景）
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

require_jq || exit 0
read_hook_input
maybe_run_override "branch-guard"

# 仅对 file 类工具生效
[ -z "$HOOK_FILE_PATH" ] && exit 0

# 检测当前 git branch
cd "${HOOK_CWD:-.}" 2>/dev/null
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
[ -z "$BRANCH" ] && exit 0  # 不在 git repo 内，跳过

# 危险 branch 名单
case "$BRANCH" in
  main|master|production|prod|release)
    # v4.0e（修 2026-07-02 误拦）：仅拦当前工作树内文件 —
    # 保护分支上写仓库外文件（如 ~/.claude/.../memory/*.md）与本仓 main 无关 → 放行。
    # 与 engine fileInsideWorktree() 前缀判断字节等价（同 JSON 风格，剥离自洽）。
    _NF="${HOOK_FILE_PATH//\\//}"
    _NC="${HOOK_CWD:-.}"; _NC="${_NC//\\//}"
    _INSIDE=1
    case "$_NF" in
      /*|[A-Za-z]:/*)  # 绝对路径 → 必须落在 cwd 前缀内才算仓库内
        _INSIDE=0
        case "$_NF" in
          "$_NC"|"$_NC"/*) _INSIDE=1 ;;
        esac
        ;;
    esac
    if [ "$_INSIDE" = "0" ]; then
      audit_log "main-edit-outside-repo-allowed" "branch=$BRANCH file=$HOOK_FILE_PATH"
      exit 0
    fi

    if [ "${CTO_MAIN_EDIT_ALLOWED:-0}" = "1" ]; then
      audit_log "main-edit-allowed-emergency" "branch=$BRANCH file=$HOOK_FILE_PATH"
      exit 0
    fi

    audit_log "main-edit-blocked" "branch=$BRANCH file=$HOOK_FILE_PATH"

    block_with_reason "🛑 铁律 #8 BLOCKED: 当前在 \`$BRANCH\` 分支上直接 Edit

文件：$HOOK_FILE_PATH
分支：$BRANCH （受保护）

直接编辑主分支违反 #8（先创建 Git 分支再动手）。

正确做法：
  git checkout -b feat/<short-name>
  # 或基于已有 PR 的分支：
  git checkout -b fix/<issue-short>

紧急 hotfix 例外（仅在事故响应中使用）：
  export CTO_MAIN_EDIT_ALLOWED=1   # 单次会话 + audit log 永久记录

参考：CLAUDE.md 铁律 #8"
    ;;
esac

exit 0
