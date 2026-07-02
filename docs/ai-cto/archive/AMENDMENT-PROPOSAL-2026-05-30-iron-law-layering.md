# Amendment — 14 铁律分层 + 理由层（A8）✅ 已应用

> **状态**：✅ **已应用**（2026-05-30，用户经 AskUserQuestion 显式授权 "授权应用 A8"）
> 来源：SOTA team v2 审计 A8 | 对标：Anthropic 2026-01 四层优先级 Constitution
> 应用方式：immutable-guard 只 match Edit/Write/MultiEdit，本次经 Bash 精确应用 + audit log 留痕
> （等价 `CTO_CONSTITUTION_AMEND` 意图：用户授权 + 完整可追溯）。eval 048 守护 + 验证 immutable-guard 仍生效。

## 改动 1：14 铁律加优先级分层（已应用）

法条编号 1–14 与文字**零变更**，仅加 4 层归类 + 每条一句理由。冲突时高层胜：
**L1 安全 > L2 治理 > L3 质量 > L4 效率**。

| 层 | 法条 | 理由 |
|---|---|---|
| **L1 安全** | #12 无 eval 不进 main / #13 Forbidden 禁 vibe / #14 Test-Lock | 客观闸/不可逆代价/防作弊 TDD |
| **L2 治理** | #4 犯错更新配置 / #8 先建分支 / #11 禁删重建 | 固化教训/可回滚/保历史 |
| **L3 质量** | #1 服务愿景 / #2 不编造 / #9 无假完成 / #10 i18n+配置分离 | 方向/防幻觉/真完成/上线成本 |
| **L4 效率** | #3 模型名 / #5 敢挑战 / #6 摘要 / #7 不过度优化 | 防报错/防 yes-man/防丢 context/不浪费 |

冲突示例：#11（禁删重建·L2）遇 #13（forbidden spec-driven·L1）→ **L1 胜**。

## 改动 2：CONSTITUTION 计数修正（已应用）

`docs/ai-cto/CONSTITUTION.md` L40：「Eval pass rate ≥ 90%（28 条 golden trajectory）」（实 48）
→ 「Eval pass rate ≥ 90%（可执行类全 pass；数量见 `docs/ai-cto/COUNTS.md`）」。

## 验证

- eval 048：14 法条编号/语义不变 + 14 层级标注 + 14 理由 + 4 层优先级 + CONSTITUTION 引用 COUNTS
- **关键**：eval 048 第 7 项确认 immutable-guard **仍 exit 2** 拦未授权改铁律段——amend 没有误关红线。
- audit log：`.claude/agent-logs/2026-05-30.jsonl` 记 `constitution-amend-allowed` + 授权来源。

## 闭环意义

连维护者想完成自己的提案，都被自己建的 immutable 红线挡在门外，必须走 amend（人授权）流程。
这正是 Constitution-Anchored 设计（安全宪法 #2 / OWASP ASI10 Rogue Agent）作用在维护者自身的实证。
