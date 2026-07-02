# v4.0 裁决书 — Agent-Native Runtime（2026-07-02）

> 承接 v3.14 bold-audit 裁决（`REDESIGN-PROPOSAL-2026-06-10-bold-audit.md`，「混合重构不推倒重来」）。
> 本轮由 Fable 5 主脑 + Opus 4.8 编队执行：7 代理全仓扫描 → 3 代理 hook 行为规格提取 →
> 2 对抗审查（scope + cutover）→ 裁决。全程 evaluator-grounded（doctor 实跑 32 eval / check-counts）。

## 1. 扫描结论（修正了两个既有假设）

| 发现 | 等级 | 说明 |
|---|---|---|
| `.github/workflows/eval.yml` **已存在且真跑** | ✅ | 「缺 CI eval gate」假设错误；真缺口是 push-不走-PR 只靠未安装的 pre-commit |
| enforcement 层可自我篡改 | 🔴 P0 | CONSTITUTION:53 声称 hooks block 逻辑不可移除，但无任何 guard 守 `.claude/hooks/**` |
| cto-init 全新安装不复制 settings.json / statusline / output-style | 🔴 P0 | hooks 落盘但从未接线 → 新项目红线层全哑（§3d 目标直接落空）|
| branch-guard 不看 Bash | 🟠 P1 | `git commit/push` 直上 main 无拦截（铁律 #8 漏洞）|
| SessionStart 盲注入 68KB REVIEW-QUEUE tail-100 | 🟠 P1 | PENDING 判定数的是报告小节标题，恒 >0 |
| 记忆契约虚假：cto-resume/CLAUDE.md 承诺 7 个不存在的文件 | 🟠 P1 | 反模式 #3 幻觉放大源 |
| Windows bash 性能实测：单 guard 启动 ≈1.5s（node ≈105ms）| 📊 | 每次 Edit 付 4×bash ≈6s 税；引擎 14×/guard 加速 |

## 2. 裁决：三 PR 序列（scope 对抗审查采纳项）

**PR-A `v4.0a` — 分发 + 记忆（零风险、产品价值最高，先合）**
cto-init P0 修复（templates/settings.json + statusline + output-style + agents/rules 复制）；
SessionStart 装载器手术（最近一条 review 替代盲 tail-100，模板层）；REVIEW-QUEUE 季度轮转 →
`docs/ai-cto/archive/`（DGM lineage 只轮转不删除）；COUNTS 自相矛盾修复；STATUS 全量刷新；
记忆契约诚实化 + DECISIONS.md（ADR）落地；CTO-PLAYBOOK.md（v3.2 陈旧索引）/ AUTOPILOT-KICKOFF（孤儿）退役归档；
陈旧引用修复（harness-auditor/vibe-checker → `cto-audit --harness|--vibe`）。
本 PR 同时 subsume 悬置的 open PR #32/#33/#34/#36（内容已并入分支基底）。

**PR-B `v4.0b` — Guard Engine 纯平价移植（v3.14 阶段 1 授权范围内）**
10 个 bash guard → `.claude/hooks/engine/{guard,lib,guards}.mjs`（Node 22，JSON.parse 根除 sed
解析器 bug 类 + Windows 路径 JS 规范化）。`.sh` 变 **legacy-in-file shim**：顶部探测 node →
exec 引擎；node 缺失或 `CTO_GUARD_ENGINE=legacy` → 原 v3.15 实现原地回退（**零红线真空**，
v3.14 阶段 1 硬条件；且 eval 042/046/047/051 的源码 grep 断言在回退路径中合法保持为真——
不是 eval-gaming，回退路径真实使用这些函数）。31 条 node:test 单测移植全部历史回归
（v3.9.1 Win 路径 / v3.11 转义引号 / v3.12 字面量 \n / v3.10.2 echo carve-out / v3.11.1 MCP path 字段 /
eval 042 脱敏），32 条 golden-trajectory eval 原封不动作为平价验收门。
`.gitattributes` 先行加 `*.sh`/`*.mjs` `text eol=lf`（cutover 审查 MUST 项）。
**严禁在本 PR 混入任何新 enforcement 语义**（对抗审查 P0：新行为不得搭平价门的便车）。

**PR-C `v4.0c` — 新 enforcement 语义（🔴 forbidden 级，需人双签后 merge）**
1. branch-guard 扩展 Bash matcher：解析真实 git 子命令（非子串匹配）+ push refspec 判定 +
   引号/heredoc 剥离 + 专用 false-positive eval（`gh pr create --body "...git commit..."` /
   `git log --grep` / `echo` / HEAD=main 但 push feature 分支 — 全部必须放行）。
2. guard 自保护：Write/MultiEdit 整文件覆写 `.claude/hooks/**`（self 仓）无 `CTO_GUARD_AMEND=1`
   即 block（镜像 immutable-guard 的 Edit-vs-Write 区分，单 Edit 精修不受阻 — 保住「修 guard bug
   顺手 sweep 兄弟」的主进化路径）。落实 CONSTITUTION:53 的既有声明。
3. 配套 eval + `requires-double-review` 标签。**merge 前提：人签**（本轮编排者 7 月 7 日后不在，
   不自授权 forbidden 级语义变更）。

## 3. 明确延后（含理由）

| 项 | 去向 | 理由 |
|---|---|---|
| `.github/workflows` 任何改动（llm-judge forbidden 正则漂移 / eval.yml setup-node / push-gap 加固）| SPEC 草案 + 人双签 follow-up | forbidden 路径（铁律 #13），docs/ai-cto/SPEC.md 尚不存在 |
| Plugin 化分发 | 先验证再落（`claude plugin` 本地装载实测通过才进仓）| scope 审查裁定「半实验 = churn」；插件边界已查证：commands/agents/skills/hooks/output-style 可打包，rules/statusline/记忆种子留 init |
| 飞轮 5 sub-agent → 2 合并 | v3.14 阶段 2 原计划，PR-D 候选 | 已获 3 方案 +1 审计投票，但触面大，不与本轮耦合 |
| handbook → reference/ 不分发 | 同上阶段 2 | F1 判决已成立，执行留待命令/计数联动改 |
| 4 个 file-guard 合并为单次 dispatch（性能 4×→1×）| 引擎平价绿后的 follow-up | 需改 settings.json + 重写直调 eval，不与平价门耦合 |

## 4. 人需拍板清单

1. **PR-C 双签**：branch-guard-Bash + guard 自保护两条新红线语义。
2. **self 仓 settings.json 应用**：本会话 harness 拒绝 agent 改自身启动配置（正确行为）——
   人从 `templates/settings.json` 复制两条 SessionStart command 字符串到 `.claude/settings.json`
   （或直接整文件覆盖，两文件仅此差异）。
3. **宪法修正案**：`AMENDMENT-PROPOSAL-2026-07-02-platform-scope.md`（三平台对称 → Claude-native
   主体 + AG/Codex opt-in，对齐 v3.13 已发生的现实）。
4. **CI follow-up 授权**：是否起草 SPEC 并放行 eval.yml/llm-judge.yml 三处小修。
