#!/usr/bin/env node
// sync-agents-md.mjs — 单源生成 AGENTS.md / GEMINI.md 的红线块（v4.3 hardening）
//
// 背景：codex 读 templates/AGENTS.md，Antigravity 读 templates/GEMINI.md。
// 这两个模板手工维护 → 与 CLAUDE.md 的 14 铁律 + forbidden SSOT 漂移。
// 本脚本把两份权威源渲染进两个模板里"清晰分隔的生成块"，实现跨工具 prompt 级对齐。
//
// 源（read-only，绝不修改）：
//   - CLAUDE.md 的 '## 铁律' 段 → 14 铁律 one-liner
//   - scripts/forbidden-paths.txt → forbidden 路径条目（剥 \r + 注释 + 空行）
//
// 生成块（BEGIN/END 标记之间的内容每次运行被替换；标记之外一律不动）：
//   <!-- BEGIN GENERATED: iron-laws (由 scripts/sync-agents-md.mjs 生成，勿手改) -->
//   ...
//   <!-- END GENERATED: iron-laws -->
//   （forbidden-paths 同理）
// 标记缺失时 → 在 角色/身份 段之后追加。
//
// 模式：
//   node scripts/sync-agents-md.mjs           # 默认：写入
//   node scripts/sync-agents-md.mjs --check    # CI 漂移锁：需重新生成则 exit 1，否则 exit 0
//
// 环境覆盖（供 eval 隔离，不碰真模板）：
//   TEMPLATES_DIR=<dir>   # AGENTS.md / GEMINI.md 所在目录（默认 <repo>/templates）
//   CLAUDE_MD=<file>      # 铁律源（默认 <repo>/CLAUDE.md）
//   FORBIDDEN_PATHS=<file># forbidden 源（默认 <repo>/scripts/forbidden-paths.txt）

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');

const TEMPLATES_DIR = process.env.TEMPLATES_DIR || join(REPO_ROOT, 'templates');
const CLAUDE_MD = process.env.CLAUDE_MD || join(REPO_ROOT, 'CLAUDE.md');
const FORBIDDEN_PATHS = process.env.FORBIDDEN_PATHS || join(REPO_ROOT, 'scripts', 'forbidden-paths.txt');

const TARGETS = ['AGENTS.md', 'GEMINI.md'];

// ── 源解析 ────────────────────────────────────────────────────────────────

// 从 CLAUDE.md 的 '## 铁律' 段抽 14 条 one-liner（保留层级标注全文）。
function parseIronLaws(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s*铁律/.test(l));
  if (start === -1) throw new Error(`未在 ${CLAUDE_MD} 找到 '## 铁律' 段`);
  const laws = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break; // 下一个 ## 段 → 结束
    const m = lines[i].match(/^(\d+)\.\s+(.*)$/);
    if (m) laws.push({ n: Number(m[1]), text: m[2].trim() });
  }
  if (laws.length !== 14) {
    process.stderr.write(`[warn] 铁律条数=${laws.length}（期望 14）— CLAUDE.md 结构可能变了\n`);
  }
  return laws;
}

// 从 forbidden-paths.txt 抽路径条目（剥 \r、跳注释与空行）。
function parseForbidden(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\r$/, '').trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

// ── 渲染 ──────────────────────────────────────────────────────────────────

function renderIronLaws(laws) {
  const body = laws.map((l) => `${l.n}. ${l.text}`).join('\n');
  return [
    '## 14 铁律（SSOT: CLAUDE.md，由 scripts/sync-agents-md.mjs 同步 — 勿手改此块）',
    '',
    '任何时候都不能违反。冲突时高层胜：L1 安全 > L2 治理 > L3 质量 > L4 效率。',
    '',
    body,
  ].join('\n');
}

function renderForbidden(entries) {
  const body = entries.map((e) => `- ${e}`).join('\n');
  return [
    '## Forbidden 路径（SSOT: scripts/forbidden-paths.txt，由 scripts/sync-agents-md.mjs 同步）',
    '',
    '触及以下路径必须 Spec-Driven + 双签（铁律 #13 / 手册 §32.1），禁止 vibe coding：',
    '',
    body,
  ].join('\n');
}

// 组装完整生成块（含 BEGIN/END 标记）。同一函数产出用于替换与比对，保证幂等。
function wrapBlock(name, inner) {
  const begin = `<!-- BEGIN GENERATED: ${name} (由 scripts/sync-agents-md.mjs 生成，勿手改) -->`;
  const end = `<!-- END GENERATED: ${name} -->`;
  return `${begin}\n${inner}\n${end}`;
}

// ── 应用到模板 ────────────────────────────────────────────────────────────

// 标记存在 → 整块替换；否则返回 null（交给追加逻辑）。用函数 replacer 避免 $ 特殊替换语义。
function replaceBlock(content, name, block) {
  const re = new RegExp(`<!-- BEGIN GENERATED: ${name}[\\s\\S]*?<!-- END GENERATED: ${name} -->`);
  if (!re.test(content)) return null;
  return content.replace(re, () => block);
}

// 在 '## 角色'（或 '## 身份'）段之后、下一个 ## 段之前插入。找不到则追加到文末。
function insertAfterRole(content, blocks) {
  const insert = blocks.join('\n\n');
  const roleIdx = content.search(/^##\s*(角色|身份)/m);
  if (roleIdx === -1) {
    return `${content.trimEnd()}\n\n${insert}\n`;
  }
  const rest = content.slice(roleIdx + 1);
  const nextRel = rest.search(/^##\s/m);
  if (nextRel === -1) {
    return `${content.trimEnd()}\n\n${insert}\n`;
  }
  const pos = roleIdx + 1 + nextRel;
  return `${content.slice(0, pos)}${insert}\n\n${content.slice(pos)}`;
}

// 返回该模板期望的完整内容（幂等：对已同步内容再跑结果不变）。
function renderTemplate(content, ironBlock, forbiddenBlock) {
  let out = content;
  const pending = [];

  const afterIron = replaceBlock(out, 'iron-laws', ironBlock);
  if (afterIron !== null) out = afterIron;
  else pending.push(ironBlock);

  const afterForbidden = replaceBlock(out, 'forbidden-paths', forbiddenBlock);
  if (afterForbidden !== null) out = afterForbidden;
  else pending.push(forbiddenBlock);

  if (pending.length > 0) out = insertAfterRole(out, pending);
  return out;
}

// ── 主流程 ────────────────────────────────────────────────────────────────

function main() {
  const checkMode = process.argv.includes('--check');

  const laws = parseIronLaws(readFileSync(CLAUDE_MD, 'utf8'));
  const forbidden = parseForbidden(readFileSync(FORBIDDEN_PATHS, 'utf8'));

  const ironBlock = wrapBlock('iron-laws', renderIronLaws(laws));
  const forbiddenBlock = wrapBlock('forbidden-paths', renderForbidden(forbidden));

  let drift = false;
  for (const name of TARGETS) {
    const file = join(TEMPLATES_DIR, name);
    const before = readFileSync(file, 'utf8');
    const after = renderTemplate(before, ironBlock, forbiddenBlock);
    if (before === after) continue;
    drift = true;
    if (checkMode) {
      process.stderr.write(`[drift] ${name} 与源不同步 — 请运行 node scripts/sync-agents-md.mjs\n`);
    } else {
      writeFileSync(file, after);
      process.stdout.write(`[write] 已同步 ${name}\n`);
    }
  }

  if (checkMode) {
    if (drift) {
      process.stderr.write('DRIFT — AGENTS.md/GEMINI.md 生成块过期\n');
      process.exit(1);
    }
    process.stdout.write('OK — 无漂移\n');
    process.exit(0);
  }
  if (!drift) process.stdout.write('OK — 已是最新，无需改动\n');
}

main();
