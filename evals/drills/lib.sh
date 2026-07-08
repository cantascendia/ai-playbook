#!/usr/bin/env bash
# evals/drills/lib.sh — 季度 fallback 演练共享库。
#
# 设计原则（诚实优先，铁律 #2/#9）：
#   - 演练 **只** 在临时目录 / 临时 git 仓 / mock 命令里跑，绝不 mutate 真仓 / 真 git / 真云。
#   - 每条演练断言"fallback 链真的接上了"（log marker / exit code / cooldown 文件），
#     不是"恰好还能过"。降级路径没接上就该 RESULT: FAIL。
#   - 平台真跑不了的（如某 CI 装了 jq 无法安全屏蔽）→ RESULT: SKIP + 明确理由，不伪 PASS。
#
# RESULT 协议（run.sh 读最后一行 RESULT:）：
#   RESULT: PASS                 演练通过（fallback 真接上）
#   RESULT: FAIL <reason>        fallback 没接上 / 静默 fail-open —— 真问题
#   RESULT: SKIP <reason>        本平台无法模拟该外部状态（诚实跳过，非失败）
#   RESULT: SKIP-manual <reason> 场景需真实外部/会话状态，headless 不可自动化
set -uo pipefail

# 真仓根（在建沙盒 cd 之前锁定，后续引用真 hook / 真 bridge 用绝对路径）
DRILL_REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
export DRILL_REPO_ROOT

drill_pass()        { echo "pass=1 fail=0"; echo "RESULT: PASS"; exit 0; }
drill_fail()        { echo "pass=0 fail=1 ($*)"; echo "RESULT: FAIL $*"; exit 0; }
drill_skip()        { echo "pass=0 fail=0 (skip)"; echo "RESULT: SKIP $*"; exit 0; }
drill_skip_manual() { echo "pass=0 fail=0 (manual)"; echo "RESULT: SKIP-manual $*"; exit 0; }

# 建一个"看起来像 ai-playbook 自身"的沙盒仓，让 immutable-guard 的 self 检测生效。
# 回显沙盒路径。调用方负责 rm -rf。
drill_make_self_sandbox() {
  local sb; sb="$(mktemp -d)"
  mkdir -p "$sb/playbook" "$sb/scripts" "$sb/.claude/hooks/lib" "$sb/.claude/hooks/engine"
  printf '## 50. flywheel self-marker\n' > "$sb/playbook/handbook.md"
  printf '## 铁律（任何时候都不能违反）\n1. 占位铁律\n' > "$sb/CLAUDE.md"
  printf 'auth/\npayment/\nsecrets/\nmigration\n' > "$sb/scripts/forbidden-paths.txt"
  # 复制真 guard + lib + engine，使 shim 行为与真仓一致
  cp "$DRILL_REPO_ROOT/.claude/hooks/immutable-guard.sh" "$sb/.claude/hooks/"
  cp "$DRILL_REPO_ROOT/.claude/hooks/lib/common.sh"       "$sb/.claude/hooks/lib/"
  cp "$DRILL_REPO_ROOT"/.claude/hooks/engine/*.mjs        "$sb/.claude/hooks/engine/" 2>/dev/null || true
  echo "$sb"
}

# 从 PATH 里移除某个"独立目录"（不与 /usr/bin 等共享工具目录混住时才安全）。
# 回显新 PATH；若该目录是共享关键目录，回显空串（调用方据此判断无法安全屏蔽）。
drill_path_without_dir() {
  local target="$1"
  case "$target" in
    /usr/bin|/bin|/usr/local/bin|/usr/local/sbin|/sbin) echo ""; return 0 ;;
  esac
  printf '%s' "$PATH" | tr ':' '\n' | grep -vxF "$target" | paste -sd: -
}
