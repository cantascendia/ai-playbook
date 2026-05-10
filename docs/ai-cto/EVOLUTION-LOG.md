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
