# Handbook 章节索引（handbook-search skill 入口）

> handbook.md 数千行不可全读。**定位方式（v3.14：grep 运行时定位，不再硬编码行号）**：
>
> 1. 查下表得章节号（如 §32）。
> 2. `grep -nE '^## 32\.' playbook/handbook.md`（子节用 `^### 32\.1`）得起始行 L。
> 3. `Read(playbook/handbook.md, offset=L, limit=120)` 精读；不够再续读。
>
> 为什么不写行号：行号随每次编辑漂移，维护必失准（v3.14 bold-audit 实测 INDEX 行号已偏 20-30 行）。
> grep 永远准、零维护。本表只维护**语义映射**（场景/章节/铁律/反模式 → §号），不碰行号。

## 按场景查（最常用）

| 场景 | 该读 |
|---|---|
| 用户提到 "spec-driven" / "怎么写 spec" | §18 |
| 触及 forbidden 路径 (auth/payment/secrets/migration) | §32 / §32.1 |
| 触及测试文件，"改测试让它通过" | §20 / §20.3 |
| "vibe coding" / "yolo" / "skip tests" 关键词 | §33 红线分级 |
| "无 eval 不进 main" / 改 prompt 类文件 | §35 EDD |
| 跨模型 review / codex 审 / "第二模型" | §19 + §48 |
| Constitution 起草 / 项目宪法 | §37 |
| Hooks 配置 / 自动化 / "怎么设 hook" | §41 |
| Sub-agent 设计 / harness-auditor 等 | §39 + §42 |
| 分发档位 / 装到子项目 / self vs subproject | §49 |
| Trajectory replay / 调试 / 重放 | §44 |
| Canary 部署 / feature flag rollback | §45 |
| LLM-as-Judge / CI 双 judge（建议非阻断）| §47 |
| **自我进化飞轮 / "AI 改自己"** | **§50** |
| 第零轮启动 / 新项目接入 | §10 + §29 |

## 按章节号（章节清单 — 用 grep 定位行）

> `grep -nE '^## N\.' playbook/handbook.md` 取行号。§号连续 §1-§50（§49 = 分层分发，v3.13 补）。

| § | 标题 |
|---|---|
| 1 | 环境能力 |
| 2 | 产品愿景理解 |
| 3 | 代码状态同步机制 |
| 4 | 上下文管理 / Context Engineering（含 §4.2 禁压清单 / §4.5 Compaction API）|
| 5 | 工具栈详细规范（Claude/AG/Codex 三平台）|
| 6 | 配置文件职责边界 |
| 7 | 安全与回退策略 |
| 8 | 独立思考职责 |
| 9 | 输出格式规范 |
| 10 | 第零轮启动序列 |
| 11 | 后续每轮流程 |
| 12 | 竞品分析原则 |
| 13 | 配置迭代原则 |
| 14 | 决策框架 |
| 15 | 快捷命令 |
| 16 | 沟通风格 |
| 17 | 仓库内记忆持久化 |
| 18 | Spec-Driven 开发流程 |
| 19 | 交叉审核与多模型策略 |
| 20 | TDD 强制流程（含 §20.3 Test-Lock）|
| 21 | Agent Skills 开放标准与 Skill 生态 |
| 22 | 社区 Skill 推荐清单 |
| 23 | CI/CD 流水线 |
| 24 | 发布管理 |
| 25 | 可观测性 |
| 26 | 设计系统 |
| 27 | 无障碍（Accessibility）|
| 28 | 隐私合规 |
| 29 | 新项目集成教程 |
| 30 | 安全工程基线 |
| 31 | 性能预算与 SLO |
| 32 | AI 代码生成的人工审核边界（§32.1 Forbidden 路径 / §32.5 6 大反模式）|
| 33 | Vibe Coding 红线分级 |
| 34 | Harness 设计自审（八条原则）|
| 35 | Eval-Driven Development（EDD）|
| 36 | Self-Healing 自动修复门禁 |
| 37 | Constitution 协议（与 Spec Kit 映射）|
| 38 | Agent Loop 模式（advanced 参考，§49 不分发子项目）|
| 39 | Multi-Agent 编排范式（advanced 参考）|
| 40 | AI Pair Programming 模式（advanced 参考）|
| 41 | Hooks 驱动的自动化 |
| 42 | Sub-agents 实战（含 §42.6 Build Packet schema）|
| 43 | Agent Reliability Engineering（ARE）|
| 44 | Deterministic Agent Replay |
| 45 | Agent Canary Deployment |
| 46 | MCP Skill Interoperability Manifest |
| 47 | Agent-Native CI/CD + LLM-as-Judge（建议非阻断）|
| 48 | Cross-Platform Auto-Review Bridge |
| 49 | 分层分发与子项目适配（v3.13）|
| 50 | 自我进化飞轮（Constitution-Anchored Self-Improvement）|

## 按铁律 (#1-#14，4 层优先级见 CLAUDE.md)

> 铁律全文 + 4 层（L1 安全>L2 治理>L3 质量>L4 效率）+ 理由在 `CLAUDE.md`（grep `^## 铁律`）。

| # | 简称 | 详见 |
|---|---|---|
| 1 | 决策服务产品愿景 | §2, §8 |
| 2 | 不编造不假设 | §32.5 反模式 #3 / §3 |
| 3 | 模型名从 §5 选 | §5.0 / §1.2 |
| 4 | Agent 犯错 → 更新配置 | §13 / §41 |
| 5 | 敢于挑战用户 | §8.4 |
| 6 | 每 3 轮出摘要 + 更新 STATUS | §17.3 |
| 7 | 不过度优化即将重写部分 | §13 |
| 8 | 先创建 Git 分支 | §9.4 + branch-guard.sh |
| 9 | 占位数据不算完成 | §24 |
| 10 | 国际化 / 配置分离 | §28 / §27 |
| 11 | 禁止删除重建替代精确修复 | §32.5 反模式 #4 |
| 12 | 无 eval 的 agent 配置改动不进 main | §35 + eval-gate.sh |
| 13 | Forbidden 路径禁止 vibe coding | §32.1 + forbidden-guard.sh |
| 14 | Test-Lock 不可绕过 | §20.3 + test-lock-guard.sh |

## 按反模式 (§32.5 #1-6)

| # | 反模式 | 防护 |
|---|---|---|
| 1 | Vibe Shipping（不读代码就部署）| §33 + UserPromptSubmit hook |
| 2 | Yes-man AI（顺从用户错误想法）| §8.4 + 铁律 #5 |
| 3 | Hallucination Amplification | §3.1 + 铁律 #2 |
| 4 | Dependency Hallucination | §32.5 + grep 实际依赖 |
| 5 | Context Starvation | §4 + Context Engineering |
| 6 | Eval Gaming（指标对但目标偏）| §35 + property-based test |

## 维护

新增章节时同步本表的**语义映射**（不写行号）。`/cto-audit` 校验 handbook 章节数 vs INDEX 条目数一致。
定位永远用 `grep -nE '^## N\.' playbook/handbook.md`。
