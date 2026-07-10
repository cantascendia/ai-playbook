# COUNTS — ai-playbook 组件计数 SSOT

> 飞轮第 7 轮 redundancy-hunter 发现：命令数在 6+ 处不一致（17/18/21/10/23）。
> 本文件是**唯一计数权威源**。README / CLAUDE.md / STATUS / handbook 引用本表，不硬写数字。
> 改组件数量时**只**更新本文件。
> ✅ **`scripts/check-counts.sh` 已实现并接入 CI**（v3.13 R1 交付，green）。
> 它比对本表数字 vs 文件系统真实计数 + grep 散落数字一致性，不符即 `exit 1`。
> 已 wired 进 `.github/workflows/eval.yml`（`chmod +x scripts/check-counts.sh && bash scripts/check-counts.sh`），
> 每次触及 COUNTS/命令/子代理/hooks/技能/eval 集的 push/PR 自动跑，作为计数漂移的自动 enforcer 兜底。

最后核实：2026-07-02（v4.0 memory-layer 审计）

| 组件 | 数量 | 位置 |
|---|---|---|
| cto-* commands | **18** | `.claude/commands/cto-*.md`（v3.14 23→18：合并 cross-review→review--cross / relink-all→link--all / refresh→resume--refresh / vibe-check+harness-audit→audit。**分发：minimal 8 / full 11 核心 / +6 advanced opt-in**）|
| sub-agents | **5** | `.claude/agents/*.md`（eval-runner / harness-auditor / pattern-detector / reliability-auditor / vibe-checker）|
| hooks (.sh) | **10** | `.claude/hooks/*.sh`（immutable / forbidden / bypass / branch / test-lock / destructive-action / **mcp-guard** / vibe-prompt / eval-gate / trajectory-logger）+ lib/common.sh（不计入）。v4.0b 起每个 .sh = engine shim + legacy 回退；引擎在 `engine/*.mjs`（不计入本行）|
| skills (.claude) | **11** | `.claude/skills/*/SKILL.md` |
| skills (.agents) | **6** | `.agents/skills/*/`（跨平台镜像，含 codex-bridge）|
| evals | **58** | `evals/golden-trajectories/*.yaml`（023-080，**全部含 `verification_command` 真执行**，`scripts/run-evals.sh` 跑 58 PASS/0 SKIP；……-078 见历史，v4.2 增 079 self-audit rolling / 080 OTel 用量面板冒烟；043 扩展 PR#11 重放断言）|
| slo-checks（v4.1）| **8 断言 + runner** | `evals/slo-checks/*.sh` + run.sh + README（6 静态 PASS + 2 运行时诚实 SKIP；`bash evals/slo-checks/run.sh` 汇总）|
| drills（v4.1）| **4 脚本 + 1 manual + runner** | `evals/drills/*.sh` + run.sh + README — §43 fallback 演练脚本化（codex 配额 / jq 缺失 / node 缺失 / cwd 缺失，均 mock+temp 无真副作用；settings opt-out 需真会话 = SKIP-manual）|
| ledger（v3.14 B）| **4 脚本** | `ledger/{collect,distill,propagate,run}.mjs` + README — 跨项目事故账本闭环（collect→distill ≥2项目印证→propagate dry-run）；incidents.jsonl/drafts 是 gitignore 运行时产物 |
| test-plans | **22** | `docs/test-plans/*.yaml`（001-022 trajectory 类规约，无 vc 不自动跑，需人工/Claude 周期验证；v3.14 从 evals/ 移出，计数诚实化）|
| rules | **3** | `.claude/rules/*.md`（eval-gate / forbidden-paths / test-lock）|
| learned-rules | **7** | `.claude/rules/learned/*.md`（active，不含 README；archived 见 archived/）|
| handbook 章节 | **§1-§50**（连续无缺号；§49 = 分层分发，v3.13 补）| `playbook/handbook.md` |
| plugin 清单（v4.0d 实验）| **1 plugin + 1 marketplace** | `.claude-plugin/{plugin,marketplace}.json` + `hooks.json`（`claude plugin validate` 通过；打包 commands/agents/skills/output-style/guard-hooks；rules/statusline/记忆种子仍留 cto-init）|
| 已部署项目 | **29** | 实测 `find /c/projects -name immutable-guard.sh`：21 独立项目 + nilou-network monorepo（root + 6 子应用）+ hoyokit（root + 1 嵌套）= 29 guard 安装。**2026-07-09 全部升级到 v4 guard engine**（bash→Node shim + legacy 回退），29/29 行为验证通过 + `.bak` 备份 |

## 版本

| 版本 | Health | ARE | 关键 |
|---|---|---|---|
| v3.15 (当前) | **79** | **78** | 2026-06-25 harness+reliability 重审 + 对抗验证回填（high conf，无膨胀）；扣分=changelog 断档/pre-commit 未装/SLO 冻结 v3.9.1/季度演练过期 |
| v3.13–v3.14 | —（见 v3.15） | —（见 v3.15） | 历史快照未单独测，当前累计态即 v3.15 |
| v3.12 | TBD | TBD | 真 eval executor（run-evals.sh）— 铁律 #12 从"空壳"变真执行；首跑即抓到 v3.11 _json_get 把 `\n` 转空格破坏 forbidden-paths 多行比对的安全回归 |
| v3.11 | TBD | TBD | 飞轮第 7-8 轮 team 迭代 |
| v3.10.2 | 96 | 86 | destructive gate + 安全回归（已修）|
| v3.9.3 | 94 | 72→86 | subproject 检测 |

## 校验

✅ **自动校验已上线**：`scripts/check-counts.sh` 自动比对真实文件数 vs 本表 + grep 散落数字一致性，
不符 `exit 1`（v3.13 R1 交付，green）。已接入 `.github/workflows/eval.yml` CI gate —
每次触及 COUNTS/命令/子代理/hooks/技能/eval 集的 push/PR 都跑一遍，计数漂移当场拦下。
本地手跑：`bash scripts/check-counts.sh`（TIER1 全绿 = 通过）。
