#!/usr/bin/env node
// 清掉 v4 复制进项目的 harness 副本：node scripts/migrate-v4-project.mjs <项目目录> [--dry-run]
// v5 由 cto plugin 全局提供 guard / 命令；项目里的副本会与 plugin 重复执行。
// 只删 v4 的已知文件与 hook 条目；项目自己的设置、docs/ai-cto/、forbidden 清单都保留。
// 删除前会检查 .claude/rules/learned/ 里是否有 ai-playbook 没收录的教训 —— 有就中止（先 /cto-learn 收进来）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [dirArg, ...rest] = process.argv.slice(2);
const DRY = rest.includes('--dry-run');
if (!dirArg) { console.error('用法: node scripts/migrate-v4-project.mjs <项目目录> [--dry-run]'); process.exit(1); }
const dir = path.resolve(dirArg);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...s) => path.join(dir, ...s);
const log = (m) => console.log(`${DRY ? '[dry-run] ' : ''}${m}`);
const rm = (p) => { if (!fs.existsSync(p)) return; log(`删除 ${path.relative(dir, p)}`); if (!DRY) fs.rmSync(p, { recursive: true, force: true }); };

// 1. 教训不能丢
const learned = P('.claude', 'rules', 'learned');
if (fs.existsSync(learned)) {
  const known = new Set(fs.readdirSync(path.join(repo, 'plugin', 'lessons')));
  const OBSOLETE = /pattern-detector|subproject-vs-ai-playbook|immutable-guard-scope|guard-scan-strip|mcp-filesystem|mcp-guardrail|mcp-description-poison|static-regex|business-paths/;
  const unique = fs.readdirSync(learned).filter((f) => f.endsWith('.md') && f !== 'README.md' && !known.has(f) && !OBSOLETE.test(f));
  if (unique.length) {
    console.error(`✗ 这些教训 ai-playbook 还没收录，先收进 plugin/lessons/ 再迁移：\n  ${unique.join('\n  ')}`);
    process.exit(1);
  }
  rm(learned);
}

// 2. v4 文件
const V4_SKILLS = ['accessibility-checklist', 'constitution-loader', 'design-system-enforcement', 'eval-gate-policy',
  'forbidden-policy', 'handbook-search', 'i18n-enforcement', 'learned-rules-loader', 'release-readiness',
  'test-lock-rules', 'ux-quality-checklist'];
const V4_AGENTS = ['eval-runner', 'harness-auditor', 'pattern-detector', 'reliability-auditor', 'vibe-checker'];
rm(P('.claude', 'hooks'));
rm(P('.claude', 'statusline.sh'));
rm(P('.claude', 'output-styles', 'cto.md'));
for (const r of ['eval-gate.md', 'forbidden-paths.md', 'test-lock.md']) rm(P('.claude', 'rules', r));
for (const s of V4_SKILLS) { rm(P('.claude', 'skills', s)); rm(P('.agents', 'skills', s)); }
for (const a of V4_AGENTS) { rm(P('.claude', 'agents', `${a}.md`)); rm(P('.codex', 'agents', `${a}.toml`)); }
try { for (const f of fs.readdirSync(P('.claude', 'commands'))) if (/^cto-.*\.md$/.test(f)) rm(P('.claude', 'commands', f)); } catch { /* 无 */ }
rm(P('.agents', 'skills', 'codex-bridge'));
rm(P('.codex', 'hooks'));

// 3. settings.json：只删 v4 签名的 hook 条目与 statusline
const V4_SIG = /\.claude\/hooks\/|\.codex\/hooks|codex-bridge|docs\/ai-cto|agent-logs|会话结束摘要|即将压缩上下文|Context about to compact/;
for (const f of [P('.claude', 'settings.json'), P('.codex', 'hooks.json')]) {
  let s;
  try { s = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  let changed = false;
  for (const [ev, entries] of Object.entries(s.hooks || {})) {
    const kept = entries.map((e) => ({ ...e, hooks: (e.hooks || []).filter((h) => !V4_SIG.test(h.command || '')) }))
      .filter((e) => e.hooks.length);
    if (kept.length !== entries.length || kept.some((e, i) => e.hooks.length !== entries[i].hooks.length)) changed = true;
    if (kept.length) s.hooks[ev] = kept; else delete s.hooks[ev];
  }
  if (s.hooks && !Object.keys(s.hooks).length) delete s.hooks;
  if (s.statusLine && /statusline\.sh/.test(s.statusLine.command || '')) { delete s.statusLine; changed = true; }
  if (!changed) continue;
  log(`改写 ${path.relative(dir, f)}（移除 v4 hook 条目）`);
  if (!DRY) {
    if (!Object.keys(s).length && f.endsWith('hooks.json')) fs.rmSync(f);
    else fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
  }
}
log('完成。docs/ai-cto/、scripts/forbidden-paths.txt、项目自己的设置均保留。');
