---
name: cto-doctor
description: v3.8 enforcement 自检 — 验证 hooks 真生效、jq/jsonl 真工作、skill auto-invoke 是否触发
allowed-tools: ["Read", "Bash", "Glob"]
model: haiku
---

# CTO Doctor — v3.8 Enforcement 自检

跑一次诊断，告诉用户 enforcement 是否真的生效（而不是 silent no-op）。

## 步骤

### 1. 检查依赖

```bash
echo "=== 依赖检测 ==="
echo "bash: $(bash --version | head -1)"
command -v jq >/dev/null 2>&1 && echo "jq: $(jq --version)" || echo "jq: ⚠️ 未装（hooks 用 sed fallback，软提醒/structured output 受限）"
command -v gh >/dev/null 2>&1 && echo "gh: $(gh --version | head -1)" || echo "gh: ⚠️ 未装（PR autopilot 不可用）"
command -v codex >/dev/null 2>&1 && echo "codex: $(codex --version)" || echo "codex: ⚠️ 未装（§48 cross-review 走 claude-only fallback）"
command -v claude >/dev/null 2>&1 && echo "claude: $(claude --version 2>&1 | head -1)" || echo "claude: ⚠️ headless 模式不可用"
```

### 2. 验证 hook 文件存在（10 个 + lib，含 5 安全红线）

```bash
echo ""
echo "=== Hook 文件（应 10 个 .sh + lib/common.sh，见 COUNTS.md）==="
# v3.13 A2：7→10，补 immutable / destructive-action / mcp-guard（批1 安装链断裂修复对齐）
for h in lib/common.sh \
         immutable-guard.sh forbidden-guard.sh branch-guard.sh \
         bypass-guard.sh destructive-action-guard.sh mcp-guard.sh \
         test-lock-guard.sh vibe-prompt-guard.sh eval-gate.sh trajectory-logger.sh; do
  f=".claude/hooks/$h"
  if [ -f "$f" ]; then
    echo "✓ $h ($(wc -l < "$f") 行)"
  else
    echo "✗ $h MISSING"
  fi
done

echo ""
echo "=== 安全红线 guard 硬检查（缺任一 = 安装失败，health 判 fail）==="
REDLINE_FAIL=0
for g in immutable-guard forbidden-guard branch-guard destructive-action-guard mcp-guard; do
  [ -f ".claude/hooks/$g.sh" ] && echo "✓ 🔴 $g" || { echo "✗ 🔴 $g MISSING — 红线层残缺！"; REDLINE_FAIL=1; }
done
# settings.json 必须接线 mcp__.* matcher（旧示例最致命的洞）
grep -qE 'mcp__' .claude/settings.json 2>/dev/null && echo "✓ settings.json 含 mcp__.* matcher" || { echo "✗ settings.json 无 mcp__ matcher — mcp-guard 未接线"; REDLINE_FAIL=1; }
[ "$REDLINE_FAIL" = "1" ] && echo "🛑 安全红线不完整 → health 直接判 FAIL（不计分）"
```

### 3. 端到端 enforcement 测试（关键）

```bash
echo ""
echo "=== Enforcement 端到端 ==="
CWD=$(pwd)
test_hook() {
  local name="$1" expected="$2" cmd="$3"
  local actual
  eval "$cmd" >/dev/null 2>&1
  actual=$?
  if [ "$actual" = "$expected" ]; then
    echo "✓ $name (exit=$actual)"
  else
    echo "✗ $name (exit=$actual, expected=$expected) ← ENFORCEMENT 失效"
  fi
}

test_hook "forbidden-guard auth/" 2 \
  "echo '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"src/auth/x.ts\"},\"cwd\":\"$CWD\"}' | bash .claude/hooks/forbidden-guard.sh"
test_hook "forbidden-guard 普通路径" 0 \
  "echo '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"src/utils/foo.ts\"},\"cwd\":\"$CWD\"}' | bash .claude/hooks/forbidden-guard.sh"
test_hook "bypass-guard --no-verify" 2 \
  "echo '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git commit --no-verify\"},\"cwd\":\"$CWD\"}' | bash .claude/hooks/bypass-guard.sh"
test_hook "bypass-guard core.hooksPath" 2 \
  "echo '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git config core.hooksPath /dev/null\"},\"cwd\":\"$CWD\"}' | bash .claude/hooks/bypass-guard.sh"
test_hook "bypass-guard 普通命令" 0 \
  "echo '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls -la\"},\"cwd\":\"$CWD\"}' | bash .claude/hooks/bypass-guard.sh"

# v3.13 A2：补 3 个安全红线 guard 的端到端 exit-2 测试（批1 安装链断裂的核心 guard）
test_hook "immutable-guard CONSTITUTION" 2 \
  "printf '%s' '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"docs/ai-cto/CONSTITUTION.md\",\"old_string\":\"x\",\"new_string\":\"y\"},\"cwd\":\"$CWD\"}' | bash .claude/hooks/immutable-guard.sh"
test_hook "destructive-action-guard rm -rf /" 2 \
  "printf '%s' '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"rm -rf /\"},\"cwd\":\"$CWD\"}' | bash .claude/hooks/destructive-action-guard.sh"
test_hook "mcp-guard delete_project" 2 \
  "printf '%s' '{\"tool_name\":\"mcp__x__delete_project\",\"tool_input\":{},\"cwd\":\"$CWD\"}' | bash .claude/hooks/mcp-guard.sh"
test_hook "mcp-guard 只读 list 放行" 0 \
  "printf '%s' '{\"tool_name\":\"mcp__x__list_projects\",\"tool_input\":{},\"cwd\":\"$CWD\"}' | bash .claude/hooks/mcp-guard.sh"
```

### 4. trajectory 日志格式

```bash
echo ""
echo "=== Trajectory 日志 ==="
TODAY=$(date +%Y-%m-%d)
LOG=".claude/agent-logs/$TODAY.jsonl"
if [ -f "$LOG" ]; then
  TOTAL=$(wc -l < "$LOG")
  V38=$(grep -c '"schema":"v3.8"' "$LOG" 2>/dev/null || echo 0)
  echo "总条目: $TOTAL"
  echo "v3.8 格式: $V38（含 tool/file/cmd 详情可 replay）"
  echo "旧格式 (silent): $((TOTAL - V38))"
  if [ "$V38" -gt 0 ]; then
    echo "示例 v3.8 条目:"
    grep '"schema":"v3.8"' "$LOG" | tail -1
  fi
else
  echo "⚠️ 今日无日志（hooks 未生效或本日无 tool call）"
fi
```

### 5. settings.json 配置验证

```bash
echo ""
echo "=== settings.json 配置 ==="
if [ -f .claude/settings.json ]; then
  if grep -q "CLAUDE_TOOL_INPUT" .claude/settings.json 2>/dev/null; then
    echo "🔴 检测到 \$CLAUDE_TOOL_INPUT — 这是已废弃的 v3.7 模式（env var 不存在）"
    echo "   现行 hook 可能是 silent no-op。请升级到 v3.8（用外置脚本 + stdin JSON）。"
  else
    echo "✓ 未检测到旧 env var 模式"
  fi
  
  if grep -q ".claude/hooks/" .claude/settings.json 2>/dev/null; then
    echo "✓ settings.json 引用 .claude/hooks/ 外置脚本"
  else
    echo "⚠️ settings.json 未引用 .claude/hooks/ — 升级未完成"
  fi
fi
```

### 6. Skills 自动加载触发 (人工验证提示)

```bash
echo ""
echo "=== Skills (paths-triggered auto-invoke) ==="
for s in .claude/skills/*/SKILL.md; do
  [ -f "$s" ] || continue
  name=$(basename $(dirname "$s"))
  paths=$(grep -E "^paths:" "$s" 2>/dev/null | head -1)
  if [ -n "$paths" ]; then
    echo "✓ $name → $paths"
  else
    echo "ℹ $name (description-triggered, 无 paths)"
  fi
done

echo ""
echo "💡 人工验证：在新会话里说 '编辑 src/auth/login.ts' — 看 Claude 响应是否引用了 forbidden-policy skill"
```

### 7. 输出 Health Score

最后输出：
- ✓ 通过项 / 总项 = N%
- 🔴 任何 enforcement 失效都视为 critical
- 🟠 缺 jq/codex/gh 视为 degraded（non-blocking）

如分数 < 80% → 提示 `/cto-init --upgrade=v3.8` 修复。

## 回报格式

```
📊 v3.8 Doctor Report
依赖：jq=✓ gh=✓ codex=✓ claude=✓
Hooks：7/7 文件存在
Enforcement：5/5 端到端通过
Trajectory：v3.8 格式 N 条
Settings：✓ 已升级
Skills：3 个 paths-triggered

总评：🟢 95/100 (excellent)
```
