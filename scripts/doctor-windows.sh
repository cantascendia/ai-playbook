#!/usr/bin/env bash
# doctor-windows.sh — 一次性 Windows/git-bash 工具链健康自检（POSIX / git-bash）
#
# 起因（本仓真实战伤 — 全部是 Windows 工具链问题）：
#   · CRLF 咬了 3 次；最狠一次：llm-judge forbidden-regex 里 \r 静默漏匹配
#     —— 无报错、检测只是永远不触发（silent-miss，最难查的一类）
#   · MSYS /c/ 路径破坏 guard engine 自检（file:// import 需原生 Windows 绝对路径）
#   · jq 缺失（本仓 sed fallback 才是生产路径）
#   · PowerShell 5.1 的各种坑
#
# 用法：bash scripts/doctor-windows.sh
# 退出码：任何 ✗ fail → exit 1；否则 exit 0（⚠ warn 不致命）。
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 1

OK=0; WARN=0; FAIL=0
ok()   { printf '  \342\234\223 %s\n' "$1"; OK=$((OK+1)); }        # ✓
warn() { printf '  \342\232\240 %s\n' "$1"; [ -n "${2:-}" ] && printf '      \342\206\263 fix: %s\n' "$2"; WARN=$((WARN+1)); }  # ⚠
fail() { printf '  \342\234\227 %s\n' "$1"; [ -n "${2:-}" ] && printf '      \342\206\263 fix: %s\n' "$2"; FAIL=$((FAIL+1)); }  # ✗
sec()  { printf '\n\342\224\200\342\224\200 %s\n' "$1"; }          # ── section

printf '════════════════════════════════════════\n'
printf ' doctor-windows — Windows/git-bash 工具链自检\n'
printf ' repo: %s\n' "$REPO_ROOT"
printf '════════════════════════════════════════\n'

# ── 1. 核心工具存在 + 版本 ──────────────────────────
sec "1. 核心工具"

# node >= 20
if command -v node >/dev/null 2>&1; then
  NODE_RAW="$(node --version 2>/dev/null)"       # e.g. v22.19.0
  NODE_MAJ="$(printf '%s' "$NODE_RAW" | sed -E 's/^v?([0-9]+).*/\1/')"
  if [ -n "$NODE_MAJ" ] && [ "$NODE_MAJ" -ge 20 ] 2>/dev/null; then
    ok "node $NODE_RAW (>=20 — guard engine 走 Node 快路径)"
  else
    warn "node $NODE_RAW (<20 — guard engine 可能不稳)" "升级 node 到 >=20（nvm-windows 或 winget install OpenJS.NodeJS.LTS）"
  fi
else
  warn "node 缺失 — guard 自动回退 legacy bash 实现（~1.5s/guard，可用但慢）" "winget install OpenJS.NodeJS.LTS 以启用 Node 引擎"
fi

# git
if command -v git >/dev/null 2>&1; then
  ok "git $(git --version 2>/dev/null | sed -E 's/^git version //')"
else
  fail "git 缺失" "安装 Git for Windows（含 git-bash）"
fi

# bash flavor (MSYS?)
BASH_MACH="$(bash -c 'echo $MACHTYPE' 2>/dev/null || echo unknown)"
UNAME_S="$(uname -s 2>/dev/null || echo unknown)"
case "$UNAME_S" in
  MINGW*|MSYS*|CYGWIN*) ok "bash flavor: $UNAME_S ($BASH_MACH) — MSYS/git-bash，POSIX 工具本地可用" ;;
  Linux)               ok "bash flavor: Linux ($BASH_MACH) — CI/WSL 环境" ;;
  *)                   warn "bash flavor: $UNAME_S ($BASH_MACH) — 非预期" "确认在 git-bash 或 WSL 中运行本脚本" ;;
esac

# jq — 缺失是 OK（sed fallback 才是生产路径）
if command -v jq >/dev/null 2>&1; then
  ok "jq $(jq --version 2>/dev/null) 存在（可选 — 本仓 hook 有 sed fallback，jq 有无都行）"
else
  ok "jq 缺失 = OK — 本仓 guard/hook 用 sed fallback 作为生产路径，不依赖 jq"
fi

# ── 2. autocrlf + .gitattributes 覆盖 ───────────────
sec "2. 换行符策略（CRLF 防线）"

AUTOCRLF="$(git config --get core.autocrlf 2>/dev/null || echo '(unset)')"
case "$AUTOCRLF" in
  true)  warn "core.autocrlf=true — checkout 时 LF→CRLF；必须靠 .gitattributes eol=lf 兜底关键文件" "已有 .gitattributes 覆盖则安全；否则 git config core.autocrlf input" ;;
  input) ok "core.autocrlf=input — commit 时 CRLF→LF，checkout 不改（推荐）" ;;
  false) ok "core.autocrlf=false — git 不碰换行符（依赖 .gitattributes eol=lf 强制）" ;;
  *)     warn "core.autocrlf=$AUTOCRLF — 未显式设置" "建议 git config core.autocrlf input（配合 .gitattributes）" ;;
esac

# .gitattributes 覆盖 sh/mjs/js/yml/yaml/json 六类
GA=".gitattributes"
if [ -f "$GA" ]; then
  MISSING=""
  for ext in sh mjs js yml yaml json; do
    if grep -qE "^\*\.${ext}[[:space:]].*eol=lf" "$GA"; then :; else MISSING="$MISSING $ext"; fi
  done
  if [ -z "$MISSING" ]; then
    ok ".gitattributes 覆盖 sh/mjs/js/yml/yaml/json 六类（均 eol=lf）"
  else
    fail ".gitattributes 缺 eol=lf 覆盖:$MISSING" "在 .gitattributes 加 '*.<ext> text eol=lf'（缺一类 = 该类文件 CRLF 静默风险）"
  fi
else
  fail ".gitattributes 不存在" "创建 .gitattributes 并加 '*.sh/*.mjs/*.js/*.yml/*.yaml/*.json text eol=lf'"
fi
# 决策记录（按 G 任务约定：本脚本只自检，不 renormalize 仓库）
printf '      \342\204\271 note: eol=lf 仅影响新 checkout/规范化的文件；本脚本不跑 git add --renormalize\n'
printf '            （批量规范化是独立决策 — 若需，人工 git add --renormalize . 并单独 commit 审阅 diff）\n'

# ── 3. CRLF 审计（read-only，capped） ──────────────
sec "3. CRLF 审计（tracked *.txt/*.yml/*.yaml 工作副本含 \\r？）"

CRLF_CAP=20
CRLF_HITS=0
CRLF_LIST=""
# git ls-files 得 tracked 集；对每个文件 grep \r（read-only，绝不改文件）
while IFS= read -r f; do
  [ -f "$f" ] || continue
  if grep -lIq $'\r' "$f" 2>/dev/null; then
    CRLF_HITS=$((CRLF_HITS+1))
    [ "$CRLF_HITS" -le "$CRLF_CAP" ] && CRLF_LIST="$CRLF_LIST$f"$'\n'
  fi
done < <(git ls-files '*.txt' '*.yml' '*.yaml' 2>/dev/null)

if [ "$CRLF_HITS" -eq 0 ]; then
  ok "0 个 tracked *.txt/*.yml/*.yaml 含 CRLF — regex/检测类无静默漏匹配风险"
else
  warn "$CRLF_HITS 个文件工作副本含 \\r（silent-regex-miss 候选，前 $CRLF_CAP 个如下）" "git add --renormalize <file> 或确保 .gitattributes eol=lf 后重新 checkout"
  printf '%s' "$CRLF_LIST" | sed 's/^/        /'
  [ "$CRLF_HITS" -gt "$CRLF_CAP" ] && printf '        … 及另外 %d 个（已截断）\n' "$((CRLF_HITS-CRLF_CAP))"
fi

# ── 4. MSYS 路径 sanity + guard engine 可加载 ──────
sec "4. MSYS 路径 sanity + guard engine 可加载"

if command -v cygpath >/dev/null 2>&1; then
  ok "cygpath 可用 — MSYS /c/ 路径可转原生 Windows 绝对路径（file:// import 前提）"
  CYGPATH_OK=1
else
  case "$UNAME_S" in
    Linux) ok "cygpath 不适用（Linux/CI — 路径本就原生 POSIX）"; CYGPATH_OK=1 ;;
    *)     fail "cygpath 缺失 — 无法把 MSYS 路径转原生，engine file:// import 会挂" "在完整 git-bash 环境运行（cygpath 随 Git for Windows 提供）"; CYGPATH_OK=0 ;;
  esac
fi

# guard engine 可加载：用 lib.mjs（纯导出，无 main 副作用）做 file:// import 探针
ENGINE_LIB="$REPO_ROOT/.claude/hooks/engine/lib.mjs"
if [ ! -f "$ENGINE_LIB" ]; then
  warn "guard engine lib.mjs 不存在 — 仅 legacy bash 路径可用" "确认 .claude/hooks/engine/ 已随分发落地"
elif ! command -v node >/dev/null 2>&1; then
  warn "node 缺失 — 跳过 engine 可加载探针（legacy 路径不受影响）" "装 node 以启用并验证 Node 引擎"
else
  # 关键：import 需原生 Windows 绝对路径（cygpath -m），MSYS /c/ 直传会 ERR_INVALID_URL / 找不到文件
  if [ "${CYGPATH_OK:-0}" = "1" ] && command -v cygpath >/dev/null 2>&1; then
    NATIVE_LIB="$(cygpath -m "$ENGINE_LIB")"
  else
    NATIVE_LIB="$ENGINE_LIB"
  fi
  if node -e "import('file://$NATIVE_LIB').then(m=>{if(Object.keys(m).length>0)process.exit(0);process.exit(3)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    ok "guard engine 可 file:// import（原生路径 $NATIVE_LIB）"
  else
    fail "guard engine file:// import 失败 — MSYS 路径未正确转原生或引擎损坏" "确认 cygpath -m 转换 + node >=20；用 CTO_GUARD_ENGINE=legacy 临时回退"
  fi
fi

# ── 5. guard smoke（forbidden-guard 拦 auth 路径） ──
sec "5. guard smoke（forbidden-guard 拦 src/auth/x.ts，engine + legacy 双路径）"

SMOKE_JSON='{"tool_name":"Edit","tool_input":{"file_path":"src/auth/x.ts"},"cwd":"."}'
SMOKE_FAIL=0

# 默认路径（node 存在 → engine；缺失 → 自动回退 legacy）
# env -u CTO_DOUBLE_SIGNED：清会话残留的双签 opt-out，否则 auth 路径会被放行导致假绿
rcE=$(printf '%s' "$SMOKE_JSON" | env -u CTO_DOUBLE_SIGNED bash .claude/hooks/forbidden-guard.sh >/dev/null 2>&1; echo $?)
if [ "$rcE" = "2" ]; then
  ok "默认路径（engine/自动回退）拦 src/auth → exit 2"
else
  fail "默认路径未拦 src/auth（exit $rcE，期望 2）" "检查 forbidden-guard.sh + scripts/forbidden-paths.txt SSOT；确认无残留 CTO_DOUBLE_SIGNED=1"
  SMOKE_FAIL=1
fi

# legacy 路径（强制回退，验证零红线真空冻结层仍生效）
rcL=$(printf '%s' "$SMOKE_JSON" | env -u CTO_DOUBLE_SIGNED CTO_GUARD_ENGINE=legacy bash .claude/hooks/forbidden-guard.sh >/dev/null 2>&1; echo $?)
if [ "$rcL" = "2" ]; then
  ok "legacy 路径（CTO_GUARD_ENGINE=legacy）拦 src/auth → exit 2"
else
  fail "legacy 路径未拦 src/auth（exit $rcL，期望 2）" "legacy fallback 冻结层损坏 — 检查 forbidden-guard.sh 第 8 行以下 legacy 实现"
  SMOKE_FAIL=1
fi

# 单行机器可判标记（eval 083 断言此行）
if [ "$SMOKE_FAIL" = "0" ]; then
  printf '  GUARD-SMOKE: PASS (engine=exit%s legacy=exit%s)\n' "$rcE" "$rcL"
else
  printf '  GUARD-SMOKE: FAIL (engine=exit%s legacy=exit%s)\n' "$rcE" "$rcL"
fi

# ── 6. PowerShell 版本 ─────────────────────────────
sec "6. PowerShell"

PS_BIN=""
command -v powershell.exe >/dev/null 2>&1 && PS_BIN="powershell.exe"
[ -z "$PS_BIN" ] && command -v powershell >/dev/null 2>&1 && PS_BIN="powershell"
PWSH_BIN=""
command -v pwsh.exe >/dev/null 2>&1 && PWSH_BIN="pwsh.exe"
[ -z "$PWSH_BIN" ] && command -v pwsh >/dev/null 2>&1 && PWSH_BIN="pwsh"

if [ -n "$PS_BIN" ]; then
  PSVER="$("$PS_BIN" -NoProfile -Command '$PSVersionTable.PSVersion.ToString()' 2>/dev/null | tr -d '\r')"
  case "$PSVER" in
    5.*) warn "Windows PowerShell $PSVER（5.1 坑：默认 UTF-16 输出 / 无 && 链 / 无三元 — 见 PowerShell 工具说明）" "脚本写文件传 -Encoding utf8；用 ; if (\$?) 代替 &&；重活可用 pwsh 7" ;;
    *)   ok "Windows PowerShell $PSVER" ;;
  esac
else
  warn "未找到 Windows PowerShell（powershell.exe）" "Windows 11 自带；确认 PATH，或改用 pwsh 7"
fi
if [ -n "$PWSH_BIN" ]; then
  PWSHVER="$("$PWSH_BIN" -NoProfile -Command '$PSVersionTable.PSVersion.ToString()' 2>/dev/null | tr -d '\r')"
  ok "PowerShell 7 (pwsh) $PWSHVER 可用 — 跨平台，无 5.1 编码/链坑（重活首选）"
else
  ok "pwsh 7 未装（可选）— 5.1 足够本仓脚本；重活可 winget install Microsoft.PowerShell"
fi

# ── 汇总 ───────────────────────────────────────────
printf '\n════════════════════════════════════════\n'
printf 'doctor summary: %d ok / %d warn / %d fail\n' "$OK" "$WARN" "$FAIL"
printf '════════════════════════════════════════\n'
if [ "$FAIL" -gt 0 ]; then
  printf 'RESULT: FAIL（%d 项 ✗ — 见上方 fix hint）\n' "$FAIL"
  exit 1
fi
printf 'RESULT: OK（%d warn 非致命）\n' "$WARN"
exit 0
