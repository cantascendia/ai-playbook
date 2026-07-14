#!/usr/bin/env node
// ledger/distill.mjs — 事故聚类 → learned-rule 草稿（v3.14 B）
//
// 把 incidents.jsonl 按 (hook + 信号关键词) 聚类。**anti-poison 核心规则**：
//   - 只有被 ≥2 个**不同项目**独立踩到的 pattern 才标 corroborated=true（auto-propagate 候选）。
//   - 单项目单次事故 → corroborated=false，只生成草稿供人审，绝不自动传播。
//   一条被投毒的 incident（来自单一被控项目）无法独自触发传播。
//
// 用法：node ledger/distill.mjs   →  写 ledger/drafts/<slug>.md（learned-rule 草稿）
//
// 注意：产出是 **advisory learned-rule（markdown）**。即使有坏 rule 漏过，子项目的
// immutable-guard / 红线 hook 仍覆盖它——learned-rule 不能关掉任何 guard（低 blast-radius）。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const LEDGER_DIR = process.env.LEDGER_DIR || 'ledger'; // 可覆盖（eval 用 temp，不碰真账本）
const DRAFTS = join(LEDGER_DIR, 'drafts');
const INC = join(LEDGER_DIR, 'incidents.jsonl');

if (!existsSync(INC)) { console.log('no incidents.jsonl — 先跑 collect.mjs'); process.exit(0); }
const incidents = readFileSync(INC, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

// 聚类 key = hook + 信号里的首个关键词（粗粒度，足够找"同类反复踩"）
function clusterKey(i) {
  const kw = (i.signal.match(/[a-z_]{4,}/i) || ['misc'])[0].toLowerCase();
  return `${i.hook || 'unknown'}::${kw}`;
}

const clusters = new Map();
for (const i of incidents) {
  const k = clusterKey(i);
  if (!clusters.has(k)) clusters.set(k, { key: k, hits: 0, projects: new Set(), samples: [] });
  const c = clusters.get(k);
  c.hits++; c.projects.add(i.source_project);
  if (c.samples.length < 3) c.samples.push(i);
}

if (!existsSync(DRAFTS)) mkdirSync(DRAFTS, { recursive: true });
let drafted = 0, corroborated = 0;
for (const c of clusters.values()) {
  if (c.hits < 2) continue; // 单次噪声不立 rule
  const isCorrob = c.projects.size >= 2; // anti-poison：≥2 项目才可 auto-propagate
  if (isCorrob) corroborated++;
  const slug = c.key.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 50);
  const provenance = [...c.projects].sort().join(', ');
  const body = `---
ledger_cluster: ${c.key}
hits: ${c.hits}
source_projects: [${[...c.projects].sort().map((p) => `"${p}"`).join(', ')}]
corroborated: ${isCorrob}
auto_propagate_eligible: ${isCorrob}
generated_by: ledger/distill.mjs
status: DRAFT
---

# Learned Rule (草稿): ${c.key} 反复触发

**事故聚类**：\`${c.hits}\` 次拦截，跨 \`${c.projects.size}\` 个项目（${provenance}）。
${isCorrob
  ? '✅ **corroborated（≥2 项目独立踩到）→ auto-propagate 候选**（anti-poison 通过）。'
  : '⚠️ 仅单项目踩到 → **draft-only，不自动传播**（防单点投毒）。需人审或等更多项目印证。'}

## 触发场景
${c.key.split('::')[0]} 在多项目反复拦截同类操作。样本信号：
${c.samples.map((s) => `- [${s.source_project}] ${s.signal}`).join('\n')}

## 应该怎么做（人审后补全）
> distill 只生成骨架。人审时填：根因 + 正确做法 + 反模式。这是 **advisory** rule，不替代 hook 红线。

## 来源
- ledger/incidents.jsonl 聚类（${provenance}）
- 生成时间见 git；本草稿需人审转正后才可 propagate（除非 corroborated 且 --auto）
`;
  writeFileSync(join(DRAFTS, `${slug}.md`), body, 'utf8');
  drafted++;
}
console.log(`distilled ${drafted} draft(s)（${corroborated} corroborated/auto-eligible，其余 draft-only）→ ${DRAFTS}/`);
