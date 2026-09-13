# 宪法修正案（omnibus）— v5.0 平台原生收敛（2026-09-13）

> 状态：**☐ 待人决策**。五条互相独立，**分条勾选、逐条独立应用**，拒绝任一条不影响其余。
> 流程依据：ADR-007（opt-out 只经 `.claude/settings.local.json` 的 `env` 注入，用完即删）
> + `docs/ai-cto/CONSTITUTION.md` 的「不可妥协清单」修改条件。
>
> ⚠️ 本提案同时要解决一个**流程债**：唯一的先例（AMENDMENT-PROPOSAL-2026-07-02）至今签署栏仍是
> `☐ 人 ☐ 第二模型`，且 CONSTITUTION 的 Amendment History 里**没有**那次修改的记录 ——
> 即「双签」在本仓从未被真正形式化过一次。A4 就是补这个洞。

---

## 为什么需要这份提案

v5.0 的侦察（72 代理，平台事实一手实抓）发现宪法文本与现实有五处脱节。其中两处是**文本比实现落后**
（A2/A3，措辞绑定了已经不存在的实现细节），一处是**用户主动改变方向**（A5），一处是**结构性升级**
（A1），一处是**流程补登**（A4）。

没有这份提案，v5.0 的 WS5（AGENTS.md 单源）与 WS10（下游默认三平台）无法合法推进。

---

## A1 — 铁律正文的单一真源迁到 AGENTS.md

**触碰**：安全宪法 #2、不可妥协清单 row 1
**背景**：AGENTS.md 是 Linux Foundation / AAIF 托管的跨 agent 规范，Codex 与 Antigravity 都**原生读取**它，
而 Claude Code 只读 CLAUDE.md（官方推荐用 `@AGENTS.md` 导入）。铁律现在写在 CLAUDE.md 里，
另外两个平台拿到的是 `sync-agents-md.mjs` 渲染出的派生块 —— 三平台对齐永远慢一拍。

**old**（不可妥协清单 row 1）：
```
| CLAUDE.md 14 铁律段 | 🔴 不可修改 | `CTO_CONSTITUTION_AMEND=1` + 人决策 |
```
**new**：
```
| AGENTS.md 14 铁律段（CLAUDE.md 经 @AGENTS.md 导入引用） | 🔴 不可修改 | `CTO_CONSTITUTION_AMEND=1` + 人决策 |
```
安全宪法 #2 中「AI 不得改 CLAUDE.md 14 铁律段」同步改为「AGENTS.md 14 铁律段」。

**安全保证**：
- 搬移**逐字不改**铁律 1-14 的编号与文字（只换物理位置）
- 同一 PR 内**先扩** immutable 红线 1 到 `{CLAUDE.md, AGENTS.md}` 两处并 eval 绿，**再**搬移 →
  全程无守护真空（eval 103 双文件断言）
- CLAUDE.md 侧守护保留一个发布周期作双保险再撤

**若拒绝**：退回「CLAUDE.md 为源、编译器渲染进 AGENTS.md」（即今天的形态，0 修宪）。
v5.0 其余工作**不受影响**，只是 Codex/agy 读的仍是派生物。

☐ 批准　☐ 拒绝

---

## A2 — 不可妥协清单 row 5 的措辞对齐实现（文本已落后两个版本）

**触碰**：不可妥协清单 row 5
**背景**：现文把红线绑在 **bash 实现细节**上，而红线逻辑早在 v4.0b 就搬进了 Node engine。
现在 guards.mjs 守的是 `.claude/hooks/**.{sh,mjs}`，`block_with_reason` 这个函数名只存在于冻结的 legacy 层。
**这条不是放宽，是让文字追上既有现实**；不改的话，v5.1 退役 legacy bash 时会与宪法字面冲突。

**old**：
```
| .claude/hooks/*.sh 的 `block_with_reason` 调用 | 🔴 不可绕过 | 禁止移除红线逻辑 |
```
**new**：
```
| guard engine 红线 guard 的 block/deny 决策与各平台 adapter 的 emit（.claude/hooks/** 全体） | 🔴 不可绕过 | 禁止移除红线逻辑 |
```

☐ 批准　☐ 拒绝

---

## A3 — 架构宪法 #4 的命令数改为引用 SSOT

**触碰**：架构宪法 #4
**背景**：现文写「14 铁律 + 23 命令认知负担过重」，而命令数 v3.14 就已是 18，v5.0 WS6 后约 13。
硬编码数字必然过期 —— 这正是 COUNTS.md 作为计数 SSOT 要解决的问题。

**old**：`4. **Hooks-driven**：14 铁律 + 23 命令认知负担过重，必须由 hooks 自动化（§41）`
**new**：`4. **Hooks-driven**：14 铁律 + 全部命令/技能（数量见 docs/ai-cto/COUNTS.md）认知负担过重，必须由 hooks 自动化（§41）`

☐ 批准　☐ 拒绝

---

## A4 — 补登 2026-07-08 的修宪记录，并把双签流程写成规程

**触碰**：Amendment History（追加）+ 新增「修正流程」小节
**背景**：2026-07-02 的平台条款修正案**已经应用**（CONSTITUTION 正文已是新版），但：
- 提案文件的签署栏至今空着
- Amendment History 只有 2026-05-11 一条，没有 07-08 那次

即本仓的「双签」从未被形式化记录过一次。治理文档正在对自己说谎（铁律 #2 反模式）。

**new**（Amendment History 追加）：
```
- 2026-07-08 v4.0e：架构宪法 #2 与产品宪法平台条款 —— 三平台对称 → Claude-native 主体 + 桥接 opt-in
  （提案 AMENDMENT-PROPOSAL-2026-07-02-platform-scope.md；人三次显式授权；经 settings.local.json
   env 注入 opt-out 应用，guard 放行并写 audit `constitution-amend-allowed`）
```

**new**（新增「修正流程」小节，成文化 ADR-007 的既有实践）：
1. 提案文件 `AMENDMENT-PROPOSAL-<date>-<slug>.md`，必含精确 old/new 块、影响面、配套 eval、回滚块
2. 双签 = 提案内 `☑ 人 <日期>` + commit trailer `Amendment-Approved-By:` + 第二模型审产物
   `docs/ai-cto/reviews/amend-<slug>.md`
3. 应用只经 `.claude/settings.local.json` 的 `env` 注入 opt-out，**用完即删**；
   由 `check-counts` 断言该文件不含 `CTO_CONSTITUTION_AMEND` 等键
4. 收尾：Amendment History 追加一行 + 提案标 ☑；eval 断言「History 行数 == 已应用提案数」
5. ADR 不得与宪法文字冲突；ADR 只能 supersede ADR，不能改宪法

☐ 批准　☐ 拒绝

---

## A5 — 平台范围：从「桥接 opt-in」改为「三平台守护默认安装」

> **这是用户 2026-09-13 明确选择的方向（决策 D2=B），方向与 2026-07-02 的修正案相反。**
> 因此必须显式修宪，不能靠解释绕过。

**触碰**：架构宪法 #2、产品宪法「不是什么」条
**背景**：用户要求「符合最新的 ChatGPT/Codex、Claude Code、Antigravity」。
侦察证实三平台**都有原生 hooks 且拒绝语义可对齐**（Codex 与 Claude 的 deny schema 同构；
agy 用 stdout decision JSON）。同时证实：本仓 Codex 侧**一条 trust 记录都没有**，
即过去的 opt-in 桥接在实际部署中等于零守护。

**old**（架构宪法 #2）：
```
2. **Claude-native 主体 + 跨平台桥接 opt-in**：Claude Code 唯一默认平台；
   Antigravity / Codex 以 opt-in 桥接支持（§5 / §49）；跨模型 review（§48）不受影响
```
**new**：
```
2. **Claude-native 主执行面 + 三平台守护默认安装**：Claude Code 是唯一默认**执行**平台；
   红线守护由同一 guard core 经三个 adapter 覆盖 Claude / Codex / Antigravity，
   `/cto-init` **默认生成**三平台接线（`--without-codex` / `--without-antigravity` 可 opt-out）。
   **生效前提**：Codex 侧须经 TUI `/hooks` 批准哈希 trust，agy 侧须经真机验证；
   未完成前 doctor 与 FLEET.md 必须逐平台显示未生效状态，**不得**视为红线在该平台成立。
   跨模型 review（§48）不受影响。
```
产品宪法「❌ 锁死单一平台的工具（Claude-native 为主体，桥接层开放 — AG / Codex opt-in…）」
中的「opt-in」改为「默认安装、显式启用」。

**为什么附带「生效前提」条款**：没有它，这条修宪会制造比现状更危险的东西 ——
文件铺到 31 个项目、doctor 显示绿灯、而 Codex 侧因未 trust 实际零守护。
**假安全感比已知的无守护更危险**，故把「必须显示未生效状态」写进宪法本身。

**若拒绝**：维持 opt-in，v5.0 的 WS10 相应改回 `--with-codex` / `--with-antigravity`，
三平台 adapter 与 eval 保留（它们不依赖这条）。

☐ 批准　☐ 拒绝

---

## 影响面与回滚

| 条 | 代码改动 | 配套 eval | 拒绝后的退路 |
|---|---|---|---|
| A1 | 铁律段物理搬移 + immutable 红线 1 扩双文件 | 103（双文件 exit 2 + CLAUDE.md `@AGENTS.md` + <200 行） | 编译器渲染（今天的形态） |
| A2 | 无（纯文字对齐现实） | 既有 058 / 095 已覆盖语义 | 保留旧措辞，v5.1 退役 legacy 时再议 |
| A3 | 无 | check-counts 已是 SSOT | 保留旧数字（会继续过期） |
| A4 | 无（补记录 + 新增规程小节） | 新增：History 行数 == 已应用提案数 | 流程债继续存在 |
| A5 | cto-init 默认生成三平台接线 + doctor 逐平台状态 | 113（fleet）+ 099/100（平台守护） | 改回 opt-in flag |

**统一回滚**：本提案的任何一条应用后，若需撤回，按相同流程提反向提案；
代码侧回滚见各 WS 的 PR（每个 WS 独立可 revert）。

---

## 签署

- 提案人：Claude Opus 5（v5.0 CTO 会话，2026-09-13）
- 人决策：☐ A1　☐ A2　☐ A3　☐ A4　☐ A5　　日期：________
- 第二模型审：☐（`codex exec` 产物置于 `docs/ai-cto/reviews/amend-v5.md`）
- 应用记录：应用后在 CONSTITUTION 的 Amendment History 追加对应行，并把本文件顶部状态改为 ☑
