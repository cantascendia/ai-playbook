#!/usr/bin/env node
// ledger/propagate.mjs — 反向传播 learned-rule 到项目（v3.14 B 闭环最后一段）
//
// 把 ledger/drafts/ 里 corroborated（≥2 项目印证）的 learned-rule 写到目标项目
// .claude/rules/learned/，带 provenance 头。完整闭环：collect → distill → propagate。
//
// 用法：
//   node ledger/propagate.mjs <projects-root>            # dry-run（默认，只列计划，不写）
//   node ledger/propagate.mjs <projects-root> --apply    # 真写
//   node ledger/propagate.mjs <projects-root> --apply --include-draft-only  # 含未印证（不推荐）
//
// 安全护栏（多层）：
//   1. 默认只传播 corroborated=true（≥2 项目）的 rule — 单点投毒无法触发。
//   2. 默认 dry-run；--apply 才写。
//   3. 写入的是 advisory learned-rule（markdown）——子项目 immutable-guard/红线 hook 覆盖它，
//      坏 rule 不能关掉任何 guard（low blast-radius）。
//   4. 每条带 provenance + propagated_at + source_cluster，可审计可回溯可撤。
//   5. 不覆盖项目已有同名 rule（除非 --force）——尊重项目本地教训。
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const DRAFTS = join(process.env.LEDGER_DIR || 'ledger', 'drafts');
const argv = process.argv.slice(2);
const root = argv.find((a) => !a.startsWith('--'));
const APPLY = argv.includes('--apply');
const INCLUDE_DRAFT = argv.includes('--include-draft-only');
const FORCE = argv.includes('--force');

if (!root) { console.log('用法: node ledger/propagate.mjs <projects-root> [--apply]'); process.exit(1); }
if (!existsSync(DRAFTS)) { console.log('无 drafts — 先跑 distill.mjs'); process.exit(0); }

// 读 draft frontmatter 判断是否 corroborated
function meta(file) {
  const t = readFileSync(file, 'utf8');
  return {
    corroborated: /corroborated:\s*true/.test(t),
    cluster: (t.match(/ledger_cluster:\s*(.+)/) || [, ''])[1].trim(),
    body: t,
  };
}

const drafts = readdirSync(DRAFTS).filter((f) => f.endsWith('.md')).map((f) => ({ f, ...meta(join(DRAFTS, f)) }));
const eligible = drafts.filter((d) => d.corroborated || INCLUDE_DRAFT);
if (!eligible.length) { console.log('无 corroborated draft 可传播（≥2 项目印证才合格；--include-draft-only 可放宽，不推荐）'); process.exit(0); }

const targets = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(root, d.name, '.claude')))
  .map((d) => join(root, d.name));

const stamp = process.env.LEDGER_STAMP || 'pending'; // 时间戳由调用方传（脚本内不取系统时间，保可重放）
let planned = 0, written = 0;
for (const t of targets) {
  const dst = join(t, '.claude', 'rules', 'learned');
  for (const d of eligible) {
    const name = `ledger-${d.f}`;
    const path = join(dst, name);
    if (existsSync(path) && !FORCE) continue;
    planned++;
    const header = `<!-- PROPAGATED by ledger/propagate.mjs | source_cluster=${d.cluster} | propagated_at=${stamp} | corroborated=${d.corroborated} | advisory-only(不覆盖红线 hook) -->\n`;
    if (APPLY) {
      if (!existsSync(dst)) mkdirSync(dst, { recursive: true });
      writeFileSync(path, header + d.body, 'utf8');
      written++;
    } else {
      console.log(`  [dry-run] → ${path}`);
    }
  }
}
console.log(APPLY
  ? `propagated ${written} rule-instance(s) 到 ${targets.length} 项目（corroborated only${INCLUDE_DRAFT ? ' + draft' : ''}）`
  : `dry-run：计划写 ${planned} 处（加 --apply 真写）。默认只传 corroborated（≥2 项目印证）。`);
