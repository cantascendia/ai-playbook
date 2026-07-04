# HARNESS-CHANGELOG

ai-playbook 自身仓库的 harness 演进档案。每次修改 CLAUDE.md / settings.json / commands / hooks / skills / agents 都在此追加一行，按手册 §34.3 规范。

格式：
```
## [YYYY-MM-DD] vN.N — 改动标题
- 改了什么：[文件 + 范围]
- 为什么：[问题场景或目标]
- Eval 跑分前/后：[regression / capability 集对比，若有]
- 影响范围：[哪些任务模式受影响]
```

---

## [2026-07-03] v4.0e — branch-guard 工作树边界修正（铁律 #8 false-positive）

- 改了什么：engine `engine/guards.mjs` 的 `branchGuard`（file-path 路径）+ legacy `branch-guard.sh`
  回退实现 —— 命中保护分支后新增**工作树边界**判断：边界取 `git rev-parse --show-toplevel`（真工作树根），
  相对路径恒视为仓库内、绝对路径经 canon 归一（MSYS `/c/`→原生盘符 + 去尾斜杠 + Windows 大小写不敏感）
  后按前缀判断；仓库内 → block，仓库外文件放行 + audit `main-edit-outside-repo-allowed`。engine `canonPath`
  与 legacy `_canon` 同款归一（parity）。`gitToplevel` 新增于 lib.mjs。新增 eval 062（双路径 parity 矩阵，
  12 断言）+ 5 条 node:test 单测（仓库外放行 / 仓库内绝对仍拦 / 尾斜杠 cwd / cwd 子目录同仓文件 / Windows 大小写）；COUNTS evals 39→40
- 为什么：2026-07-02 实测 —— 在 main 分支的仓库里写**仓库外**文件（如
  `~/.claude/projects/.../memory/*.md`）被铁律 #8 `BLOCKED` 误拦。branch-guard 原实现命中保护分支后
  无条件拦所有 Edit/Write，不判断文件是否在仓库工作树内。而 #8 的威胁模型是"保护本仓 main"，
  仓库外文件与本仓分支无关，属 false positive（同 learned rule 类：guard 判断需带上下文边界）
- 双审迭代（诚实记录）：首版用 cwd 前缀（图省事、规避 Windows normalize footgun）。独立 Claude 审查判为
  "无 Critical/Major，parity 一致"，仅提尾斜杠 Minor（已加固）。**但 §48 codex 跨模型审 verdict=BLOCK**，
  抓到两个 Major **安全 false-negative**：① cwd 为仓库子目录时，cwd 外的同仓文件在保护分支上漏拦
  （用户从子目录/monorepo package 跑 claude 可触发）；② Windows 大小写/盘符差异（`c:` vs `C:`）导致同仓
  文件漏拦。二者均已用 git 工作树根 + canon 归一修复 —— **跨模型审的价值实证：codex 抓到了单模型自审误判为
  "不触发"的真安全弱点**
- Eval 跑分前/后：39 → **40 PASS / 0 FAIL**；单测 36 → 41；node:test 全绿（Windows 大小写测试真机实跑）+ run-evals 全绿
  （注：eval 045 曾在 Windows 本地因工作树陈旧 CRLF 伪失败 —— git blob 两侧 SHA 一致 + CI 绿，
  renormalize 后本地亦 40/40；非仓库漂移，无需改文件）
- 影响范围：保护分支上对**仓库外**文件的 Edit/Write（现放行）；仓库内 Edit/Write 拦截行为不变（含 cwd 子目录 / Windows 大小写场景现正确拦截）

---

## [2026-07-02] v4.0d — 收尾：激活本仓 live settings.json + 实验性 plugin 分发通道（PR-D）

- 改了什么：① 本仓 `.claude/settings.json` 对齐 templates（v4.0a 的 SessionStart 装载器修复：
  最近一条 review 替代盲 tail-100 + hooks-presence 替代 v3.7.bak 死哨兵；v4.0c 的 branch-guard 上 Bash
  matcher）—— 完成 v4.0a/c 在本机的实际激活；② 新增 `.claude-plugin/{plugin,marketplace}.json` +
  `hooks.json`（`claude plugin validate` 通过），把 commands/agents/skills/output-style/guard-hooks
  打包为 Claude Code 原生 plugin，guard 经 `${CLAUDE_PLUGIN_ROOT}` 引用；③ README 加 plugin 安装段；
  eval 061 守护清单结构
- 为什么：合并后本仓 live settings 仍是旧装载器（自改保护上一会话拦下，本会话获显式授权应用）；
  plugin 化是分发原语现代化（scope 对抗审查「要么做要么砍」），验证可行后作为**实验通道与 cto-init 并行**
- 关键发现（实测）：plugin.json `agents` 字段**必须显式文件路径数组**（validator 拒绝目录，`commands`
  却接受目录 — 不对称）；plugin 装不进 rules/statusline/permissions/项目记忆（feasibility 查证坐实）→
  这些仍由 cto-init 文件复制
- Eval 跑分前/后：38 → **39 PASS / 0 FAIL**（新增 061 plugin 清单结构断言，node 校验，CI 可跑）
- 影响范围：本机会话启动上下文（下次生效）；新增 plugin 分发通道（experimental，不改 cto-init 现状）
- 边界：CI 加固（SPEC-001，.github/workflows forbidden 路径）+ 宪法平台条款修正案**仍待人 opt-out**——
  guard 机制正确地拒绝 agent 自授权触碰（即便本轮有全权，forbidden/immutable 需 env-var 级 deliberate act）

---

## [2026-07-02] v4.0c — 新 enforcement 语义：铁律 #8 Bash 扩展 + guard 自保护（PR-C，🔴 待人双签）

- 改了什么：engine 侧两条新红线 —— ① branch-guard 扩展 Bash：解析真实 git 子命令
  （剥引号/heredoc + 跳全局 flag，非子串匹配），commit/merge 看 HEAD、push 看 refspec，
  命中保护分支 → deny JSON；② immutable-guard 红线 5：Write/MultiEdit 整文件覆写既有
  `.claude/hooks/**.{sh,mjs}` → exit 2（单 Edit / 新文件放行，`CTO_GUARD_AMEND=1` 维护解锁）。
  templates/settings.json Bash matcher 加 branch-guard；eval 059/060 + 4 条单测（FP 矩阵）
- 为什么：扫描 P0 —— CONSTITUTION「hooks block 逻辑不可移除」是纸面声明零 enforcement；
  铁律 #8 只拦 Edit，`git commit/push` 直上 main 无人管
- 边界（诚实声明）：legacy 回退路径无新语义（v3.15 冻结）；单 Edit 链仍可逐步削弱 guard —
  拦的是最短路径，完整防护靠 PR review + eval 平价门
- Eval 跑分前/后：36 → **38 PASS / 0 FAIL**；单测 32 → 36
- 影响范围：保护分支上的 git 操作；guard 文件的覆写操作。**merge 前提：人双签 +
  self 仓 settings.json Bash matcher 手动加 branch-guard（agent 不改自身启动配置）**

---

## [2026-07-02] v4.0b — Guard Engine：bash → Node 语义等价移植（PR-B）

- 改了什么：10 个 `.claude/hooks/*.sh` → engine shim + legacy 回退（node 缺失或
  `CTO_GUARD_ENGINE=legacy` 原地走 v3.15 冻结实现，零红线真空）；引擎
  `engine/{guard,lib,guards}.mjs` + 32 条 node:test 单测（移植 v3.9.1 Win 路径 / v3.11 转义引号 /
  v3.12 字面量 \n / v3.10.2 echo carve-out / v3.11.1 MCP path 字段 / eval 042 脱敏全部历史回归）；
  `.gitattributes` 加 `*.sh` `*.mjs` `*.js` eol=lf；eval 058 平价门（同输入双路径 diff）
- 为什么：`_json_get` sed fallback 已记录 2 次安全回归 + 3 条 Windows 路径 learned rule =
  结构性 bug 类；实测 bash 单 hook ~1.5s vs node ~105ms（每次 Edit 省 ~5.6s）；JSON.parse
  结构性根除解析器问题。v3.14 verdict 阶段 1 授权范围（语义等价，严禁重设计）
- Eval 跑分前/后：35 PASS → **36 PASS / 0 FAIL**（32 条旧 eval 全部在引擎路径重验）；
  平价门首轮抓到 MSYS 路径（/c/...）self-检测缺口并修复 + 新增单测
- 影响范围：所有 guard 拦截路径的执行引擎；行为契约（exit 码 / deny JSON 字节形状 /
  audit 事件名 / env opt-out / hooks-overrides / 042/046/047/051 源码断言）全部保持
- 备注：新 enforcement 语义（branch-guard-Bash / guard 自保护）**不在本 PR**（PR-C，需人双签）

---

## [2026-07-02] v4.0a — 分发 P0 修复 + 记忆层手术（PR-A，Fable 5 限时轮）

- 改了什么：`templates/settings.json` 新建（修复 SessionStart 装载器：最近一条 review 替代盲 tail-100、
  hooks-presence 替代 v3.7.bak 死哨兵）+ cto-init 补 settings/statusline/output-style/agents/rules 复制；
  REVIEW-QUEUE 季度轮转至 `docs/ai-cto/archive/`；COUNTS 自相矛盾修复；STATUS 全量刷新；
  记忆契约裁剪至真实文件 + DECISIONS.md（ADR）落地；CTO-PLAYBOOK.md / AUTOPILOT-KICKOFF 退役归档；
  harness-auditor/vibe-checker 陈旧命令引用修复；saved workflow `cto-scan.js` + `cto-probe.js`
- 为什么：2026-07-02 七代理扫描定位 2×P0（全新安装 enforcement 全哑 / SessionStart 每会话盲注入
  68KB 陈旧 review）+ 记忆契约 7 个幻影文件（反模式 #3 幻觉源）；裁决书
  `REDESIGN-PROPOSAL-2026-07-02-v4-agent-native.md`
- Eval 跑分前/后：32 PASS 基线 → 目标 35+（新增 055/056/057，037/050/054 扩展）
- 影响范围：所有 /cto-init 分发目标（27 项目）的首装正确性；每个会话的启动上下文体积；会话恢复流
- 备注：self 仓 `.claude/settings.json` 本会话未动（harness 自改保护，正确行为）— 人从
  templates/settings.json 同步两条 SessionStart command 即可；PR-B（guard engine）/ PR-C（新红线
  语义，需人签）见裁决书

---

## [2026-06-25] v3.15 — health/ARE 重审回填（45 天断档首笔补账）

**为什么**：会话恢复后实测发现 STATUS/COUNTS 的 v3.11–v3.15 Health/ARE 全 TBD（v3.9.3 的 94 已 9 个月陈旧），且本 changelog 自 2026-05-11 v3.9.1 后断档 45 天 / 27 提交未记录——是手册 §34.3 + §43 定义的可观测性盲区。

**改动**：
- 工作流并行跑 harness-auditor（§34 八原则）+ reliability-auditor（§43 四维）→ 对抗验证者抽查 14 项 evidence（防膨胀/防臆造，铁律 #3）
- 回填 STATUS.md「质量评分」表 + COUNTS.md 版本表：v3.15 = **Health 79 / ARE 78**（high confidence，两份 grounded=true，无膨胀）
- 修 COUNTS.md:6 误述：`check-counts.sh` 旧文案说"尚未实现"，实测已交付且 EXIT 0

**评分依据**：
- Health 79：5 pass（context engineering / lazy loading / token-eff / multi-agent separation / durable state）+ 3 warn（self-contained：7 skill 无 paths trigger；minimal-intervention：4 hooks 双源漂移；fail-fast：pre-commit 未安装）
- ARE 78：四维全 warn — SLO.md 冻结 v3.9.1（v3.10+ 组件零覆盖）、`evals/slo-checks/` 不存在、季度演练 Q2 过期未跑、`.evolve-cost-month.json` 缺失（cost 累计无状态可读）

**新登记 P1（grounded）**：HARNESS-CHANGELOG v3.10–v3.14 仍需补；pre-commit hook 待 `install-pre-commit.sh`；SLO.md 待对齐 v3.15；季度演练待实跑。

**影响范围**：所有「项目自审 / 发布门禁 / 可靠性回归」任务模式 — 解除了 9 个月评分陈旧 + changelog 断档对下游分析的阻断。

---

> 以下 v3.10–v3.14 为 2026-06-25 断档补账（从 git 历史 + EVOLUTION-LOG 重建，事后追记，非当时实时记录）。

## [2026-06-16] v3.14 — bold-audit：质疑地基 + 定向重构（PR #29）

- 改了什么：Bash/mcp guard `exit 2`→`permissionDecision:deny` JSON（common.sh deny_with_reason）；命令 23→18 合并（cross-review→review --cross / relink-all→link --all / refresh→resume --refresh / vibe-check+harness-audit→audit）；INDEX 硬编码行号→运行时 grep；新增 `ledger/{collect,distill,propagate,run}.mjs` 跨项目事故账本；22 trajectory eval 移 docs/test-plans/
- 为什么：多 agent 工作流质疑地基，对抗验证后裁决「混合重构（不推倒重来）」；对冲 GitHub #23284（exit 2 不可靠）
- 影响范围：所有 guard 拦截语义 + 命令调用面 + 跨项目经验传播

## [2026-05-30] v3.13 — 平台收敛 + 治理强化（PR #20–#26，批 1-4）

- 改了什么：平台范围默认 Claude-only（AG/Codex 改 opt-in）；14 铁律 4 层优先级（L1 安全>L2 治理>L3 质量>L4 效率）+ 理由层；`scripts/check-counts.sh` SSOT enforcer 落地（提案 R1）；destructive-SQL + forbidden fallback 正则单源到 common.sh；分层分发 minimal/full/advanced；飞轮诚实降级为「人在环 detect 辅助」（R4，见 EVOLUTION-LOG 2026-05-30）
- 为什么：SOTA team v2 审计发现安装链断裂 + 计数 6+ 处漂移 + 飞轮 applied=0 却宣称自治
- 影响范围：跨平台范围 / 铁律冲突裁决 / 计数一致性 / 飞轮成熟度声明

## [2026-05-30] v3.12 — 真 eval executor（铁律 #12 从空壳变真执行，PR #19）

- 改了什么：新增 `scripts/run-evals.sh` 真 executor（awk 提取 verification_command 真跑 + judge）；`036-eval-executor` meta-eval；eval-runner.md 删「不实际跑」
- 为什么：旧 eval-runner 不跑 Claude + CI 只 count yaml = §32.5 反模式 #6 eval-gaming
- 影响范围：铁律 #12 enforcement — 首跑即抓到 v3.11 `_json_get` 的 `\n`→空格破坏 forbidden 多行比对的安全回归（详见 EVOLUTION-LOG 2026-05-30 v3.12）

## [2026-05-29] v3.11 / v3.11.1 — MCP guardrail（飞轮第 7-8 轮，PR #17/#18）

- 改了什么：新增 `mcp-guard.sh`（settings.json `matcher: mcp__.*`）覆盖 MCP 工具（execute_sql DROP / delete_branch / filesystem write 红线文件）；test-lock/eval-gate Windows 路径修复 + normalize_paths 抽 common.sh；修 v3.10.2 destructive-guard 安全回归 + _json_get 转义引号根因
- 为什么：destructive/file-path guard 只 match Bash/内置 Edit|Write，MCP（execute_sql / filesystem write_file）完全绕过整个红线体系（飞轮第 8 轮最致命发现，见 learned rules 2026-05-29）
- 影响范围：所有 MCP server 启用场景的 enforcement 覆盖面

## [2026-05-29] v3.10.1 / v3.10.2 — destructive-action gate（OWASP ASI01，PR #15/#16）

- 改了什么：新增 `destructive-action-guard.sh`（rm -rf / DROP TABLE / git push --force 等）；cost-cap 计量；Stop hook opt-in；v3.10.2 剥离 heredoc/引号内容防 false positive
- 为什么：防 agent 灾难性破坏操作（OWASP Agentic ASI01）；v3.10.1 拦了自己写 PR body 的 DROP TABLE 文本（飞轮第 6 轮自食其果，见 learned rules 2026-05-20）
- 影响范围：所有 Bash destructive 命令路径

## [2026-05-19] v3.10 — autopilot kickoff template（PR #13）

- 改了什么：新项目「开机提示词」模板（autopilot kickoff prompt）
- 为什么：降低新项目接入 CTO 系统的冷启动成本
- 影响范围：cto-init / 新项目首轮

---

## [2026-05-11] v3.9.1 — Windows 反斜杠路径剥离 bug 修复（飞轮首次产出）

**飞轮发现**：v3.9 首次跑 pattern-detector 多 sub-agent 并行（pattern-detector + harness-auditor + vibe-checker + reliability-auditor），实测发现：

`${HOOK_FILE_PATH#$CWD/}` 在 Windows 反斜杠 cwd 下静默失效 — REL 仍是绝对路径，`[ "$REL" = "CLAUDE.md" ]` / `grep "/CLAUDE.md$"` **全部 NO**。**immutable-guard 在 Windows 上根本没守住红线**。

6 轮 codex review 都没发现因为 codex 走 GitHub MCP（不实际 exec bash）。

**修复**：
- `NORMALIZED_FILE="${HOOK_FILE_PATH//\\/\/}"` — 反斜杠转正斜杠
- `BASENAME=$(basename ...)` — 文件名兜底匹配
- 红线 1 用 `[ "$BASENAME" = "CLAUDE.md" ]`
- 红线 2/3/4 用 `echo "$NORMALIZED_FILE" | grep ...`

**验证**：11/11 通过（Windows 5 用例 + POSIX 4 用例 + Write 2 用例 + opt-out 1）

**意义**：飞轮 v3.9 第一次跑就抓到 v3.9 自己的盲区 — 证明"飞轮自审飞轮"设计有效。Reflexion + MAR 多 critic 验证（pattern-detector 报 P0-1 trajectory 是 false positive，但 P0-2 路径剥离是真 bug）。

---

## [2026-05-10] v3.9 — 自我进化飞轮（Constitution-Anchored）

**为什么**：用户问"项目能否自我进化飞轮"。Phase 1 多源调研（AlphaEvolve / Sakana DGM / Cursor Bugbot / Voyager / Reflexion+MAR / Anthropic CAI / OWASP Agentic Top 10）后，实施三层飞轮。

**主要改动**：
- `immutable-guard.sh` — PreToolUse 守 CLAUDE.md 14 铁律 / CONSTITUTION / forbidden SSOT / handbook §32-§35
- `pattern-detector.md` sub-agent — 找反复失败 pattern
- `cto-evolve.md` 命令 — detect/propose/apply/status 四段式
- `learned-rules-loader` skill + `.claude/rules/learned/` Bugbot 归档
- GH Actions weekly cron + cost cap 设计
- 3 evals (026/027/028)

**§48 跨模型 review 价值实证（4 轮 dogfood）**：
- 第 5 轮 (6c385ea)：3 个 P1/P2 bug（Write/MultiEdit 绕过 + handbook §34 漏）
- 第 6 轮 (b0cb86f)：1 个 P1（cwd fallback 错误）
- 全部 6 轮发现 11 个真 bug

**health score**：v3.7 70.7 → v3.8 88 → v3.9 94（harness-auditor 评分）

PR：#6（merged 357ca50）

---

## [2026-05-09] v3.8 — Real AI-native enforcement（v3.7 silent no-op 修复）

**致命发现**：v3.7 之前所有 PreToolUse / PostToolUse hooks 用 `echo "$CLAUDE_TOOL_INPUT"` — 但官方文档明确说该 env var **不存在**。Hook input 通过 stdin JSON 传入。**所有"提醒"hook 永远 silent no-op**。AI 表面"被提醒"是它自己泛化产物 — hooks 根本没说话。

**修复**：
- 7 个 PreToolUse hooks 全部用 stdin JSON + jq/sed fallback
- forbidden-guard.sh / bypass-guard.sh / branch-guard.sh / test-lock-guard.sh → exit 2 真硬拦截
- 5 个 paths-triggered skills (forbidden-policy / test-lock-rules / eval-gate-policy / constitution-loader / handbook-search)
- /cto-doctor 自检命令
- outputStyle 加 "behavior-must" 强约束（防 AI "问而不做"）

**§48 价值实证（3 轮 dogfood）**：
- 第 2 轮 (d82d9cc)：2 P2（test -x gating + 双写 trajectory）
- 第 3 轮 (0b7c6f9)：1 P1（paths YAML list 格式 → 5 skills 完全失效）
- 第 4 轮 (4bb844a)：1 P3（命令计数文档不一致）

PR：#5（merged 2787794）

---

## [2026-05-08] v3.7 — PR autopilot（codex 订阅 review 自动同步到 PR comment）

**用户诉求**："我希望开发 ai-native 的，尽量让 AI 自动，不要总让人提醒... 不要让 AI 总是停下来问"

**改动**：
- `.agents/skills/codex-bridge/run.sh` 加 PR autopilot 段（~50 行）
- 会话结束 Stop hook → codex review（订阅 auth）→ 写 REVIEW-QUEUE → 自动 push + gh pr create + gh pr comment（按 sha 去重）
- 反 silent-failure 加固（backport from money）：stale lock auto-clear / 4 处 silent skip 写 audit log
- 新增 scripts/safe-grep.sh（grep 退出码区分 1 no-match vs 2+ error）

**§48 价值实证（首轮）**：v3.5 cross-review 找 3 bug（含 1 P1 shell injection）

PR：#4（merged b0309bd）

---

## [2026-05-07] v3.6.3 — SubagentStop hook 写 jsonl 而非污染 STATUS.md

**问题**：旧 SubagentStop hook 每次 sub-agent 完成就向 docs/ai-cto/STATUS.md 末尾 echo 一行时间戳，导致每次会话都污染主状态文件（已积累 7 行）。

**修复**：改写到 `.claude/agent-logs/${DAY}.jsonl`（gitignored，符合 §44 trajectory log 设计）+ 清理 STATUS.md 末尾 7 行历史污染。

PR：#3（merged 1ebb468）

---

## [2026-04-29] v3.6.2 — SessionStart hook 自动判断新项目 vs 继续项目

**用户反馈**：开新会话时如何让 ai-playbook 继续上次的项目记忆？

**问题**：v3.6.1 SessionStart hook 仅在文件存在时输出 CONSTITUTION + STATUS，**新项目**（无记忆）什么都不显示，用户不知道该跑 `/cto-start`。

**修复**：升级 hook 区分两种场景：

- **有记忆**（CONSTITUTION 或 STATUS 存在）：
  - 显式提示 "🔄 检测到 docs/ai-cto/ 项目记忆，自动恢复上下文..."
  - 加载 CONSTITUTION（head 150）+ STATUS（head 150）
  - **新增**：如有 REVIEW-QUEUE.md 末尾未审视的 §48 review，自动加载
  - 末尾提示：直接对话继续 / 或 `/cto-resume` 显式刷新

- **无记忆**（首次接入）：
  - 显式提示 "🆕 未检测到 docs/ai-cto/ 项目记忆"
  - 引导 `/cto-start`（第零轮）或 `/cto-init`（重新配置）

**17 个项目同步**：全部升级到 v3.6.2 SessionStart hook。

**当前 17 项目状态**：
- 10 项目已有记忆（AstralSolver / HanaNote / RotaAssist / aegis-panel / cm / dian / hayami-navi / mikalive / witch-gacha / yakuten）→ 直接打开会话即恢复
- 7 项目无记忆（FGO-py / SmartDesk-AI / better-genshin-impact / genshin-trophy / hoyokit / rvc-engine / rvc-pro）→ 首次开会话会看到引导提示

---

## [2026-04-29] v3.6.1 — hotfix: 业务路径 SSOT（aegis-panel 实战暴露的 bug）

**反向集成自 aegis-panel PR #118**。这是 §48 设计实证：用户在 aegis-panel 项目跑了一会，发现 codex-bridge 从未触发，REVIEW-QUEUE.md 一直空。诊断出 v3.6 的 generic 假设盲区。

- **改了什么**：
  - 新增 `scripts/business-paths.txt`（中央默认 + 各项目可 customize）
  - `run.sh` 第 47-56 行：从 hardcode 改为读 SSOT，含 fallback 兼容
  - handbook §48.7.1 文档化业务路径 SSOT + 实战诊断步骤
  - SKILL.md 加"两个 SSOT 对照"章节（forbidden = safety guard / business = trigger guard）
  - 17 个项目同步：
    - aegis-panel：保留已有自定义（dashboard/src/ hardening/ ops/ deploy/ tests/ app/）
    - dian：自动配置为 PHP 风格（actions/ admin/ api/ includes/ templates/ data/ database/）
    - witch-gacha：自动配置为 pnpm monorepo（apps/ packages/ functions/）
    - 其他 14 个：默认 generic + 注释建议路径
- **为什么**：
  - v3.6 把业务路径 hardcode 为 `^(src|app|lib|apps|packages)/`，generic 项目假设
  - aegis-panel 自研业务全在 `dashboard/src/` `hardening/` `ops/` — 行首匹配失败
  - 11+ 个业务 commit 全被 Stop hook silent skip — 用户看不到 codex review
  - 用户报告 + 修复 + 反向集成（dogfooding 闭环）
- **§48 设计实证**：
  - aegis-panel 修复后 force-trigger 一次 review，**Codex 抓到一个真实 P2 bug**：
    - `dashboard/src/modules/reality/components/audit-summary-card.tsx:121-122`
    - "空 audit 显示 worst_score=100" — security theater（误导性绿灯）
    - Claude 同会话 Phase 1 review 没抓到（只抓 worstGradeFor 漂移）
    - 跨模型独立审 → 抓到不同问题 — §48 价值印证
- **Eval 跑分前/后**：22 → 22（结构无变化，eval 仍在）

---

## [2026-04-29] v3.6 — Self-audit 实装补齐 + Codex 额度容错

继 v3.5（85/100）self-audit 暴露纸上设计后，按 plan v3.6 全 10 步执行。

- **改了什么**：
  - §44 Replay 从纸面落地：`.claude/agent-logs/.gitkeep` + PostToolUse hook 写最小 jsonl（仅 ts + type，不含 secrets）
  - `.agents/skills/codex-bridge/run.sh` v3.5 → v3.6（73 → 149 行）：
    - TOCTOU 防护：mkdir 原子锁 + trap 清理（POSIX-only，Windows 友好）
    - Markdown 注入防护：OUTPUT 包裹在 ` ```markdown ... ``` ` 代码块
    - **Codex 额度耗尽自动 fallback 到 Claude**（用户需求）：
      - 检测 `rate_limit / quota / 429 / 402 / insufficient` 等关键词
      - 写 `docs/ai-cto/.codex-quota-cooldown`（unix 时间戳）
      - 1 小时内重跑直接走 `claude -p` headless（--max-turns 5）
      - REVIEW-QUEUE.md 标注 `Reviewer: claude-fallback-opus` + ⚠️ "失去跨模型价值"警告
  - Forbidden 路径 SSOT：`scripts/forbidden-paths.txt`（12 项）+ run.sh 从此读
  - `scripts/check-forbidden-consistency.sh`：advisory 模式校验 SSOT 与手册 §32.1 一致性
  - README v3.5 → v3.6：command count 20 → 21（9 处替换）+ 新增"5 分钟 Smoke Test"章节
  - `.github/workflows/codex-review.yml` 顶部加 pull_request_target 安全警告
  - `scripts/install-pre-commit.sh`：可选脚本，让终端 `git commit` 也触发 §48
  - handbook §44.8 实装状态表格 + §48.5.1 额度耗尽容错小节
  - 3 个新 evals：020 trajectory-logging / 021 concurrency / 022 quota-fallback
- **为什么**：
  - v3.5 self-audit 发现 §44 是纸上设计、§47 LLM-as-Judge 是 placeholder、命令计数错误等差距
  - 用户需求：codex 额度耗尽自动 fallback 到 Claude，避免无 review 状态
  - 健康分从 92 跌到 85（实装覆盖度 65%）— v3.5 的"vibe shipping"反模式
- **Eval 跑分前/后**：19 → 22 条（+3）
- **影响范围**：
  - .claude/agent-logs/ 开始有真实日志
  - REVIEW-QUEUE.md 含 Reviewer 元字段（codex-gpt5.5 / claude-fallback-opus / ...）
  - codex 额度限制不再阻塞 review 链路

**关键认知**：v3.5 是负面教材 — 加了 6 章手册 + 5 项创新但实装跟不上，分数下跌。下次再扩展手册章节强制流程：spec → eval → impl → docs。

---

## [2026-04-29] v3.5 — 5 项前沿创新 + README 视觉重塑

继 v3.4 dogfooding（70.7→~92）后，按用户选择的 TOP-5 全量创新执行。

- **改了什么**：
  - 手册新增 §43-§48 共 6 个章节（约 900 行）
  - 新增 1 个 sub-agent（`reliability-auditor`）
  - 新增 3 个 slash commands（`cto-replay` / `cto-canary` / `cto-cross-review`）
  - 新增 1 个 cross-platform skill（`codex-bridge` 在 `.agents/skills/`）
  - 新增 4 个 GitHub Actions workflows（`eval.yml` / `canary.yml` / `llm-judge.yml` / `codex-review.yml`）
  - 新增 1 个 manifest 文件（`.agents/skills-manifest.json`）
  - 新增 7 条 evals（013-019）
  - settings.json Stop hook 加 cross-review 触发链路
  - .mcp.json 加 codex MCP server lazy 配置
  - **README.md 视觉重塑**：113 行 → 250+ 行（banner / 8 badges / Mermaid / 对比表 / 三层导航 / Star History / v3.5 创新表）
  - docs/assets/architecture.mmd（架构 Mermaid 源文件）
- **为什么**：
  - §43 ARE：从"设计 + 测试"升级到"生产可靠性 + SLO"
  - §44 Replay：让 LLM 非确定性可审计
  - §45 Canary：改 CLAUDE.md/hooks 不再是直推 prod
  - §46 Manifest：跨工具 skill 互操作合同
  - §47 CI/CD：铁律 #12 真正机器化执行
  - §48 Cross-Review：用户实际需求 — Claude 完成任务自动 → Codex 跨模型审
  - README：当前漏报 6 项核心功能，跳出率高
- **Eval 跑分前/后**：12 → 19 条（+7）
- **影响范围**：17 个下游项目同步新 commands；GitHub Actions 让铁律 #12 在 CI 层强制；§48 让 Claude / Codex 跨模型自动协作

---

## [2026-04-29] v3.4 dogfooding — 自审与首次 changelog

由本仓库自身的 `harness-auditor` / `vibe-checker` / 通用一致性 sub-agent 并行审计后修复。

- **改了什么**：
  - 创建 `docs/ai-cto/HARNESS-CHANGELOG.md`（本文件）+ `STATUS.md`
  - 修复 5 处过期章节声明：`templates/AGENTS.md` `templates/GEMINI.md` `templates/CLAUDE.md` `.claude/commands/cto-audit.md` `.claude/commands/cto-relink-all.md` 中遗留的 §1-§28 / §1-§29
  - §33 "91.5% / Karpathy" 等无源引用改为保守措辞 + 标注来源类型
  - 新增 4 个 eval yaml（009-012）：cto-spec / cto-link / cto-image / hooks-flow
  - CLAUDE.md 加"4 个 audit 命令决策树"
- **为什么**：harness-auditor 给出 70.7/100，发现的 6 项改进有 5 项是 P0 / P1（缺 changelog / 缺 STATUS / 过期章节 / 数据未引用 / eval 覆盖不足）
- **Eval 跑分前/后**：本次预计从 70.7 → ~92（+21）
- **影响范围**：所有引用 ai-playbook fallback 模板的下游项目都会拿到更准确的章节范围；4 个新 eval case 让铁律 #12（无 eval 不进 main）真正可验证

---

## [2026-04-28] v3.3 — Claude Code 原生对齐

- **改了什么**：
  - 17 commands 全补 frontmatter（name / description / argument-hint / allowed-tools / model）
  - 新增 3 sub-agents：`harness-auditor` / `eval-runner` / `vibe-checker`
  - Skills 复制到 `.claude/skills/`（与 `.agents/skills/` 双位置 + SHA 同步 hook）
  - 新增 `.claude/rules/` 三个路径触发文件（forbidden-paths / test-lock / eval-gate）
  - 新增 `.claude/output-styles/cto.md` + `.claude/statusline.sh`
  - 新增 `.mcp.json`（lazy 加载）+ `enabledMcpjsonServers: []`
  - 新增 hooks：SubagentStop / PreCompact / Skills SHA 校验
  - handbook §42 Sub-agents 实战
- **为什么**：3 个 Explore + 1 个 Plan sub-agent 反馈"手册写了多代理但项目零实施"；17 commands 零 frontmatter
- **影响范围**：17 个下游项目同步

## [2026-04-28] v3.2 — Hooks 自动化

- 6 类 hooks 接管 5 个高频命令的检测时机：SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / Stop
- 命令数减少？不，但典型工作流 9 命令 → 4 命令
- handbook §41

## [2026-04-28] v3.1 — Vibe / Harness / Eval / Self-Healing / Constitution

- handbook §33-§37 五个新章节
- 加铁律 #12 / #13 / #14
- 新增 5 个斜杠命令（vibe-check / harness-audit / eval / constitution / spec 升级三段）

## [2026-04-28] v3.0 — 现代化升级

- 手册从 §1-§28 扩到 §1-§32（+509 行）
- §5.0 Claude Code 全功能展开（Hooks / Skills / Sub-agents / MCP / Settings / Permissions）
- §5.1 Antigravity 2.0 / §5.2 Codex gpt-5.5 + AGENTS.md 修正
- §27 WCAG 2.1 → 2.2 / §28 + PIPL / §25 OTel + LLM 观测
- 新增 §30 Security / §31 Performance / §32 AI Review 边界

## [2026-04 v2.x] — Claude Code 本地优先架构（GenSpark → Claude Code 迁移）

- 三个 part 文件合并为 handbook.md
- prompts/ → .claude/commands/
- 新增 CLAUDE.md 主提示 + templates/CLAUDE.md
