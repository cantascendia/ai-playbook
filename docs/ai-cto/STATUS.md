# STATUS — ai-playbook 自身仓库

> 这是 ai-playbook 仓库**自身**的 CTO 项目记忆（dogfooding）。
> 把 ai-playbook 当作"产品"对待 — 用自己的 playbook 管理自己。

最后更新：2026-09-13 — **v5.0 进行中**（分支 `feat/v5.0-native-convergence`）：平台原生收敛重构，阶段 0 与阶段 1 核心已落地。
上一版：2026-07-16 — v4.4：Antigravity CLI（agy）接入 — headless 委派 + codex-bridge fallback 链 codex→agy→claude + cost cap 仅 codex 入账（eval 085）
再上一版：2026-07-10 — v4.2：PR#11 重放 · Self-Audit rolling issue · ADR-009 三层定位（规则/审计/回放）· telemetry/ OTel 用量面板

---

## v5.0 —「平台原生收敛」（2026-09-13 起，进行中）

**计划**：`~/.claude/plans/ai-paybook-chatgpt-claude-antigravity-refactored-umbrella.md`
（依据：72 代理侦察 + 3 方案 × 3 评委 + 宪法/迁移批评；平台事实均 2026-09-12 实抓）

**已拍板**：D1=AGENTS.md 作铁律 SSOT（需 amendment A1）· D2=**下游默认装三平台守护**（反转 2026-07-02 平台条款，需 amendment A5）· D3=09-10 Codex `/import` 产物归档后重生

### 已完成

| 提交 | 内容 |
|---|---|
| `29998d4`（wip 分支） | 2026-09-10 Codex `/import` 的 12 项产物归档到 `wip/codex-import-2026-09-10`，工作树移除 → check-counts TIER1 由红转绿（skills(.agents) 16→6） |
| `b80b0ee` | **WS0**：绿色基线存档（44 单测 / 67 eval / TIER1）+ `SPIKES-2026-09.md`（8 项 spike 中 4 项已成一手事实，4 项待测但各有不退化的安全默认） |
| `1d25744` | **WS0b**：三个红线盲区修复 —— PowerShell 工具全程零覆盖（P0）、NotebookEdit 路径恒空（P1）、mcp-guard Check3 只重跑 2/5 条 immutable 红线（P0）；另加 self 识别第二信号 |
| `dd3b49a` | **WS1-WS3**：一套 guard core 服务三平台（Claude / Codex / agy），Codex `apply_patch` 路径解析 + `group.mjs` 串联把 Codex trust 批准次数 8→3；`.codex/` 与 `.agents/` 接线落地；`RUNBOOK-platforms.md` |
| `e248d92` | **WS8**：记忆层治理（ADR-011）—— review 全文本地-only（12MB 不再进 git）、REVIEW-QUEUE 1.6MB→11KB 并把体积升为 TIER1 硬 gate、**cost cap 从只写变真闸**、新增 immutable 红线 6（ASI06 记忆投毒）、SessionStart 指针化、PostCompact |
| `ea02918` | **WS7 部分**：模型名过期修复（agy 3.6→3.8 实测、Nano Banana Pro→Nano Banana 2）、版本漂移（CLAUDE.md v2.0→v5.0、plugin 4.0.0→5.0.0）、**omnibus amendment 提案** + **SPEC-002** 草案 |

**当前闸门**：44/44 单测 · **72 PASS / 0 FAIL** eval · check-counts TIER1 绿 + **零 TIER2 软警告**

### 本轮修正的两个「治理只写不读」

1. **cost cap 从未被执行过**：`.evolve-cost-month.json` 一直只被写入、从不被读取。2026-09 已记 28419 分
   （≈$284）对上限 2000 分且 `exceeded: true`，而跨模型审照跑不误 —— 安全宪法 #5 自建立起是空文。
   现在触发前读它，超限复用既有 `SKIP_CODEX` 通道降级为 agy/claude 补位（符合宪法「只 detect 不 codex」），
   月份字段比对使其跨月自动失效，无需人工清零。
2. **双签从未被形式化记录过**：唯一先例（2026-07-02 平台条款）已应用，但提案签署栏至今空着、
   Amendment History 里没有那次记录。A4 补登并把流程写成规程。

### 本轮实测出的关键事实（全部有一手证据，见 SPIKES-2026-09.md）

- **PowerShell 盲区不是理论风险**：trajectory 日志显示该工具自 **2026-07-02** 起已在实际使用，而 PreToolUse 的 Bash 组 matcher 只写 `"Bash"` → bypass / destructive / branch 三个 guard 在这条活跃通道上零覆盖两个多月。
- **Codex 侧一直是零守护**：`~/.codex/config.toml` 的 `[hooks.state]` 中本仓**一条 trust 记录都没有**，即 2026-09-10 生成的 `.codex/hooks.json` 从未运行过。且 trust 是**逐 hook 条目 + 绝对路径**登记，重新生成即全部失信 → 这是「假安全感」的头号来源，故 `.codex/hooks.json` 刻意压到 3 条。
- **agy payload 自带 `workspacePaths[]`** → adapter 可直接拿到 repo root，消除了「agy 侧 self/SSOT 判定静默失效」的风险（此前由宪法批评家指出）。
- **agy 的红线面远超 run_command**：122 个 step type 中 `git_commit` / `shell_exec` / `mcp_tool` / `cloud_sql_execute_sql` / `delete_directory` / `move` 各自成独立步骤。
- **写含红线字面量的文档必须用 Write/Edit 工具**：用 Bash heredoc 会被自己的 bypass-guard 拦（ADR-010 的 fail-safe 按设计工作，非 bug）。commit body 同理走 `-F`。

### 范围决策（偏离原计划，已记录理由）

- **不做 guard 纯函数化**：其唯一刚需是单进程 dispatch 不丢 audit，而 dispatch 已被评委团拆为独立 PR 并推到 v5.1。改为「输入归一 + 输出变形」的 I/O 层方案，风险小一个数量级，WS2/WS3 目标不变。
- **保留 `MultiEdit` matcher**：工具已从 `filePatternTools` 消失，但死 matcher 是零成本防御，删除只换来清爽、却有开洞风险。

### 待办（按计划顺序）

**阻塞在人的三件事（其余工作均已绕开它们推进）**

| 事项 | 阻塞了什么 |
|---|---|
| 签 `AMENDMENT-PROPOSAL-2026-09-v5.md`（A1…A5，分条勾选） | A1 阻塞 WS5 的 AGENTS.md 单源；**A5 阻塞 WS10 的下游默认三平台**（这是 D2=B 的合法性前提） |
| 升级 Claude Code ≥2.1.217（本机 2.1.178） | WS6 的 `.claude/rules` `paths:` 惰性加载（低版本有 glob 崩溃缺陷，加了会踩） |
| 在各仓 Codex TUI 跑 `/hooks` 批准 trust | Codex 侧守护实际生效；未批准时 doctor 会红字显示，不会假装 ✓ |

**可继续推进（无前置）**

- **WS4 余项**：序列回放 `evals/lib/replay.mjs` + audit 行序列断言（parity 矩阵已由 eval 095 的 31 条断言覆盖）
- **WS5**：`scripts/compile-policy.mjs`（吸收 sync-agents-md.mjs）+ `policy/{models,deny,hook-matrix}.json`
  —— 编译器本身不依赖 A1，只有「铁律搬家」那一步依赖
- **WS6**：18 commands → 13 skills（skill 化不依赖版本升级，只有 rules `paths:` 依赖）
- **WS7 余项**：handbook 原地瘦身（零引用 6 章 + 内嵌模板 375 行 + §38-40 压缩；self 第二信号已就位，可安全动手）
- **WS9**：eval 契约化（kind/bucket/binds）+ **telemetry / ledger 正式下线**（ADR-011 已决定，执行与 eval 080/084/085/088 重写同批）
- **WS10**：fleet 升级工具与灰度（33 个安装点，wave 0 = 本仓）
- **SPEC-002**：两个僵尸 workflow 退役（forbidden 路径，需双签）

---

## 一句话状态

ai-playbook **v4.0 (agent-native runtime) — 主体已落地 main**。enforcement 从「零散 bash hook」
演进为「统一 Node guard engine + legacy-fallback shim」运行时。**3-PR 序列全部合并**（Fable 5 限时轮，
7 代理扫描 → 规格提取 → scope/cutover 双对抗审查 → 分阶段落地）：
- ✅ **PR-A #38（分发 + 记忆层）**：cto-init 全新安装 P0 修复（settings/statusline/output-style/agents/rules
  从不复制 → 补齐）+ 记忆层手术（REVIEW-QUEUE 季度轮转、陈档归档、记忆契约诚实化、DECISIONS.md 补建）。
- ✅ **PR-B #39（guard engine parity port）**：10 bash hook → `engine/*.mjs`（JSON.parse 根除 sed 解析
  bug 类，Windows 14× 提速），逐条 parity + legacy-fallback shim；32 单测 + eval 058 平价门。
- ✅ **PR-C #40（新语义，已人双签）**：铁律 #8 扩展 Bash（git commit/push 到保护分支拦截，refspec 解析
  + FP 矩阵）+ guard 自保护（覆写 guard 文件拦截）。
- 🔄 **v4.0d 收尾**：本仓 live settings.json 激活 v4.0a/c（自改保护上轮拦下，本轮获授权应用）+
  `.claude-plugin/` 实验 plugin 分发通道（validate 通过，与 cto-init 并行）。
- ✅ **v4.0e（PR #43 已 merge，squash `3940c0f`）**：branch-guard 工作树边界修正 —— 铁律 #8 原实现在保护分支上无条件拦
  **所有** Edit/Write，不判断文件是否在仓库工作树内 → 写仓库外文件（如 `~/.claude/.../memory/*.md`）被
  误拦（2026-07-02 实测）。engine `guards.mjs` + legacy `branch-guard.sh` 同步加**工作树边界**判断
  （工作树根 = `git rev-parse --show-cdup` 相对上爬 + canon 归一，parity），仓库外放行 + audit；eval 062 双路径矩阵
  12/14 断言 + 6 单测（36→42）；COUNTS evals 39→40。**双审迭代（§48 价值实证）**：独立 Claude 审判"无 Major"，
  但 §48 codex 审 3 轮 verdict=**BLOCK**，逐层抓到单模型漏掉的 4 个安全 false-negative（cwd 子目录 / Windows
  大小写 / symlink 别名 / legacy 多尾斜杠 parity）→ canon 归一 + cdup 上爬 + bash 剥全部尾斜杠修复。第 4 轮 codex
  撞 usage limit（安全宪法 #5 优雅降级）→ **独立 Claude parity 终审补位**：逐案端到端跑双实现，判 **PARITY: OK
  「ship it」**（无残留 false-negative / 无 parity 分歧）。3 轮审计存 REVIEW-QUEUE.md。

> ☑ **v4.0e 已应用（2026-07-08）**：CI 加固（eval.yml setup-node + 引擎单测入 gate；llm-judge
> forbidden 正则单源 SSOT）+ 宪法平台修正案（三平台对称 → Claude-native + opt-in）。人三次显式授权，
> opt-out 经 settings.local.json env 激活（guard 放行 + audit），应用后即删（ADR-007）。
> **v4.0 全序列（a-e）就此完成。** 下阶段候选：飞轮 5→2 agent 合并、handbook reference 化（v3.14 阶段 2）、
> branch-guard 仓库内文件范围修正（chip 已建）。

此前 **v3.15** Claude 模型阵容对齐当代（默认 **Opus 4.8** `claude-opus-4-8` + **Fable 5** `claude-fable-5`
opt-in）。再前 **v3.14（bold-audit）** 对抗验证裁决**混合重构**（Bash/mcp guard `exit 2`→`permissionDecision:deny`
JSON、跨项目事故 **ledger** 闭环、命令 23→18 合并）；**v3.13** 平台默认收敛 **Claude-only** + 14 铁律 4 层优先级
+ check-counts SSOT enforcer 落地。

组件计数以 `docs/ai-cto/COUNTS.md` 为唯一 SSOT（**不在本文件硬写数字** —— 见 COUNTS.md 表）；
`scripts/check-counts.sh` 已接入 `.github/workflows/eval.yml` CI 自动兜底计数漂移。

> ⚠️ 本文件下半部 v3.6→v3.14 曾长期冻结（pre-existing 债），v3.15/v4.0 两轮已滚动刷新；
> 逐版细节见 `EVOLUTION-LOG.md`（append-only 权威记录）+ ADR 见 `DECISIONS.md`。
> v4.0a 质量分数重测排队中（见「质量评分」）。

---

## 质量评分

> 2026-06-25 回填：harness-auditor + reliability-auditor 并行重审 + 对抗验证（high confidence，无膨胀，
> 两份 grounded=true，verifier 逐条核实 14 项 evidence）。v3.15 测得 **Health 79 / ARE 78**。
> v3.13/v3.14 历史快照未单独测，当前累计态即 v3.15 分数。**不臆造分数**（铁律 #3）。

| 版本 | Health | ARE | 关键 |
|---|---|---|---|
| **v4.4** (当前) | **85** | **82** | 2026-07-15 harness+reliability 双审重测（v4.0-v4.3 首次回填，实测非轻信）。加分=branch protection 真激活/eval 31→63/引擎 42 单测/changelog 续档/演练脚本化。欠 ≥90=drift锁+pre-commit 未激活（本轮修）/SLO 文档滞后/REVIEW-QUEUE 复胀/telemetry 未产真数据 |
| v4.0a→v4.3 | —（见 v4.4） | —（见 v4.4） | agent-native runtime + 分发 + 跨工具 enforcement 收敛 + Windows 硬化 + 遥测；累计态即 v4.4 分数 |
| v3.15 | **79** | **78** | Claude 模型阵容对齐；扣分=changelog 断档 + pre-commit 未装 + 7 skill 无 paths + SLO 冻结 v3.9.1 + 季度演练 Q2 过期未跑 |
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

- `feat/v4.0-agent-native-runtime` — **当前工作分支**：v4.0 agent-native runtime 集成分支，
  并入并统辖多个 v3.14/v3.15 收尾 PR（#32 / #33 / #34 / #36 已 merge 进本分支）+ 本轮 memory-layer 手术
- `main` — v3.15 基线（v4.0 分支从此拉出）
- 远程残留已合并 feature 分支若干（含 v3.15 系列）— 可批量清理（见待办 P2）

---

## 已完成（v3.13 → v4.0a）

### v4.0a — agent-native runtime PR-A：分发 + 记忆层（feat/v4.0-agent-native-runtime，进行中）
- ✅ **REVIEW-QUEUE 季度轮转**：2026-06-01 前 11 条 review（1074→383 行主文件）轮转到 `archive/REVIEW-QUEUE-2026-Q2.md`（byte-identical，只轮转不删除，Sakana DGM lineage 全保留）；主文件加 archive 指针
- ✅ **飞轮 lineage 消费者对齐 archive**：cto-evolve.md + pattern-detector.md 扫描范围含 `docs/ai-cto/archive/REVIEW-QUEUE-*.md`
- ✅ **5 份 zero-live-ref 陈档归档**：EVOLUTION-PROPOSAL(×2) / AMENDMENT-PROPOSAL / SELF-AUDIT-2026-05-10 / QUARTERLY-DRILLS → `archive/`（REDESIGN-2026-06-10-bold-audit 保留原位，仍是治理裁决书）
- ✅ **记忆契约诚实化**：cto-resume + CLAUDE.md 记忆清单裁到真实存在的 8 文件（删 7 个从未创建的 aspirational 引用），保留「TARGET 项目可经 /cto-start 长出完整集」一行
- ✅ **DECISIONS.md 补建**：从 EVOLUTION-LOG + bold-audit 裁决书回填 ADR-001~006（此前被 cto-resume/cto-constitution 引用却从未存在）
- ✅ **COUNTS/STATUS 诚实刷新**：check-counts.sh 已实现且接入 CI（改掉「待实现」旧文案）；STATUS 下半部对齐 v4.0 现实

### v3.15 — Claude 模型阵容对齐当代（branch `de7da50` + 审计后续，PR #31 已合）
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

- **PR-B（guard engine parity port）**：把 10 个独立 hook 红线逻辑收敛进统一 guard engine，
  行为逐条对齐旧 hook（parity），旧 hook 降级 legacy-fallback shim（零回归再切换）。
- **PR-C（新 enforcement 语义）**：引入旧 hook 没有的新拦截语义 —— 触及 enforcement 红线本身，
  **必须人工 double-sign** 后进 main（forbidden-path，铁律 #12/#13）。

---

## 待办（按优先级）

> **2026-07-08 v4.1「backlog 清零」轮**（Fable 5 指挥 + Opus 编队，verify-then-implement）：
> 2026-07-02 扫出的项**全部处置到终态** —— 要么 ✅ 已做，要么 ⚪ 诚实定性为「需真环境/人治理开关」（非悬挂 TODO）。

### ✅ 已完成（v4.1）
- [x] **eval.yml push-gap**（forbidden）→ 加 `push:branches[main]` 触发（eval 077），经 CTO_DOUBLE_SIGNED opt-out 应用 + audit。
- [x] **7 个 command 零 eval 覆盖** → 064-070 结构+契约 eval（原述「8 个」实为 7：canary/design/eval/image/models/release/skills）。
- [x] **llm-judge.yml forbidden-regex 漂移**（forbidden）→ v4.0e 已单源自 `scripts/forbidden-paths.txt`（本条为 STATUS stale，实早已核销）。
- [x] **`evals/slo-checks/` 机器可执行 SLO** → 8 断言 + runner（6 静态 PASS / 2 运行时诚实 SKIP），eval 072。
- [x] **季度 fallback 演练脚本化** → `evals/drills/`（4 场景 mock+temp 可跑 / 1 需真会话 SKIP-manual），eval 075。原「headless 无法模拟」部分为陈述性 stale。
- [x] **7 skill 无 paths trigger** → **诚实 refute**（cargo-cult false positive：paths 仅 file-edit guard 用，这 7 个用 description 触发是正确设计），eval 071 守 description 关键词。
- [x] **bypass-guard BYPASS_PATTERNS 单源** → common.sh `bypass_patterns()` + engine const 字节对齐，eval 073。
- [x] **4 条 hooks 文案单源** → legacy 文案收缩为 rule 指针（forbidden/test-lock；eval-gate 已有指针；vibe 无 rules 对应），eval 076。
- [x] **CLAUDE.md audit 决策树** → 7 行 review/audit/release 辨析表，eval 074。
- [x] **清理远程已合并分支** → 删 11 个。
- [x] **Plugin 化** → v4.0d `.claude-plugin/`（validate 通过，与 cto-init 并行）。

### ⚪ 终态：需真环境 / 人治理开关（非悬挂 TODO，precondition 明确）
- ✅ **push-gap 真阻断已落地**（2026-07-14 v4.3）：branch protection ON（require PR / 0 approvals / enforce_admins=false / 无 required checks——见 Resolved 条目取舍说明）。
- ⚪ **季度演练场景 3（settings opt-out）+ 真 FP-rate SLO** —— 需真 Claude 会话 / 人工标注 block 正确性，drill 05 + slo-check 07 已 SKIP-manual 标 precondition。附带发现：settings.json 的 SessionStart 未实现「effective vs declared hook 数」告警（QUARTERLY-DRILLS scenario-3 note 记录，未来 harness 增强候选）。

### 🔵 明确不做（v3.14 「no big-bang」裁决保护，非本轮范围）
- 🔵 命令 23→18→**12** 合并 / 5→2 agent 合并 / handbook → reference/ 不分发 —— v3.14 阶段 2，需 27 项目灰度滚动验证，headless 大改会违反「no big-bang」裁决。留人决定何时启动。
- 🔵 AAIF AGENTS.md 标准化提案 —— 待标准稳定。

---

## 已部署配置文件

> 组件计数一律以 `docs/ai-cto/COUNTS.md` 为唯一 SSOT（**本节不硬写数字** —— 见 COUNTS.md 表）；
> `scripts/check-counts.sh`（CI 已接入）自动比对文件系统 vs SSOT，漂移即 `exit 1`。

- ✅ CLAUDE.md（项目铁律 + 路由 + 命令清单）
- ✅ playbook/handbook.md（§1-§50 连续无缺号）
- ✅ .claude/settings.json（hooks + outputStyle cto + statusLine + enabledMcpjsonServers）
- ✅ .claude/commands/（cto-* 命令集，分发档 minimal / full / advanced —— 计数见 COUNTS.md）
- ✅ .claude/agents/（sub-agents —— 计数见 COUNTS.md）
- ✅ .claude/hooks/ + lib/common.sh（计数见 COUNTS.md）
- ✅ .claude/skills/（.claude 原生 + .agents/skills/ 跨平台镜像 —— 计数见 COUNTS.md）
- ✅ .claude/rules/ + learned/（计数见 COUNTS.md）
- ✅ .claude/output-styles/cto.md + .claude/statusline.sh
- ✅ .mcp.json（lazy 配置）+ templates/{CLAUDE,AGENTS,GEMINI}.md + templates/settings.json
- ✅ evals/golden-trajectories/ + docs/test-plans/（计数见 COUNTS.md，全含 verification_command）
- ✅ .github/workflows/（eval / canary / codex-review / llm-judge / self-audit-weekly）
- ✅ ledger/（跨项目事故账本闭环 —— 计数见 COUNTS.md）

---

## 已知问题

### Open
- **4 条 hooks 文案与 rules 内容重复**（🟡 minor，defer — 2026-07-15 v4.4 复核）：guard 运行时提示（engine/guards.mjs）
  与 rules/*.md 权威内容重叠，v4.1 eval 076 只单源化了 legacy .sh 兜底、未覆盖 engine 运行时路径。
  **裁决 defer（by-design 可接受）**：guard 提示合法承载即时可操作文本 + hook 专属 opt-out env
  （CTO_DOUBLE_SIGNED/CTO_TEST_LOCK_ACK/CTO_EVAL_GATE_ACK，rules 里没有），不宜降为纯指针。
  真单源方案（提取 engine/lib.mjs 的 FORBIDDEN_MSG/TESTLOCK_MSG 常量供 guards.mjs 消费）是 nice-to-have，
  非紧急，留待触及 guards 文案时顺手做。
- **plugin loader Agents(0)**（🟡 minor，defer — 2026-07-15 v4.4 复核修正前提）：`.claude-plugin/plugin.json`
  的 agents 字段是 **5 条显式文件路径数组**（非单 glob），`claude plugin validate` 通过、cache 内 5 文件在，
  但 loader details 报 Agents(0)（validate ≠ load）。修复候选（挪 root `agents/` 布局）会引入 .claude/agents
  SSOT 的双源拷贝，比 Agents(0) 现状更糟，且 root 自动发现是否真 load 未实测；plugin 是 opt-in 实验通道
  当前已卸载不影响分发。保持已知限制。

### Resolved
- ✅ **v4.4 fallback/cost 5 个可靠性 bug**（2026-07-16 v4.4b/c 后双审揪出 → v4.4d 修，含 2 个我 v4.4c 自带缺陷）：
  ① 严重度计数扫全量 transcript 被 emoji 范例污染（🔴51 vs 真 0 Critical）→ 改 SEVERITY_SUMMARY 解析 + 诚实未知；
  ② reviews/<sha>.md 从不 git add（lineage 断链）→ 加 git add；③ cost cap 文件从不 bootstrap（裸奔 32 天）→ 缺失即建；
  ④ MODE 覆写吞 codex/agy 真失败（PR 假报"codex 未装"）→ FAIL_CHAIN 保留失败链；⑤ agy 补位档零动态测试 → drill 06 +
  slo-check 断言。Opus 编码 + Fable 5 独立沙箱/对抗验证（严重度解析 7/7）。**Health 85→80 / ARE 82→79 的扣分项本轮解**。
  eval 086 强化（反污染 mock）+ drill 06 + slo-check 06。
- ✅ **REVIEW-QUEUE 反复膨胀（341KB）**（2026-07-15 Health 审计 top-gap #4 → 2026-07-16 v4.4c 修根因）：
  codex-bridge post-commit §48 审每次 append 整份八维报告（#59 一 PR +2683 行）。修：全文分流 `reviews/<sha>.md`
  （lineage 保全），REVIEW-QUEUE 只留摘要+严重度计数+指针；pattern-detector/cto-evolve 扫 reviews/*.md。
  eval 086。check-counts >200KB 软警告仍在作 tripwire（存量旧格式全文待季度轮转，不影响新 append）。
- ✅ **bypass-guard core.hooksPath 读写不分 FP**（2026-07-03 发现 → 2026-07-15 v4.4b **裁决 WONTFIX-as-carve-out + 硬化**）：
  尝试「只拦写」carve-out 修误拦只读的 FP，**3 轮对抗验证（9 agent）逐轮击穿**（轮1 前缀锚被 `git -C .` 击穿 /
  轮2 空引号对逃逸 / 轮3 引号包 metachar 值族 `'>x'`+`${IFS}`+续行）→ 坐实 **static regex 不可安全区分读/写**。
  **决断（ADR-010）**：放弃 carve-out，保持广义 token（拦一切提及 fail-safe，读 FP 理论性无真实消费方），
  但**保留新增的剥引号归一化**——这让广义 token 严格更强，闭合旧 pattern 漏的引号插入写逃逸（`core.hooks'Path'`/
  引号包操作符值）+ 修复续行的 engine/legacy parity 破裂。eval 024 锁 29 断言，行为矩阵 54/54，byte-parity 相等，轮4 SAFE。
- ✅ **AGENTS.md/GEMINI.md 漂移锁是摆设**（2026-07-14 codex §48 + 2026-07-15 Health 审计发现 → v4.4 修）：
  v4.3 sync-agents-md.mjs 未接任何 CI（全仓 grep 零命中）+ eval 082 test#2 先 write 后 --check 自愈屏蔽真漂移。
  修：漂移锁 `--check`（只读比对已提交文件，绝不先 write）接进 CI 已跑的 check-counts.sh TIER1.5 硬 gate；
  eval 082 改直接 --check + 加 CI 接线断言。
- ✅ **git 层 pre-commit 兜底本仓未安装**（2026-07-15 Health/ARE 审计发现 → v4.4 修）：v4.3「唯一对
  codex/终端一致生效」的兜底脚本存在但 `.git/hooks/pre-commit` 缺失=零保护。已 `install-pre-commit.sh` 激活 +
  doctor-windows.sh 加 5b 检测（未装则 warn+fix hint）+ eval 083 断言。
- ✅ **audit 命令交叠「待文档化」STATUS stale**（2026-07-15 v4.4 复核）：决策树早已在 CLAUDE.md:124-136
  （eval 074 守），STATUS 同文件一处 [x] done 一处仍挂 Open = 纯陈旧漂移。已删该 Open 条目。
- ✅ **v4.0a 质量分数 TBD 回填**（2026-07-15 v4.4）：harness-auditor 重评 **Health 79→85**、reliability-auditor
  重评 **ARE 78→82**（均实测验证非轻信文档）。改善项：changelog 断档解除 / 演练脚本化 / branch protection 真激活 /
  eval 31→62 / 42 引擎单测。新扣分：drift 锁+pre-commit 未激活（本轮已修）/ SLO.md 文档滞后 / REVIEW-QUEUE 复胀 /
  telemetry 未产真数据。距 ≥90 目标仍差，欠账见 top-gaps。
- ✅ **CONSTITUTION 安全宪法 #4 branch protection vaporware**（2026-07-04 发现 → 2026-07-14 v4.3 落地）：
  gh api PUT main 保护 = require PR / 0 approvals（单维护者不能自批own PR）/ enforce_admins=false（逃生门）/
  **无 required checks**（Eval Gate paths-filtered，设 required 会让不触发的 PR 永卡 Expected—Waiting，有意取舍）。
  push-gap 真阻断随之闭合（direct push main 被 GitHub 拒绝）。
- ✅ **llm-judge.yml 自创建以来从未解析成功过一次**（2026-04-29 创建 → 2026-07-09 修复）：根因是
  GitHub Actions **schema 层解析失败**（注册 workflow name 显示为文件路径而非 YAML `name:` 值 —
  GitHub 读不到顶层 name: 字段的标准指纹；push 100% "workflow file issue"，pull_request 触发器
  两个多月零成功；已排除 CRLF/emoji/job-level 多行 if: 等假设，GitHub API 不吐具体解析错误行）。
  修复：改纯 PR-only 触发（push 到 main 不再产生噪声）+ 去 job-level 多行 `if:` + 去
  `actions/github-script`（改 `gh pr comment`）+ forbidden 正则显式 `tr -d '\r'` 兜底防 CRLF 静默
  检测失效。Fable 5 诊断/裁决/最终应用，codex(gpt-5.5) 编码执行，eval 078 守护。经 ADR-007
  opt-out 通道应用（非绕过）。
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
