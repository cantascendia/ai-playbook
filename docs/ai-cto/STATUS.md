# STATUS — ai-playbook 自身仓库

> 这是 ai-playbook 仓库**自身**的 CTO 项目记忆（dogfooding）。
> 把 ai-playbook 当作"产品"对待 — 用自己的 playbook 管理自己。

最后更新：2026-06-16 v3.15 — Claude 模型阵容对齐当代（Opus 4.8 默认 + Fable 5 opt-in）

---

## 一句话状态

ai-playbook **v3.15** — Claude 模型阵容对齐当代：§1.2 模型 SSOT 把默认 Opus 升到 **Opus 4.8**
（`claude-opus-4-8`，$5/$25，1M ctx，128K out，仅 adaptive thinking），新增 **Fable 5**
（`claude-fable-5`，Opus 之上最强推理档，$10/$50）为极难推理 opt-in；全仓 Opus 4.6→4.8 sweep
（路由表 / §38-40 agent-loop 示例 / CLAUDE.md / templates / Antigravity Claude-backend 行 / §44 replay 示例）。
补 Claude Code 运行形态（CLI / 桌面 App Mac+Win / web / IDE）+ `/fast` + effort xhigh 说明。
非 Claude 模型（gpt-5.5 / Gemini 3.1 Pro / Nano Banana Pro / gpt-image-2）**保持原样**——
无 2026-06 权威源（铁律 #3）；PocketOS 历史事故注释中的 "Opus 4.6" 是**真实历史记录**，按铁律 #2 不改。

此前 **v3.14（bold-audit）** 用多 agent 工作流质疑地基，对抗验证后裁决**混合重构**（不推倒重来）：
Bash/mcp guard 拦截从 `exit 2` 切到 `permissionDecision:deny` JSON、跨项目事故 **ledger** 闭环、
命令 23→18 合并、INDEX 行号 grep 化、README 去营销。再往前 **v3.13** 把平台范围默认收敛为
**Claude-only**（Antigravity / Codex 改 opt-in）+ 14 铁律 4 层优先级 + check-counts SSOT enforcer 落地。

组件计数以 `docs/ai-cto/COUNTS.md` 为 SSOT：**18 commands / 5 sub-agents / 10 hooks /
11 skills(.claude) / 31 evals**（全部含 `verification_command`，`scripts/run-evals.sh` 跑 31 PASS / 0 SKIP）
+ 22 test-plans（trajectory 类，移出 evals/ 计数诚实化）。

> ⚠️ 本文件 v3.6→v3.14 多轮未滚动更新（pre-existing 债，v3.15 本次刷新补上头部四段）；
> 逐版细节见 `EVOLUTION-LOG.md`（append-only 权威记录）。下半部「进行中/待办/已部署/已知问题/假设清单」
> 多数仍停在 v3.4 语境，留作下一轮 STATUS 全量刷新。

---

## 质量评分

> v3.11 起 Health/ARE 未重跑评分（COUNTS.md 版本表标 TBD）。下方为有据可查的历史值，
> v3.13–v3.15 待 harness-auditor / reliability-auditor 重审后回填，**不臆造分数**。

| 版本 | Health | ARE | 关键 |
|---|---|---|---|
| v3.15 (当前) | TBD | TBD | Claude 模型阵容对齐（Opus 4.8 默认 + Fable 5 opt-in）|
| v3.14 (bold-audit) | TBD | TBD | guard exit-2→deny JSON + ledger 闭环 + 命令 23→18 + INDEX grep 化 |
| v3.13 | TBD | TBD | 平台默认 Claude-only + 14 铁律 4 层 + check-counts SSOT enforcer 落地 |
| v3.12 | TBD | TBD | 真 eval executor（run-evals.sh）— 铁律 #12 从空壳变真执行 |
| v3.10.2 | 96 | 86 | destructive gate + 安全回归（已修）|
| v3.9.3 | 94 | 72→86 | subproject 检测 |
| v3.5 (2026-04-29) | 85 | — | self-audit 发现实装覆盖度仅 65%，纸上设计降分 |
| v3.4 (2026-04-29) | 92 | — | 首次 dogfooding 闭环 |
| v3.3 (2026-04-28) | 70.7 | — | baseline |

---

## 活跃分支

- `main` — 最新 `d53f3fc`（v3.14 bold-audit, PR #29 已合）
- `chore/v3.15-opus48-claude-code-latest` — 当前工作分支：v3.15 模型阵容对齐 + 审计后续 + STATUS 刷新；**PR #31 待人 merge**

---

## 已完成（v3.13 → v3.15）

### v3.15 — Claude 模型阵容对齐当代（branch `de7da50` + 审计后续，PR #31 待 merge）
- ✅ §1.2 模型 SSOT（铁律 #3）：默认 **Opus 4.8**（`claude-opus-4-8`）+ **Fable 5**（`claude-fable-5`）opt-in + 真实 model ID
- ✅ 补 Claude Code 运行形态（CLI / 桌面 App Mac+Win / web / IDE）、`/fast` 模式、effort 默认 xhigh 说明
- ✅ 全仓 Opus 4.6→4.8 sweep + 多 agent 完备性审计抓到 §44 replay 示例 `opus-4-7`→`opus-4-8` 漏网（cto-replay.md + handbook:3658）
- ✅ 审计后续：修 cto-init 档位清单 + cto-models 悬挂 cto-refresh 引用（v3.14 命令合并尾巴）
- ✅ 非 Claude 模型保持原样（铁律 #3）；PocketOS 历史事故注释不改（铁律 #2）
- ✅ eval `053-model-lineup` 守护；全量 31 PASS / 0 FAIL；check-counts SSOT 绿

### v3.14 — bold-audit：质疑地基的全面审计 + 定向重构（PR #29）
- ✅ 多 agent 工作流裁决「混合重构（不推倒重来）」（裁决书 `REDESIGN-PROPOSAL-2026-06-10-bold-audit.md`）
- ✅ **Bash/mcp guard 拦截**：`exit 2` → `permissionDecision:deny` JSON（对冲 GitHub #23284）
- ✅ **跨项目事故 ledger 闭环**：`ledger/{collect,distill,propagate,run}.mjs`（≥2 项目印证才传播，advisory-only）
- ✅ **命令 23→18 合并**：cross-review→`review --cross` / relink-all→`link --all` / refresh→`resume --refresh` / vibe-check+harness-audit→`audit`（能力零丢失）
- ✅ **INDEX grep 化**：删硬编码行号（已漂移 20-30 行），改运行时 `grep -nE '^## N\.'` 定位
- ✅ 22 条 trajectory eval 移 `docs/test-plans/`；README 去营销；阶段 0 止血（删泄漏 meta-eval + `zzz-*` 防复发 + check-counts 补 learned-rules 断言）

### v3.13 — 平台范围收敛 + 治理强化（PR #20–#26）
- ✅ **平台范围默认 Claude-only**：Antigravity / Codex 改 **opt-in**（PR #26）
- ✅ **14 铁律 4 层优先级**（L1 安全 > L2 治理 > L3 质量 > L4 效率）+ 理由层（PR #25）
- ✅ **check-counts.sh SSOT enforcer 落地**（提案 R1）+ 分层分发（minimal/full/advanced）
- ✅ destructive-SQL + forbidden fallback 单源到 common.sh；飞轮**诚实降级**为「人在环 detect 辅助」（R4）

---

## 进行中

无（v3.4 dogfooding 是当前唯一进行中的工作）

---

## 待办（按优先级）

### P0
- [ ] 修复 5 处过期 §1-§28/§29 章节声明（consistency audit 发现）
- [ ] §33.1 "91.5%" / Karpathy 数据补 source 或改保守措辞（vibe-checker 发现）
- [ ] 提交 v3.4 commit + push

### P1
- [ ] 添加 .github/workflows/eval.yml（铁律 #12 真正落地，harness-auditor +5）
- [ ] 补全 4 个 eval（009-012）
- [ ] CLAUDE.md 4 个 audit 命令决策树
- [ ] 4 条 hooks 文案收缩为 rule 引用（避免双源漂移）

### P2
- [ ] Plugin 化（待业界稳定后再考虑）
- [ ] AAIF AGENTS.md 标准化提案

---

## 已部署配置文件

- ✅ CLAUDE.md (140 行 / 6.6 KB)
- ✅ playbook/handbook.md (§1-§42 / 3378 行)
- ✅ .claude/settings.json（含 6 类 hooks + outputStyle + statusLine + enabledMcpjsonServers）
- ✅ .claude/commands/ × 18
- ✅ .claude/agents/ × 3
- ✅ .claude/skills/ × 5（与 .agents/skills/ 双位置）
- ✅ .claude/rules/ × 3
- ✅ .claude/output-styles/cto.md
- ✅ .claude/statusline.sh
- ✅ .mcp.json（lazy 配置）
- ✅ templates/{CLAUDE,AGENTS,GEMINI}.md
- ✅ evals/golden-trajectories/ × 8（v3.4 起 12）

---

## 已知问题

### Open
- 4 条 hooks 文案与 rules 内容重复（双源漂移风险，harness-auditor 标⚠️）
- 18 commands 中 4 个 audit 类（review/vibe-check/harness-audit/audit）有功能交叠（待决策树文档化）
- 缺 GitHub Actions eval gate（铁律 #12 仅靠手工跑）

### Resolved
- ✅ HARNESS-CHANGELOG 缺失 → v3.4 创建
- ✅ STATUS.md 缺失（dogfooding 缺口） → v3.4 创建
- ✅ 5 处过期章节声明 → v3.4 修复

---

## 假设清单（待验证）

按 §32.5 反模式 #3 "Hallucination Amplification" 防护，在 STATUS 中显式列出未验证假设：

- ⚠️ `gpt-image-2` 2026-04-21 发布 — 之前 sub-agent 用 WebSearch 验证（VentureBeat / OpenAI 官方），但需要每次 release 时 re-verify
- ⚠️ `gpt-5.5` 当前旗舰 — 同上
- ⚠️ §33 "91.5% vibe-coded apps" 数据 — vibe-checker 发现源不可考，本轮改为保守措辞 + 标注 vendor 报告

---

## 竞品关键发现（手册外参考）

- **cc-sdd**（gotalab）：与 ai-playbook 最接近，已做跨 8 平台 Skills 分发
- **disler/claude-code-hooks-mastery**（2k★）：Hooks 实战集合
- **Aider**：RepoMap 风格 Tree-sitter 自动符号树（暂不抄，文档型仓库无业务符号）

---

## 📅 最后同步确认

轮次 v3.4，2026-04-29，并行调度 harness-auditor / vibe-checker / consistency-audit 三个 sub-agent，读取了 .claude/{commands,agents,settings.json,rules,skills,output-styles,statusline.sh} + handbook.md + CLAUDE.md + 6 个 commits 的 git log。

> Note: 历史 7 行 "sub-agent finished" hook 污染已清理（v3.6.3）。SubagentStop hook 改写到 `.claude/agent-logs/${DAY}.jsonl`，本文件不再被自动 mutate。
