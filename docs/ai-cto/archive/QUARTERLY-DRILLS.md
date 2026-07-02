# Quarterly Drills — ai-playbook fallback 演练

> 每季度跑一次，验证 §43 Agent Reliability Engineering 的 fallback 链路真生效（不是设计文档自欺）。

## 演练日程

| 季度 | 日期 | 场景 | 状态 |
|---|---|---|---|
| 2026 Q2 | TBD | 4 场景全跑 | 待安排 |
| 2026 Q3 | TBD | TBD | — |

## 4 个演练场景

### 场景 1：codex 配额耗尽 → claude fallback

**目的**：验证 v3.6 fallback chain（codex 失败 → claude headless）真工作。

**执行**：
```bash
# 模拟 codex 配额耗尽（mock stderr 返回 rate_limit_exceeded）
codex() {
  echo "Error: rate_limit_exceeded" >&2
  return 1
}
export -f codex

# 跑 codex-bridge
FORCE=1 bash .agents/skills/codex-bridge/run.sh HEAD

# 验证：
# 1. CODEX-REVIEW-LOG 含 mode=fallback-to-claude
# 2. REVIEW-QUEUE 有 ⚠️ 警告"失去跨模型价值"
# 3. .codex-quota-cooldown 文件被创建
# 4. 1 小时内重跑直接走 claude（不再尝试 codex）
```

**Pass criteria**：上面 4 条全满足

### 场景 2：jq 卸载 → sed fallback

**目的**：验证 v3.8 common.sh 在 Windows 无 jq 环境降级。

**执行**：
```bash
# PATH 屏蔽 jq
PATH=$(echo "$PATH" | tr ':' '\n' | grep -v 'jq' | tr '\n' ':')

# 跑 immutable-guard
echo '{"tool_name":"Edit","tool_input":{"file_path":"C:\\projects\\foo\\CLAUDE.md","old_string":"## 铁律","new_string":""}}' \
  | bash .claude/hooks/immutable-guard.sh
echo "exit=$?"

# 验证：
# 1. exit=2（仍正确拦截）
# 2. v3.8-degraded.log 含 jq_missing
# 3. sed fallback 正确解析 JSON 字段
```

**Pass criteria**：exit=2 + sed fallback 工作

### 场景 3：settings.local.json 关 hook → 仍能 audit

**目的**：验证用户可关 hook（opt-out 设计）但 enforcement 仍有审计追溯。

**执行**：
```bash
cat > .claude/settings.local.json <<EOF
{
  "hooks": {
    "PreToolUse": []
  }
}
EOF

# 在新会话试改 CLAUDE.md 铁律
# 验证：
# 1. hook 不再触发（用户主动关 — 设计如此）
# 2. SessionStart 比对 effective vs settings.json hooks 数，输出警告
# 3. 用户能从 git log 看到自己关了 hook（settings.local.json 应 .gitignored）
```

**Pass criteria**：差异警告输出 + audit log

### 场景 4：immutable-guard 缺 cwd → fallback 到 "."

**目的**：复演 codex 第 6 轮 dogfood P1（cwd 缺失 bypass）。

**执行**：
```bash
# 模拟 hook input 不传 cwd
echo '{"tool_name":"Write","tool_input":{"file_path":"scripts/forbidden-paths.txt","content":"# minimal\npayment/"}}' \
  | bash .claude/hooks/immutable-guard.sh
echo "exit=$?"

# 验证：
# 1. exit=2（CWD fallback "." 后能找到 ./scripts/forbidden-paths.txt）
# 2. 比对真实文件 vs 新内容，检测到 auth/ 等被删 → 拦
# 3. v3.9.1 Windows 反斜杠 cwd 场景同样工作
```

**Pass criteria**：exit=2 + 路径 fallback 工作

## 演练记录

### 2026-05-11（首次 dry-run，未实跑）

仅文档化 4 场景。Q2 实跑后填充结果。

### Q2 2026（计划）

- [ ] 4 场景全跑一次（约 1 小时）
- [ ] 失败场景写 INCIDENT-<date>.md
- [ ] 改进项 → EVOLUTION-PROPOSAL → /cto-evolve apply

## 不在演练范围

- 真实生产 OpenAI 配额耗尽（不主动制造）
- 真实 git push --force（破坏性 — 仅 staging 试）
- 真实 GitHub token 撤销（不必要）

## 与 §43 / §50 的关系

- §43 ARE Cost Canary + Silent Failure Detection 设计层
- §50 v3.9 飞轮 — 演练发现的问题 → pattern-detector → cto-evolve apply
