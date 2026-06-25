# STATUS — ai-playbook 自身仓库

> 这是 ai-playbook 仓库**自身**的 CTO 项目记忆（dogfooding）。
> 把 ai-playbook 当作"产品"对待 — 用自己的 playbook 管理自己。

最后更新：2026-06-25 — 会话恢复 + 下半部 v3.4 陈账刷新（活跃分支/待办/已部署/已知问题对齐现实）
上一版：2026-06-16 v3.15 — Claude 模型阵容对齐当代（Opus 4.8 默认 + Fable 5 opt-in）

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

> ⚠️ 本文件 v3.6→v3.14 多轮未滚动更新（pre-existing 债，v3.15 补头部四段）；
> 逐版细节见 `EVOLUTION-LOG.md`（append-only 权威记录）。
> 2026-06-25 本轮已对齐下半部「活跃分支/待办/已部署/已知问题」到现实；「假设清单」仍待 release 时 re-verify。

---

## 质量评分

> 2026-06-25 回填：harness-auditor + reliability-auditor 并行重审 + 对抗验证（high confidence，无膨胀，
> 两份 grounded=true，verifier 逐条核实 14 项 evidence）。v3.15 测得 **Health 79 / ARE 78**。
> v3.13/v3.14 历史快照未单独测，当前累计态即 v3.15 分数。**不臆造分数**（铁律 #3）。

| 版本 | Health | ARE | 关键 |
|---|---|---|---|
| v3.15 (当前) | **79** | **78** | Claude 模型阵容对齐；扣分=changelog 断档 + pre-commit 未装 + 7 skill 无 paths + SLO 冻结 v3.9.1 + 季度演练 Q2 过期未跑 |
| v3.14 (bold-audit) | —（见 v3.15） | —（见 v3.15） | guard exit-2→deny JSON + ledger 闭环 + 命令 23→18 + INDEX grep 化 |
| v3.13 | —（见 v3.15） | —（见 v3.15） | 平台默认 Claude-only + 14 铁律 4 层 + check-counts SSOT enforcer 落地 |
| v3.12 | TBD | TBD | 真 eval executor（run-evals.sh）— 铁律 #12 从空壳变真执行 |
| v3.10.2 | 96 | 86 | destructive gate + 安全回归（已修）|
| v3.9.3 | 94 | 72→86 | subproject 检测 |
| v3.5 (2026-04-29) | 85 | — | self-audit 发现实装覆盖度仅 65%，纸上设计降分 |
| v3.4 (2026-04-29) | 92 | — | 首次 dogfooding 闭环 |
| v3.3 (2026-04-28) | 70.7 | — | baseline |

---

## 活跃分支

- `main` — 最新 `b463a77`（v3.15 模型阵容对齐, **PR #31 已合**）
- `chore/status-refresh-2026-06-25` — 当前工作分支：会话恢复后的 STATUS 下半部陈账刷新
- 远程残留已合并 feature 分支 16 个（含 `chore/v3.15-opus48-claude-code-latest` 等）— 可批量清理（见待办 P2）

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

> 2026-06-25 刷新：v3.4 era 的 P0/P1 已被 v3.5→v3.15 多轮吸收完成，逐条核销见下。

### 已核销（原 v3.4 待办）
- [x] 5 处过期章节声明 → v3.4 修复（已在「已知问题/Resolved」记录）
- [x] §33 "91.5%" 数据 → v3.15 改保守措辞 + 标 vendor 报告（见「假设清单」）
- [x] 提交 + push → 自 v3.4 起 48 个 v3.5+ 提交，远古完成
- [x] `.github/workflows/eval.yml` → **已存在**（与 canary/codex-review/llm-judge/self-audit-weekly 共 5 个 workflow）
- [x] check-counts.sh SSOT enforcer → v3.13 落地（2026-06-25 实测 TIER1 全绿、EXIT 0）

### P1（2026-06-25 audit grounded，按 ROI 排序）
- [x] ~~STATUS/COUNTS 质量评分 TBD 回填~~ → 完成（Health 79 / ARE 78，本轮）
- [ ] **HARNESS-CHANGELOG 断档 45 天**（v3.10–v3.15 共 27 提交无条目）— audit #1 ROI（5 分钟/条，解锁下游可靠性分析）。本轮先补 v3.15 audit 条目，v3.10–v3.14 待补
- [ ] **pre-commit hook 未安装**（`.git/hooks/` 仅 .sample，`install-pre-commit.sh` 未跑）— 铁律 #12 本地绕过面，仅 CI PR gate 兜底
- [ ] **SLO.md 冻结 v3.9.1** + `evals/slo-checks/` 不存在 — mcp-guard/deny_with_reason/ledger 等 v3.10+ 组件零 SLO 覆盖；mcp-guard 静默失效无指标可测
- [ ] **季度 fallback 演练 Q2 2026 过期未跑**（QUARTERLY-DRILLS 4 场景全 TBD，仅 2026-05-11 dry-run）
- [ ] 7 skill 无 `paths:` trigger（无自动唤起，沦为手动）
- [ ] 4 条 hooks 文案 + bypass-guard BYPASS_PATTERNS 收缩为单源（双源漂移，harness-auditor ⚠️）
- [ ] CLAUDE.md audit 类命令（review / audit --vibe / --harness）决策树文档化（功能交叠）

### P2
- [ ] 清理远程 16 个已合并 feature 分支（`git push origin --delete <branch>`）
- [ ] Plugin 化（待业界稳定后再考虑）
- [ ] AAIF AGENTS.md 标准化提案

---

## 已部署配置文件

> 计数以 `COUNTS.md` 为 SSOT；2026-06-25 实测文件系统与 SSOT 完全一致（check-counts EXIT 0）。

- ✅ CLAUDE.md（项目铁律 + 路由 + 命令清单）
- ✅ playbook/handbook.md（§1-§50 连续无缺号）
- ✅ .claude/settings.json（hooks + outputStyle cto + statusLine + enabledMcpjsonServers）
- ✅ .claude/commands/ × **18**（minimal 8 / full 11 核心 / +6 advanced opt-in）
- ✅ .claude/agents/ × **5**（eval-runner / harness-auditor / pattern-detector / reliability-auditor / vibe-checker）
- ✅ .claude/hooks/ × **10** + lib/common.sh
- ✅ .claude/skills/ × **11**（.agents/skills/ × 6 跨平台镜像）
- ✅ .claude/rules/ × 3 + learned/ × **7**
- ✅ .claude/output-styles/cto.md + .claude/statusline.sh
- ✅ .mcp.json（lazy 配置）+ templates/{CLAUDE,AGENTS,GEMINI}.md
- ✅ evals/golden-trajectories/ × **31**（023-053，全含 verification_command）+ docs/test-plans/ × 22
- ✅ .github/workflows/ × 5（eval / canary / codex-review / llm-judge / self-audit-weekly）
- ✅ ledger/ × 4 脚本（跨项目事故账本闭环）

---

## 已知问题

### Open
- 4 条 hooks 文案与 rules 内容重复（双源漂移风险，harness-auditor 标⚠️）
- audit 类命令（review / audit --vibe / audit --harness）有功能交叠（待 CLAUDE.md 决策树文档化）
- 质量评分 v3.13–v3.15 未重跑（COUNTS/STATUS 标 TBD），需 harness-auditor / reliability-auditor 回填

### Resolved
- ✅ HARNESS-CHANGELOG 缺失 → v3.4 创建
- ✅ STATUS.md 缺失（dogfooding 缺口） → v3.4 创建
- ✅ 5 处过期章节声明 → v3.4 修复
- ✅ 缺 GitHub Actions eval gate → 已建 `.github/workflows/eval.yml`（铁律 #12 CI 落地）
- ✅ 计数 6+ 处不一致 → v3.13 check-counts.sh SSOT enforcer（2026-06-25 实测 EXIT 0）

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

**2026-06-25 会话恢复**：从 GitHub `cantascendia/ai-playbook` 同步到本地（新 Windows 克隆，保留本地 `.claude`）。
读取 docs/ai-cto/{CONSTITUTION,STATUS,COUNTS}.md + git log；实测验证：
- main `b463a77`（PR #31 已合），working tree 干净
- 组件计数文件系统 vs COUNTS.md SSOT **完全一致**（18 cmd / 5 agent / 10 hook / 11 skill / 31 eval / 22 test-plan / 7 learned-rule）
- `check-counts.sh` EXIT 0（TIER1 全绿，0 软警告）+ `run-evals.sh` **31 PASS / 0 FAIL** — Windows 环境可复现
- 据此核销 v3.4 era 陈账（详见「待办/已核销」），刷新活跃分支/已部署/已知问题

此前 v3.4，2026-04-29，并行调度 harness-auditor / vibe-checker / consistency-audit 三 sub-agent 读取全 harness 组件。

> Note: 历史 7 行 "sub-agent finished" hook 污染已清理（v3.6.3）。SubagentStop hook 改写到 `.claude/agent-logs/${DAY}.jsonl`，本文件不再被自动 mutate。
