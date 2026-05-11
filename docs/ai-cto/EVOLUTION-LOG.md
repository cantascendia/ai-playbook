# Evolution Log — ai-playbook 自我进化飞轮历史

> v3.9 起记录每次飞轮迭代。pattern-detector 找到的 pattern → /cto-evolve propose → /cto-evolve apply → PR → 用户 merge / reject / cooldown 全程留痕。

## 失败 Budget 规则

| 状态 | 升级 |
|---|---|
| 1 周未采纳 | 维持原优先级 |
| 2 周未采纳 | 提升到 P1 + SELF-AUDIT 加红色标记 |
| 3 周未采纳 | 自动升级 P0 + 写 GitHub Issue + 邮件通知 |
| 4 周未采纳 | 标记 superseded（用户已默认拒绝） |

## 飞轮迭代记录

### 2026-05-XX — v3.9 飞轮启动

- **状态**: bootstrap
- **触发源**: 用户提问 "项目是否可以自我进化飞轮？"
- **Phase 1 调研**: AlphaEvolve / Sakana DGM / Cursor Bugbot / Cline / Voyager / Reflexion / OWASP Agentic Top 10 / AIVSS（详见 PR #6 描述）
- **决策**: Constitution-Anchored 三层飞轮（红线 / 软配置 / 飞轮层）
- **首次实施**:
  - immutable-guard.sh 守红线
  - pattern-detector sub-agent
  - cto-evolve 命令
  - learned-rules-loader skill (Bugbot 模式)
  - GH Actions weekly cron
  - 3 evals (026/027/028)
- **首次自审**: 待 GH Actions cron 跑完（每周一 9:00 UTC）

## 待审视的 SELF-AUDIT

（待 pattern-detector 跑出第一份 SELF-AUDIT-<date>.md 后填充）

## 已采纳的 Evolution

（待 /cto-evolve apply 写出第一个 PR 后填充）

## 已 reject / cooldown 的 Evolution

（用户拒绝或冷却中的 pattern）

## 月度统计

```
Month | Patterns Detected | Patterns Applied | Cost (codex token cents) | Notes
------|-------------------|------------------|--------------------------|------
2026-05 | 0 | 0 | 0 | Bootstrap
```

## 与其他文件关系

- `docs/ai-cto/SELF-AUDIT-<date>.md` — pattern-detector 单次输出
- `docs/ai-cto/EVOLUTION-PROPOSAL-<id>.md` — /cto-evolve propose 输出
- `docs/ai-cto/SKILL-CANDIDATES.md` — Voyager 式候选 skill 库
- `docs/ai-cto/REVIEW-QUEUE.md` — codex 跨模型 review lineage（Sakana DGM 启发）
- `docs/ai-cto/CODEX-REVIEW-LOG.md` — audit log
- `.claude/rules/learned/*.md` — Bugbot-style learned rules

---

## 2026-05-11 — 飞轮首次实战跑（4 sub-agent 并行）

**触发**：用户 "运用 cto-book，自我飞轮，委派多 sub agent 并行进行项目"

**实施**：用 Task 工具并行调用 4 个 sub-agent
- pattern-detector — 输出 SELF-AUDIT-2026-05-10.md（6 个 pattern）
- harness-auditor — Health 94/100（§34 八条原则）
- vibe-checker — 🟡 YELLOW Spec-Driven（v3.9 immutable-guard 6 轮迭代 = vibe 风险中等）
- reliability-auditor — ARE 72/100（SLO/QUARTERLY-DRILLS/CONSTITUTION 缺失）

**综合发现**：
- 🔴 P0-1 trajectory schema：pattern-detector **false positive**（读了旧文件误判，2026-05-11 jsonl 实际 147/147 v3.8 schema 工作）→ 验证"必须 codex 二次审"设计
- 🔴 P0-2 immutable-guard Windows 反斜杠路径剥离静默失效 → **真 bug**（红线在 Windows 上根本没守住）
- 🟠 P1 文档治理：SLO.md / QUARTERLY-DRILLS.md / CONSTITUTION.md / HARNESS-CHANGELOG v3.7-v3.9 全缺
- 🟠 P1 cost-cap 文件未 bootstrap

**采纳 / 拒绝**：
- ✅ P0-2 Windows 路径剥离修复 → v3.9.1 PR（commit TBD）
- ✅ P1 SLO.md / QUARTERLY-DRILLS.md / CONSTITUTION.md 全补齐
- ✅ P1 HARNESS-CHANGELOG 补 v3.7/v3.8/v3.9/v3.9.1 四条
- ✅ P1 cost-cap 文件 bootstrap
- ❌ pattern-detector P0-1 false positive → 加 learned rule 防再犯（建议）

**飞轮自审飞轮的实证价值**：
- 6 轮 codex review 都没发现 Windows 路径 bug（因为走 GitHub MCP）
- 多 sub-agent 并行 + Reflexion+MAR 多 critic 设计真起作用
- 单 critic (pattern-detector) 报 P0-1 是 false positive，但 P0-2 是真 bug
- 验证设计哲学：不能让单 critic 独立决定 — 必须人审 / 多 agent 交叉

