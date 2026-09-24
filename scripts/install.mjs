#!/usr/bin/env node
// 把 ai-playbook 部署到本机：node scripts/install.mjs [--dry-run]
//
//   顺序刻意为「先装新的、验证生效，再清旧的」—— 新 plugin 装失败时 v4 guard 仍在，机器不会裸奔（codex review P1）。
//   1. Claude Code plugin（marketplace = 本仓库目录），装完验证 enabled，失败即 exit 1
//   2. ~/.claude/CLAUDE.md + ~/.claude/output-styles/cto.md
//   3. Codex：~/.codex/cto/（guard 引擎 + 教训 + 命令）+ ~/.codex/hooks.json + ~/.codex/AGENTS.md
//   4. 清理 v4：只删 scripts/v4-manifest.mjs 列出的文件与带 v4 签名的 hook 条目，其余一律保留
//
// 所有被改动或删除的文件先备份到 ~/.claude/backup/<时间戳>/（lesson: tools-must-not-overwrite-their-own-baseline）。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  V4_HOOK_FILES, V4_RULE_FILES, V4_OBSOLETE_LESSONS, V4_SKILLS, V4_AGENTS, removeKnown, stripV4Hooks,
} from './v4-manifest.mjs';

const DRY = process.argv.includes('--dry-run');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();
const CL = path.join(home, '.claude');
const CX = path.join(home, '.codex');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupRoot = path.join(CL, 'backup', stamp);
const log = (m) => console.log(`${DRY ? '[dry-run] ' : ''}${m}`);
const die = (m) => { console.error(`✗ ${m}`); process.exit(1); };

function backup(p) {
  if (DRY || !fs.existsSync(p)) return;
  const dest = path.join(backupRoot, path.relative(home, p));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(p, dest, { recursive: true });
}
function remove(p) {
  if (!fs.existsSync(p)) return;
  log(`删除 ${path.relative(home, p)}`);
  backup(p);
  if (!DRY) fs.rmSync(p, { recursive: true, force: true });
}
function write(p, content) {
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === content) return;
  log(`写入 ${path.relative(home, p)}`);
  backup(p);
  if (!DRY) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); }
}
function copyDir(src, dest) {
  log(`同步 ${path.relative(repo, src)} → ${path.relative(home, dest)}`);
  if (DRY) return;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}
function listTree(dir) {
  try {
    return fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
      .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).replaceAll('\\', '/')).sort();
  } catch { return null; }
}
function sameTree(a, b) {
  const fa = listTree(a); const fb = listTree(b);
  if (!fa || !fb || fa.join('\n') !== fb.join('\n')) return false;
  return fa.every((f) => fs.readFileSync(path.join(a, f)).equals(fs.readFileSync(path.join(b, f))));
}

// ─── 1. Claude Code plugin（先装、验证，失败则不动任何旧东西）───
function findClaude() {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['claude'], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split(/\r?\n/)[0];
  const base = path.join(process.env.APPDATA || '', 'Claude', 'claude-code');
  try {
    const vers = fs.readdirSync(base).filter((v) => fs.existsSync(path.join(base, v, 'claude.exe')))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (vers.length) return path.join(base, vers.at(-1), 'claude.exe');
  } catch { /* 非 Windows 桌面端 */ }
  return null;
}
const claude = findClaude();
if (!claude) die('找不到 claude CLI。手动执行：claude plugin marketplace add <本仓库路径> && claude plugin install cto@ai-playbook，再重跑本脚本');
const cli = (...args) => spawnSync(claude, args, { encoding: 'utf8' });
const must = (...args) => {
  log(`claude ${args.join(' ')}`);
  if (DRY) return;
  const r = cli(...args);
  if (r.status !== 0) die(`claude ${args.join(' ')} 失败（exit ${r.status}）：\n${r.stdout}${r.stderr}\n未做任何清理，v4 guard 仍然有效。`);
};
const version = JSON.parse(fs.readFileSync(path.join(repo, 'plugin', '.claude-plugin', 'plugin.json'), 'utf8')).version;
const cache = path.join(CL, 'plugins', 'cache', 'ai-playbook', 'cto', version);
if (/ai-playbook/.test(cli('plugin', 'marketplace', 'list').stdout || '')) must('plugin', 'marketplace', 'update', 'ai-playbook');
else must('plugin', 'marketplace', 'add', repo);
const installed = /cto@ai-playbook/.test(cli('plugin', 'list').stdout || '');
if (!installed) must('plugin', 'install', 'cto@ai-playbook', '--scope', 'user');
else if (!sameTree(path.join(repo, 'plugin'), cache)) {
  // `plugin update` 只看 version，版本号没变时缓存不会刷新 → 比内容，不一致就重装
  must('plugin', 'uninstall', 'cto@ai-playbook');
  must('plugin', 'install', 'cto@ai-playbook', '--scope', 'user');
} else log('cto plugin 已是最新');
if (!DRY) {
  const list = cli('plugin', 'list').stdout || '';
  if (!/cto@ai-playbook[\s\S]*?enabled/.test(list)) die(`cto plugin 安装后未处于 enabled 状态：\n${list}\n未做任何清理。`);
  if (!sameTree(path.join(repo, 'plugin'), cache)) die(`plugin 缓存与仓库内容不一致（${cache}）。未做任何清理。`);
}

// ─── 2. 全局约定 + 输出风格 ───
const contract = fs.readFileSync(path.join(repo, 'global', 'CLAUDE.md'), 'utf8');
write(path.join(CL, 'CLAUDE.md'), contract);
// 装成用户级文件：名字就是 `cto`，任何项目的 "outputStyle": "cto" 都能解析
write(path.join(CL, 'output-styles', 'cto.md'), fs.readFileSync(path.join(repo, 'global', 'output-styles', 'cto.md'), 'utf8'));

// ─── 3. Codex ───
if (fs.existsSync(CX)) {
  const cto = path.join(CX, 'cto');
  copyDir(path.join(repo, 'plugin', 'hooks'), path.join(cto, 'hooks'));
  copyDir(path.join(repo, 'plugin', 'lessons'), path.join(cto, 'lessons'));
  copyDir(path.join(repo, 'plugin', 'commands'), path.join(cto, 'commands'));
  const cmdDir = path.join(cto, 'commands').replaceAll('\\', '/');
  write(path.join(CX, 'AGENTS.md'), `${contract}
> Codex 里没有 \`/cto-*\` 斜杠命令：需要时读 \`${cmdDir}/<命令名>.md\` 照做（其中 plugin 根 = \`${cto.replaceAll('\\', '/')}\`）。
> 踩坑教训索引：\`${path.join(cto, 'lessons', 'INDEX.md').replaceAll('\\', '/')}\`（做相关工作前读）。
`);
  // cto 的 guard 条目：matcher 沿用 v4 在 Codex 上的写法（Codex hook payload 的工具名本次未重新实测）
  const node = (rel, arg = '') => ({ type: 'command', command: `node "${path.join(cto, 'hooks', ...rel).replaceAll('\\', '/')}"${arg ? ` ${arg}` : ''}` });
  const guard = (g) => node(['engine', 'guard.mjs'], g);
  const ours = {
    SessionStart: [{ matcher: '*', hooks: [node(['session-start.mjs'])] }],
    PreToolUse: [
      { matcher: 'Edit|Write|MultiEdit', hooks: [guard('forbidden-guard'), guard('branch-guard')] },
      { matcher: 'Bash|PowerShell', hooks: [guard('bypass-guard'), guard('destructive-action-guard'), guard('branch-guard')] },
      { matcher: 'mcp__.*', hooks: [guard('mcp-guard')] },
    ],
  };
  // 合并：保留用户自己的条目，去掉 v4 条目与我们上一次写入的条目，再追加这一版
  let hj = { hooks: {} };
  try { hj = JSON.parse(fs.readFileSync(path.join(CX, 'hooks.json'), 'utf8')); } catch { /* 不存在 */ }
  hj.hooks = hj.hooks || {};
  stripV4Hooks(hj);
  hj.hooks = hj.hooks || {};
  const mine = /[\\/]\.codex[\\/]cto[\\/]hooks[\\/]/;
  for (const [ev, entries] of Object.entries(ours)) {
    const others = (hj.hooks[ev] || []).map((e) => ({ ...e, hooks: (e.hooks || []).filter((h) => !mine.test(h.command || '')) }))
      .filter((e) => e.hooks.length);
    hj.hooks[ev] = [...others, ...entries];
  }
  write(path.join(CX, 'hooks.json'), JSON.stringify(hj, null, 2) + '\n');
}

// ─── 4. 清理 v4（只删清单内）───
const known = new Set([...fs.readdirSync(path.join(repo, 'plugin', 'lessons')), ...V4_OBSOLETE_LESSONS]);
for (const base of [CL, CX]) {
  const left = removeKnown(path.join(base, 'hooks'), V4_HOOK_FILES, remove, DRY);
  if (left.length) log(`保留 ${base}/hooks 下非 v4 文件：${left.map((f) => path.basename(f)).join(', ')}`);
  for (const a of V4_AGENTS) { remove(path.join(base, 'agents', `${a}.md`)); remove(path.join(base, 'agents', `${a}.toml`)); }
}
const learnedDir = path.join(CL, 'rules', 'learned');
let learned = [];
try { learned = fs.readdirSync(learnedDir); } catch { /* 无 */ }
const unknownLessons = learned.filter((f) => !known.has(f));
if (unknownLessons.length) log(`⚠️ 保留未收录的教训（请 /cto-learn 收进 plugin/lessons/）：${unknownLessons.join(', ')}`);
removeKnown(path.join(CL, 'rules'), [...V4_RULE_FILES, ...learned.filter((f) => known.has(f)).map((f) => `learned/${f}`)], remove, DRY);
remove(path.join(CL, 'cto-sync.sh'));
for (const f of ['forbidden-paths.txt', 'business-paths.txt', 'safe-grep.sh']) remove(path.join(CL, 'scripts', f));
for (const s of V4_SKILLS) remove(path.join(CL, 'skills', s));
try {
  for (const f of fs.readdirSync(path.join(CL, 'commands'))) if (/^cto-.*\.md$/.test(f)) remove(path.join(CL, 'commands', f));
} catch { /* 无 commands 目录 */ }

// ~/.claude/settings.json：只去掉 v4 签名的 hook 条目与过期的模型钉死；其余键原样保留
const settingsPath = path.join(CL, 'settings.json');
try {
  const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  let changed = stripV4Hooks(s);
  if (changed) log('settings.json：移除 v4 hook 条目（改由 cto plugin 提供）');
  if (typeof s.model === 'string' && /^claude-(opus|sonnet|fable)-[0-9]/.test(s.model)) {
    log(`settings.json：移除钉死的模型 ${s.model}（用应用默认的最新模型）`); delete s.model; changed = true;
  }
  if (changed) write(settingsPath, JSON.stringify(s, null, 2) + '\n');
} catch (e) { log(`⚠️ 跳过 settings.json：${e.message}`); }

log(DRY ? '预演结束，未做任何改动。' : `完成。备份在 ${backupRoot}（若有改动）。重启 Claude Code / Codex 会话后生效。`);
