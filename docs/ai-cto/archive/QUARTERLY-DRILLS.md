# Quarterly Drills — ai-playbook fallback 演练

> 每季度跑一次，验证 §43 Agent Reliability Engineering 的 fallback 链路真生效（不是设计文档自欺）。

## 🆕 2026-07-08：3 场景 + 引擎兜底已脚本化

此前 4 场景全 TBD，理由记「headless 无法真模拟」。复核后发现**其中 3 场景 + guard 引擎兜底其实可脚本化**
（用 mock 命令 / PATH 屏蔽 / 临时 git 仓，全程不碰真状态）—— 只是一直没把可跑的 bash 变成可执行脚本。

现已落地 `evals/drills/`，每季度一键跑：

```bash
bash evals/drills/run.sh
```

| 场景 | 脚本 | 状态 |
|---|---|---|
| 场景 1 codex 配额 → claude | `evals/drills/01-codex-quota-fallback.sh` | ✅ 已脚本化（每季度可跑） |
| 场景 2 jq 卸载 → sed | `evals/drills/02-jq-missing-sed-fallback.sh` | ✅ 已脚本化 |
| （引擎兜底）node 缺失 → legacy | `evals/drills/03-node-missing-legacy-fallback.sh` | ✅ 已脚本化 |
| 场景 4 缺 cwd → "." 兜底 | `evals/drills/04-cwd-missing-fallback.sh` | ✅ 已脚本化 |
| 场景 3 settings.local 关 hook | `evals/drills/05-settings-optout.manual.sh` | ⊘ **手动**（needs real env，见场景 3 末注） |

回归门：`bash scripts/run-evals.sh 075`。

## 演练日程

| 季度 | 日期 | 场景 | 状态 |
|---|---|---|---|
| 2026 Q2 | TBD | 4 场景全跑 | 待安排（脚本化后可一键补跑 1-4，场景 3 手动） |
| 2026 Q3 | TBD | TBD | — |
| — | 2026-07-08 | 脚本化 1/2/4 + 引擎兜底 → `evals/drills/` | ✅ 已完成 |

## 4 个演练场景

### 场景 1：codex 配额耗尽 → claude fallback  ✅ 已脚本化 → `evals/drills/01-codex-quota-fallback.sh`

**目的**：验证 v3.6 fallback chain（codex 失败 → claude headless）真工作。

> 脚本化实现：临时 `git init` 仓当 `REPO_ROOT`，mock `codex`（吐 rate_limit）/ `claude`（吐 mock 报告）/ `gh`，
> `FORCE=1` 跑真 `codex-bridge/run.sh`，轮询断言 ①`.codex-quota-cooldown` 创建 ②`mode=fallback-to-claude`
> ③冷却内重跑 codex 不再被调用。全程不碰真仓/真云。

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

### 场景 2：jq 卸载 → sed fallback  ✅ 已脚本化 → `evals/drills/02-jq-missing-sed-fallback.sh`

**目的**：验证 v3.8 common.sh 在 Windows 无 jq 环境降级。

> 脚本化实现：本机 / Windows git-bash 默认**无 jq**，sed fallback 即生产路径 —— 演练直接跑真实降级路径，
> 断言 guard 仍拦红线（exit 2）不静默 fail-open。装了 jq 且无法安全屏蔽的 CI → `SKIP` + 理由（不伪造）。

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

### 场景 3：settings.local.json 关 hook → 仍能 audit  ⊘ **手动（needs real env）** → `evals/drills/05-settings-optout.manual.sh`

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

> **needs real env（为何手动，不是偷懒）**：本场景要观察的是「用户清空 `PreToolUse` 后，**新起一个真
> Claude 会话**时 `SessionStart` 能否比对 effective vs 配置 hooks 并输出差异警告」。这需要：
> ① 真实 Claude 会话（`SessionStart` 只在真会话启动触发，headless 脚本起不了）；② 用户主动写
> `settings.local.json`（演练不会去写真仓）。这是明确的**前置条件**，不是悬空 TODO。
>
> **诚实发现（2026-07-08）**：当前 `.claude/settings.json` 的 `SessionStart` 只做「回显项目记忆 + 提示
> enforcement 已部署」，**尚未实现**「比对 effective vs 配置 hooks 数并警告」这一步 —— 场景 3 期望的审计
> 行为目前是待补实现缺口。`evals/drills/05-settings-optout.manual.sh` 静态核对前置条件（settings.local.json
> 已 gitignored ✓ / SessionStart-diff 未实现）后 `SKIP-manual`，绝不伪装通过。
>
> **运营手动跑法**：改 `settings.local.json` 清空 `PreToolUse` → 新开会话 → 确认差异警告 + `git log` 可见。

### 场景 4：immutable-guard 缺 cwd → fallback 到 "."  ✅ 已脚本化 → `evals/drills/04-cwd-missing-fallback.sh`

**目的**：复演 codex 第 6 轮 dogfood P1（cwd 缺失 bypass）。

> 脚本化实现：沙盒仓内跑，input 不带 `cwd` → guard `CWD="."` 兜底定位 `scripts/forbidden-paths.txt`，
> 断言仍拦红线（exit 2）；含 Windows 反斜杠绝对路径变体（learned rule 2026-05-12 同源 bug）。
> 另：guard 引擎缺 node → legacy bash 兜底由 `evals/drills/03-node-missing-legacy-fallback.sh` 覆盖。

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

### 2026-07-08（脚本化 — v4.1 backlog-zero）

把场景 1/2/4 + guard 引擎 node→legacy 兜底变成可执行演练 `evals/drills/`（runner + 5 脚本 + README）。
每季度一键 `bash evals/drills/run.sh`。本机实跑结果：`01/02/03/04 PASS · 05 SKIP-manual · DRILLS: PASS`。
场景 3 判定为 genuinely-manual（needs real Claude session；且 SessionStart 差异警告逻辑尚未实现）。
回归门 eval `075-quarterly-drill-scripting`。所有演练只在临时目录/临时 git 仓/mock 里跑，不碰真状态。

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
