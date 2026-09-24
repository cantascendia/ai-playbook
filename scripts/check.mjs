#!/usr/bin/env node
// 仓库结构自检（CI 与本地共用）：node scripts/check.mjs
// 只检查会真实坏掉的东西 —— 不数组件个数，不 grep 文档措辞。
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...s) => path.join(root, ...s);
const errors = [];
const fail = (m) => errors.push(m);

// 1. JSON 清单可解析
for (const f of ['.claude-plugin/marketplace.json', 'plugin/.claude-plugin/plugin.json', 'plugin/hooks/hooks.json', '.claude/settings.json']) {
  try { JSON.parse(fs.readFileSync(P(f), 'utf8')); } catch (e) { fail(`${f}: JSON 无效 (${e.message})`); }
}

// 2. marketplace 与 plugin 版本一致
try {
  const mk = JSON.parse(fs.readFileSync(P('.claude-plugin/marketplace.json'), 'utf8'));
  const pl = JSON.parse(fs.readFileSync(P('plugin/.claude-plugin/plugin.json'), 'utf8'));
  const entry = mk.plugins.find((p) => p.name === pl.name);
  if (!entry) fail(`marketplace 里没有 plugin ${pl.name}`);
  else if (entry.version !== pl.version) fail(`版本不一致：marketplace ${entry.version} ≠ plugin ${pl.version}`);
} catch { /* 已在 1 报错 */ }

// 3. hooks.json 引用的脚本都存在
const hooks = fs.readFileSync(P('plugin/hooks/hooks.json'), 'utf8');
for (const m of hooks.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\\ ]+)/g)) {
  if (!fs.existsSync(P('plugin', m[1]))) fail(`hooks.json 引用不存在的文件: plugin/${m[1]}`);
}

// 4. 教训索引 ↔ 文件双向一致
const lessonsDir = P('plugin/lessons');
const index = fs.readFileSync(path.join(lessonsDir, 'INDEX.md'), 'utf8');
const indexed = new Set([...index.matchAll(/`([0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+\.md)`/g)].map((m) => m[1]));
const files = fs.readdirSync(lessonsDir).filter((f) => f !== 'INDEX.md' && f.endsWith('.md'));
for (const f of indexed) if (!files.includes(f)) fail(`INDEX.md 指向不存在的教训: ${f}`);
for (const f of files) if (!indexed.has(f)) fail(`教训未进索引（不会被任何会话看到）: ${f}`);

// 5. SessionStart 注入预算 ≤ 6KB（v4 是 ~170KB，这是 v5 要守住的）
const ss = spawnSync(process.execPath, [P('plugin/hooks/session-start.mjs')], { input: JSON.stringify({ cwd: root }), encoding: 'utf8' });
if (ss.status !== 0) fail(`session-start.mjs 退出码 ${ss.status}: ${ss.stderr}`);
const bytes = Buffer.byteLength(ss.stdout || '', 'utf8');
if (bytes > 6144) fail(`SessionStart 注入 ${bytes} 字节，超过 6KB 预算`);

// 6. 控制字符（heredoc 吃反斜杠的事故：\b → U+0008，源码看着对但正则永远不匹配）
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of [...walk(P('plugin')), ...walk(P('scripts'))].filter((f) => /\.(mjs|js|json|md)$/.test(f))) {
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => {
    const bad = [...l].filter((c) => { const x = c.codePointAt(0); return x < 32 && x !== 9; });
    if (bad.length) fail(`${path.relative(root, f)}:${i + 1} 含控制字符 U+${bad.map((c) => c.codePointAt(0).toString(16).padStart(4, '0')).join(',')}`);
  });
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ 结构自检通过（SessionStart 注入 ${bytes} 字节，教训 ${files.length} 条）`);
