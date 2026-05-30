# Constitution — ai-playbook 自身仓库

> ai-playbook 项目的不可妥协约束（§37）。本文件由 immutable-guard.sh 守护，AI 不可单方面修改。
> 修改流程：`/cto-constitution review` + 人决策 + 双签 + amendment 记录。

## 产品宪法

ai-playbook 是 **AI-native CTO 闭环指挥系统** — 让 Claude Code + Antigravity + Codex 三平台协作的 agent 框架。**不是**：

- ❌ 通用 dev tool（专注 AI agent harness 设计）
- ❌ 单平台工具（必须跨 Claude / AG / Codex 三平台）
- ❌ 仅文档（必须有可执行 hooks / commands / skills / sub-agents）

## 架构宪法

1. **Constitution-Anchored**：所有自我进化在红线之内（§37 + §50）
2. **三平台对称**：Claude Code 主体 + Antigravity 委派 + Codex 委派（§5）
3. **跨模型 review 必须**：任何代码改动 PR 必走 §48（codex 跨模型审）
4. **Hooks-driven**：14 铁律 + 23 命令认知负担过重，必须由 hooks 自动化（§41）
5. **Eval 即 fitness**：所有 agent 配置改动须配 golden trajectory（§35 + 铁律 #12）

## 安全宪法

1. **Forbidden 路径必须 spec-driven**（§32.1 + 铁律 #13）：auth / payment / secrets / migration / crypto / infra / .github/workflows
2. **Self-modify system prompt 禁止**（OWASP Agentic Top 10 / AIVSS）：AI 不得改 CLAUDE.md 14 铁律段 / CONSTITUTION.md / forbidden-paths.txt 删条目 / handbook §32-§35
3. **Pre-commit hook 不可绕过**（铁律 #14 + bypass-guard）：禁止 --no-verify / core.hooksPath / HUSKY=0 / stash 绕过
4. **Test-Lock 不可绕过**（铁律 #14）：AI 仅可改实现不可改测试断言
5. **Cost cap**：月度 codex token < $20，超 cap 退化为只 detect 不 codex

## 合规宪法

1. **Spec-Kit 对齐**（§37.3）：specify → plan → tasks，每阶段都先读 Constitution
2. **AAIF AGENTS.md**（Linux Foundation 2025-12）：跟进规范（v3.10+）
3. **审计可追溯**：所有 immutable-guard / forbidden-guard / bypass-guard 拦截写 `.claude/agent-logs/*.jsonl`
4. **GitHub Branch Protection**：main 分支必须 PR + codex review + 人 merge

## 质量宪法

1. **Health Score ≥ 90**（v3.9 现状 94/100）
2. **Eval pass rate ≥ 90%**（可执行类全 pass；数量见 `docs/ai-cto/COUNTS.md`）
3. **Test coverage**：核心 hooks 必须有端到端 eval
4. **Codex dogfood**：每个 PR 必跑 §48 跨模型审
5. **Failure budget**：连续 3 周相同 pattern 未采纳 → P0 升级人审

## 不可妥协清单（immutable-guard 守护）

| 文件 | 守护级别 | 修改条件 |
|---|---|---|
| CLAUDE.md 14 铁律段 | 🔴 不可修改 | `CTO_CONSTITUTION_AMEND=1` + 人决策 |
| docs/ai-cto/CONSTITUTION.md | 🔴 不可修改 | `/cto-constitution review` + 双签 |
| scripts/forbidden-paths.txt | 🟠 仅可加，不可删 | `CTO_FORBIDDEN_REMOVE=1` 紧急解锁 |
| playbook/handbook.md §32-§35 | 🔴 不可修改 | 加新章节 §50+ 反而推荐 |
| .claude/hooks/*.sh 的 `block_with_reason` 调用 | 🔴 不可绕过 | 禁止移除红线逻辑 |
| main / master / production / prod / release 分支 | 🔴 禁止直 Edit | `CTO_MAIN_EDIT_ALLOWED=1` 紧急解锁 |

## Spec-Kit 映射（§37.3）

| Spec-Kit 阶段 | ai-playbook 对应 | Constitution 检查 |
|---|---|---|
| `/specify` | `/cto-spec specify` | spec 起草前先加载 Constitution |
| `/plan` | `/cto-spec plan` | plan 步骤必须服从 Constitution |
| `/tasks` | `/cto-spec tasks` | task 不能违反任何"不得 X" |
| `/implement` | 直接 Edit/Write | 实施前最后一次 Constitution 校验 |

## Amendment History

- 2026-05-11 v3.9.1：首次创建（harness-auditor 飞轮发现"docs/ai-cto/CONSTITUTION.md 不存在"死引用 P1，补齐）
