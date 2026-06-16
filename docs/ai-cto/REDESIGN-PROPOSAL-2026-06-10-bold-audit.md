# 演进 vs 重做 裁决书 — Bold Audit 2026-06-10

> **裁决书记录员综合报告**。日期 2026-06-10。
> **参与规模**：5 份大胆审计（产品身份 + enforcement 技术路线双 lens）+ 4 份外部研究（Claude Code 2026 原生能力 / 治理竞品对标 / enforcement 技术路线 / 知识记忆组织）+ 3 套独立重做方案 + 3 名评委独立打分 + 9 条对抗验证。
> **与上轮 v3.13 提案的关系**：上轮（SOTA-team-v2，2026-05-30）是**修裂缝**——O1-O11/A2-A8 共 17 项已全部 completed，修的是计数、单源、MCP token、分层分发等具体 bug。本轮是**质疑地基**：第一次有人系统性地问「这套东西的产品身份是不是错的？bash hook 底座是不是该整体换掉？为零吞吐飞轮建的治理是不是该删？」上轮的 keep 结论（K1「不要改 bash exit-2 架构」）本轮被三套方案集体挑战。本轮**刻意不重报** v3.13 已 ship 的修复。

---

## 1. 执行摘要

**审计总判决**：这不是「AI CTO 闭环指挥系统」。它是一个约 1600-3000 行、业界罕见的 exit-2 硬护栏内核（10 个 guard + common.sh + 安装链 + 8 条 learned rules + Constitution 锚定），被 4320 行 handbook 教材、给不存在的 GitHub 公众做的营销 README、和为零吞吐量飞轮（EVOLUTION-LOG applied=0）建的治理仪式稀释。最近 40/40 commit 全是系统在修自己，零个给 27 个子项目交付新能力。诊断层经代码核实**大体成立**，但若干 load-bearing 数字（"6/7 learned rule 根因是 sed 解析器""18% 价值密度""/plugin install git-url 一命令""32 工具采纳 agentskills.io"）被对抗验证**实锤纠偏或证伪**。

**最终路线裁决（一句话）**：**混合重构 + 演进吸收，分两个独立可回滚迭代** —— 以「双产物拆分」的稳健迁移骨架为主干，定向重写**仅限** hooks 底座（bash→Node，受 hook 行为矩阵硬闸保护），移植「事故账本」作为唯一真 10x 新能力，其余 80% 是减法与移动；**不**全面推倒重来，**不**接受任何单一方案的激进版本。

---

## 2. 审计判决

### 2.1 五维度逐条判决

| 维度（lens） | 一句话判决 |
|---|---|
| **产品身份与价值密度** | 成立：身份错位真实（指挥系统叙事 vs 护栏内核现实），但"18% 价值密度"是把 exec 代码与参考文档对立计算的错误框架——handbook 走渐进披露不与 guard 争 context，实测核心执行物约占 9.9%-16%，稀释**方向**对、**量级**被夸大。 |
| **Enforcement 技术路线（bash on Windows）** | 部分成立：sed-fallback JSON 解析器确是真实工程债（jq 不在 PATH、Node v22 在），但"6/7 learned rule 根因"被证伪——实际仅约 2-3/8 归因于路径/sed，MCP 绕过类是**架构覆盖面缺口**，换 Node 同样存在。 |
| **计数 SSOT 体系** | 成立且当前活跃：check-counts.sh 已 ship 且 TIER1 真 exit 非零，但 git status 里的 `zzz-tmp-fail.yaml` 让 yaml 数 49≠COUNTS.md 的 48，TIER1 现在就 fail；散文层"到处写数字"的漂移问题真实，否定式扫描是正确解。 |
| **Eval 资产负债表** | 成立：49 条中 22 条永久 SKIP（从未真跑），可执行类大半是文本快照（grep 修复字符串还在）而非行为测试；4 轮 Windows bug 没有一条现有 eval 抓住过——hook 行为矩阵是正确转向。 |
| **飞轮 + sub-agents + 治理仪式** | 成立：applied=0 全 bootstrap，5 个常驻 agent / 周 cron / 失败预算表服务零吞吐管线；真正有效的交叉审是会话内临时组 team（v3.13 的 21-agent 审计就是这么跑的）。 |

### 2.2 Fundamental 级 findings 表

| # | Finding（fundamental 级） | 提出 lens | 对抗验证后状态 |
|---|---|---|---|
| F1 | 产品身份错位：护栏内核被教材/营销/治理稀释 | 产品身份 | **成立**（量级修正：密度 9.9%-16% 非 18%） |
| F2 | 计数 SSOT 是自我制造的疾病，专修后仍全身漂移 | 产品身份 | **成立**（check-counts 已 ship，但 tmp 文件致 TIER1 现 fail） |
| F3 | common.sh sed-fallback 是 Windows bug 根因，应整体删而非补丁 | 技术路线 | **部分成立**（是真债；但"6/7 根因"证伪，实为 2-3/8） |
| F4 | 计数体系换治理模型：散文禁数字 + 否定式扫描 | 产品身份 | **成立**（结构上根除漂移的最佳一招） |

### 2.3 Kill 清单（合并去重 + 票数）

> 票数 = 几套方案 + 几名评委 + 审计明确建议的合计支持度。

| 要 kill 的东西 | 支持票 | 备注 |
|---|---|---|
| 22 条永久 SKIP 的 trajectory eval（移 docs/test-plans/，不删，CI 行为零变化） | 3 方案 + 2 审计 + 3 评委 | 高共识，零风险，只缩水虚荣数字=诚实 |
| INDEX.md 全部硬编码行号（已漂移 20-33 行）→ grep 运行时定位 | 3 方案 + 1 审计 + 全 3 评委明确"该偷" | **零争议最佳一招**，与平台无关 |
| self-audit-weekly.yml + llm-judge.yml 两个 cron/CI workflow | 3 方案 + 1 审计 | applied=0 已证明无人消费产物 |
| 散文层裸数字（README 8 badge / Star History / 竞品表 / 占位演示） | 3 方案 + 1 审计 | 单人私有工具不需要营销页 |
| 5 sub-agents → 2（eval-runner + 统一 auditor）；**merge 非 kill** | 3 方案 + 评委倾向 merge | 临时组 team 已证明优于常驻定义 |
| 命令 23→12（merge，**非 guardkit 的 23→4**）；canary/replay/relink-all 等真仪式 | 2 方案（12）+ 评委一致反对砍到 4 | 砍到 4 被评委判过激（牺牲知识复利） |
| 7 个 generic checklist skills（i18n/a11y/ux/design-system/release）降为 optional | 3 方案 | 与 enforcement 内核零耦合，full profile 可选装 |
| handbook §5 AG/Codex + §38-40 综述 + §43-48 创新章 → reference/ 不分发 | 3 方案 + 1 审计 | 不删，降级为参考文献 |

### 2.4 Keep 清单（无论如何不动 — 两 lens 交集）

1. **exit-2 + stderr 硬拦截语义**：不依赖 jq、不受 JSON 转义影响、Claude 直接当错误读——整套 enforcement 的命门，重写必须逐字保留。
2. **mcp-guard 的 MCP-aware 覆盖**：工具名语义 + execute_sql 带 WHERE 放行 + filesystem 写类重跑三红线——业界罕见正确设计（learned rule 2026-05-29 两条血泪），换底座一行不能丢。**这是 PocketOS 删库防线，与 sed 解析器无关。**
3. **CLAUDE.md 14 铁律（4 层 + 理由层）+ immutable-guard 守护铁律本体**：所有 enforcement 的合法性来源。
4. **IS_AI_PLAYBOOK_SELF self/子项目分层 + CTO_* env override**：learned rule 2026-05-12 用 wrist-fc 部署事故换来。
5. **8 条 learned rules**：每条带 commit sha + 触发场景 + 反模式 + 冷却期——重写时的**回归测试清单和验收标准，比代码更值钱**。
6. **cto-init cp -r 整目录安装 + cto-doctor 安装后自检**：27 项目生命线，"手工列清单必漏装"是 P0 事故换来的（O2 已修）。
7. **run-evals.sh 真执行器 + check-counts.sh TIER1 硬 gate + 13 条行为型 eval 的 exit-code 断言契约 + hooks-overrides 子项目覆盖协议**：evaluator-grounded 原则本身。
8. **handbook §18 / §32-§35 doctrine（~400 行）**：hook 的"立法理由"，AI 被拦时要能读到为什么——降级 reference 但保留可被 grep。
9. **三级渐进披露理念**（CLAUDE.md 永驻 → 索引 → 按需精读）：实现要换（grep 替代硬编码行号），但架构判断对。

---

## 3. 三套重做方案

### 方案 A — guardkit（极简核心派）

**Thesis**：被 14000 行教材稀释的 exit-2 内核，价值密度 18%→90%。把 968 行 bash 整体重写为 ≤500 行 `guard-core.mjs`，叙事削成 ≤200 行 RULES.md doctrine。23 命令→4，10 hooks→1 入口（10 thin shim 维持契约），48 evals→约 24 条全可执行行为矩阵。成品 = 一个 Claude Code plugin，`/plugin install` 一命令分发。

**架构**：分发物 plugin（plugin.json + guard-core.mjs + 10 thin shim + hooks.json + 4 命令 + 2 skill + RULES.md 200 行 + 8 learned rules + 24 eval）；主仓 reference/（handbook 4320 行不分发、不计数、INDEX 删行号改 grep）。

**评委均分**：5.5（impact 7 / feasibility 5 / migration 5 / risk 5）。

**被对抗验证修正的点**：
- ❌ **"6/7 learned rule 是 sed 解析器根因"被 refuted**——实际 2/7（28%）涉路径/sed，3/7 是 MCP 架构盲区（JSON.parse 救不了，忘读 `tool_input.path` 会一字复现），其余是方法论/作用域逻辑。
- ❌ **"/plugin install \<git-url\> 一命令"被 refuted**——手册仅记载 `/plugin install <plugin-id>`（marketplace ID），git-url 安装无文档证据；plugin 装进 `~/.claude/plugins/cache`，**不写项目根 CLAUDE.md**（提案自己承认 cto-init 仍要留，故安装器删不掉只是改名）。
- ❌ **"修了 4 轮还在修"被纠为现在时投射**——v3.11/v3.12 后 common.sh 已稳定，最近 4 个月无新 Windows 路径回归。
- ❌ **"968→≤500 行 JS"存疑**——immutable-guard 单文件 238 行（Write/MultiEdit 特判 + 逐行 diff + 四层 self/subproject 检测 + 4 个 audit_log），逻辑量换语言不消失。

### 方案 B — guardrails-kit / cto-playbook-plugin（双产物拆分）

**Thesis**：分发交给 Plugin 系统，enforcement 底座换单个 Node dispatcher（结构上消灭 sed 解析器 bug 类），其余按"平台原生替代或删除"。但**诚实划清三条平台边界**：plugin 装不进项目根 CLAUDE.md、auto-memory 不能替代人审 learned rules、permission deny 不能做内容感知 SQL WHERE 检测——这三处自制代码必须保留。~3500 行 plugin + reference handbook，密度 18%→~70%。

**架构**：产物拆分（plugin 分发物 vs reference 不分发）；dispatcher.mjs ~250 行 + 10 thin shim；命令 23→12（merge 非 kill，保留 spec/review/constitution/eval/evolve）；5→2 agent merge；INDEX 删行号改 grep；散文禁数字 + check-counts TIER2 否定式扫描。**transparent thin-shim**：27 子项目入口名不变内部 exec node，dispatcher 顶部 Node 探测 + 旧 .sh fallback，`/cto-link --upgrade` 自愿迁移。

**评委均分**：7.0（impact 7 / feasibility 7 / migration 7 / risk 7）—— **三套最高**。

**被对抗验证修正的点**：
- ⚠️ "彻底解决安装链断裂"**夸大**——O2 已用 cp -r 修复；plugin 根因（枚举 vs 整目录）同构，并引入 cache 路径重写工程量 + disabled-still-fire bug（#39307）+ plugin agent frontmatter 不支持 hooks 的安全限制。
- ⚠️ dispatcher 250 行**偏乐观**（要装 self/subproject 分层 + MCP WHERE carve-out + filesystem 重跑三红线）。
- ✅ "划清平台三边界 + 各保留自制代码"被评委判为**最安全的护栏**，直接回答"PocketOS 删库还防得住吗"。

### 方案 C — SAFETY-BELT（降维到真实 job）

**Thesis**：27 项目没有董事会要被指挥，真实 job 只两件——安全带 + 项目记忆。重定位为「Claude Code guardrails + memory kit」，bash→Node dispatcher（~280 行），并建 **10x 新能力：跨 27 项目事故账本**（incidents.jsonl → distill.mjs → learned-rule → plugin update 反向传播），把"同 bug 多项目反复踩"变成共享免疫系统。

**架构**：三件套物理隔离 —— core/（唯一分发物，guard-core.mjs + thin shim + CLAUDE.md + learned rules + cp -r 安装链保留）；reference/（handbook 降级 + INDEX 改 grep）；ledger/（中央事故账本，复用现有 trajectory-logger jsonl）。**保留 cp -r、plugin 仅 optional**（不押注 medium-confidence 的 plugin exit-2）。

**评委均分**：6.75-6.9（impact 9 / feasibility 6-7 / migration 6-7 / risk 6）—— **诊断与创意最高，工程最冒进**。

**被对抗验证修正的点**：
- ❌ **"check-counts.sh TIER1 exit 0 不是 gate"被 refuted**——实测脚本 TIER1 真 exit 非零；它指向的真 bug 是 zzz-tmp-fail.yaml 致 49≠48，描述错但问题真实存在。
- ⚠️ **ledger 反向传播闭环依赖未证实的 plugin 中央分发能力**——若不存在则退化为手动 cto-init re-run；且"自动蒸馏→推 27 项目"是新攻击面（投毒一条 incident 污染全舰队），方案未讨论信任链。
- ✅ **唯一真去读当前文件系统的方案**（实地抓到 tmp 文件）+ **唯一给出"迁移期零红线真空"硬机制**（新旧影子并行双跑比对 exit code + Node 探测失败回退旧 .sh）。
- ✅ 引用 GitHub issue #34457（Windows bash hook 第二消息挂死）——若属实是换 Node 最强论据，**需独立核实**。

---

## 4. 评委合议

### 4.1 分数矩阵

| 方案 | 评委1（综合） | 评委2（安全） | 评委3（长期主义） | 平均 |
|---|---|---|---|---|
| A guardkit | 5.5 | 30.5/40 ≈ 6.1 | 6.1 | **~5.9** |
| B 双产物拆分 | **7.0** | 32/40 ≈ 6.4 | **7.3** | **~6.9（胜出）** |
| C SAFETY-BELT | 6.75 | **36.5/40 ≈ 7.3** | 6.9 | **~7.0（并列）** |

> 注：评委2用 40 分制（4 维各 10），换算后 SAFETY-BELT 居首；评委1/3 双产物拆分居首。B 与 C 实质并列，A 垫底。

### 4.2 三评委共识（高置信）

1. **核心赌注（bash→Node dispatcher）方向正确**：jq 不在 PATH、Node v22 在、common.sh sed-fallback 是真实工程债——三评委一致认可换底座的方向，但一致要求**语义等价移植，严禁重设计**。
2. **必偷三件**：① hook 行为矩阵（每 guard × {Win 反斜杠, POSIX} × {应拦, 应放行}）作为**先于任何 .mjs 写出的强制验收闸**；② transparent thin-shim 迁移法（27 项目无感）；③ ledger 跨项目事故账本（唯一真 10x）。
3. **guardkit 砍到 4 命令/0 agent/全删安装器过激**：安装器删不掉（CLAUDE.md 仍写项目根），砍 19 命令把低频救命能力赌进 git 历史。
4. **不应在一次重做里同时换底座 + 重组知识体系 + 改分发 + 加新子系统**：拆成独立迭代是单人不烂尾的唯一现实路径。

### 4.3 评委分歧

| 议题 | 评委1（综合） | 评委2（安全） | 评委3（长期主义） |
|---|---|---|---|
| 是否值得现在重做 | 倾向"演进现状 + 定向重写" | **强保留**：未做完 A/B 对拍前不押 27 项目 | "不是推倒重来，是定向重写一个组件" |
| 主干选哪套 | 双产物拆分骨架 + 偷 ledger | **SAFETY-BELT 为主干**（唯一读了文件系统 + 零真空机制） | 双产物拆分骨架 + 移植 ledger |
| sed 根因被夸大 | 默认接受三方诊断 | **强烈纠偏**（2-3/8 非 6/7，下调全部分数） | 核实后认同（6/8 含路径+MCP，但 MCP 非 sed） |
| 平台盲区是否致命 | 提及 -p 模式 | **列为硬前置**（exit-2 间歇失效 #24327/#13744） | 列为必须文档化 + doctor 实测 |

---

## 5. 对抗验证结果（9 条逐条）

| # | 被验证主张 | 裁定 | 关键依据 |
|---|---|---|---|
| V1 | guardkit：6/7 learned rule 是 sed 根因 / /plugin install git-url / 修 4 轮还在修 | **REFUTED** | 实为 2/7 涉 sed；git-url 无文档；当前已稳定。正确解=common.sh L16-38 加 `node -e JSON.parse` 单行替换，ROI 高 50 倍无迁移成本 |
| V2 | 平台原生派：~3000 行内核占 18% / plugin 替代 cto-init / 结构消灭 4 轮 bug | **REFUTED** | 实测内核 1618 行占 9.9%；plugin 装 cache 不写项目根；最近两轮已 normalize_paths 修复，sed 仍活跃但无新 bug |
| V3 | SAFETY-BELT：40/40 self-fix / 18% 密度 / ledger 10x / check-counts exit 0 | **UNCERTAIN** | self-fix 与 bash 债**确认**；18% 密度框架错；check-counts exit 0 **错**（真 exit 非零）；ledger 闭环依赖未证实的 plugin 分发 |
| V4 | Plugin hooks.json 打包 + exit-2 硬拦截 + 消除 O2 漏装根因 | **UNCERTAIN**（强版本 refuted） | hooks.json 打包**确认**（2025-10）；但 plugin exit-2 有多个未关 bug（#10412/#29767/#39307）；O2 已用 cp -r 修复，根因同构 |
| V5 | Agent SDK in-process hooks 替代 shell hooks，600→250 行无 Windows 问题 | **REFUTED** | SDK hooks 是**编程模型**场景，交互式 CLI 仍走 settings.json shell 子进程；实测 968 行非 600；`node guard.mjs` 仍 fork 子进程，PowerShell-not-in-PATH 根因不消失 |
| V6 | /sandbox 可 offload destructive-guard / mcp-guard 到 denyWrite | **REFUTED** | 原生 Windows **不支持**沙箱（主维护者环境）；官方文档明确 hooks/MCP 在沙箱外不受约束；denyWrite 路径级规则不能做 SQL WHERE 语义 |
| V7 | Agent Skills 规范让 .agents/skills/ 三平台自动发现，无需 sync 逻辑 | **REFUTED** | Claude Code **不自动发现** .agents/skills/（issue #56193 仍 open）；规范只定义格式不规定 SSOT；sync-skills.sh（O9）仍必要 |
| V8 | Plugin 体系彻底解决安装链断裂（rebuild enabler） | **UNCERTAIN**（强版本 refuted） | 平台能力 4 条属实；但作用域是四级非三级；安装链 O2 已修；plugin agent frontmatter 不支持 hooks（安全限制） |
| V9 | 30 hook 事件（PreCompact/PermissionRequest 等）给 O4 原生支持 | **UNCERTAIN**（强版本 refuted） | 事件存在；但 PreCompact 阻断=取消压缩（危险）；PermissionRequest 对 subagent 不触发（#23983 未解）；O4 已用 bash diff ship 完成 |

**REFUTED 总计 5 条 / UNCERTAIN 4 条 / CONFIRMED 0 条整体**。核心信号：**没有一条"平台已经造好了轮子可以直接替代"的研究主张完整通过对抗验证**。技术上可行 ≠ 对单人维护者净收益为正。

---

## 6. 最终路线图

> 综合原则：**定向重写一个组件（hooks 底座）+ 移植一个能力（ledger）+ 全局诚实化**。保留全部 v3.13 已 ship 成果。骨架取方案 B，零真空机制 + ledger 取方案 C，thin-shim 取三方共识。

### 阶段 0 — 立即做（本周，零架构改动，半天）

| 项 | 工作量 | immutable/forbidden？ | 27 项目影响 |
|---|---|---|---|
| 删除 `evals/golden-trajectories/zzz-tmp-fail.yaml`（致 check-counts TIER1 现 fail） | 5 分钟 | 否 | 无 |
| COUNTS.md 修正：learned-rules 4→8、evals 口径统一（48 vs 49 vs 36 三处自相矛盾）、删"check-counts 尚未实现"的自相矛盾文字 | 30 分钟 | 否（COUNTS 非 immutable） | 无 |
| INDEX.md 删全部硬编码行号 → handbook-search 改 `grep -n '^## N\.'` 运行时定位；INDEX 只留场景→章节 + 铁律→章节两张语义表 | 2 小时 | 否 | 无（reference 层） |
| 散文层禁数字 + check-counts TIER2 反转为否定式扫描（散文出现 `[0-9]+ ?(个\|条)?(命令\|evals\|hooks\|...)` 即 fail，白名单仅 COUNTS.md 表格） | 2 小时 | **触及 CLAUDE.md/handbook 散文** → 受铁律 #12，需配 eval | 无（仅主仓） |
| README 删营销层（8 badge / Star History / 竞品表 / 占位演示 / 三栏受众） | 1 小时 | 否 | 无 |

### 阶段 1 — 本月（enforcement 换底座，最高 ROI 也最高风险，**需用户授权**）

| 项 | 工作量 | immutable/forbidden？ | 27 项目影响 |
|---|---|---|---|
| **先建 hook 行为矩阵**（每 guard × {Win 反斜杠, POSIX} × {应拦 exit2, 应放行 exit0}），8 条 learned rule 每个 bug 场景一条复现 case——**先于任何 .mjs** | 2-3 天 | 受铁律 #12（新 eval） | 无（新增测试） |
| 写 `guard-core.mjs`：`JSON.parse(readFileSync(0))` 真解析，逐函数**语义等价移植** 8 个判定（含 self/subproject 分层 + MCP WHERE carve-out + filesystem 重跑三红线 + secret redaction）。**严禁重设计** | 1-2 周 | **触及 hooks 核心 = forbidden 双签 + spec-driven**（铁律 #13） | 无（阶段 1 不动子项目，旧 bash 继续跑） |
| bash 与 .mjs 在矩阵上 **A/B 逐字节对拍全绿** + 新旧影子并行（同一 hook input 双跑比对 exit code） | 3-5 天 | 否 | 无 |
| 10 个 .sh 改 3 行 thin shim（`exec node guard-core.mjs <name>`），dispatcher 顶部 Node 探测失败回退旧 .sh；维持 13 条行为 eval + hooks-overrides 契约 | 2 天 | 受铁律 #12 同 PR 配 eval | 透明（入口名不变） |
| 独立核实 GitHub issue #34457 真伪（Windows bash hook 挂死）——决定本阶段紧迫度 | 1 小时 | 否 | 决定是否加速 |

### 阶段 2 — 下季度（瘦身 + 10x 能力 + 滚动迁移）

| 项 | 工作量 | immutable/forbidden？ | 27 项目影响 |
|---|---|---|---|
| 命令 23→12（merge：audit 三兄弟并 doctor；canary/replay/relink-all/image/design/models/refresh 删或并）；5→2 agent merge；删两个 cron workflow | 1 周 | 触及 commands/agents → 铁律 #12 | 子项目命令集变化，cto-doctor 报 diff |
| 22 条 SKIP eval 移 docs/test-plans/；7 个 generic skills 移 optional/；handbook 降 reference/ | 3 天 | 否 | 减少分发表面积 |
| **ledger 事故账本**：guard-core.mjs 加中央 incidents.jsonl 写入（复用现有 audit_log）+ distill.mjs（**仅 append + 聚类 + 生成草稿，人审后才传播，不自动 apply**）| 1 周 | 否（新增 opt-in 子系统） | 维护者主机单机先验证 |
| 滚动重装 27 项目：分批 5-6 个，每批 cto-doctor 端到端 exit-2 验证三红线（immutable 拦 CONSTITUTION / destructive 拦 rm -rf / mcp 拦 delete_project）；保留 `.claude/settings.json.bak` 回滚；自定义 hooks-overrides 项逐个验证 | 2-3 周 | 否（迁移用 cp -r/plugin） | **关键**：先灰度 1-2 低风险项目实测 Windows exit-2 真生效再批量 |
| cto-doctor 加平台盲区文档化 + 实测：`-p`/管道模式 hook 不触发、exit-2 间歇失效（#24327/#13744）每项目实测 | 2 天 | 否 | 提升可信度 |

### 明确不做（防过度）

- ❌ 不砍命令到 4、不删 cto-init 安装器、不删全部 sub-agent（guardkit 激进版）
- ❌ 不把分发**完全**改为 plugin（CLAUDE.md 装不进项目根，plugin exit-2 有未关 bug）——plugin 仅作 skills/commands 的**可选**现代化路径，hooks 暂留 cp -r/thin-shim
- ❌ 不引入 agentskills.io 外部 schema 依赖、不删 sync-skills.sh（issue #56193 未合并前 Claude Code 不读 .agents/skills/）
- ❌ ledger 不做自动 apply、不在底座未对拍全绿前迁移任何子项目

---

## 7. 需用户拍板（≤5 个方向性决定）

1. **是否授权重写 hooks 底座（bash→Node `guard-core.mjs`）？** 这触及 enforcement 核心 = forbidden 双签 + spec-driven（铁律 #13），且推翻上轮 K1"不改 bash 架构"结论。收益：消灭 sed/路径类 bug、维护税骤降、Edit 触发进程 4→1。风险：重写丢覆盖面 = 安全静默失效（比不做更危险），且飞轮被砍无兜底。**前置硬条件**：hook 行为矩阵 + A/B 对拍 + 影子并行全绿才切——**不接受跳过验收闸的"快速重写"**。

2. **是否先独立核实 GitHub issue #34457（Windows bash hook 第二消息挂死）？** 若属实 → 现状的 exit-2 在你主力 Windows 平台上**可能已是纸面保证**，结论从"可演进"推向"应重做"，阶段 1 应加速。若证伪 → "演进现状 + 阶段 0 止血 + 受矩阵保护的渐进 dispatcher 化"是更低风险路径。**这一条决定整个路线的紧迫度。**

3. **ledger 事故账本要不要做、做到哪一步？** 这是唯一真 10x（27 项目共享免疫），但是给 applied=0 历史的系统加新自动化管线。建议：仅"append + 聚类 + 生成草稿 + 人审后传播"，**不自动 apply**。要不要这个能力，以及传播是手动 cto-init re-run 还是赌未来 plugin 中央分发？

4. **命令砍多少？12 还是更激进？** 评委一致反对砍到 4。12（merge 非 kill，保留 spec/review/constitution/eval/evolve 的知识复利）是稳健共识。你是否接受 12，还是有特定低频命令（canary/replay/image/design）想保留？

5. **27 项目迁移节奏：强推还是自愿？** 建议自愿（thin-shim 透明 + `/cto-link --upgrade` opt-in + cto-doctor 报 diff，绝不静默改 27 项目——learned rule 2026-05-12 教训）。你是否接受"老项目可停在 thin-shim 版 bash 入口、新项目用新底座"的渐进，还是要求统一版本？

---

**报告完。**
