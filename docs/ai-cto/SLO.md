# SLO — ai-playbook 自身 (v3.15，2026-06-25 刷新)

> Agent Reliability Engineering (§43) — 每个核心组件的 success_rate / latency / cost / fallback 四字段。
> ⚠️ v3.10–v3.15 新增组件 SLO 见下「v3.10+ 组件」节（reliability-auditor 2026-06-25 审计标 P1：此前 SLO.md 冻结 v3.9.1 零覆盖新组件）。
> ✅ v4.1：`evals/slo-checks/`（机器可执行 SLO 断言）已落地 —— 静态可查的 SLO 转硬断言，真需运行时数据的（FP-rate / 季度演练）READ-then-SKIP 诚实不伪造。跑 `bash evals/slo-checks/run.sh`；eval `072-slo-machine-checks` 守门。见本文件「机器可执行断言」节。

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

## v3.10+ 组件（2026-06-25 reliability-auditor 补）

### mcp-guard.sh（v3.11 — MCP 工具红线层）

| 指标 | 目标 | 测量 |
|---|---|---|
| Block accuracy | 100%（execute_sql DROP / delete_* / filesystem write 红线文件 0 漏）| eval 034/035 + agent-logs `mcp-destructive-blocked` event |
| 只读工具放行 | 100%（SELECT / list_/get_/search_ 不误拦）| eval 034 false-positive 子集 |
| 覆盖面 | matcher `mcp__.*` 全 MCP server | settings.json:83-89 |

### deny_with_reason 机制（v3.14 — guard 拦截语义）

| 指标 | 目标 | 测量 |
|---|---|---|
| 拦截可靠性 | 用 `permissionDecision:deny` JSON 替 `exit 2`（对冲 GitHub #23284）| eval 051-deny-json-mechanism |
| 覆盖 guard | bypass / destructive / mcp 全切换 | common.sh:96-113 |

### run-evals.sh executor（v3.12 — 铁律 #12 真执行）

| 指标 | 目标 | 测量 |
|---|---|---|
| Eval pass rate | 100%（31 PASS / 0 FAIL）| `bash scripts/run-evals.sh` exit 0 |
| 真执行（非 count yaml）| 每 yaml 的 verification_command 子 shell 真跑 | eval 036-eval-executor meta-eval |

### check-counts.sh enforcer（v3.13 — 计数 SSOT）

| 指标 | 目标 | 测量 |
|---|---|---|
| 计数一致性 | TIER1 文件系统 vs COUNTS.md 0 偏差 | `bash scripts/check-counts.sh` exit 0 |
| 散落数字漂移 | TIER2 软警告 0 | 同上输出 |

### ledger（v3.14 — 跨项目事故账本）

| 指标 | 目标 | 测量 |
|---|---|---|
| 传播门槛 | ≥ 2 项目印证才 propagate（advisory-only，dry-run）| `ledger/distill.mjs` 逻辑 |

## 全局

| 指标 | 目标 |
|---|---|
| harness health score | ≥ 90 / 100（v3.15 实测 79，低于目标 — 见 STATUS P1 欠账）|
| ARE score | ≥ 85 / 100（v3.15 实测 78 — 四维全 warn，见下）|
| eval 集 pass rate | ≥ 90%（31 条 golden trajectory，实测 31/31 = 100%）|
| Cost 月度 | < $30（codex + Claude API + GH Actions）|

## 机器可执行断言（v4.1 — `evals/slo-checks/`）

> backlog P1「SLO 靠人工核」修复。目录把上表 SLO 分两类落为脚本：
> **静态可查** → 硬 PASS/FAIL 断言；**真需运行时数据** → READ agent-logs / 记录文件后
> SKIP-with-reason（诚实，不伪 pass）。runner：`bash evals/slo-checks/run.sh`。

| 脚本 | 类型 | 覆盖的上表 SLO |
|---|---|---|
| `01-security-guards-eval-coverage.sh` | 静态 | Block accuracy 100%（5 红线 guard 各有 eval + 文件存在）|
| `02-cost-cap-config.sh` | 静态 | 月度 codex token < $20（cap_cents ≤2000 + 计量回写 + 退化模式）|
| `03-ci-gates-wired.sh` | 静态 | 计数一致 / Eval 真执行（check-counts + run-evals + engine 单测在 CI）|
| `04-guard-engine-legacy-parity.sh` | 静态 | engine↔legacy 平价（每 shim engine+legacy+node 探测）|
| `05-mcp-guard-coverage.sh` | 静态 | mcp-guard 覆盖 `mcp__.*` 全 MCP server |
| `06-fallback-chain.sh` | 静态 | Fallback 完整（jq 降级 + codex→claude→no-reviewer）|
| `07-fp-rate-agent-logs.sh` | 运行时 | FP-rate < 1% → **SKIP**（真 FP 需 block 正确性标注，agent-logs 不携带）|
| `08-quarterly-drill-freshness.sh` | 运行时 | 季度演练 → **SKIP**（演练是运营动作，advisory 报告新鲜度）|

明细与「为何 07/08 是 SKIP」见 `evals/slo-checks/README.md`。

## 季度演练（QUARTERLY-DRILLS.md）

详见 `docs/ai-cto/archive/QUARTERLY-DRILLS.md`（v4.0 已轮转至 archive/）。
运营新鲜度可跑 `bash evals/slo-checks/08-quarterly-drill-freshness.sh` 报告距今天数（advisory）。

## 修改记录

- 2026-05-11 v3.9.1：首次创建（reliability-auditor 飞轮发现 ARE 72/100，SLO.md 缺失为 P0）
- 2026-06-25 v3.15：补 v3.10+ 组件（mcp-guard / deny_with_reason / run-evals / check-counts / ledger）；修 eval 计数 28→31；全局加 ARE 目标行。reliability-auditor 实测 ARE 78（四维全 warn）。**仍欠**：`evals/slo-checks/` 机器断言 + 季度演练实跑（Q2 过期）。
