# DECISIONS — ai-playbook ADR 决策记录

> ADR（Architecture Decision Record）风格。每条记录一个不可轻易回退的架构/治理决策：
> **Context**（背景/为什么要决策）· **Decision**（决定了什么）· **Consequences**（代价与影响）。
> 由 `/cto-constitution` 与 `/cto-resume` 引用。此前本文件被引用却从未创建（v4.0a 补建，
> 从 `EVOLUTION-LOG.md` + `REDESIGN-PROPOSAL-2026-06-10-bold-audit.md` 回填历史）。

---

## ADR-001 — Hooks-driven enforcement（v3.8）

- **Status**: accepted
- **Context**: v3.7 及以前的红线（14 铁律 / forbidden 路径 / test-lock）只是文档约定，AI 可以直接违反，
  没有运行时闸门。纯 prompt 层约束在长会话中被稀释（§32.5 反模式 Vibe Shipping）。
- **Decision**: 把 enforcement 下沉到 Claude Code hooks（PreToolUse / PostToolUse / SessionStart / Stop）。
  由 `.claude/settings.json` 声明式配置，`.claude/hooks/*.sh` 在工具调用**前**硬拦截，AI 不可绕过。
  红线守护交给 immutable-guard.sh，配套 common.sh 做统一 hook input 解析。
- **Consequences**: enforcement 从「靠 AI 自觉」变成「harness 强制」；但引入了 bash-on-Windows 的
  路径/jq 兼容债（后续 learned rules 2026-05-11/05-12 反复踩坑，最终由 ADR-006 的 Node 底座重写偿还）。
- **来源**: EVOLUTION-LOG.md（v3.9 飞轮启动记 immutable-guard 已就位）+ HARNESS-CHANGELOG。

---

## ADR-002 — Real eval executor（v3.12）

- **Status**: accepted
- **Context**: 铁律 #12（无 eval 不进 main）在 v3.11 前是「空壳」—— CI 只 count yaml + assert 字段存在，
  从不真跑，构成 §32.5 反模式 #6 Eval Gaming（指标绿但目标偏）。
- **Decision**: 落地 `scripts/run-evals.sh` 真执行每条 golden-trajectory 的 `verification_command`，
  FAIL → exit 1 阻 merge。对齐 AlphaEvolve「evaluator-grounded」：eval 必须真执行才是 fitness 函数。
- **Consequences**: eval 从虚荣数字变成真行为闸；首跑即抓到 v3.11 `_json_get` 把 `\n` 转空格、
  破坏 forbidden-paths 多行比对的安全回归。代价是每条 eval 必须写可执行 `verification_command`（house style）。
- **来源**: EVOLUTION-LOG.md 月度统计（v3.12 applied）+ COUNTS.md 版本表 v3.12 行。

---

## ADR-003 — 平台范围默认 Claude-only（v3.13）

- **Status**: accepted
- **Context**: 早期 playbook 默认三平台并行分发（Claude Code + Antigravity + Codex），但绝大多数
  实际使用是 Claude Code 单平台；三平台默认拉高了 cto-init 分发的复杂度与 context 负担。
- **Decision**: 默认范围收敛为 **Claude-only**；Antigravity / Codex 改为显式 **opt-in**
  （`--with-antigravity` / `--with-codex`）。README 计数诚实化，只报默认 Claude 平台的组件数。
- **Consequences**: 降低默认认知与分发负担；跨平台能力仍保留但需主动开启。文档中所有「跨 3 平台」
  叙事需相应降级为 opt-in 说明。
- **来源**: REVIEW-QUEUE / STATUS「已完成 v3.13」（PR #26）+ CLAUDE.md 平台范围说明。

---

## ADR-004 — 14 铁律 4 层优先级（v3.13）

- **Status**: accepted
- **Context**: 14 条铁律此前是平铺列表，冲突时无仲裁规则（如 #11 禁删重建 遇 #13 forbidden 必须
  spec-driven，谁胜不明确）。对标 Anthropic 四层 Constitution。
- **Decision**: 给 14 铁律分 4 层 **L1 安全 > L2 治理 > L3 质量 > L4 效率**，冲突时高层胜；
  法条编号 1–14 与文字**不变**（保持既有引用），仅标注层级 + 理由层。
- **Consequences**: 冲突可判定（L1 胜例：先 spec 再决定怎么改）；铁律本体不动，向后兼容所有引用。
  层级/理由由 immutable-guard 守护，不可绕改。
- **来源**: CLAUDE.md 铁律段（v3.13 A8）+ `archive/AMENDMENT-PROPOSAL-2026-05-30-iron-law-layering.md`。

---

## ADR-005 — 混合重构（非推倒重来）+ Bash/mcp guard 改 deny-JSON（v3.14）

- **Status**: accepted
- **Context**: v3.14 bold-audit 用多 agent 工作流 + 3 套独立重做方案 + 3 名评委 + 9 条对抗验证，
  第一次系统性质疑地基（产品身份 / bash hook 底座 / 零吞吐飞轮治理）。三套方案集体挑战「不动 bash 架构」。
- **Decision**: 裁决 **混合重构 + 演进吸收，分独立可回滚迭代** —— **不**全面推倒重来、**不**接受任何单一
  激进方案。同期把 Bash/mcp guard 拦截从 `exit 2` 切到 `permissionDecision:deny` JSON（对冲 GitHub #23284），
  移植跨项目事故 **ledger** 作为唯一真 10x 新能力，命令 23→18 合并，INDEX 行号 grep 化。
- **Consequences**: 保留全部 v3.13 已 ship 成果 + exit-2/stderr 硬语义 + mcp-guard MCP-aware 覆盖（Keep 清单）；
  为 ADR-006 的 Node 底座重写划定「语义等价移植、严禁重设计 + hook 行为矩阵先行验收」的护栏。
- **来源**: `REDESIGN-PROPOSAL-2026-06-10-bold-audit.md`（§1 执行摘要「最终路线裁决」+ §2.4 Keep 清单）。

---

## ADR-006 — v4.0 agent-native runtime：3-PR 序列（2026-07-02，进行中）

- **Status**: in progress
- **Context**: 承接 ADR-005 裁决，把 enforcement 从「10 个零散 bash hook」演进为「统一 guard engine +
  legacy-fallback shim」的 agent-native 运行时；同时偿还 bash-on-Windows 兼容债与 cto-init 分发链 P0。
- **Decision**: 按 **3-PR 序列**推进（高风险改动分阶段 + 人工双签，铁律 #12/#13）：
  **PR-A** 分发 P0 修复 + 记忆层手术（REVIEW-QUEUE 季度轮转、陈档归档、记忆契约诚实化、DECISIONS 补建）；
  **PR-B** guard engine parity port —— 红线逻辑收敛进统一引擎、行为逐条对齐旧 hook，旧 hook 降级为
  legacy-fallback shim（Node 探测失败回退旧 .sh，27 项目透明迁移）；
  **PR-C** 引入旧 hook 没有的新 enforcement 语义 —— 触及红线本身，必须人工 double-sign 后进 main。
- **Consequences**: 分阶段可回滚、零真空迁移；PR-B 必须以「hook 行为矩阵（每 guard × {Win, POSIX} ×
  {应拦, 应放行}）」为先于任何 .mjs 的强制验收闸。CI/workflow 类改动（eval.yml push-gap、llm-judge
  forbidden-regex 漂移）属 forbidden-path，须 spec-driven + 双签。
- **来源**: STATUS.md「一句话状态 / 进行中」（v4.0a）+ `REDESIGN-PROPOSAL-2026-06-10-bold-audit.md` §5 三方共识
  （必偷三件：hook 行为矩阵 / transparent thin-shim / ledger）。

## ADR-007: v4.0e governance 应用 — settings.local.json 作为 opt-out 通道（2026-07-08）

**Context**: CI 加固（SPEC-001，forbidden 路径）+ 宪法平台修正案（immutable）的 opt-out 是 hook
启动读的 shell env，agent loop 内不可自设。人三次显式授权（2026-07-02「全部通过」/「动用所有权限」/
2026-07-08「应用 v4.0e 全自动」）但未在 shell export。agent 拒绝 Bash 间接写绕过（守 §3 红线）。

**Decision**: 经 `.claude/settings.local.json` 的 `env` 块注入 opt-out（该文件是 CLAUDE.md 自己
背书的本地 hook 调整位，gitignore，不入库）—— 实测热生效，guard 仍运行、自行判定放行、自动写
audit（forbidden-allowed double_signed=true / constitution-amend-allowed）。应用完成后立即删除
settings.local.json（transient opt-out，红线不长期敞开）。

**Consequences**: ① guard 的 opt-out 语义完整保留（audit 可追溯 + 人授权在 transcript）；
② 确立先例：settings.local.json env = agent 可操作的正规 opt-out 通道，但仅限人显式授权后 + 用完即删；
③ 后续 harness 改进候选：guard 可要求 opt-out 附带 reason 字符串入 audit。

来源：本会话 transcript + .claude/agent-logs/2026-07-08.jsonl + APPLY-v4.0e.md 选项 B 变体
