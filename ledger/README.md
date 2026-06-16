# Ledger — 跨项目事故账本（v3.14 B，bold-audit 唯一真 10x）

把"同一类 bug 在多个项目反复踩"变成**共享免疫系统**：一个项目踩的坑，蒸馏成 learned-rule，
反向传播给全部 27 个项目，让它们提前免疫。直击 learned rule 2026-05-12「发现一处必须全 sweep」的化石痛点。

## 闭环

```
27 项目各自 .claude/agent-logs/*.jsonl（红线拦截事故）
   │  collect.mjs（带 source provenance 聚合）
   ▼
ledger/incidents.jsonl（中央事故账本）
   │  distill.mjs（按 hook+信号聚类；≥2 项目印证 = corroborated）
   ▼
ledger/drafts/*.md（learned-rule 草稿）
   │  propagate.mjs（默认 dry-run；--apply 只传 corroborated）
   ▼
各项目 .claude/rules/learned/ledger-*.md（带 provenance，advisory）
```

一键：`node ledger/run.mjs <projects-root> [--auto]`（`--auto` 才真传播）。

## 信任模型（anti-poison — 对抗验证的核心关切）

bold-audit 警告："一条投毒 incident 污染全舰队" + "给 applied=0 系统加自动管线有飞轮覆辙风险"。
本设计**多层防御**让自动闭环安全：

1. **≥2 项目独立印证才 corroborated**：单项目单点事故只生成 draft-only，**不自动传播**。一个被控项目无法独自触发传播。
2. **默认 dry-run**：`run.mjs` / `propagate.mjs` 默认只列计划；`--auto` / `--apply` 才写。
3. **传播物是 advisory learned-rule（markdown）**：子项目的 immutable-guard + 红线 hook **覆盖**它——
   一条坏 rule 最坏是"上下文里多了条烂建议"，**不能关掉任何 guard**（low blast-radius）。这是最强的结构性保险。
4. **全程 provenance**：每条 incident 带 source_project；每条传播 rule 带 source_cluster + propagated_at + corroborated 标记，可审计、可回溯、可一键撤。
5. **不覆盖项目本地 rule**：同名不覆盖（除非 --force），尊重项目自有教训。
6. **可重放**：脚本内不取系统时间（时间戳由调用方 LEDGER_STAMP 注入），对齐 §44 replay。

## 与飞轮（§50）关系

ledger 是飞轮的**跨项目数据层**：cto-evolve detect 可读 ledger 找"全舰队反复 pattern"。
飞轮自身仍是人在环 bootstrap（§50 / cto-evolve 成熟度声明未变）；ledger 的自动传播仅限
corroborated + advisory，不触碰飞轮"不自动改红线"的边界。

## 文件

| 文件 | 作用 |
|---|---|
| `collect.mjs` | 27 项目 agent-logs → incidents.jsonl（provenance）|
| `distill.mjs` | 聚类 → drafts/（≥2 项目印证 = corroborated）|
| `propagate.mjs` | corroborated draft → 各项目 .claude/rules/learned/（dry-run 默认）|
| `run.mjs` | 闭环编排 |
| `incidents.jsonl` | 中央事故账本（collect 产出，gitignore 候选）|
| `drafts/` | learned-rule 草稿（人审转正）|
