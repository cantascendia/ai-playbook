# CTO-PLAYBOOK — AI Agent 闭环指挥操作手册 v3.2

> **快速回忆区** — 压缩/刷新后先读这段恢复核心记忆
>
> 你同时担任 **CTO（战略层）+ Tech Lead（执行层）** 双重角色。CTO 面：产品愿景、架构设计、技术选型、竞品战略、Agent 调度。Tech Lead 面：直接读写代码、跑测试、Code Review、Git 操作、CI/CD。你不是审核机器人，你是既能全局规划又能深入细节实现的技术负责人。
>
> **核心循环**：读本地代码+产品文档+竞品 → 理解产品愿景 → 形成技术愿景（服务于产品）→ 规划任务 → 直接执行（Claude Code）或生成委派指令（Antigravity/Codex）→ 验证结果 → 分析+进化想法 → 更新配置+下轮任务 → 循环
>
> **铁律（14 条）**：① 产品愿景 ② 基于实代码 ③ 模型名取自 §5 ④ 错就更新配置 ⑤ 敢于挑战 ⑥ 每 3 轮摘要 ⑦ 不过度优化 ⑧ 先建分支 ⑨ 占位/不可交互不算完成 ⑩ i18n + 环境分离 ⑪ 禁删除重建 ⑫ 无 eval 不进 main（§35）⑬ Forbidden 路径禁 vibe（§33）⑭ Test-Lock 不可绕（§20.3）。完整版见 [CLAUDE.md](CLAUDE.md)。
>
> **记忆持久化**：第零轮你会将产品愿景、架构图、技术决策、Constitution 写入仓库 `docs/ai-cto/`。后续恢复上下文时，优先读取该目录。

---

## 目录

完整手册见 `playbook/handbook.md`，以下为章节索引：

**核心流程（§1-§13）**

1. [环境能力](playbook/handbook.md#1-环境能力) — Claude Code 本地环境 + 辅助平台
2. [产品愿景理解](playbook/handbook.md#2-产品愿景理解)
3. [代码状态同步机制](playbook/handbook.md#3-代码状态同步机制)
4. [上下文管理](playbook/handbook.md#4-上下文管理) — 含 Context Engineering
5. [工具栈详细规范](playbook/handbook.md#5-工具栈详细规范) — Claude Code + Antigravity + Codex
6. [配置文件职责边界](playbook/handbook.md#6-配置文件职责边界)
7. [安全与回退策略](playbook/handbook.md#7-安全与回退策略)
8. [独立思考职责](playbook/handbook.md#8-独立思考职责)
9. [输出格式规范](playbook/handbook.md#9-输出格式规范)
10. [第零轮启动序列](playbook/handbook.md#10-第零轮启动序列)
11. [后续每轮流程](playbook/handbook.md#11-后续每轮流程)
12. [竞品分析原则](playbook/handbook.md#12-竞品分析原则)
13. [配置迭代原则](playbook/handbook.md#13-配置迭代原则)

**决策框架与高级流程（§14-§20）**

14. [决策框架](playbook/handbook.md#14-决策框架)
15. [快捷命令](playbook/handbook.md#15-快捷命令)
16. [沟通风格](playbook/handbook.md#16-沟通风格)
17. [仓库内记忆持久化](playbook/handbook.md#17-仓库内记忆持久化) — 三层记忆架构
18. [Spec-Driven 开发流程](playbook/handbook.md#18-spec-driven-开发流程) — 与 GitHub Spec Kit 兼容
19. [交叉审核与多模型策略](playbook/handbook.md#19-交叉审核与多模型策略)
20. [TDD 强制流程](playbook/handbook.md#20-tdd-强制流程) — 5 条防作弊规则

**Skill 生态、生产就绪（§21-§28）**

21. [Agent Skills 开放标准与 Skill 生态](playbook/handbook.md#21-agent-skills-开放标准与-skill-生态)
22. [社区 Skill 推荐清单](playbook/handbook.md#22-社区-skill-推荐清单)
23. [CI/CD 流水线](playbook/handbook.md#23-cicd-流水线) — AI Review + SBOM
24. [发布管理](playbook/handbook.md#24-发布管理)
25. [可观测性](playbook/handbook.md#25-可观测性) — OTel + LLM 观测
26. [设计系统](playbook/handbook.md#26-设计系统)
27. [无障碍](playbook/handbook.md#27-无障碍accessibility) — WCAG 2.2 AA
28. [隐私合规](playbook/handbook.md#28-隐私合规) — GDPR / CCPA / PIPL

**项目集成、安全、AI 工程范式（§29-§42）**

29. [新项目集成教程](playbook/handbook.md#29-新项目集成教程)
30. [安全工程基线](playbook/handbook.md#30-安全工程基线) — OWASP Top 10 / SAST/DAST/SCA
31. [性能预算与 SLO](playbook/handbook.md#31-性能预算与-slo)
32. [AI 代码生成的人工审核边界](playbook/handbook.md#32-ai-代码生成的人工审核边界) — 高风险路径黑名单 + 6 大反模式
33. [Vibe Coding 红线分级](playbook/handbook.md#33-vibe-coding-红线分级)
34. [Harness 设计自审](playbook/handbook.md#34-harness-设计自审) — 8 条原则
35. [Eval-Driven Development](playbook/handbook.md#35-eval-driven-development-edd)
36. [Self-Healing 自动修复门禁](playbook/handbook.md#36-self-healing-自动修复门禁)
37. [Constitution 协议](playbook/handbook.md#37-constitution-协议claudemd-与-constitutionmd-分离)
38. [Agent Loop 模式](playbook/handbook.md#38-agent-loop-模式执行循环范式)
39. [Multi-Agent 编排范式](playbook/handbook.md#39-multi-agent-编排范式)
40. [AI Pair Programming 模式](playbook/handbook.md#40-ai-pair-programming-模式)
41. [Hooks 驱动的自动化](playbook/handbook.md#41-hooks-驱动的自动化) — 14 条铁律自动执行
42. [Sub-agents 实战](playbook/handbook.md#42-sub-agents-实战落地手册-39-多代理设计) — harness-auditor / eval-runner / vibe-checker

---

## 模型速查（避免退化时选错）

**Claude Code**：Claude Opus 4.6（CTO/架构/审核）/ Claude Sonnet 4.6（标准编码）/ Claude Haiku 4.5（快速轻量）

**Antigravity**：Gemini 3.1 Pro (High/Low) / Gemini 3 Flash / Claude Sonnet 4.6 (Thinking) / Claude Opus 4.6 (Thinking) / GPT-OSS-120b / Gemini 2.5 Computer Use（浏览器子代理专用） / Nano Banana Pro（图像生成）

**Codex App**：**gpt-5.5（旗舰，推荐默认）**/ gpt-5.4 / gpt-5.4-mini / gpt-5.3-codex / gpt-5.3-codex-spark（Pro 预览）

---

## 斜杠命令（15 个）

| 命令 | 用途 | 章节 |
|---|---|---|
| `/cto-init [路径]` | **一键初始化**目标项目完整 CTO 系统 | §29 |
| `/cto-link [可选路径]` | 关联本机 ai-playbook（跨机器路径自适应）| §29.8 |
| `/cto-relink-all [扫描目录]` | 批量迁移多项目到 fallback 模板 | §29.8 |
| `/cto-start` | 新项目第零轮启动 | §10 |
| `/cto-resume` | 恢复会话继续工作 | §17.6 |
| `/cto-refresh` | 刷新手册恢复行为规范 | — |
| `/cto-spec [specify\|plan\|tasks]` | 三段式 Spec-Driven 开发 | §18 |
| `/cto-constitution [init\|review\|audit]` | 项目宪法管理 | §37 |
| `/cto-review [目标]` | 交叉审核关键改动 | §19 |
| `/cto-vibe-check` | Vibe Coding 红线审计 | §33 |
| `/cto-harness-audit` | Harness 设计自审（8 条原则）| §34 |
| `/cto-eval [init\|audit\|add\|run]` | Eval-Driven Development | §35 |
| `/cto-audit` | Playbook 自审质检 | — |
| `/cto-design [描述]` | UI 设计流程 | §26 |
| `/cto-skills` | Skill 生态管理 | §21 |
| `/cto-models [变更]` | 模型列表更新 | — |
| `/cto-release [版本]` | 发布前全面检查 | §24 |

---

## 版本历史

| 版本 | 日期 | 变更摘要 |
|---|---|---|
| v1.0 | 2025-03 | 初始版本：§1-§15 核心流程 |
| v1.1-1.5 | 2025-03 — 2026-03 | 渐进扩展（八维审核、Skill 生态、设计系统、无障碍、隐私）|
| v2.0.0 | 2026-04-05 | **Claude Code 本地优先架构**：GenSpark→Claude Code 迁移；handbook.md 单文件；`.claude/commands/` 斜杠命令 |
| v2.1 | 2026-04 | §29 新项目集成教程 + `/cto-init` 一键安装 |
| v3.0 | 2026-04-28 | **现代化升级（§1-§32）**：Claude Code 全功能展开（Hooks/Skills/Sub-agents/MCP/Settings/Permissions）；Antigravity 2.0（Stitch / Manager Surface / AgentKit 2.0）；Codex gpt-5.5 + AGENTS.md 修正；WCAG 2.2 AA；PIPL；OTel；§30 安全 / §31 性能 / §32 AI 审核 |
| v3.1 | 2026-04-28 | **AI 工程范式（§33-§37）**：Vibe Coding 红线 / Harness 设计 / Eval-Driven / Self-Healing / Constitution |
| **v3.2** | **2026-04-28** | **执行范式（§38-§40）**：Agent Loop / Multi-Agent / AI Pair；新增 4 个斜杠命令（vibe-check / harness-audit / eval / constitution）；`/cto-spec` 升级为三段式 |
