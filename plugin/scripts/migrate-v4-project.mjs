#!/usr/bin/env node
// 清掉 v4 复制进项目的 harness 副本：node <plugin 根>/scripts/migrate-v4-project.mjs <项目目录> [--dry-run]
// v5 由 cto plugin 全局提供 guard / 命令；项目里的副本会与 plugin 重复执行。
// 只删 scripts/v4-manifest.mjs 列出的文件与带 v4 签名的 hook 条目；项目自己的设置、hook、docs/ai-cto/、forbidden 清单都保留。
// 项目里若有 ai-playbook 没收录的教训 → 中止（先 /cto-learn 收进来，别丢）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  V4_HOOK_FILES, V4_RULE_FILES, V4_OBSOLETE_LESSONS, V4_SKILLS, V4_SKILL_MIRRORS, V4_COMMANDS, V4_AGENTS,
  removeKnown, stripV4Hooks,
} from './v4-manifest.mjs';

const [dirArg, ...rest] = process.argv.slice(2);
const DRY = rest.includes('--dry-run');
if (!dirArg) { console.error('用法: node <plugin 根>/scripts/migrate-v4-project.mjs <项目目录> [--dry-run]'); process.exit(1); }
const dir = path.resolve(dirArg);
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...s) => path.join(dir, ...s);
const log = (m) => console.log(`${DRY ? '[dry-run] ' : ''}${m}`);
const rm = (p) => { if (!fs.existsSync(p)) return; log(`删除 ${path.relative(dir, p)}`); if (!DRY) fs.rmSync(p, { recursive: true, force: true }); };

// 1. 教训不能丢
const known = new Set([...fs.readdirSync(path.join(pluginRoot, 'lessons')), ...V4_OBSOLETE_LESSONS]);
let learned = [];
try { learned = fs.readdirSync(P('.claude', 'rules', 'learned')); } catch { /* 无 */ }
const unique = learned.filter((f) => !known.has(f));
if (unique.length) {
  console.error(`✗ 这些教训 ai-playbook 还没收录，先用 /cto-learn 收进 ai-playbook 的 plugin/lessons/ 再迁移：\n  ${unique.join('\n  ')}`);
  process.exit(1);
}

// 2. v4 文件（只删清单内）
const keep = removeKnown(P('.claude', 'hooks'), V4_HOOK_FILES, rm, DRY);
if (keep.length) log(`保留项目自己的 hook 文件：${keep.map((f) => path.relative(dir, f)).join(', ')}`);
removeKnown(P('.codex', 'hooks'), V4_HOOK_FILES, rm, DRY);
removeKnown(P('.claude', 'rules'), [...V4_RULE_FILES, ...learned.map((f) => `learned/${f}`)], rm, DRY);
rm(P('.claude', 'statusline.sh'));
rm(P('.claude', 'output-styles', 'cto.md'));
for (const s of V4_SKILLS) { rm(P('.claude', 'skills', s)); rm(P('.agents', 'skills', s)); }
for (const s of V4_SKILL_MIRRORS) rm(P('.agents', 'skills', s));
for (const a of V4_AGENTS) { rm(P('.claude', 'agents', `${a}.md`)); rm(P('.codex', 'agents', `${a}.toml`)); }
for (const c of V4_COMMANDS) rm(P('.claude', 'commands', c));

// 3. settings / Codex hooks.json：只删 v4 签名的条目
for (const f of [P('.claude', 'settings.json'), P('.codex', 'hooks.json')]) {
  let s;
  try { s = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  let changed = stripV4Hooks(s);
  if (s.statusLine && /statusline\.sh/.test(s.statusLine.command || '')) { delete s.statusLine; changed = true; }
  if (!changed) continue;
  log(`改写 ${path.relative(dir, f)}（移除 v4 hook 条目）`);
  if (DRY) continue;
  if (f.endsWith('hooks.json') && !Object.keys(s).length) fs.rmSync(f);
  else fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
}
log('完成。docs/ai-cto/、scripts/forbidden-paths.txt、项目自己的设置均保留。');
