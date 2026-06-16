#!/usr/bin/env node
// ledger/collect.mjs — 跨项目事故采集（v3.14 B / bold-audit 唯一真 10x）
//
// 把 27 个已部署项目各自 .claude/agent-logs/*.jsonl 里的"红线拦截事故"聚合到中央
// ledger/incidents.jsonl，带 provenance（来源项目 + 时间 + hook + 原因）。
// 这是"同一类 bug 在多个项目反复踩"→ 共享免疫系统的数据底座（learned rule 2026-05-12 痛点）。
//
// 用法：
//   node ledger/collect.mjs <projects-root>     # 扫该目录下所有项目
//   node ledger/collect.mjs --self              # 只扫本仓（默认，安全）
//
// 安全：只读各项目日志，不改任何项目。incident 一律带 source provenance（防匿名投毒）。
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const BLOCKED_RE = /blocked|denied|destructive|forbidden|removal/i;
const LEDGER_DIR = process.env.LEDGER_DIR || 'ledger'; // 可覆盖（eval 用 temp 目录，不碰真账本）
const OUT = join(LEDGER_DIR, 'incidents.jsonl');

function readJsonl(file) {
  try {
    return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

// 从一个项目目录收集 blocked 事故
function collectProject(projDir) {
  const logsDir = join(projDir, '.claude', 'agent-logs');
  if (!existsSync(logsDir)) return [];
  const proj = basename(projDir);
  const out = [];
  for (const f of readdirSync(logsDir)) {
    if (!f.endsWith('.jsonl')) continue;
    for (const e of readJsonl(join(logsDir, f))) {
      const ev = String(e.event || '');
      if (!BLOCKED_RE.test(ev)) continue;
      out.push({
        source_project: proj,        // provenance：哪个项目（防匿名）
        ts: e.ts || '',
        hook: e.hook || '',
        event: ev,
        // details 截断 + 不含路径全文（隐私 + 防注入），只留分类信号
        signal: String(e.details || '').slice(0, 200),
      });
    }
  }
  return out;
}

const arg = process.argv[2] || '--self';
let projectDirs = [];
if (arg === '--self') {
  projectDirs = ['.'];
} else {
  const root = arg;
  for (const d of readdirSync(root, { withFileTypes: true })) {
    if (d.isDirectory() && existsSync(join(root, d.name, '.claude', 'agent-logs'))) {
      projectDirs.push(join(root, d.name));
    }
  }
}

const incidents = projectDirs.flatMap(collectProject);
if (!existsSync(LEDGER_DIR)) mkdirSync(LEDGER_DIR, { recursive: true });
writeFileSync(OUT, incidents.map((i) => JSON.stringify(i)).join('\n') + (incidents.length ? '\n' : ''), 'utf8');

const projects = new Set(incidents.map((i) => i.source_project));
console.log(`collected ${incidents.length} incidents from ${projects.size} project(s) → ${OUT}`);
