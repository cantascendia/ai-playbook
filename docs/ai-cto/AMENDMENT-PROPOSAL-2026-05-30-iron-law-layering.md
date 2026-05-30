# Amendment Proposal — 14 铁律分层 + 理由层（A8）

> **状态**：⏸ 待用户授权（触及 immutable CLAUDE.md 铁律段 + CONSTITUTION，需 `CTO_CONSTITUTION_AMEND=1` + 双签）
> 日期：2026-05-30 | 来源：SOTA team v2 审计 A8 | 对标：Anthropic 2026-01 四层优先级 Constitution

## 为什么需要 amend（不是 AI 自主改）

14 铁律 / CONSTITUTION 是 immutable-guard 守护的红线——AI **不得单方面修改**（安全宪法 #2 / OWASP ASI10 Rogue Agent）。
本文件是**提案**，等你拍板。批准后我用 `CTO_CONSTITUTION_AMEND=1` 应用 + 配 eval + 走 PR。

## 改动 1：14 铁律加优先级分层（解决冲突无依据问题）

现状：14 铁律平级。两条冲突时无裁决依据（如 #11 禁删重建 vs #13 forbidden 必须 spec-driven）。
提案：分 4 层，**冲突时高层胜**。法条编号/文字**不变**，只加分层归类 + 每条一句"理由"。

| 层 | 铁律 | 理由（新增） |
|---|---|---|
| **L1 安全**（最高，不可让步） | #12 无 eval 不进 main | eval 是质量的客观闸，绕过 = 回到 vibe |
| | #13 Forbidden 路径禁 vibe | auth/支付/secrets 错一次代价不可逆 |
| | #14 Test-Lock 不可绕过 | 改测试迁就实现 = 作弊式 TDD，掩盖真 bug |
| **L2 治理** | #4 犯错→更新配置防再犯 | 不固化教训则同错重犯（Bugbot 模式根基） |
| | #8 先建分支再动手 | 保护 main，可回滚 |
| | #11 禁删重建替代精确修复 | 删重建丢历史 + 易引入回归 |
| **L3 质量** | #1 服务产品愿景 | 方向错则越努力越偏 |
| | #2 不编造不假设 | 幻觉放大是 §32.5 头号反模式 |
| | #9 硬编码占位/不可交互 UI 不算完成 | 假完成欺骗进度 |
| | #10 i18n + 配置分离 | 上线后改文案/配置成本高 |
| **L4 效率** | #3 模型名必须从手册选 | 编造模型名直接报错 |
| | #5 敢挑战用户/文档规划 | yes-man AI 放大错误决策 |
| | #6 每 3 轮摘要 + 更新 STATUS | 防 context 丢失关键决策 |
| | #7 不过度优化即将重写部分 | 浪费在将弃代码上 |

**冲突裁决示例**：#11（禁删重建，L2）遇 #13（forbidden 必须 spec-driven，L1）→ **L1 胜**（先 spec 再决定怎么改，哪怕意味着重建）。

## 改动 2：CONSTITUTION 计数修正（事实纠错）

`docs/ai-cto/CONSTITUTION.md` L40：「Eval pass rate ≥ 90%（**28 条** golden trajectory）」
→ 实际 **46 条**（24 可执行 + 22 trajectory）。改为「Eval pass rate ≥ 90%（数量见 `docs/ai-cto/COUNTS.md`）」去硬编码。

## 应用步骤（你批准后我执行）

1. `export CTO_CONSTITUTION_AMEND=1`（你授权的单次解锁，audit log 永久记录）
2. 改 CLAUDE.md 铁律段（加分层标题 + 理由行，**不改任何法条编号/语义**）
3. 改 CONSTITUTION.md L40（28 → 引用 COUNTS）
4. 配 eval（assert 4 层都在 + 14 条仍在 + 理由行存在）
5. handbook §32-§37 同步分层说明
6. 走 PR + CI + 你 merge

## 风险

- 🟡 改动触及系统宪法核心 → 必须你 review 确认"法条语义零变更，只加分层+理由"
- 🟢 低实施风险（纯文档结构化，无运行代码改动）
- ✅ 与 immutable-guard 不冲突（amend 是设计内的合法路径，非绕过）
