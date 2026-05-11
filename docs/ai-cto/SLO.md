# SLO — ai-playbook 自身 (v3.9.1)

> Agent Reliability Engineering (§43) — 每个核心组件的 success_rate / latency / cost / fallback 四字段。

## v3.9 飞轮三组件

### immutable-guard.sh（红线层）

| 指标 | 目标 | 测量 |
|---|---|---|
| Block accuracy | 100%（红线 0 漏） | `.claude/agent-logs/*.jsonl` 含 `immutable-blocked` event 数 vs eval 026 跑出的 expected blocks |
| False positive rate | < 1%（合法操作不误拦）| 周扫 agent-logs 中 immutable-blocked vs git commit 频率 |
| P99 latency | < 50ms（不阻塞 Claude） | hook 执行时间 |
| Windows 兼容性 | 100%（反斜杠路径正确处理）| v3.9.1 修复后必跑 5 Windows + 6 POSIX 测试 |
| Fallback | jq 缺失降级到 sed parser（已有）| `v3.8-degraded.log` jq_missing 条目 |

**Error Budget**：每月 ≤ 1 次漏拦红线（破即 P0 incident）

### pattern-detector sub-agent（分析层）

| 指标 | 目标 | 测量 |
|---|---|---|
| 周跑成功率 | 100%（GH Actions cron）| `.github/workflows/self-audit-weekly.yml` run history |
| Pattern 置信度 ≥ 60% 产出率 | ≥ 80%（高质量比例）| SELF-AUDIT-<date>.md 中 confidence ≥ 60% 占比 |
| False positive rate | < 30%（Reflexion 教训）| codex 二次审驳回率（v3.9.1 首跑：Pattern 2 被驳回 = 1/6 = 17% ✅）|
| 冷却生效 | 100%（30 天内不重复同 pattern）| 检查 EVOLUTION-LOG 同 pattern 间隔 |

**Error Budget**：连续 3 周相同 pattern 未采纳 → 自动 P0 升级人审

### cto-evolve 命令（飞轮入口）

| 指标 | 目标 | 测量 |
|---|---|---|
| 月度 codex token | < $20（cap）| `.evolve-cost-month.json` 累计 |
| Pattern 采纳率 | 30-70%（太低=幻觉多，太高=过度激进）| EVOLUTION-LOG 中 applied / detected |
| Apply 成功率 | ≥ 95%（PR 开成功 + 通过 codex 审）| audit log |
| 退化模式触发 | < 1 次/月（cost 超 cap）| .evolve-cost-month.json exceeded=true 次数 |

## v3.8 enforcement 组件

### codex-bridge run.sh（§48 跨模型 review）

| 指标 | 目标 | 测量 |
|---|---|---|
| Success rate | ≥ 80%（codex 跑通比例）| CODEX-REVIEW-LOG.md `mode=success` / total |
| Fallback chain 完整 | 100% | 测过：codex 失败 → claude fallback → no-reviewer all-fail 三段 |
| PR comment 同步 | ≥ 95%（v3.7 修后）| CODEX-REVIEW-LOG.md `mode=pr-comment-posted` / `mode=success` |
| Windows sandbox 1326 错误 | < 30%（已知 codex 自身问题，靠 GitHub MCP fallback）| stderr grep |

### forbidden-guard / bypass-guard / branch-guard / test-lock-guard

| 指标 | 目标 |
|---|---|
| Block accuracy | 100%（路径命中即拦）|
| Bypass 6 模式覆盖 | 100%（issue #40117 全 6 种）|
| False positive | < 1% |

## v3.7 PR autopilot

| 指标 | 目标 |
|---|---|
| PR 自动开成功率 | ≥ 95%（branch != main + 未推 commits）|
| comment 同步 | ≥ 95% |
| 后台 disown 兼容 | Windows / Linux / macOS 全 ok |

## 全局

| 指标 | 目标 |
|---|---|
| harness health score | ≥ 90 / 100 |
| eval 集 pass rate | ≥ 90%（28 条 golden trajectory） |
| Cost 月度 | < $30（codex + Claude API + GH Actions）|

## 季度演练（QUARTERLY-DRILLS.md）

详见 `docs/ai-cto/QUARTERLY-DRILLS.md`。

## 修改记录

- 2026-05-11 v3.9.1：首次创建（reliability-auditor 飞轮发现 ARE 72/100，SLO.md 缺失为 P0）
