# EVOLUTION PROPOSAL — SOTA Team v2 综合演进提案

> 文件：`docs/ai-cto/EVOLUTION-PROPOSAL-2026-05-30-sota-team-v2.md`

| 项 | 值 |
|---|---|
| **触发** | SOTA Team v2 多智能体综合审计（6 份 SOTA 研究 + 5 份内部审计 lens：架构 / 可靠性 / 冗余-DRY / harness 认知负担 / fit-for-purpose）+ 对抗验证 squad 实地核查 |
| **方法** | 综合决策矩阵（keep / optimize / redo / add / drop）→ 对抗验证（逐条 confirmed / refuted / uncertain + 修正）→ 批次化实施建议 |
| **日期** | 2026-05-30 |
| **范围** | ai-playbook 主仓自身 + 「装进子项目让 AI 自治」分发物 |
| **基准核实** | 已实地核查：`.claude/hooks/*.sh` = **10** 个守护脚本（+ `lib/`）、`.claude/commands/` = **23**、`evals/golden-trajectories/` = **36 yaml**、`scripts/check-counts.sh` **不存在** |

---

## 执行摘要

整体健康度：**架构与安全理念领先 SOTA**（exit-2 硬拦截 + MCP-aware guard + Constitution 锚定 + Bugbot learned-rules + evaluator-grounded 真 eval），但**工程落地**与「安装到子项目让 AI 自治」这一**核心产品目标**之间存在结构性裂缝。三方（6 份研究 + 5 份审计）共同指向三个最重要判断：

1. **安装链断裂是当前唯一真 P0**。`cto-init.md` 只装 7/10 hooks（漏 immutable / destructive / mcp 三个红线 guard），手动安装路径（§29.3）完全不复制 `hooks/` 与 `skills/`，handbook §41.8 权威示例也缺这 3 个 guard，导致任何新项目装出的是「红线层有名无实」的残缺系统，且 `templates/CONSTITUTION` 还在宣称这些保护已生效——**等于对新项目撒谎**。

2. **SSOT 防漂移机制本身在漂移且无 enforcer**。`COUNTS.md` 自称唯一计数源却把 hooks 数写成 **9**（实际 **10**，漏 `mcp-guard.sh`），声称 `check-counts.sh` 是 CI gate 但**该脚本根本不存在**，handbook / README / CLAUDE.md 多处计数全过时。这违反铁律 #2「不编造」。

3. **自治飞轮与 §48 跨模型 autopilot 实际空转**。飞轮 `applied=0` 全 bootstrap；§48 自 2026-05-12 起对全部 v3.10–v3.12 安全改动零审（`BIZ_PATTERN` 把 `.claude/hooks` 判为 non-business 跳过），系统最自豪的两个「自动化」能力恰在最高风险改动上不运行。

**核心战略结论**：这套系统对「ai-playbook 自身研发」是先进的，但作为「装进任意子项目的标准件」**过重**——真正的过度工程不是任何单个组件，而是「**不区分 self vs subproject 就全量分发**」这个策略本身。

> ⚠️ **诚实声明**：本提案中 4 条建议经对抗验证后被 **refuted 或 uncertain**（含引用幻觉、技术前提存疑、事实错误），均在「对抗验证结果」节**显式标注并修正/降级**，不假装没发生。读者请以对抗验证后的修正版为准。

---

## 保留（Keep As-Is）

这些是已对齐 2026 SOTA 的正确决策，**不要改架构**，只修分发与覆盖。

| # | 组件 | 为什么保留 | SOTA 对标 |
|---|---|---|---|
| K1 | **10 个 PreToolUse/Stop bash hooks 的 exit-2 硬拦截架构** | settings.json 已正确接线（Edit\|Write\|MultiEdit→4 file-guard / Bash→2 guard / mcp__.*→mcp-guard），每个走 `common.sh` `block_with_reason` | deterministic-guard-first，对齐 OAP/AGT/Microsoft AGT，比 Cursor/Windsurf 单层 markdown rule 更强 |
| K2 | **mcp-guard.sh MCP-aware 设计** | 工具名语义检测 + execute_sql 内容检测（带 WHERE 的 DELETE/UPDATE 放行避免误拦 SELECT）+ filesystem 写类重跑 immutable/forbidden/test-lock 三红线 | 2026-05 业界文档化实现中极罕见的 MCP guardrail，覆盖 OWASP ASI02 Tool Misuse，超前至少一个版本 |
| K3 | **Manager-Worker + 上下文隔离的 sub-agent 架构** | 5 个 sub-agent 独立上下文、仅摘要回传、只审计不修改、职责不重叠 | 与 2026 五大厂商（Anthropic/OpenAI/MAF/Cognition/LangChain）收敛方向吻合；比 GroupChat（生产失败率 41–86.7%）早几年做对 |
| K4 | **Bugbot 式 learned-rules**（`.claude/rules/learned/` 6 条 active） | 每条带 commit sha + 触发场景 + 应做 + 避免 + 来源 + 冷却期五段式，是 procedural memory 的显式审计文件版本 | 对齐 Cursor Bugbot（44k rules）/ Cline `.clinerules`，比行业多数实现更规范 |
| K5 | **Constitution-Anchored 三层架构** + immutable-guard 守 14 铁律不被 AI 自身修改（含 MCP filesystem 绕过） | Anthropic 宪法 AI 在 harness 层的工程落地 | 对齐 OWASP ASI10 Rogue Agent；比 Sakana DGM（沙箱直改）和 AutoGPT（闭合 RSI）更安全，竞品无对标 |
| K6 | **handbook 三级渐进披露**（CLAUDE.md 134 行永驻 → INDEX.md → handbook-search skill 按需 Read offset） | 在 Anthropic Agent Skills 标准发布前已有类似设计；4287 行本身不构成 context 负担 | 架构正确，只需修行号/章节计数漂移（3986→4287、§49 缺号） |
| K7 | **v3.12 run-evals.sh evaluator-grounded 真执行** + 036 meta-eval | 首跑即抓到 v3.11 `_json_get` 的 `\n`→空格破坏 forbidden 多行比对的真安全回归 | AlphaEvolve evaluator-grounded 原则的正确工程化，开源 AI harness 中极少数做到。保留机制，只修内部 exit-0-pass 漏洞和基线计数漂移 |

---

## 优化（Optimize）

| # | 标题 | 改什么 | 为什么 | 优先级 | 工作量 |
|---|---|---|---|---|---|
| O1 | **COUNTS.md hooks 9→10 + 补 mcp-guard** | `COUNTS.md` L13 写 9 并列 9 名，实际 10 个 `.sh`，漏 `mcp-guard.sh`。改 9→10、名单补 mcp-guard | 号称「唯一计数权威源」自身错数，引用它的地方全跟着错。1 行修复，直接关系 cto-init 应装几个 hook。**已实地核实** | **P0** | 10 分钟 |
| O2 | **cto-init / §29.3 改「按目录整体 cp -r」** | `cto-init.md` L61-68 硬列 7 guard（漏 immutable/destructive/mcp），§29.3 根本不 cp `hooks/`、`skills/`。改为 `cp -r .claude/hooks/` 全部 + `cp -r .claude/skills/` 全部，安装报告数字引用 COUNTS.md | 根因是组件列表在 4 处手工维护，改组件要同步 4 地，漏装必然发生。整目录复制让漏装结构上不可能 | **P0** | 1–2 小时 |
| O3 | **消除 eval trajectory 计数硬编码门禁值** | §47.1「12+ 全 pass 才能 merge」/§47.3「12+」、CONSTITUTION「28 条」、cto-eval.md「12 条」、eval-runner「13 PASS」全过时（实 36 yaml / 14 可执行）。门禁改为「全部可执行类 eval pass（数量见 COUNTS.md）」，去掉裸数字 | 这些是带 CI gate 语义的阈值，过时让读者误判真实门禁，也让 036 meta-eval 基线在新增可执行 eval 时静默失真。eval-runner 13 vs COUNTS 14 已掉 1 | **P1** | 1 小时 |
| O4 | **§48 Stop-hook 改「按 diff 风险信号触发」+ 修 self 的 business-path 盲区** | settings.json L143 每次 Stop 无条件 spawn codex review（烧 token）；`codex-bridge/run.sh:73` `BIZ_PATTERN='^(src\|app\|lib\|apps\|packages)/'` 把 `.claude/hooks` 判 non-business 跳过 → v3.10–v3.12 安全改动自 05-12 零审。改为先查 HEAD diff 是否触及 business/forbidden/security，无风险跳过；`IS_AI_PLAYBOOK_SELF` 时把 `.claude/hooks/`、`.agents/skills/`、`scripts/` 纳入 business 或新增 `SECURITY_PATTERN` | 同修两问题：违反原则 #5（深度审计当心跳烧 token）+ 系统最核心「跨模型防盲区」在最高风险改动上空转 18 天 | **P1** | 2–3 小时 |
| O5 | **堵 run-evals.sh「exit 0 即 PASS」漏洞** | `run-evals.sh:84-85` 把「退出 0 且无 PASS/FAIL 标记」直接计 PASS。改为：无显式标记 → SKIP（汇总警告「N 条 vc 无断言标记」），强制每条 verification_command 显式打印 `pass=/fail=` | typo 命令/no-op/被 guard 拦后 `2>&1` 吞掉都会无声过门——§32.5 反模式 #6 eval-gaming 在 fitness 函数内部复现，与 v3.12「真执行才有意义」自相矛盾（Goodhart's Law） | **P1** | 1 小时 |
| O6 | **COUNTS.md SSOT 收敛范围扩到 handbook §41/§42/§46 + 扩展校验器** | §41「5/7 hook」、§42「3 sub-agent」（漏 reliability-auditor/pattern-detector）、§46「5 skill」是最大引用源却被 COUNTS 漏掉。改硬数字为软措辞或「见 COUNTS.md」，让 check-counts.sh grep 扫 handbook/README/CLAUDE.md 裸数字 | SSOT 只覆盖 README/CLAUDE.md/STATUS，handbook 自身这个最大引用源被漏，导致 SSOT 与权威文档当面矛盾。读 §42 会以为只有 3 个 sub-agent | **P1** | 1–2 小时 |
| O7 | **destructive/forbidden 检测正则 + fallback 统一为 common.sh 单源** | `destructive-action-guard.sh:42` 与 `mcp-guard.sh:34` 是两套独立 SQL 正则；forbidden fallback 在 forbidden-guard/mcp-guard/codex-bridge 三处且 codex-bridge 那份缺 billing/keys/terraform/.github/workflows。抽到 common.sh `is_destructive_sql`/`forbidden_pattern` 单源，顺带把 mcp-guard 接入 2026-05-20 learned rule 的 heredoc/引号剥离 | learned rule 2026-05-12 教训正是「共同模式发现一处必须全 sweep」——这里恰没 sweep，双源易漂移 + FN/FP 双风险 | **P1** | 2–3 小时 |
| O8 | **补「error trace 不压缩」原则到 §4.2 + Compaction API 参数指引** | §4.2 写「优先丢弃成功 tool 输出」但没反向声明「错误历史必须保留」。加「禁止压缩：错误/失败 tool 输出、断言失败测试输出、REVIEW-QUEUE 发现」。新增 §4.5 补 Anthropic Compaction API（compact-2026-01-12）的 custom instructions + `pause_after_compaction` 以保护 CONSTITUTION/14 铁律 | SwirlAI 2026 共识：error trace 被压缩掉 agent 会重复同样错误。与 learned-rules 逻辑一致。改 5–10 行，ROI 高 | **P1** | 1 小时 |
| O9 | **审计 17 个 skill 的 description 质量 + 5 个跨平台 skill 改单源同步** | 按 SkillReducer（<20 token description = broken routing）审 description 是否含「做什么+何时触发+何时不触发」；5 个字节级双写的跨平台 skill（约 8KB）改为以 `.claude/skills` 为唯一源 + pre-commit cp 到 `.agents/skills` + SHA 断言 | description 质量是 skill 路由关键弱点；5 对 skill 字节级 IDENTICAL 无自动同步，drift 等待发生（EVOLUTION-PROPOSAL #14 已记 P2） | **P2** | 3–4 小时 |
| O10 | **trajectory-logger 加 secret pattern 过滤** | `trajectory-logger.sh` `_escape()` 之前加 secret redaction：正则匹配 `sk-`/`ghp_`/`AKIA`/`Bearer [A-Za-z0-9+/]{20,}` 替换为 `[REDACTED]`，再写 JSONL | GitHub 2026 扫描发现 24008 个 MCP 配置相关 secret 泄露。当前记录 bash 命令前 200 字符无脱敏，eval verification_command 可能把 env secret 写入日志 | **P2** | 1 小时 |
| O11 | **回填 EVOLUTION-LOG.md 飞轮健康统计 + 补 handbook §49 缺号** | 飞轮跑 8+ 轮但月度统计还是 0\|0\|0 占位、两节空。回填真实 pattern/采纳/cost。§49 缺号要么补一章要么把 §50 重编为 §49 让 §1–§50 连续 | 原则 #8 durable state 在「进化可审计性」维度半空壳，无法判断飞轮空转/FP 率（要求 FP<30% 却无数据）。自称校验章节一致性的系统留编号空洞是自打脸 | **P2** | 1–2 小时 |

---

## 重做（Redo）

> ⚠️ 本节 R3 / R4 经对抗验证后**降级 / 修正**，见对抗验证结果节。

| # | 标题 | 现状（问题） | 建议（修正后） | 优先级 | 风险 |
|---|---|---|---|---|---|
| R1 | **实现 scripts/check-counts.sh 并接入 CI（或诚实删假承诺）** | COUNTS.md L5、L34 两次声称 `check-counts.sh` 是 CI gate，但**该脚本根本不存在**（已实地核实）。grep 全仓只命中 COUNTS.md 自引用 2 处。整个计数 SSOT 没有任何 enforcer | 实现脚本（约 60–80 行 bash，**对抗验证修正：非 40 行**）：`ls` 各目录对比 COUNTS.md 表，不符 exit 1；grep-assert CLAUDE.md「17」、README「21」一致性；接入 `eval.yml`。**明确：10 个 `.sh` guard 计入，`lib/common.sh` 不计入，避免 off-by-one**。若不实现，**必须删 L5/L34 两句虚假承诺**（铁律 #2） | **P0** | 低。纯新增脚本 + CI step，不改现有 enforcement。首次接入会因现存漂移 fail——这正是它要暴露的，先一次性同步再开 gate |
| R2 | **修 handbook §41.8 权威示例（+ §41.3）** | §41.8（L3390-3402）「完整 v3.8 settings.json」示例 PreToolUse Edit 缺 immutable-guard、Bash 缺 destructive-action-guard、完全无 `mcp__.*` matcher。真实 settings.json（L46-89）含全部三层。**对抗验证补充：§41.3（L3207-3270）是更旧的过时快照，同样需修** | §41.8 不再内嵌完整 JSON，改为「完整配置见仓库 `.claude/settings.json`（SSOT），本节只讲设计意图」+ 三层 guard 说明（红线 immutable / Bash destructive / MCP mcp-guard）。§41.3 改为「历史参考（v3.7 inline 模式）— 当前配置见 §41.8」。补一行 grep 自检注释。**同步修改覆盖 §41.8 的 eval（铁律 #12）** | **P0** | 低。改文档不改运行代码。改指针后维护成本下降 |
| R3 | **cto-init 分层分发（降级为 --profile=minimal vs full 两档）** | ⚠️ **对抗验证 uncertain — 已修正**。原提案的「Princeton 64%」「single-agent-first」引用在仓库内**找不到出处（幻觉引用）**；核心 FP 已在 **v3.9.3 runtime 层修复**（immutable-guard L21-34 自动识别 self/subproject，子项目 §32-§35 守护已 no-op）；sub-agents 与 evals/ **本就不在 cto-init 复制列表**，全量装入量被高估 | **降级为 P2 体验优化**（减子项目 commands 目录噪音，非 P0 安全修复）。引入 `/cto-init --profile=minimal`（4 安全 hook + CLAUDE.md + 核心 7 commands：start/resume/spec/review/release/vibe-check/doctor）vs 默认 `full`（现状），**无需三档**。安全 hook（forbidden/branch/immutable/destructive/mcp）所有档强制装。**实施前须先补 eval 覆盖 --profile=minimal 安装后 cto-doctor 自检通过的 golden trajectory** | **P2**（原 P1，降级） | 中。须同步 cto-update/cto-relink-all + 配 eval |
| R4 | **决断飞轮 propose/apply 闭环** | ⚠️ **对抗验证 uncertain — 部分采纳**。核心诊断属实（self-audit-weekly.yml L58 bash-only stub、1 份 SELF-AUDIT、两节空、applied=0）。但**「分发到 27 项目的 weekly cron 税」是事实错误**——cto-init 不复制 `.github/workflows/self-audit-weekly.yml`，cron 只在主仓；且 CI 里**无 agent-logs trajectory 数据**，claude -p 接进 CI 信号缺失质量低；MOSS/Dreaming SOTA 引用属延伸解读，非强证据 | **不采纳「CI 接 claude -p」**（数据源缺失）。**不采纳删 cost-cap json/budget 表**（20 行代码删除收益为零）。**采纳 option (b) 精神**：cto-evolve.md + EVOLUTION-LOG.md 状态显示明确标注「飞轮 = 人在环 detect 辅助（bootstrap），未达自动 propose 阈值」，加激活条件（累计 trajectory ≥ 200 + 用户显式 `/cto-evolve enable`）。在 cto-evolve detect 加「上次本地跑距今 N 天」nudge。子项目默认不装飞轮（已是现实） | **P1**（诚实降级路线） | 低（减法 + 诚实标注） |

---

## 新增（Add）

> ⚠️ A2 / A4 经对抗验证后**修正 / refuted**，见对抗验证结果节。

| # | 标题 | 加什么 | 为什么 | 优先级 |
|---|---|---|---|---|
| A1 | **为零 eval 覆盖命令补「可执行」eval**（修正自原「trajectory eval」） | ⚠️ **对抗验证 uncertain — 修正**：实际 **14** 个零覆盖命令（非 13；cto-evolve 已被 028 覆盖，cto-cross-review 确实零覆盖）。**不补 SKIP 类 trajectory（CI 形同空气=eval-gaming），改补带 `verification_command` 的可执行 eval**。优先级：cto-init（P0，临时目录模拟安装后检查文件存在）/ cto-release（P0，mock git log + grep 八维清单）/ cto-review·cto-cross-review（P1，forbidden 过滤逻辑静态测试）/ cto-constitution（P1）/ cto-harness-audit·cto-audit（P2）。真无法写 vc 的（cto-resume/refresh/models）保留 trajectory 但 README+CI 明标「trajectory-only，需人工周期验证」 | 铁律 #12 保护面有大窟窿——最该有 eval 的安装器/审核/发布命令恰好没有。改 cto-init 进 main 时铁律 #12 形同放行 | **P0/P1** |
| A2 | **安装后强制跑完整性自检**（修正：扩 cto-doctor，不依赖 COUNTS.md） | ⚠️ **对抗验证 uncertain — 修正**：`check-counts.sh` 当前不存在；cto-doctor 已有自检意图但只检 7 hook（实际 10），且 COUNTS.md 是**主仓** SSOT 与**子项目**实有数语义错位。**改为：扩充 cto-doctor 直接对比 ai-playbook 主仓实际文件列表 vs 目标项目实有文件，给 diff 报告**。cto-doctor hook 检查列表 7→10（补 immutable/mcp/destructive）。SSOT 比对应以主仓文件系统 glob 为权威，非 COUNTS.md 手动数字 | 两条安装路径都因手工列文件名漏装，漏装时 templates/CONSTITUTION 仍宣称保护生效=对新项目撒谎。自检是最后一道闸 | **P1** |
| A3 | **铁律 #12/#14 硬 enforcement 落到 install-pre-commit.sh** | `eval-gate.sh:3` 和 `test-lock-guard.sh:6` 都把真 enforcement 推给从未实现的「commit-msg hook (v3.8 Step D2)」。在 install-pre-commit.sh 加 pre-commit：staged 含 commands/agents/skills/CLAUDE.md 改动但无配套 `evals/` 改动 → 警告或 block（带 opt-out） | 当前本地 commit 层对铁律 #12/#14 零硬约束，仅靠 PR eval.yml 兜底；不开 PR 直接 push（branch-guard 只拦 main 上 Edit 不拦 push）则铁律 #12 可绕过 | **P2** |
| A4 | ~~mcp-guard 工具 description 投毒扫描~~ → **先做 PoC 验证技术前提** | ⚠️ **对抗验证 uncertain — 重大修正**：核心假设「PreToolUse hook stdin 含 MCP 工具 `tool_input.description`」**未经证实**——description 是注册时 schema 元数据，在 LLM 推理层读取，可能不在 hook payload。若不存在则扫描静默失效=虚假安全感（比不做更危险）。baseline 对比机制存在**循环论证**（攻击者已控 server 则首写 baseline 即恶意）+ 竞争条件 + 跨 27 项目维护负担。**改为：第一步 PoC 验证字段是否真在 hook stdin；不存在则改 MCP server 注册层/manifest 校验或文档建议外部 mcp-scan；存在则删 baseline 改无状态 pattern 匹配 + FP 测试** | MCP tool poisoning 是 2026 高杠杆攻击（CVE-2025-54136、OWASP ASI04），但「NSA 点名 description 字段」措辞夸大。先验证前提再投入 | **P1**（先 PoC） |
| A5 | ~~eval verification_command 沙箱化（ulimit+gVisor）~~ → **改 timeout 包裹** | ❌ **对抗验证 refuted**：①「ASI05」标签全仓引用 0 次=**编号幻觉**；②`ulimit -t` 在 Windows（主力开发平台）**实测失效**（cannot modify limit），半数场景静默失效；③威胁模型高估（eval YAML 走 git PR 审查、fork PR 只读无 secrets、能注入恶意 YAML 者已有 write 权限可直改 run-evals.sh）；④gVisor 对 27 项目分发工具是过度工程，ulimit -f 1000 误杀合理测试输出。**改为：run-evals.sh 顶层 `timeout 30 bash -c "$vc"`（Win Git Bash + ubuntu 均可用）+ 去 ulimit/gVisor + 修 ASI 编号 + 真要防恶意 YAML 注入则对 evals/ 加 immutable-guard（双签改 eval）** | 保留核心意图（防 runaway vc 卡死 CI），用跨平台简单方案替代过度工程 | **P2**（降级 + 重构方案） |
| A6 | **cto-init 增加 MCP token 税审计步骤** | 第零轮检查列出 settings.json 已激活 MCP server，估算 token overhead；超 30k tokens 建议关低频 MCP 改 ToolSearch 按需加载 | 研究：5–10 MCP 环境第一次输入前消耗 50k–143k tokens，单工具 schema 500–820 tokens。§4.3 已有 ToolSearch 策略但 cto-init 未量化 MCP 税。规模化（27+ 项目）影响显著 | **P2** |
| A7 | **sub-agent handoff 结构化 Build Packet schema + 分级模型路由** | §42 定义返回 schema：`{id, summary(≤500 tokens), findings[{severity, location, description}], verdict(pass\|fail\|needs-human)}`，token 上限 1000–2000；harness-auditor/vibe-checker 等模式匹配类 sub-agent 改用 Haiku（当前全 Sonnet） | 研究：多 agent 15x token overhead，worker 用便宜模型省 40–60%；结构化 handoff 防 sub-agent 把整个 trajectory 写入 REVIEW-QUEUE 污染 context | **P2** |
| A8 | **14 铁律建优先级层次 + 补「理由」解释层** | 当前 14 铁律平级。分层 L1 Safety（#12/#13/#14）、L2 Governance（#4/#8/#11）、L3 Quality（#1/#2/#9/#10）、L4 Productivity（其余），冲突按层裁决；每条后加「理由：」一行 | Anthropic 2026-01 新版 Constitution 引入四层优先级替代平级。两铁律冲突时（#11 禁删重建 vs #13 forbidden 必须 spec-driven）当前无裁决依据。原因驱动让 AI 在边界情形做更好判断 | **P2** |

---

## 砍掉（Drop）

| # | 标题 | 为什么砍 | 注意 |
|---|---|---|---|
| D1 | **子项目分发中 ai-playbook-self 专用逻辑**（immutable-guard 的 handbook §32-§35 守护段 / `IS_AI_PLAYBOOK_SELF` 大段检测） | 子项目全 no-op（无 handbook），却随每项目分发，增维护面 + learned rule 2026-05-12「装到子项目被自己拦」FP 债。cto-init 按 profile 分发：子项目只装真正适用的安全 guard 的子项目模式 | **这是「砍子项目分发」不是「砍主仓功能」**——主仓自身仍需完整守护。注意对抗验证 R3 指出 runtime 层已正确分层，此项主要是「不分发主仓专用守护段」的优化 |
| D2 | **飞轮 4 周失败 budget 升级表 + cost-cap json**（仅在采纳 R4 删除路线时） | ⚠️ **对抗验证修正：建议保留**。飞轮 applied=0 从未自动产 proposal，为不存在吞吐量建精密四级治理是典型过度工程——但对抗验证认为「总共 20 行代码，删除收益为零，可为未来真吞吐量铺路」 | **修正为：不删**。若飞轮降级 detect-only，仅诚实标注现状即可，无须删 budget/cost 脚手架 |
| D3 | **handbook §38-§40 作为核心 handbook 章节** | Agent Loop 六大范式对照 / Multi-Agent 四范式 / Pair Programming 三模式是 SOTA 综述教材而非可执行规约，无 enforcement 钩子，却占 INDEX 条目 + 交叉引用维护成本。移到 handbook-advanced（按需 WebFetch），不随子项目分发 | **不是删内容，是从核心分发物降级为附录参考**。与 open question「物理拆 vs 逻辑分层」相关，需用户拍板 |
| D4 | **LLM-as-judge 作为 CI gate 的阻断依据** | 2026 共识：LLM judge 可被 prompt injection 操纵，不能作单一防线。明确文档化：所有 LLM judge（cto-review / §48 八维 / 017-ci-judge）输出是「建议」非「阻断」，最终阻断权只在确定性 hook（exit 2） | **降级权威性 + 文档化局限，不删 judge 功能**。写入 ARCHITECTURE.md + cto-release.md |

---

## 对抗验证结果

逐条标注对抗验证 squad 的实地核查结论。**confirmed = 可直接执行；uncertain = 修正后采纳；refuted = 显式降级/替换方案**。

### ✅ Confirmed（2 条）— 可直接执行

| 主张 | Verdict | 核查要点 | 最终建议 |
|---|---|---|---|
| **R1 实现 check-counts.sh / 删假承诺** | **confirmed** | ① 脚本不存在（scripts/ 仅 6 文件，无 check-counts.sh）；② L5/L34 两处虚假承诺=vaporware（违铁律 #2）；③ hooks 实际 10 但写 9 且漏 mcp-guard=「SSOT 无 enforcer 必退化」铁证；④ README「21 commands」实 23、CLAUDE.md「17 命令」实列 21；⑤ CI 无任何计数校验步骤 | **修正**：两阶段。P0 立即删/注释 L5/L34 + 修 hooks 9→10 补 mcp-guard；P1 实现脚本（**60–80 行非 40**，区分 10 个 .sh guard vs lib/common.sh 避免 off-by-one）接入 eval.yml；README/CLAUDE.md 数字改引用 COUNTS.md |
| **R2 修 §41.8 settings.json 权威示例** | **confirmed** | ① §41.8（L3390-3402）缺 immutable/destructive/mcp 三 guard；② 真实 settings.json（L46-89）含全部；③ **§41.3（L3207-3270）是更旧过时快照，提案漏提，需一并修**；④ CONSTITUTION「Self-modify 禁止」的守护 immutable-guard 在示例中完全缺失，照此部署绕过红线 | **修正**：同时处理 §41.3（改历史参考）+ §41.8（改 SSOT 指针 + 三层设计意图）；补 grep 自检注释；同步修引用 §41.8 JSON 的 eval 断言 |

### ⚠️ Uncertain（4 条）— 修正后降级采纳

| 主张 | Verdict | 被证伪/误判的点 | 修正后建议 |
|---|---|---|---|
| **R3 cto-init --profile 三档分层** | **uncertain** | ① 「Princeton 64%」「single-agent-first」**仓库内查无出处=幻觉引用**；② FP 问题已在 **v3.9.3 runtime 层修复**（把已修当待修）；③ sub-agents + evals/ **本就不在复制列表**，安装量被高估 | **降级 P2 体验优化**（减 commands 目录噪音非 P0 安全）；改 `--profile=minimal` vs `full` **两档**（非三档）；安全 hook 全档强制；进 main 前先补 minimal 安装后 cto-doctor 自检 golden trajectory |
| **R4 飞轮 propose/apply 闭环** | **uncertain** | ① 「分发 27 项目 cron 税」**事实错误**（cto-init 不复制 self-audit-weekly.yml，cron 只主仓）；② CI 接 claude -p **无 agent-logs 数据源**、有真实 API 费用，质量低；③ MOSS/Dreaming SOTA 引用属延伸解读非强证据 | **不接 CI claude -p**；**不删 cost-cap/budget**（20 行收益为零）；采纳诚实标注「人在环 detect 辅助 bootstrap」+ 激活阈值（trajectory ≥ 200 + 显式 enable）+ detect 加「距上次 N 天」nudge |
| **A1 为零覆盖命令补 eval** | **uncertain** | ① 实际 **14** 个零覆盖（非 13）；cto-evolve 已被 028 覆盖（误列）；cto-cross-review 确实零覆盖；② **SKIP 类 trajectory 在 CI 形同空气=eval-gaming**，违 v3.12 修复原则；③ 「静态可达性检查」**仓库内无此工具=投机预期** | **改补带 verification_command 的可执行 eval**（非 SKIP）：cto-init/cto-release P0、cto-review/cross-review/constitution P1；真无法写 vc 的保留 trajectory 但明标「trajectory-only 需人工验证」 |
| **A2 安装后完整性自检** | **uncertain** | ① check-counts.sh **幻象脚本**（提案在空壳上加门）；② cto-doctor 已有自检但只检 7 hook（实 10）；③ COUNTS.md 是**主仓** SSOT 与**子项目**实有数**语义错位**，拿主仓数比子项目是错的 | **改为扩 cto-doctor 直接对比主仓文件列表 vs 目标项目实有文件给 diff**；hook 检查列表 7→10；SSOT 比对以主仓 glob 为权威非 COUNTS.md 手动数字 |

### ❌ Refuted（1 条）— 显式降级 + 替换方案

| 主张 | Verdict | 被驳倒的点 | 替换方案 |
|---|---|---|---|
| **A5 eval verification_command 沙箱化（ulimit + gVisor）** | **refuted** | ① **「ASI05」全仓引用 0 次=编号幻觉**（项目实际用 ASI01/02/04/06/07）；② **`ulimit -t` 在 Windows 实测失效**（cannot modify limit, exit 1），主力开发平台半数场景静默失效；③ 威胁模型严重高估（eval YAML 走 git PR 审查、fork PR 只读无 secrets、能注入者已可直改 run-evals.sh、36 个 vc 均为读文件/grep/printf 静态片段）；④ gVisor 需 Linux kernel + 特殊 runner，对 27 项目分发工具是过度工程；ulimit -f 1000 误杀合理测试输出。**净收益为负** | **保留核心意图（防 runaway vc 卡死 CI），用跨平台简单方案**：① `timeout 30 bash -c "$vc"`（Win Git Bash + ubuntu 均可用，团队已自然用过）；② 去 ulimit/gVisor；③ 修 ASI 编号（改 ASI02 或去 OWASP 标签待核实）；④ 真要防恶意 YAML 则对 evals/ 加 immutable-guard（双签改 eval，与现有架构一致，成本极低） |

> **A4（mcp-guard description 投毒扫描）虽列为 uncertain，技术前提存疑程度接近 refuted**：核心假设「PreToolUse hook stdin 含 `tool_input.description`」未经证实，若不存在则方案静默失效=虚假安全感。**必须先 PoC 验证字段存在性再投入**，baseline 对比机制因循环论证漏洞应删除。

---

## Top 5 优先级

1. **修复安装链断裂（P0 安全回归）**：cto-init 改 `cp -r` 整目录补齐 immutable/destructive/mcp 三个红线 guard（O2）+ 修 handbook §41.8 **和 §41.3** 权威示例改为指针引用 `.claude/settings.json`（R2）。三方共指、唯一真 P0——任何新项目当前装出的是红线层有名无实的残缺系统。

2. **实现 scripts/check-counts.sh 并接入 CI，或诚实删除 COUNTS.md 虚假承诺**（R1，违反铁律 #2）：先修 COUNTS hooks 9→10 补 mcp-guard（O1），再让 SSOT 有真 enforcer，否则计数永远漂移。这是让所有后续修复「不再退化」的元基础设施。

3. **修 §48 跨模型 autopilot 在自身仓库的空转 + 改风险信号触发**（O4）：`BIZ_PATTERN` 把 `.claude/hooks` 判 non-business 跳过，让系统最核心的「跨模型防盲区」真正运行在最高风险的安全改动上（已空转 18 天），同时停止每次 Stop 烧 token。

4. **堵 run-evals.sh「exit 0 即 PASS」漏洞 + 给 14 个零覆盖命令补可执行 eval**（O5 + A1 修正版）：让 v3.12 真 eval executor 名副其实（当前 fitness 函数可被「命令不报错」欺骗），并把铁律 #12 的保护面从 10/23 命令扩到关键安装/审核/发布命令——**注意补的是可执行 eval 不是 SKIP 占位**。

5. **cto-init 分层分发 `--profile=minimal` vs `full`（降级 P2）**（R3 修正版）：服务核心愿景「装到别的项目让 AI 自治」而不压垮小项目，安全 hook 全档强制，飞轮/canary/replay 等高级机制 opt-in。**已从 P0 降级——FP 已 runtime 修复，价值主要是减目录噪音。**

---

## 需用户拍板的 Open Questions

1. **handbook 4287 行要不要拆？** 审计三方建议拆（拆 4 册 / 按 enforcement vs 综述拆 core+advanced），但 context lens 研究明确说「三级渐进披露已实现、不需拆、拆会破坏 §N.M 交叉引用」。折中：不物理拆，而是按「是否随子项目分发」逻辑分层（core 引用 vs advanced 留主仓 WebFetch），保留单文件 + INDEX 路由。**需拍板：物理拆分 vs 逻辑分层 vs 维持现状只修行号漂移**。

2. **飞轮（§50）战略定位**：「真自治进化能力」（投 CI 跑 LLM 真 propose + ephemeral-worker 验证）还是「人在环 detect 辅助工具」（诚实降级、子项目 opt-in）？**对抗验证已倾向后者**（CI 无 trajectory 数据源、真实 API 成本）。决定要不要继续把飞轮当「已交付能力」随 27 项目分发。

3. **eval 对外计数口径**：宣传「36 条 eval」还是「14 条真执行 + 22 条 trajectory（待真跑 Claude）」？后者更诚实（与铁律 #12 刚升级真执行的精神自洽、防 §32.5 反模式 #6），但数字看起来少一半。涉及 README/COUNTS/CONSTITUTION 多处口径统一。

4. **eval 内容是否对 AI 透明（Goodhart's Law / eval gaming）**：36 条 eval 全公开在仓库，AI 每次会话能读 verification_command。要不要把断言常量移出 AI 读取路径（`evals/.secrets/` + CI env 注入）或加 `EVAL_BLIND_MODE`？安全收益 vs 维护复杂度的取舍，且与「装到子项目」场景可行性相关。

5. **三平台 + templates 三份 + skill 双写的维护成本**，对「绝大多数只用 Claude Code 的装机项目」是否值得？是否应默认只分发 Claude Code 配置，Antigravity/Codex 作为 opt-in 扩展？涉及是否收缩平台中立性这一核心卖点。

---

## 实施批次建议

### 批 1 — P0 安全回归止血（本迭代，优先）

> 目标：让任何新装项目不再装出残缺红线系统 + 让 SSOT 有真 enforcer。

| 任务 | 来源 | 走 forbidden 双签？ |
|---|---|---|
| O1 修 COUNTS.md hooks 9→10 补 mcp-guard | O1 | 否（纯文档计数） |
| O2 cto-init / §29.3 改 `cp -r` 整目录 | O2 | **是** — cto-init.md 是 commands/ 配置（铁律 #12 配套 eval）；安装逻辑触及分发安全边界，建议第二模型独立审 |
| R2 修 handbook §41.8 + §41.3 改指针引用 | R2 | **是** — handbook.md 改动触发 eval-gate（铁律 #12），需配套 eval；CONSTITUTION 引为权威源，建议双签 |
| R1 实现 check-counts.sh + 接入 eval.yml | R1 | **是** — `.github/workflows/eval.yml` 命中 forbidden-paths（`.github/workflows/**`），强制双签 + spec-driven + requires-double-review 标签 |
| A1（P0 部分）补 cto-init / cto-release 可执行 eval | A1 | 否（新增 evals/，但触及 cto-init 命令时与 O2 一并双签） |

### 批 2 — P1 防漂移 + 自治诚实化（次迭代）

| 任务 | 来源 | 走 forbidden 双签？ |
|---|---|---|
| O3 消除 eval 计数硬编码门禁值 | O3 | 否（文档 + eval-runner 措辞，但 handbook 改动需配 eval） |
| O4 §48 改风险触发 + 修 self business-path 盲区 | O4 | **是** — `settings.json` + `codex-bridge/run.sh` 是 enforcement 核心，安全相关，双签 |
| O5 堵 run-evals.sh exit-0-pass 漏洞 | O5 | 否（但 run-evals.sh 是 fitness 函数核心，建议第二模型审 + 配 036 meta-eval 回归） |
| O6 COUNTS SSOT 扩到 §41/§42/§46 + 扩展校验器 | O6 | 部分（handbook 改动配 eval；check-counts.sh 扩展若改 eval.yml 则双签） |
| O7 destructive/forbidden 正则统一 common.sh 单源 | O7 | **是** — 触及 forbidden 检测逻辑本身，安全核心，双签 + 双向 FP/FN 测试 |
| O8 补 error trace 不压缩原则 + Compaction API | O8 | 否（handbook 文档，配 eval） |
| R4 飞轮诚实降级标注 + 激活阈值 | R4 | 否（cto-evolve.md + EVOLUTION-LOG 文档；不删 budget/cost） |
| A1（P1 部分）cto-review/cross-review/constitution eval | A1 | 否 |
| A2 扩 cto-doctor 完整性自检（hook 7→10） | A2 | 否（cto-doctor skill 改动配 eval） |
| A4 mcp-guard description 投毒**先 PoC 验证前提** | A4 | 先 PoC（不改 enforcement）；若真做改 mcp-guard 则**双签** |

### 批 3 — P2 优化 + 战略拍板后（视 open question 结论）

| 任务 | 来源 | 走 forbidden 双签？ |
|---|---|---|
| R3 cto-init `--profile=minimal/full`（降级 P2） | R3 | **是** — 改分发逻辑触及安装安全边界，配三档安装矩阵 eval + 双签 |
| O9 skill description 审计 + 5 跨平台 skill 单源同步 | O9 | 否（skill 改动配 eval） |
| O10 trajectory-logger 加 secret 过滤 | O10 | 否（安全增强，建议第二模型审 redaction 正则 FP） |
| O11 回填 EVOLUTION-LOG 统计 + 补 §49 缺号 | O11 | 否（文档） |
| A3 铁律 #12/#14 落 install-pre-commit.sh | A3 | 否（脚本增强，但触及 enforcement 建议审） |
| A5 run-evals.sh 改 `timeout 30` 包裹（refuted 替换版） | A5 | 否（去掉 ulimit/gVisor；若对 evals/ 加 immutable-guard 则双签） |
| A6 cto-init MCP token 税审计 | A6 | 否（与 R3 一并审） |
| A7 sub-agent Build Packet schema + Haiku 路由 | A7 | 否（§42 handbook + agents/ 配置，配 eval） |
| A8 14 铁律优先级层次 + 理由层 | A8 | **是** — 触及 CLAUDE.md 14 铁律本体（immutable-guard 红线），最高级别双签 + Constitution review |
| D1/D3/D4 砍子项目分发专用逻辑 / §38-§40 降级 / LLM-judge 降级 | Drop | D1/D4 触及 enforcement 与架构文档，建议双签；D3 纯文档分层 |

> **forbidden 双签判定依据**（`.claude/rules/forbidden-paths.md` / §32.1）：命中 `.github/workflows/**`、auth/payment/secrets/migration/crypto、或触及 enforcement 核心（settings.json / hooks 逻辑 / forbidden 检测正则 / CLAUDE.md 铁律本体）的改动，必须 spec-driven（SPEC→PLAN→TASKS）+ CTO + senior engineer + 第二模型独立审 + PR 打 `requires-double-review` 标签。所有 commands/agents/skills/CLAUDE.md/handbook 改动额外受**铁律 #12** 约束（无配套 eval 不进 main）。
