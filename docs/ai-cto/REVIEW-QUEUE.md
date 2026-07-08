# Cross-Model Review Queue

> 由 §48 codex-bridge skill 写入。每条记录 Codex (gpt-5.5) 跨模型评审结果，下次会话 SessionStart hook 自动加载。
>
> 历史 review 轮转至 `docs/ai-cto/archive/`（Sakana DGM lineage 全保留，只轮转不删除）。

---

## 2026-07-04 — Review for PR #43（v4.0e branch-guard 工作树边界，main…e014895）
**Reviewer**: codex gpt-5.5 (xhigh) via `codex exec` | **Mode**: §48 cross-model，3 完整轮 + 独立 Claude 终审补位

```markdown
§48 codex 跨模型审 — branch-guard 工作树边界修正（铁律 #8 false-positive 修复）

三轮迭代，每轮 verdict=BLOCK 并抓到单模型自审漏掉的**真安全 false-negative**（保护分支上仓库内文件被漏拦）：

| 轮 | 发现 | 严重度 | 处置 |
|---|---|---|---|
| 1 | Major-1：cwd 为仓库子目录时 cwd 外同仓文件漏拦（从子目录/monorepo package 跑 claude 可触发）| 🟠 Major | ✅ 边界改取 git 工作树根 |
| 1 | Major-2：Windows 大小写/盘符差异（`c:` vs `C:`）同仓文件漏拦 | 🟠 Major | ✅ canon 大小写不敏感归一 |
| 2 | Major-3：symlink/junction 别名 —— cwd 用别名路径而 `--show-toplevel` 返回 real 路径致前缀不匹配漏拦（macOS `/tmp`、Windows junction）| 🟠 Major | ✅ 改用 `--show-cdup` 相对上爬（停留 cwd 空间，免 realpath）|
| 3 | Major-4：legacy bash `${_ROOT%/}` 只剥一个尾斜杠 vs engine 剥全部 → cwd `…/app//` 时 legacy 少爬一层漏拦（真 parity 分歧）| 🟠 Major | ✅ bash 改剥全部尾斜杠对齐 engine |
| 4 | codex 配额耗尽（usage limit，安全宪法 #5 优雅降级）；部分输出确认修复已就位，未出终裁 → 独立 Claude 终审补位 | — | — |

**价值实证**：单模型（Claude）自审判"无 Major，parity 一致"，但 codex 跨模型审逐层抓到 4 个真 false-negative —— §48 跨模型 dogfooding 的直接价值证明。所有发现均有对应单测 + eval 062 双路径断言复现并守护。

**验证**：42 node:test（Windows 大小写 + symlink junction 真机实跑）+ eval 062 双路径矩阵（多尾斜杠/大小写/symlink gated）+ 全量 40 PASS + CI（Linux）绿 + 直接复现 codex 各场景 exit 2。

**成本**：codex 3 轮 xhigh ≈ 40 万 token → 触及月度 usage limit → 后续降级为只 detect（安全宪法 #5）。
```

---

## 2026-06-17T00:19:12+09:00 — Review for b463a77
**Reviewer**: claude-fallback-opus | **Mode**: claude-only

```markdown
八维评审完成。以下为只读报告，未改动任何文件。

---

# 八维审核报告 — commit `b463a77`

**标题**：`feat(v3.15): align Claude model lineup to current gen (Opus 4.8 + Fable 5) (#31)`
**作者/日期**：Unflight · 2026-06-16 · PR #31（squash merge）
**规模**：10 文件 · +140/−60 · 1 新 eval

## 一句话结论

🟢 **可放行**。模型 SSOT 升级（Opus 4.6→4.8 + Fable 5）干净、自洽，配套 eval 053 真执行守护，历史事故记录按铁律 #2 保留——这是一次教科书式的"事实对齐型"改动。仅 2 处 🟡 Minor（命令合并尾巴的 eval 覆盖缺口 + eval 脚本正则未转义）值得后续收口。

## 逐维度

| 维度 | 评级 | 说明 |
|---|---|---|
| 架构 | 🟢 | 单一改动主题（模型阵容），§1.2 明确标注为「铁律 #3 模型名 SSOT」(`handbook.md:22`)，下游路由表全部从该表派生。符合宪法「§1.2 是唯一权威源」的设计意图。 |
| 代码质量 | 🟢 | sweep 彻底：CLAUDE.md / CTO-PLAYBOOK / templates / handbook §14/§32/§34/§38-40/§44 全覆盖，无遗漏的活跃路由残留。多 agent 完备性审计补抓 §44 replay 的 `opus-4-7`/`opus-4-8` dash-form 漏网（`cto-replay.md:44`、`handbook.md:3658`）——这正是单次正则 sweep 会漏的边角。 |
| 性能 | 🟢 | 纯文档/配置改动，无运行时性能影响。eval verification_command 为轻量 grep，可接受。 |
| 安全 | 🟢 | **铁律 #2 严格遵守**：PocketOS 历史事故注释中的 "Opus 4.6" 明确保留不改（commit msg + `053.yaml:9` forbidden_actions 显式列为禁止项）。**铁律 #3 遵守**：非 Claude 模型（gpt-5.5/Gemini 3.1/Nano Banana/gpt-image-2）因无 2026-06 权威源而保持不动，不编造版本号。未触及任何 forbidden 路径。 |
| 测试 | 🟡 | **铁律 #12 部分满足**。新增 `053-model-lineup-v3.15.yaml` 含真 `verification_command`（5 检查点，COUNTS 同步 30→31）——模型改动有 eval 覆盖 ✅。**但** `cto-init.md:26-27`、`cto-models.md` 的命令合并尾巴修复（vibe-check→audit、删 cross-review/harness-audit/cto-refresh 引用）属 v3.14 命令合并的文档对齐，**不被 053 覆盖**，本 commit 内无对应 eval。commit msg 已诚实标注「real-but-defer，单维护者拒绝为 2 行另开 PR」——可接受的工程权衡，但严格按 #12 应有 case。 |
| DX | 🟢 | §1.2 新增「运行形态 + /fast + effort」说明 (`handbook.md:33-35`) 显著降低选型/切换认知负担；model ID 列让铁律 #3「只从表选名」可机械校验。 |
| 功能完整性 | 🟢 | 无硬编码占位/假完成（铁律 #9 不适用——纯文档）。STATUS.md 从 v3.12 真实滚动到 v3.15，质量评分表诚实标 `TBD`「不臆造分数」(`STATUS.md` 质量评分段)——符合反模式 #6 eval-gaming 防线。 |
| UX 可用性 | 🟢 | 表格化 model ID + 价格对比（Fable 5 ~2× $10/$50 vs Opus $5/$25）让成本敏感场景有明确指引；STATUS 删除重复的「🔀 分支状态」段，去冗余。 |

## 关键发现明细

🟡 **Minor-1 · eval 脚本正则未转义**（`053.yaml:43`）
```bash
grep -q 'Opus 4.8' CLAUDE.md && pass=$((pass+1))
```
`4.8` 的 `.` 未转义会匹配任意字符（`Opus 4x8` 也通过）。同文件 check #2/#3 的 `Opus 4\.6` 已正确转义，此处不一致。实际无害（不会有 `4x8` 文本），但同一脚本内转义标准不统一。建议改 `Opus 4\.8`。

🟡 **Minor-2 · 命令合并尾巴缺 eval**（铁律 #12 边角）
`cto-init.md` / `cto-models.md` 的命令引用对齐无 case 覆盖。**已在当前分支 `fix/v3.14-live-cmd-refs` 用 `054-command-merge-live-refs.yaml` 补上**（git status 显示该文件已 staged）——即本次评审所在分支正是该缺口的收口，闭环成立。

📌 **自洽性核验通过**：
- COUNTS.md evals 30→31 ✅ 与新增 053 文件一致
- 模型 ID（`claude-opus-4-8` / `claude-fable-5` / `claude-sonnet-4-6` / `claude-haiku-4-5`）均为有效别名形式，与环境模型表一致，无铁律 #3 违规
- STATUS.md 内文「PR #31 待 merge」是 commit 时点的真实状态（自引用），非 stale

## 下一步（我继续做）

当前分支 `fix/v3.14-live-cmd-refs` 已 staged `054-command-merge-live-refs.yaml` + 4 个命令文档修订——这正是 Minor-2 的收口。建议合并前我跑一次 `eval-runner` 确认 053+054 全绿且无回归，再走 §48 codex 跨模型审。需要我现在触发吗？（这是真分叉点：是否在本轮就跑 eval gate）
```

---

## 2026-06-17T00:17:12+09:00 — Review for b463a77
**Reviewer**: claude-fallback-opus | **Mode**: claude-only

```markdown
# 八维评审报告 — commit b463a77 (v3.15 模型阵容对齐)

## 直接结论

🟢 **整体 PASS** — 这是一次**纯文档/配置 sweep**（Opus 4.6→4.8 + 新增 Fable 5），无运行时逻辑改动。改动范围克制、铁律遵守到位（#2 历史记录不改 / #3 模型名 SSOT / #12 配套 eval 053）。仅 eval 053 的 verification_command 有 2 处 🟡 健壮性瑕疵，不影响当前 PASS。

| 维度 | 评级 | 一句话 |
|---|---|---|
| 架构 | 🟢 | SSOT 单源设计正确，§1.2 立为模型名权威表 |
| 代码质量 | 🟡 | eval bash 有未转义 `.` + check#2 绝对化两处小瑕疵 |
| 性能 | 🟢 | 无关（文档改动），eval grep 开销可忽略 |
| 安全 | 🟢 | 铁律 #2/#3 严格遵守，非 Claude 模型不臆造 |
| 测试 | 🟢 | eval 053 五检覆盖到位，含回潮防护 |
| DX | 🟢 | model ID + 运行形态 + /fast + effort 说明显著提升 |
| 功能完整性 | 🟢 | sweep 无残留（已实测验证），含 dash-form 漏网修补 |
| UX | 🟢 | STATUS 表格化 + TBD 诚实标注，可读性提升 |

---

## 逐维详评

### 1️⃣ 架构 🟢

- ✅ `handbook.md:22` §1.2 显式标注「铁律 #3 模型名 SSOT — 只从本表选名」，把单一权威源**写进标题**，符合 CONSTITUTION「§1.2 是铁律#3 SSOT」定位。
- ✅ `cto-models.md:-7` 删除 `cto-refresh.md` 悬挂引用 — v3.14 命令合并（refresh→`resume --refresh`）的正确收尾，避免指向已不存在的同步目标。
- ✅ 分层正确：路由表（CLAUDE.md / CTO-PLAYBOOK / templates / handbook §14.1）全部下游引用 §1.2，无重复定义模型特性。

### 2️⃣ 代码质量 🟡

唯一含逻辑的文件是 `053-model-lineup-v3.15.yaml` 的 `verification_command`：

- 🟡 `053:38` `grep -q 'Opus 4.8' CLAUDE.md` — `.` 未转义，正则会匹配 "Opus 408"/"Opus 4x8" 等。当前内容下不会误判，但与 check#2/#3 中已转义的 `'Opus 4\.6'` 风格不一致，建议统一为 `'Opus 4\.8'`。
- 🟡 `053:33` check#2 对 handbook 做**绝对** `grep -q 'Opus 4\.6'` 判 FAIL。当前 handbook 无任何历史性提及所以安全，但语义上比 check#4（仅扫"活跃路由文档"并允许 changelog 描述性提及）更脆 —— 未来若 handbook 新增 changelog 段描述本次迁移，会误 FAIL。属可接受的紧约束，建议注释里点明「handbook 不得有任何 4.6 字样」是有意为之。
- ✅ check#4 `053:43-48` 的 dash-form `opus-4-8` 回潮防护设计良好（双 grep：cto-replay.md `model=opus-4-8` + handbook `"model":"opus-4-8"`），正是 commit message 自述「4.6-only sweep 漏掉 opus-4-7」教训的固化。

### 3️⃣ 性能 🟢

- ✅ 无关维度。eval 5 次 grep 全文件扫描开销 ms 级，可忽略。

### 4️⃣ 安全 🟢

- ✅ **铁律 #2（不篡改历史）严格遵守**：`destructive-action-guard.sh:4` PocketOS 事故注释中的 "Opus 4.6" 原文保留（已实测确认），eval `053:10` 显式将「改历史版本号」列为 `forbidden_actions`。
- ✅ **铁律 #3（模型名只从 SSOT 选）**：非 Claude 模型（gpt-5.5 / Gemini 3.1 / Nano Banana / gpt-image-2）全部未动，`053:13` 把「编造未核实版本号」列为 forbidden — 抵抗了 sweep 时顺手"更新"的诱惑。
- ✅ 未触及任何 forbidden 路径（auth/payment/secrets/migration/crypto/infra/workflows）— 无需双签。
- 📌 model ID 准确性核对：`claude-opus-4-8` / `claude-fable-5` / `claude-sonnet-4-6` 均与本会话环境一致；`claude-haiku-4-5`（`handbook:30`）为别名形式，环境完整 ID 为 `claude-haiku-4-5-20251001` —— 别名可用，🟢 无误。

### 5️⃣ 测试 🟢

- ✅ **铁律 #12 闭环**：配置改动（CLAUDE.md / commands / handbook）配套 eval 053，COUNTS.md `:17` 同步 30→31，commit 自述「31 PASS/0 FAIL」。
- ✅ eval 五检覆盖完整：§1.2 SSOT 含双模型+双 ID（check#1）/ handbook 无残留（check#2）/ CLAUDE.md+templates 同步（check#3）/ 活跃文档+§44 示例（check#4）。
- ✅ `acceptance_criteria:19` 明确区分「活跃路由」vs「描述性提及允许」，避免 eval-gaming（§32.5 反模式 #6）。

### 6️⃣ DX 🟢

- ✅ `handbook:24-30` 新增 **model ID 列** + 价格对比（Fable 5 ≈ 2× 价）+ Fable 5 选型指引（「成本敏感时仍用 Opus 4.8」）—— 决策信息密度显著提升。
- ✅ `handbook:33-34` 补 Claude Code 运行形态（CLI/桌面/web/IDE）+ `/fast` + effort xhigh/max/low 说明，对标本会话环境上下文，实用。
- ✅ `cto-init.md:26` minimal 8 命令列表 `vibe-check→audit` 修正 —— 与 v3.14 命令合并（vibe-check+harness-audit→`audit`）保持一致，避免分发指向已合并命令。

### 7️⃣ 功能完整性 🟢

- ✅ **sweep 无残留**（已 grep 全仓实测）：除合法的 PocketOS 历史注释 + eval/STATUS 描述性文本外，无活跃路由文档残留 Opus 4.6。
- ✅ 多 agent 审计抓到的 dash-form 漏网（`cto-replay.md:44` `opus-4-7→4-8`、`handbook:3658` jsonl 示例）已补，符合 commit 自述。
- ✅ §32.2 双签示例（`handbook:2542` Opus 4.8↔gpt-5.5）、§34.2 三 Agent Harness（`handbook:2666/2670`）、§38-40 agent-loop 示例均同步更新 —— 覆盖面完整。

### 8️⃣ UX 可用性 🟢

- ✅ `STATUS.md` 质量评分从散列表改为**版本×Health×ARE 表格**，并对未重跑评分的 v3.11+ 诚实标 `TBD`（「不臆造分数」）—— 符合铁律 #9（不假完成）精神。
- ✅ STATUS 头部四段补齐 v3.13→v3.15 历史，并显式标注「下半部多数仍停在 v3.4 语境」的 pre-existing 债 —— 透明，不掩盖。
- ✅ `STATUS.md:36` 修正 draft 误称 de7da50 已在 main（实为本分支 PR #31 待 merge）—— 准确反映分支状态。

---

## 下一步（我继续做）

本次仅评审不改文件（按要求）。两处 🟡 是可选硬化项，**不阻塞当前 PASS**。若你要我把它们落地：
1. `053:38` 转义 `'Opus 4\.8'` 统一风格；
2. check#2 加注释声明 handbook「零 4.6 字样」是有意紧约束。

这属于 eval 自身健壮性微调（铁律 #12 范畴），改完需重跑 `scripts/run-evals.sh` 确认仍 31 PASS。要做就说一声。
```

---

## 2026-06-17T00:28:19+09:00 — Review for ba74d2a
**Reviewer**: claude-fallback-opus | **Mode**: claude-only

```markdown
八维评审完成。已跑 `git show` 看全 diff + 复跑 eval 054 扫描逻辑验证零残留。

---

# 八维评审报告 — commit `ba74d2a`

**主题**：v3.14 命令合并后，清理 agent/skill/command/output-style + handbook 正文里指向已删命令的功能性 live 引用
**规模**：7 文件，+68/-14（纯文档 + 1 个新 eval），无代码/无 forbidden 路径
**总评**：🟢 **可合入**。零 🔴/🟠，2 个 🟡 加固建议。

## 📊 改动分类

| 文件 | 改动 | 性质 |
|---|---|---|
| `.agents/skills/codex-bridge/SKILL.md:4,16,38` | `/cto-cross-review`→`/cto-review --cross` ×3 | live ref 修正 |
| `.claude/agents/eval-runner.md:93` | `/cto-relink-all --upgrade`→`/cto-link --all --upgrade` | live ref 修正 |
| `.claude/commands/cto-link.md:68` | `/cto-relink-all`→`/cto-link --all` | live ref 修正 |
| `.claude/output-styles/cto.md:94` | `/cto-vibe-check`→`/cto-audit` | live ref 修正 |
| `playbook/handbook.md`(×7) | §29.8/§41/§48.5 live ref 对齐 | live ref 修正 |
| `evals/golden-trajectories/054-*.yaml` | 新增 eval | 铁律 #12 门禁 |
| `docs/ai-cto/COUNTS.md:17` | evals 31→32 | 计数同步 |

---

## 1️⃣ 架构 — 🟢 OK

- 🟢 与 v3.14 命令合并方向一致（`docs/ai-cto/COUNTS.md` / handbook §49 的 23→18 收敛）。所有替换严格遵循合并映射：relink-all→link --all、cross-review→review --cross、vibe-check→audit、refresh→resume --refresh。
- 🟢 **职责分层清晰**：本次只动「配置正文 live 引用」，明确把 CTO-PLAYBOOK.md catalog 表行（eval 050 / PR #33）与 docs/ai-cto 历史记录（changelog/proposal/review-queue）排除在外 —— eval 054 的 sota_reference 第 2 条显式声明「不同模式，互不重叠」，避免了两个 eval 重复扫同一区域的耦合。

## 2️⃣ 代码质量 — 🟢 OK（eval 脚本质量高）

- 🟢 `054-*.yaml:39-53` 的 `verification_command` 采用**正向+反向双断言**（check #1 既验 `/cto-review --cross` 存在、又验 `/cto-cross-review` 不存在），比单向断言更严，能同时抓「漏改」和「改错」。
- 🟢 命令重排避免自匹配：DEL 正则用 `cto-cross-review`（连字符序），而新命令是 `/cto-review --cross`（空格分隔），不会自我误命中。设计审慎。
- 🟡 **Minor**（`054-*.yaml:50`）：check #3 白名单用**整行排除** `grep -vE '原 |合并自|已合并|的区别'`。我复跑确认当前 11 处残留命中全部命中白名单（`.claude/commands/cto-{audit,link,review,resume,init}.md` 的 merge-note + `harness-auditor.md:86`/`vibe-checker.md:96` 的「的区别」）。但整行白名单意味着：若未来同一行**既有 merge-note 又混入一个真 dangling live ref**，会被整行放过。属于已知 trade-off，当前内容安全，记一笔即可。

## 3️⃣ 性能 — 🟢 OK

- 🟢 纯文档 + grep 类 eval，无运行时影响。`verification_command` 三次 grep 扫描范围有限，CI 开销可忽略。

## 4️⃣ 安全 — 🟢 OK（铁律 #12 满足，关键点）

- 🟢 **铁律 #12 达标**：本 commit 改了 `.claude/agents/`、`.agents/skills/`、`.claude/commands/`、`.claude/output-styles/`、`playbook/handbook.md` —— 全部属于 eval-gate 触发文件，且**配套新增 eval 054** 覆盖该改动。未绕过 eval 门禁。
- 🟢 无 forbidden 路径（auth/payment/secrets/migration/crypto/infra/.github）改动，铁律 #13 不触发。
- 🟢 无模型名编造（铁律 #3），无删除重建（铁律 #11，仅字符串替换）。

## 5️⃣ 测试 — 🟢 OK

- 🟢 新 eval 含 `id/description/priority/input/expected_steps/forbidden_actions/acceptance_criteria/verification_command`，字段齐全，符合 `eval-gate.md` 必填项。
- 🟢 **我已复跑 check #2/#3 扫描逻辑**：handbook 正文 0 残留、配置正文剔除白名单后 0 残留 —— 与 commit 声明的 `32 PASS/0 FAIL/0 SKIP` 一致。
- 🟡 **Minor**（`054-*.yaml:46,49`）：扫描正则 `/?(${DEL})` 把斜杠设为可选，会同时命中**无斜杠的裸词**（如散文里的 "cross-review"/"refresh"）。当前无误报，但 `refresh` 是高频英文词，未来 handbook 若出现 "refresh the cache" 类正常散文会被误判 FAIL。建议后续把裸词风险高的词收紧为必带斜杠（`/(${DEL})`），或对 `refresh` 单列。不阻塞本次合入。

## 6️⃣ DX — 🟢 OK

- 🟢 修复**直接面向开发者体验**：`cto-link.md:68` 的迁移引导、`eval-runner.md:93` 的升级提示原本会指引用户去敲已删命令，现已指向真实可用命令。
- 🟢 commit message 质量高：明确列出「改了什么 / 保持不动什么 / 为何与 PR #33 区分」，可追溯性强。

## 7️⃣ 功能完整性 — 🟢 OK

- 🟢 覆盖完整：codex-bridge SKILL 的 description/触发链路图/新旧对比表三处全部同步（`:4/:16/:38`），未遗漏任一可见位置。
- 🟢 合法历史正确保留：merge-note（`原 /合并自 /已合并入`）与 sub-agent「与 /cto-xxx 的区别」说明未被误删 —— 这些是能力可追溯性所需，删了反而丢上下文。forbidden_actions 第 1 条专门防此回归。

## 8️⃣ UX 可用性 — 🟢 OK

- 🟢 终端用户不再被文档误导去运行已删命令（描述里的「会误导用户去跑已删命令」正是修复动机），消除「照文档跑却命令不存在」的挫败路径。

---

## 下一步（我继续做）

| 项 | 动作 |
|---|---|
| 🟡 eval 054 裸词误报风险 | 下个文档维护轮把 `verification_command` 的 `/?(${DEL})` 对 `refresh` 收紧为必带斜杠，防未来散文 FP。**这是建议，不阻塞本 commit。** |
| 🟢 当前 commit | 八维全绿，符合铁律 #3/#11/#12/#13，建议正常进 §48 跨模型 review 流程后合入 |

📌 本次仅评审，未改动任何文件。
```

---

## 2026-07-02T21:59:39+09:00 — Review for ba74d2a
**Reviewer**: claude-fallback-opus | **Mode**: claude-only

```markdown
八维评审完成。已核验：残留清零、eval 真跑、白名单行为正确。以下为报告。

---

# 📊 八维评审报告 — commit `ba74d2a`

**主题**：v3.14 命令合并后，退役配置正文 + handbook 里指向已删命令的功能性 live 引用
**性质**：纯文档/配置引用对齐 + 新增 1 条 eval 守护
**改动规模**：7 文件，+68/−14；无代码逻辑改动

**一句话结论**：🟢 **高质量文档卫生 PR，可合并**。改动精准、正反双向断言、白名单设计合理，且按铁律 #12 自带 eval 守护防复发。仅 1 个 🟡 Minor（白名单整行掩码的理论风险）+ 1 个 🟡 观察项。

---

## 逐维评分

| 维度 | 结论 | 说明 |
|---|---|---|
| 架构 | 🟢 OK | 无架构影响。符合宪法「文档腐烂做成可执行 guard」思路（eval 054 补位 eval 050，两者扫描范围显式不重叠）|
| 代码质量 | 🟢 OK | 替换精准，命令名均为真实存在命令（铁律 #3 ✅）；verification_command 正反双向断言 |
| 性能 | 🟢 OK | 纯 grep 类 eval，无性能影响 |
| 安全 | 🟢 OK | 无 forbidden 路径触及；未改断言迁就实现（铁律 #14 无关）|
| 测试 | 🟢 OK | 铁律 #12 满足 — 配套 eval 054 且含真 `verification_command`；实测残留清零 |
| DX | 🟢 OK | 消除「照文档跑已删命令」的误导，直接改善用户体验 |
| 功能完整性 | 🟢 OK | 4 明确位置 + handbook 7 处 live 引用全部对齐；merge-note/区别说明正确保留 |
| UX | 🟢 OK | 迁移引导/对比表/决策矩阵均指向现命令，用户不再走死路 |

---

## 关键发现（带行号）

### 🟢 正确的改动

| 位置 | 改动 | 评价 |
|---|---|---|
| `codex-bridge/SKILL.md:3,16,38` | `/cto-cross-review` → `/cto-review --cross` ×3（description + 触发链路图 + 对比表）| ✅ description 是 skill 被 LLM 选用时读的元数据，此处修对最关键 |
| `eval-runner.md:93` | `/cto-relink-all --upgrade` → `/cto-link --all --upgrade` | ✅ |
| `cto-link.md:68` | 迁移引导 `/cto-relink-all` → `/cto-link --all` | ✅ 自指命令内引用旧名，修对 |
| `output-styles/cto.md:94` | 关键词示例 `/cto-vibe-check` → `/cto-audit` | ✅ |
| `handbook.md:2353,2382,3210,3221,3253,4059` | 7 处功能性 live 引用（setup 步骤/迁移代码块/hook 替代说明/决策矩阵/UX 对比表/codex 配额恢复指引）| ✅ 全部核验对齐现命令 |

### 🟢 正确的「保持不动」

`cto-audit.md:39` / `cto-link.md:187` / `cto-review.md:46` / `cto-resume.md:41` 的 `原 /cto-xxx 已合并`，以及 `vibe-checker.md:96` / `harness-auditor.md:86` 的「与 /cto-xxx 的区别」——均为合法历史/能力说明，**正确保留**（删了丢可追溯性，违反铁律 #11 精神）。

### 独立验证结果（read-only）

```
配置正文残留（去白名单）：  (无残留) ✅
handbook 正文残留：         (无残留) ✅
eval 文件数：              32 ✅（与 COUNTS.md 一致）
054 verification_command： 存在 ✅
scripts/run-evals.sh：     存在 ✅
```

---

## 🟡 待改进项（Minor，不阻塞）

**🟡 M1 — 白名单整行掩码的理论盲区**
`054.yaml:52` 的 stray 检查用 `grep -vE '原 |合并自|已合并|的区别'` **按整行**过滤。若未来某行**同时**包含白名单词 + 一个真正 dangling 的功能性 live 引用，会被静默放行。当前无此情况（已实测 6 条命中行全是纯 merge-note/区别说明），但白名单粒度是「行」而非「引用」，属脆弱设计。
→ 建议（下一次触碰 eval 054 时）：白名单收窄为「行首 `>` 引用块 或 `原 \`/cto-` 紧邻模式」，降低误放行面。

**🟡 M2 — eval 扫描范围不含 worktree（当前正确，需留意）**
`.claude/worktrees/sweet-kare/` 内仍有旧命令引用（grep 命中 8 行），但 eval 054 的 stray 检查**未纳入** worktree 路径 → 无误报，符合预期（worktree 是临时副本）。📌 备注：若 worktree 未来被误提交入 git，扫描范围需重新评估。二者当前不冲突。

---

## 下一步（我继续做）

此 commit 无需修复即可合并。当前分支 `fix/v3.14-live-cmd-refs` 工作区有 `CODEX-REVIEW-LOG.md` / `REVIEW-QUEUE.md` 两处未提交改动（codex 跨模型审产物）——按宪法「架构宪法 #3 任何代码改动 PR 必走 §48 跨模型审」，建议此 PR 合并前确认 codex 审已落 REVIEW-QUEUE。需要我 `git diff` 看这两个文件的未提交内容、或跑 `/cto-review --cross` 对本 commit 补跨模型审，说一声即可。
```

---

## 2026-06-16T23:31:28+09:00 — Review for 46764f0
**Reviewer**: claude-fallback-opus | **Mode**: claude-only

```markdown
## 八维审核报告 — commit `46764f0`

> `docs(v3.14): retire dangling /cto-refresh xrefs after command merge`
> 3 files, +2 / -4, 纯文档清理

---

### 1. 架构 ✅

纯交叉引用清理，无架构影响。命令合并 `/cto-refresh` → `/cto-resume --refresh` 的设计决策在 PR #29 已完成，此 commit 只扫残留。

### 2. 代码质量 ✅

- **cto-models.md:25** — 删除指向已删文件的 sync target（第 7 项），正确。剩余 6 项编号连续无断裂。
- **CTO-PLAYBOOK.md:96-100** — 两行合一，`--refresh` 说明内联，格式与 CLAUDE.md:108 对齐。
- **handbook.md:2350** — `/cto-refresh` → `/cto-resume --refresh`，上下文语义准确。

### 3. 性能 ✅

纯 markdown，无运行时影响。

### 4. 安全 ✅

不涉及 forbidden 路径 / 红线文件。

### 5. 测试 ✅

commit message 提到 eval `050-command-merge` 保持 5/0 green。文档改动不影响可执行逻辑。

### 6. DX（开发者体验） ✅

消除了 3 处 dangling reference，减少新贡献者跟着过期文档走弯路的风险。

### 7. 功能完整性 ⚠️

commit message 自述 **scope 有限**，以下残留显式标记为 follow-up：

| 残留 | 位置 | 风险 |
|---|---|---|
| `cto-relink-all` 行仍在 CTO-PLAYBOOK.md:97 | diff 可见 | v3.14 已合并为 `/cto-link --all`，此行是下一个 dangling ref |
| "15 个" 命令计数过时 | CTO-PLAYBOOK.md（commit message 提到） | 读者看到错误总数 |
| 其余 4 条已合并命令 | CTO-PLAYBOOK.md 命令表 | 同上 |

**判定 ⚠️**：scope 控制合理（单 commit 只修 `/cto-refresh` 残留），但 follow-up 应尽快闭环，否则 CTO-PLAYBOOK.md 命令表处于半更新状态。

### 8. UX ✅

面向开发者的内部文档，用户无感知。

---

### 总结

| 维度 | 评级 |
|---|---|
| 架构 | ✅ |
| 代码质量 | ✅ |
| 性能 | ✅ |
| 安全 | ✅ |
| 测试 | ✅ |
| DX | ✅ |
| 功能完整性 | ⚠️ CTO-PLAYBOOK.md 命令表仍有 4+ 处 stale ref（已标 follow-up） |
| UX | ✅ |

**结论**：🟢 该 commit 本身干净、scope 明确、commit message 优秀（列出每处改动 + 理由 + eval 状态 + follow-up 声明）。唯一 action item 是尽快处理 CTO-PLAYBOOK.md 剩余的命令表对齐。
```

---

## 2026-07-03T22:32:11+09:00 — Review for 3321496
**Reviewer**: claude-fallback-opus | **Mode**: claude-only

```markdown
# 八维审核报告 — commit `3321496`

**结论**：🟢 修复正确、方向对（#8 威胁模型是"保护本仓工作树"，仓库外文件放行是对的），engine+legacy 双路径 + eval 062 + 2 单测覆盖到位。**1 个 🟠**（Windows 大小写敏感前缀比较，属该 commit 自己声称要规避的 footgun 类）+ 3 个 🟡。无 🔴。

---

## 📊 改动概览

| 文件 | 改动 | 性质 |
|---|---|---|
| `engine/guards.mjs:291-298,306-310` | 新增 `fileInsideWorktree()` + branchGuard 内调用 | 核心逻辑 |
| `branch-guard.sh:31-48` | legacy 前缀判断（case-glob） | 平价回退 |
| `guard.test.mjs:119-131` | +2 单测（仓库外放行/仓库内绝对仍拦） | 测试 |
| `evals/.../062-*.yaml` | 新 eval（双路径 parity 矩阵，8 checks） | eval gate |
| `COUNTS.md` / `HARNESS-CHANGELOG.md` | 39→40 + 变更档案 | 文档 SSOT |

---

## 逐维评审

### 1. 架构 🟢
- ✅ 正确的语义修正：#8 威胁模型是"保护本仓 main 工作树"，仓库外文件（`~/.claude/.../memory/*.md`）不在其内，放行是**架构一致**的。
- ✅ engine（`guards.mjs`）+ legacy（`.sh`）双路径同步改，未破坏 v4.0b 建立的 shim/fallback 对称结构。
- ✅ `HARNESS-CHANGELOG.md:16-31` 诚实声明边界（用 cwd 前缀而非 `git rev-parse --show-toplevel`），符合 §37 可追溯 + 铁律 #2。

### 2. 代码质量 🟡
- ✅ `fileInsideWorktree` 逻辑清晰：相对路径恒 in-tree（保守），绝对路径按前缀。`normFile === normCwd || startsWith(normCwd + '/')` 的 **`+ '/'` 正确防住兄弟目录误判**（`ai-playbook` 不会命中 `ai-playbook-other/`）。
- 🟡 **engine 与 legacy 并非严格"字节等价"**（commit/注释 `guards.mjs:290` 反复声称）：engine 用 JS `startsWith`（字面量匹配），legacy 用 `case "$_NF" in "$_NC"|"$_NC"/*)`（**glob 模式匹配**）。若 cwd/路径含 glob 元字符（`[` `?` `*`），两路径决策会分叉。实际 worktree 名 `hopeful-sammet-a1f936` 无此字符，不触发 —— 但"字节等价"是**过强断言**，建议注释降级为"常规路径下等价"。
- 🟡 `branch-guard.sh:34-35` 变量名 `_NF`/`_NC` 隐晦，靠注释救场；legacy 冻结代码可接受。

### 3. 性能 🟢
- ✅ 纯字符串操作（replaceAll + startsWith / case glob），PreToolUse 热路径开销可忽略。无新增 subprocess（刻意不调 `git rev-parse`，反而更快）。

### 4. 安全 🟠
- 🟠 **Windows 大小写敏感前缀比较 — guard 削弱方向**（`guards.mjs:297` / `branch-guard.sh:40-41`）：Windows 文件系统大小写不敏感，但 `startsWith` / case-glob **大小写敏感**。若 Claude Code 对 `cwd` 与 `file_path` 发出大小写不同的盘符/路径（如 `C:/projects/...` vs `c:/projects/...`），`fileInsideWorktree` 返回 `false` → 仓库内文件被判**仓库外 → 放行 → 绕过铁律 #8**。
  - **失败方向是"欠拦"（under-block）** = 安全 guard 被弱化，比"过拦"更该关注。
  - **实际概率低**：Claude Code 会话 `cwd` 与 `file_path` 通常同源同 casing。但**这恰是 3 条 learned rule（`2026-05-12-windows-path-pattern-generalization` 等）反复记录的 Windows 路径 footgun 类**，而 commit 正是以"规避 Windows normalize 回归"为由才没用 `git rev-parse`。建议：前缀比较前对盘符/路径做 `toLowerCase()`（Windows only），或在 eval 062 加一条大小写错配 case 明确其行为。
- ✅ opt-out（`CTO_MAIN_EDIT_ALLOWED=1`）语义不受影响，仓库内文件仍受 #8 保护（单测 `guard.test.mjs:126-130` + eval 覆盖）。
- ✅ `..` 逃逸路径（`C:/repo/../outside/x`）会命中前缀被**拦**（过拦、安全方向），非漏洞。

### 5. 测试 🟢（有小缺口）
- ✅ eval 062 parity 矩阵扎实：仓库内相对/绝对 → exit 2，仓库外绝对 → exit 0，engine+legacy 双跑，opt-out，feature 分支回归，共 8 checks（`062-*.yaml:35-48`）。含 `verification_command` 真执行 + `cygpath -m` 处理 MSYS 私有映射 —— 细节到位。
- ✅ 铁律 #12 满足：配置类改动配 golden trajectory + regression 全绿（39→40 PASS）。
- 🟡 **测试缺口**：未覆盖第 4 维的大小写错配、cwd 尾斜杠（`normCwd + '/'` 变双斜杠）、glob 元字符路径。这三者正是 engine/legacy 可能分叉之处。
- 📌 commit 声明 `045 skill-drift` 是既有无关 FAIL —— 需确认已有 issue 追踪，勿被本 commit 掩盖。

### 6. DX 🟢
- ✅ 注释密度高、双语清晰，changelog "边界（诚实声明）"段直接写明 trade-off（cwd 子目录时同仓文件放行 + 为何实际不触发）。符合 CTO 手册"诚实计数/诚实边界"文化。

### 7. 功能完整性 🟢
- ✅ 精确修复 2026-07-02 实测误拦（禁止删重建，铁律 #11 遵守），保留仓库内拦截 + opt-out + feature 分支放行。**闭环完整**。

### 8. UX（guard 反馈）🟢
- ✅ 放行走 `audit_log "main-edit-outside-repo-allowed"`，可追溯（合规宪法第 3 条）。拦截信息文案不变，仍指向 `git checkout -b` + opt-out 说明。

---

## 决策与下一步

| 项 | 级别 | 行动 |
|---|---|---|
| Windows 大小写前缀比较 | 🟠 Major | 建议后续小补丁：前缀比较对盘符/路径 `toLowerCase()`（Win），或至少在 eval 062 加大小写错配 case 固化当前行为 |
| "字节等价"断言过强 | 🟡 Minor | 注释降级为"常规路径等价"，或对 glob 元字符加显式说明 |
| 测试缺口（casing/尾斜杠/glob 字符）| 🟡 Minor | 补 parity 边界 case |
| `045 skill-drift` 既有 FAIL | 📌 | 确认有独立 tracking，非本 commit 引入 |

**本 commit 可合入**（🟠 为低概率、需后续增强项，非阻断）。我下一步：如需，可直接起草上述大小写归一化的补丁 + eval 062 增量 case（走新分支，不动 main）。

> 📌 全程只读审阅，未修改任何文件。
```

---

## 2026-07-03T22:30:54+09:00 — Review for 3321496
**Reviewer**: claude-fallback-opus | **Mode**: claude-only

```markdown
# 八维评审报告 — commit `3321496`

**结论**：🟢 一个定位精准的 false-positive 修复（铁律 #8 边界收窄），engine + legacy 双路径改动对称、测试与 eval 配套齐全、变更文档诚实声明了 trade-off。**可合并**。仅 1 项 ⚠️ Windows 大小写边界值得后续补测，无 🔴。

## 改动概览

| 文件 | 改动 | 性质 |
|---|---|---|
| `engine/guards.mjs` | +`fileInsideWorktree()` + branchGuard 内调用（L288-310）| 核心逻辑 |
| `branch-guard.sh` | legacy 回退镜像同一前缀判断（L31-49）| 平价 |
| `guard.test.mjs` | +2 单测（L119-131）| 测试 |
| `evals/…/062-*.yaml` | 新增 parity 矩阵 eval | eval gate |
| `COUNTS.md` / `HARNESS-CHANGELOG.md` | 39→40 + 演进档 | SSOT/文档 |

## 逐维评分

### 1. 架构 ✅
- 威胁模型收窄正确：铁律 #8 目的是"保护**本仓** main"，仓库外文件（`~/.claude/.../memory/*.md`）不在其边界内，原实现无条件拦所有 Edit/Write 是过宽（`guards.mjs:296-299`）。
- ✅ 有意识规避 `git rev-parse --show-toplevel`，改用 cwd 前缀（`guards.mjs:288` 注释 + changelog「边界诚实声明」），直接对齐 3 条 Windows-path learned rule 的教训 — 架构决策有据可溯。
- 🟢 engine 主 + legacy 回退双实现由 `branch-guard.sh:5` 的 `exec node` 分派，改动同时覆盖两路径，未留红线真空。

### 2. 代码质量 ✅
- `fileInsideWorktree()`（`guards.mjs:291-297`）纯函数、单一职责、注释说明与 legacy 字节等价意图。
- ✅ 前缀判断用 `normFile === normCwd || normFile.startsWith(normCwd + '/')` — `+ '/'` 正确防止 `/repo` 误配 `/repo-other`（经典前缀陷阱已规避）。
- ✅ legacy `case "$_NF" in "$_NC"|"$_NC"/*)`（`branch-guard.sh:41-43`）与 engine 语义一致，both 先 `//\\//` 归一反斜杠。
- 🟡 engine 绝对路径正则 `/^\/|^[A-Za-z]:\//` vs legacy glob `/*|[A-Za-z]:/*` — 语义等价但表达形式不同，"字节等价"是行为等价而非字面等价，注释措辞略夸张（Minor，不影响正确性）。

### 3. 性能 ✅
- 两次字符串归一 + 一次 `startsWith`，O(路径长度)，PreToolUse 热路径无实质开销。🟢 无问题。

### 4. 安全 ⚠️
这是**放宽** guard 的改动，需重点看是否开了绕过口子：
- ✅ 相对路径**恒判为仓库内 → 仍 block**（`guards.mjs:295` / `.sh:_INSIDE=1` 默认），保守方向正确，不给"用相对路径绕过"留口。
- ✅ 仓库内绝对路径仍 block（单测 L127-131 覆盖），`CTO_MAIN_EDIT_ALLOWED=1` 紧急 opt-out 不受影响（eval 062 `acceptance_criteria` 第 3 条覆盖）。
- ⚠️ **Windows 大小写边界（唯一实质风险）**：Windows 路径大小写不敏感。若 Claude Code 传入 `cwd=C:/Projects/ai-playbook` 而 `file_path=c:/projects/ai-playbook/docs/x.md`（盘符/路径大小写不一致），`startsWith` 会**判为仓库外 → 误放行**一个真正的仓库内文件 — 是 false negative（削弱保护），比原 false positive 危害方向更敏感。建议后续在 Windows 路径场景归一大小写或补一条大小写不一致的单测。
- 🟡 relative traversal（`../../outside`）相对 cwd 实际逃逸仓库却仍被判"仓库内 → block" — 是 false-positive 残留，安全上无害（偏保守），仅遗留小瑕疵。

### 5. 测试 ✅
- ✅ 单测 +2：仓库外放行（L119-124）/ 仓库内绝对仍拦（L127-131），36→38 全绿。
- ✅ eval 062 是真执行 `verification_command`，含 **engine + legacy 双跑循环**（`for E in "" "CTO_GUARD_ENGINE=legacy"`）+ opt-out + feature 分支回归，expect 8/0 — parity 门有实测支撑，符合铁律 #12。
- ✅ `forbidden_actions` 显式列出"engine 修了 legacy 没修"的平价破裂场景，防回归意识到位。
- 🟡 未覆盖：上述 Windows 大小写边界、trailing-slash cwd（`normCwd + '/'` → `//`）、relative `../` 逃逸 — 三个 edge case 无对应 case（Minor）。

### 6. DX ✅
- ✅ commit message + HARNESS-CHANGELOG「边界（诚实声明）」段清楚写明 cwd-prefix vs `--show-toplevel` 的 trade-off 与"cwd 恒为项目根故实际不触发"，接手者无需读代码即懂取舍。审计事件名 `main-edit-outside-repo-allowed` 语义自解释。

### 7. 功能完整性 ✅
- ✅ 直接修复 2026-07-02 实测的 `~/.claude/.../memory/*.md` 误拦，且仓库内拦截行为不变（changelog「影响范围」明确）。非假完成 — 有真执行 eval 佐证（铁律 #9 满足）。

### 8. UX（拦截提示体验）✅
- 🟢 放行走 audit_log 静默、拦截保留原 `block_with_reason` 铁律 #8 提示文案（`.sh:56+`），交互体验一致，无退化。

## SSOT 一致性 ✅
`COUNTS.md` evals 39→40、run-evals 描述、eval 文件编号 062、changelog 版本 v4.0e 四处自洽对齐。🟢

## 下一步（我继续做）
1. 若你要收敛 ⚠️ Windows 大小写风险 → 我可在 `fileInsideWorktree()` 加一条"Windows 时 `toLowerCase()` 比较"并补 1 条单测 + eval 062 追加大小写场景（改动需配 eval，符合 #12）。
2. 否则此 commit 维持现状即可合并 — 它本身已是合规的 harness 修复。

📌 本次仅评审，未改任何文件。
```

---

## 2026-07-04T12:53:21+09:00 — Review for a41a88e
**Reviewer**: claude-fallback-opus | **Mode**: claude-only

```markdown
# 八维评审报告 — commit `a41a88e`

**结论**：🟢 整体高质量的安全修复，engine/legacy 双实现 parity 严谨、注释与 changelog 诚实可追溯。**无 Critical**。1 个 🟠 隐含假设（cwd 必须是绝对路径，否则漏拦方向）、2 个 🟡（测试静默跳过、内部路径归一化边界）值得记录。核心修复本身（cdup 上爬替代 show-toplevel）方向正确，从构造上消除 symlink 别名漏拦。

**改动范围**：`lib.mjs` `gitToplevel→gitCdup` · `guards.mjs` `fileInsideWorktree` · `branch-guard.sh` 回退实现 · +1 单测 +Win 断言 · 3 份 doc。

---

## 📊 逐维评审

### 1. 架构 🟢
| 项 | 评价 |
|---|---|
| ✅ 路径空间统一 | `guards.mjs:303-309` 全程停留 cwd 字符串空间，与 `file_path` 同空间 → 从**构造上**消除 real/alias 不匹配，而非事后 realpath 修补。这是比"归一化两边"更本质的设计 |
| ✅ 规避已知脆弱性 | 主动避开 realpath 跨平台归一（呼应 3 条 learned rule：`2026-05-12-windows-path-pattern-generalization` 等），设计决策与仓库历史教训一致 |
| ✅ 双实现 parity | engine `levels` 计数上爬（`guards.mjs:307-308`）与 legacy `while ../` 上爬（`branch-guard.sh:56-62`）算法等价，注释显式声明 parity |

### 2. 代码质量 🟠
- ✅ `guards.mjs:307` `cdup.split('/').filter(s => s === '..')` 计数干净；bash `${_ROOT%/*}` 逐段剥离等价，已验证 `../../`（trailing slash）两侧都得 2 层。
- 🟠 **隐含假设未防御**（`guards.mjs:304`）：`root` 从 `ctx.cwd` **字符串**派生而非 git 输出。若 `ctx.cwd` 为相对路径 / `'.'` / 空，上爬后 `root` 无法还原为绝对路径 → 与绝对 `file_path` 前缀不匹配 → `fileInsideWorktree` 返回 false → **保护分支上放行（漏拦方向）**。旧 `gitToplevel` 版本因 git 在该目录实跑仍能拿到绝对根，无此问题。
  - 现实中 Claude Code 恒传绝对 cwd，故不触发；但这是**新引入的正确性依赖**，且失败方向是 false-negative（与本次修复目标相反）。建议加一行断言/兜底：`root` 非绝对时回退保守 block，或至少注释声明"依赖 cwd 为绝对路径"。bash 侧 `branch-guard.sh:55` `_ROOT="${HOOK_CWD:-.}"` 同理，`.` 兜底 `${_ROOT%/*}` 恒为 `.` → 同漏拦。
- 🟡 `guards.mjs:308` `root.replace(/\/[^/]+$/, '')` 对含 `/./` 或 `//` 的 cwd 会误剥段。低风险（git cdup 只产 `../`，cwd 通常规整），可忽略。

### 3. 性能 🟢
- ✅ `--show-cdup` 替换 `--show-toplevel`，**子进程数净零增**（仍 1 次 `spawnSync`）。上爬为纯字符串循环，O(depth)。无性能回归。

### 4. 安全 🟢（本 commit 的核心目的）
| 项 | 评价 |
|---|---|
| ✅ 修复真 false-negative | symlink/junction 别名（macOS `/tmp`→`/private/tmp`、Win junction）此前在保护分支上漏拦仓库内文件，属真安全弱点，现修复 |
| ✅ 前缀匹配严谨 | `guards.mjs:312` `f === base || f.startsWith(base + '/')` 带 `/` 边界 → 避免 `/repo` 误匹配 `/repofoo`。bash `case "$_CF" in "$_CB"\|"$_CB"/*)` 同款正确 |
| ✅ fail-safe 方向 | `gitCdup` 失败返回 `null`（`lib.mjs:191`），engine `if (cdup)` 跳过上爬 → root=cwd，与旧"回退 cwd 保守"一致 |
| 🟠 见 §2 | cwd 相对/缺失时漏拦方向，是安全维度需复核的唯一点 |

### 5. 测试 🟡
- ✅ `guard.test.mjs:155-169` 新增 symlink 别名测，Win junction 免管理员优先、失败降级 dir symlink，断言 `status === 2`（仍拦）。
- ✅ eval 062 Windows 大小写断言 uname-gated（`062-...yaml:61-72`），Linux 明示跳过并调整期望计数 12/14 — 无静默虚报。
- 🟡 **测试静默跳过**（`guard.test.mjs:157` `catch { return; }`）：junction+dir symlink 都失败（无权限环境）时直接 `return`，**不留 skip 标记也不 fail** → 该场景 0 断言却计为绿。呼应 learned rule `2026-05-20`/silent-cap 精神："无声跳过 = 假装覆盖"。commit body 声称"真机实跑未跳过"可信，但 CI 无权限机器上会静默失覆盖。建议 `t.skip()` 或输出 `[skip] symlink 权限不足` 标记。
- 🟢 全套 40/40 eval + 42 单测，声称真机实跑，可信。

### 6. DX 🟢
- ✅ 注释密度与信息量高：`guards.mjs:288-294`、`lib.mjs:182-186` 逐条标注 Major-1/Major-2/round-3 各自解决什么，未来维护者可直接读懂三轮迭代的 why。
- ✅ 命名 `gitToplevel→gitCdup` 语义准确（返回的确是 cdup 串非根路径），注释声明"根目录=''，否则 `../` 重复"。

### 7. 功能完整性 🟢
- ✅ 三类 false-negative（cwd 子目录 / Win 大小写盘符 / symlink 别名）全覆盖，回归项（feature 分支放行、opt-out 仓库内放行）保留（`062-...yaml`）。仓库内拦截行为不变。

### 8. UX（面向 agent 的拦截体验）🟢
- ✅ `branch-guard.sh:70-73` 仓库外放行 + `audit_log main-edit-outside-repo-allowed`，行为可审计。拦截文案（`:82+`）与 audit 分支（allowed/emergency/blocked）分层清晰，agent 收到的信号明确。

---

## 下一步（我继续做）

1. 🟠 **建议补一条防御**：`fileInsideWorktree` 与 bash 侧对"cwd 非绝对/缺失"时改为**保守 block**（而非当前漏拦方向），或显式注释声明该前置契约。这是本 commit 唯一实质安全缺口 — 我可起草 `guards.mjs`/`branch-guard.sh` 的 3 行加固 + eval 062 补一条 relative-cwd 断言，走 §35 eval gate（触及 hooks，铁律 #12）。
2. 🟡 `guard.test.mjs` symlink 测的静默 `return` 改 `[skip]` 标记，避免无权限机假绿。

要我直接落 (1)+(2) 的加固补丁（含 eval case）吗？触及 `.claude/hooks/`，需配套 eval + §48 跨模型复审 —— 与本 commit 已建立的三轮 codex 审流程一致。

*（本次仅评审，未改动任何文件。）*
```

---

## 2026-07-04T12:51:16+09:00 — Review for a41a88e
**Reviewer**: claude-fallback-opus | **Mode**: claude-only

```markdown
单测未获批准执行（权限模式拦截），改为纯静态评审 + commit 自述交叉核对。已掌握全部改动，输出报告。

---

# 📋 八维评审报告 — commit `a41a88e`

**标题**：`fix(v4.0e): derive worktree root via git cdup to fix symlink-alias false-negative`
**性质**：branch-guard（铁律 #8）安全 false-negative 修复，§48 codex 跨模型审第 3 轮产物
**改动面**：`branch-guard.sh` / `guards.mjs` / `lib.mjs` / `guard.test.mjs` / eval 062 + 3 个文档

> ⚠️ 触及 `.claude/hooks/` + `CLAUDE.md`-邻近 enforcement 逻辑 → 铁律 #12 eval-gate 适用。已配 eval 062（本 commit 同步更新），符合门禁。

## 一句话结论

🟢 **改动方向正确、逻辑自洽、parity 保持**。用 `--show-cdup` 相对上爬替代 `--show-toplevel`，从**构造上**消除 symlink/junction 别名的 real/alias 路径空间不匹配，且回避了 3 条 learned rule 警告的 realpath 跨平台脆弱性 — 这是比"加 realpath 归一"更稳的解法。无 Critical/Major。存在 2 个 🟡 Minor（测试可能静默跳过、bash/mjs 去尾斜杠语义微差）。

---

## 核心机制验证（铁律 #2 — 基于实际读到的代码）

| 检查项 | 结论 | 证据 |
|---|---|---|
| cdup 上爬是否停留在 cwd 路径空间 | ✅ | `_ROOT` 从 `HOOK_CWD` 派生逐段剥离，全程无 realpath；file_path 也是 cwd 空间 → 别名前缀匹配 |
| canon 是否会抵消别名保留（隐患点） | ✅ 不会 | `_canon`(sh:22-33) / `fsPath`(lib:26-33) / `canonPath` 均为**纯字符串**操作（MSYS→盘符 + 小写 + 去尾斜杠），**不 realpath** |
| bash 与 mjs 上爬计数 parity | ✅ 等价 | sh:57-62 逐 `../` 剥离 vs guards.mjs `cdup.split('/').filter(s=>s==='..').length` — 同 N 层 |
| 空 cdup（仓库根）处理 | ✅ | sh:`_t=""`→不剥离；mjs `if(cdup)` 空串 falsy→不剥离；root=cwd 正确 |
| null cdup（非 git/失败）回退 | ✅ | lib:190 返回 `null` → 调用方回退 cwd（保守，倾向判"仓库内"= 拦，安全侧） |

---

## 八维逐条

### 1. 架构 🟢
- ✅ `lib.mjs:182` `gitToplevel → gitCdup` 重命名 + 语义迁移干净，单一职责（只返回 cdup 字符串，上爬逻辑留调用方）。
- ✅ engine / legacy 双实现 parity 显式维护（sh:49 注释 + guards.mjs:290-296 注释互指），符合"零红线真空"冻结约束。
- ✅ 解法选型正确：cdup 从**构造上**消除 real/alias 不匹配，优于 realpath 归一（后者引入跨平台 footgun，见 3 条 learned rule）。

### 2. 代码质量 🟢
- ✅ `guards.mjs:303-309` 上爬逻辑清晰：`root.replace(/\/[^/]+$/,'')` 逐层，drive-root 处无匹配即停（不会过爬穿透盘符）。
- ✅ `lib.mjs:192-193` 返回契约明确注释（根=`''`，否则 `'../'` 重复，失败=`null`）。
- 🟡 **Minor（parity 微差）**：去尾斜杠 bash `${_ROOT%/}`(sh:55) 只删**一个**尾斜杠，mjs `.replace(/\/+$/,'')`(guards.mjs:302) 删**全部**。正常单尾斜杠输入两侧一致；仅 `cwd` 带 `//` 尾时理论分叉。实际不可达（git 不产双斜杠 cwd），可不改，记录即可。

### 3. 性能 🟢
- ✅ 每次 Edit/Write 命中保护分支才跑 1 次 `git rev-parse --show-cdup`（与原 `--show-toplevel` 同量级 spawn），字符串上爬 O(depth)。无回退。

### 4. 安全 🟢（本 commit 的核心价值）
- ✅ **修复真 false-negative**：`branch-guard.sh:54` / `guards.mjs:305`。原 `--show-toplevel` 在 symlink 别名场景返回 resolved-real 路径，而 cwd/file_path 用别名 → 前缀不匹配 → 保护分支上**漏拦**同仓文件（macOS `/tmp`→`/private/tmp`、Windows junction 可触发）。cdup 上爬彻底消除。
- ✅ 失败侧保守：null cdup → 回退 cwd 前缀判断，倾向"仓库内"= 拦（安全侧 fail-closed）。
- ⚠️ **残留边界（非本 commit 引入，需知悉）**：若 cwd 与 file_path **分属不同路径空间**（一个别名、一个 real），cdup 方案仍会 false-negative。但实务上同一 claude 会话 cwd 与 file_path 出自同一次路径解析 → 空间一致，前提成立。此为 §48 三轮审后的可接受剩余风险，非回归。

### 5. 测试 🟡
- ✅ `guard.test.mjs:155-169` 新增 symlink 别名用例，构造 junction 子目录 + 别名 file，断言 `exit 2`（仍拦）。方向正确，直击本 commit 修复点。
- ✅ eval 062 新增 Windows 盘符小写断言（uname-gated，Linux 12/Windows 14），gating 合理（Linux FS 大小写敏感故跳过）。
- 🟡 **Minor（测试可能静默跳过）**：`guard.test.mjs:157` `catch { ... catch { return; } }` — 无 junction/symlink 权限的机器上该测试**静默 return（视作 pass）**，不留 skip 标记。commit 声称"junction on Windows 免管理员，ran live→42 green"可信，但 CI/他机上可能**假绿**。建议后续改为显式 `t.skip()` 或计数告警（参考 learned rule 2026-05-12「测试矩阵必须有 Windows case」精神）。**不阻断本 commit**。
- ⚠️ 本次单测未能在此环境独立复跑（权限模式拦截 `node --test`）→ 42 green 依据 commit 自述 + 静态分析，未第三方复验。

### 6. DX 🟢
- ✅ 注释密度与周边一致，中文技术注释解释"为什么用 cdup 不用 toplevel"（sh:48 / lib:183-187），后人可读。
- ✅ HARNESS-CHANGELOG / STATUS 诚实记录三轮 codex 审逐层抓 false-negative，符合铁律 #4（固化教训）。

### 7. 功能完整性 🟢
- ✅ 三类场景全覆盖修复：Major-1（cwd 子目录）+ Major-2（Windows 大小写/盘符）+ round-3（symlink 别名）。
- ✅ 回归保留：非保护分支放行、opt-out `CTO_MAIN_EDIT_ALLOWED=1`、仓库外文件放行 + audit 均未动。

### 8. UX 🟢
- ✅ 拦截提示文案（sh:82-97）未改，铁律 #8 引导路径清晰。别名场景下现能正确拦截 = 用户不会被"以为拦了其实漏了"的假安全感误导。

---

## 决策

| 项 | 判定 |
|---|---|
| Critical/Major | 🟢 无 |
| Minor | 🟡 2（测试静默跳过 · 去尾斜杠 parity 微差）— 均不阻断 |
| 铁律合规 | ✅ #2(实读代码) #4(固化教训) #8(修复本体) #11(精确修复非删重建) #12(配套 eval 062) |
| 建议 | 可 merge。后续 backlog：`guard.test.mjs` symlink 用例改显式 skip-marker，避免无权限机器假绿 |

## 下一步（我继续做）

1. 若需闭环，我可把「symlink 测试静默跳过」这条 🟡 记入 `docs/ai-cto/REVIEW-QUEUE.md` 作为 backlog 条目（不改代码）。
2. 若你要我实跑单测验证 42 green，需放行 `node --test`（当前权限模式拦了）。

> 📌 本轮仅评审输出，未修改任何文件（遵你的约束）。
```

---
