# evals/slo-checks — 机器可执行 SLO 断言

> 把 `docs/ai-cto/SLO.md` 的可靠性目标从「人工 + agent-logs 人核」转为**可执行断言**。
> 背景：v4.1 backlog P1「`evals/slo-checks/` 机器可执行 SLO 断言目录未建；SLO 靠人工核」。

## 设计原则（诚实优先 — 铁律 #2 / #9）

SLO 分两类：

1. **静态可查**（从仓库状态判定）→ 硬断言，`RESULT: PASS/FAIL`。
2. **真需运行时数据**（真 FP-rate、季度演练真跑）→ READ agent-logs / 记录文件后
   `RESULT: SKIP`（附原因）。**不伪造 pass**。数据缺失 → SKIP no-data。

## 运行

```bash
bash evals/slo-checks/run.sh            # 跑全部
SLO_VERBOSE=1 bash evals/slo-checks/run.sh   # 展开每个 check 完整输出
```

任一 check `RESULT: FAIL` → runner exit 1。SKIP 不算失败。

## 断言清单

| 脚本 | 类型 | 对应 SLO.md 目标 | 断言内容 |
|---|---|---|---|
| `01-security-guards-eval-coverage.sh` | 静态 | Block accuracy 100%（5 红线 guard）| 每个安全 guard（immutable/forbidden/branch/destructive-action/mcp）文件存在 **且** ≥1 覆盖 eval |
| `02-cost-cap-config.sh` | 静态 | 月度 codex token < $20 (cap) | cto-evolve.md 声明 `cap_cents` **且** ≤2000 **且** codex-bridge 写回计量 **且** 超 cap 退化模式 |
| `03-ci-gates-wired.sh` | 静态 | 计数一致性 / Eval pass rate 真执行 | `.github/workflows/eval.yml` 真接线 check-counts + run-evals + engine 单测 + hooks 触发路径；脚本本体存在 |
| `04-guard-engine-legacy-parity.sh` | 静态 | guard engine↔legacy 平价（bypass/destructive/mcp 全切换）| 每个 `.claude/hooks/*.sh` 含 engine 路径 + 保留 legacy + node 探测三合一 |
| `05-mcp-guard-coverage.sh` | 静态 | mcp-guard 覆盖面 `mcp__.*` 全 MCP server | mcp-guard.sh 存在 + settings.json 有 `mcp__.*` matcher 且路由到 mcp-guard |
| `06-fallback-chain.sh` | 静态 | Fallback 完整（jq 降级 / codex→claude→no-reviewer）| guard node 缺失回退 + common.sh jq/sed 降级 + codex-bridge 三段 fallback |
| `07-fp-rate-agent-logs.sh` | 运行时 | False positive rate < 1% | READ `.claude/agent-logs/*.jsonl`，输出 block vs override 代理信号 → **SKIP**（真 FP 需 block 正确性标注，日志不携带） |
| `08-quarterly-drill-freshness.sh` | 运行时 | 季度演练 | READ QUARTERLY-DRILLS.md，报告最近演练日期距今天数 → **SKIP**（演练是运营动作，advisory） |

## 为什么 07/08 是 SKIP 而非 PASS

- **07 FP-rate**：真 false positive 需对每次 block 做「拦对了吗」的标注；agent-logs jsonl
  只记 `*-blocked` / `*-allowed` 事件，不含正确性标签。脚本输出 override 比例作**上界代理**
  供人审，但不据此判 pass/fail —— 否则就是 §32.5 反模式 #6 eval-gaming。
- **08 季度演练**：drill 是真跑一次故障演练的运营动作，不是仓库静态属性。SLO.md 自己
  已承认「Q2 过期」，这里如实报告新鲜度而非硬 fail 掩盖。

## 与既有 gate 的关系

- 本目录是 **SLO 层**断言（可靠性目标），与 `evals/golden-trajectories/`（行为 golden
  trajectory）互补。
- eval `072-slo-machine-checks.yaml` 断言本 runner 存在、可跑、且 6 条静态断言全 PASS。
- CI 若要接线，可在 eval.yml 增一步 `bash evals/slo-checks/run.sh`（当前经 eval 072 间接覆盖）。
