#!/usr/bin/env node
// 把 ai-playbook 部署到本机：node scripts/install.mjs [--dry-run]
//
//   Claude Code：plugin（marketplace = 本仓库目录）+ ~/.claude/CLAUDE.md
//   Codex      ：~/.codex/cto/（guard 引擎 + 教训）+ ~/.codex/hooks.json + ~/.codex/AGENTS.md
//   清理       ：v4 留在 ~/.claude 与 ~/.codex 的 hook / rule / 命令 / 子代理副本（会与 plugin 重复执行）
//
// 所有被改动或删除的文件先备份到 ~/.claude/backup/<时间戳>/（lesson: tools-must-not-overwrite-their-own-baseline）。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry-run');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();
const CL = path.join(home, '.claude');
const CX = path.join(home, '.codex');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupRoot = path.join(CL, 'backup', stamp);
const log = (m) => console.log(`${DRY ? '[dry-run] ' : ''}${m}`);

function backup(p) {
  if (!fs.existsSync(p)) return;
  const rel = path.relative(home, p);
  const dest = path.join(backupRoot, rel);
  if (DRY) return;
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
  fs.cpSync(src, dest, { recursive: true, filter: (s) => !s.endsWith('.test.mjs') });
}

// ─── 1. 全局约定 ───
const contract = fs.readFileSync(path.join(repo, 'global', 'CLAUDE.md'), 'utf8');
write(path.join(CL, 'CLAUDE.md'), contract);
// 输出风格装成用户级文件：名字就是 `cto`，任何项目的 "outputStyle": "cto" 都能解析
write(path.join(CL, 'output-styles', 'cto.md'), fs.readFileSync(path.join(repo, 'global', 'output-styles', 'cto.md'), 'utf8'));

// ─── 2. 清理 v4 在 ~/.claude 的副本 ───
const V4_AGENTS = ['eval-runner', 'harness-auditor', 'pattern-detector', 'reliability-auditor', 'vibe-checker'];
const V4_SKILLS = ['accessibility-checklist', 'constitution-loader', 'design-system-enforcement', 'eval-gate-policy',
  'forbidden-policy', 'handbook-search', 'i18n-enforcement', 'learned-rules-loader', 'release-readiness',
  'test-lock-rules', 'ux-quality-checklist'];
remove(path.join(CL, 'hooks'));
remove(path.join(CL, 'rules'));
remove(path.join(CL, 'cto-sync.sh'));
for (const f of ['forbidden-paths.txt', 'business-paths.txt', 'safe-grep.sh']) remove(path.join(CL, 'scripts', f));
for (const a of V4_AGENTS) remove(path.join(CL, 'agents', `${a}.md`));
for (const s of V4_SKILLS) remove(path.join(CL, 'skills', s));
try {
  for (const f of fs.readdirSync(path.join(CL, 'commands'))) if (/^cto-.*\.md$/.test(f)) remove(path.join(CL, 'commands', f));
} catch { /* 无 commands 目录 */ }

// ~/.claude/settings.json：去掉 v4 hooks（plugin 提供）与过期的模型钉死；其余键原样保留
const settingsPath = path.join(CL, 'settings.json');
try {
  const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  let changed = false;
  if (s.hooks) { delete s.hooks; changed = true; log('settings.json：移除 v4 hooks（改由 cto plugin 提供）'); }
  if (typeof s.model === 'string' && /^claude-(opus|sonnet|fable)-[0-9]/.test(s.model)) {
    log(`settings.json：移除钉死的模型 ${s.model}（用应用默认的最新模型）`); delete s.model; changed = true;
  }
  if (changed) write(settingsPath, JSON.stringify(s, null, 2) + '\n');
} catch (e) { log(`⚠️ 跳过 settings.json：${e.message}`); }

// ─── 3. Claude Code plugin ───
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
if (!claude) {
  log('⚠️ 找不到 claude CLI —— 手动执行：claude plugin marketplace add <本仓库路径> && claude plugin install cto@ai-playbook');
} else if (!DRY) {
  const run = (...args) => {
    const r = spawnSync(claude, args, { encoding: 'utf8' });
    log(`claude ${args.join(' ')} → ${r.status === 0 ? 'ok' : `exit ${r.status}`}${r.status === 0 ? '' : `\n${r.stdout}${r.stderr}`}`);
    return r;
  };
  const list = spawnSync(claude, ['plugin', 'marketplace', 'list'], { encoding: 'utf8' }).stdout || '';
  if (!/ai-playbook/.test(list)) run('plugin', 'marketplace', 'add', repo);
  else run('plugin', 'marketplace', 'update', 'ai-playbook');
  const installed = spawnSync(claude, ['plugin', 'list'], { encoding: 'utf8' }).stdout || '';
  // `plugin update` 只看 version：版本号没变时缓存不会刷新 → 直接比内容，不一致就重装
  const version = JSON.parse(fs.readFileSync(path.join(repo, 'plugin', '.claude-plugin', 'plugin.json'), 'utf8')).version;
  const cache = path.join(CL, 'plugins', 'cache', 'ai-playbook', 'cto', version);
  if (!/cto@ai-playbook/.test(installed)) run('plugin', 'install', 'cto@ai-playbook', '--scope', 'user');
  else if (!sameTree(path.join(repo, 'plugin'), cache)) {
    run('plugin', 'uninstall', 'cto@ai-playbook');
    run('plugin', 'install', 'cto@ai-playbook', '--scope', 'user');
  } else log('cto plugin 已是最新');
} else {
  log(`claude plugin marketplace add/update + install cto@ai-playbook（${claude}）`);
}

// ─── 4. Codex ───
if (fs.existsSync(CX)) {
  const cto = path.join(CX, 'cto');
  copyDir(path.join(repo, 'plugin', 'hooks'), path.join(cto, 'hooks'));
  copyDir(path.join(repo, 'plugin', 'lessons'), path.join(cto, 'lessons'));
  copyDir(path.join(repo, 'plugin', 'commands'), path.join(cto, 'commands'));
  const cmdDir = path.join(cto, 'commands').replaceAll('\\', '/');
  write(path.join(CX, 'AGENTS.md'), `${contract}
> Codex 里没有 \`/cto-*\` 斜杠命令：需要时读 \`${cmdDir}/<命令名>.md\` 照做。
> 踩坑教训索引：\`${path.join(cto, 'lessons', 'INDEX.md').replaceAll('\\', '/')}\`（做相关工作前读）。
`);
  // matcher 沿用 v4 在 Codex 上的写法（Codex hook payload 的工具名本次未重新实测）
  const node = (args) => ({ type: 'command', command: `node "${path.join(cto, 'hooks', ...args[0]).replaceAll('\\', '/')}"${args[1] ? ` ${args[1]}` : ''}` });
  const guard = (g) => node([['engine', 'guard.mjs'], g]);
  const hooks = {
    hooks: {
      SessionStart: [{ matcher: '*', hooks: [node([['session-start.mjs']])] }],
      PreToolUse: [
        { matcher: 'Edit|Write|MultiEdit', hooks: [guard('forbidden-guard'), guard('branch-guard')] },
        { matcher: 'Bash|PowerShell', hooks: [guard('bypass-guard'), guard('destructive-action-guard'), guard('branch-guard')] },
        { matcher: 'mcp__.*', hooks: [guard('mcp-guard')] },
      ],
    },
  };
  write(path.join(CX, 'hooks.json'), JSON.stringify(hooks, null, 2) + '\n');
  remove(path.join(CX, 'hooks'));
  for (const a of V4_AGENTS) remove(path.join(CX, 'agents', `${a}.toml`));
}

log(DRY ? '预演结束，未做任何改动。' : `完成。备份在 ${backupRoot}。重启 Claude Code / Codex 会话后生效。`);
