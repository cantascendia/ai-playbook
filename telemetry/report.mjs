#!/usr/bin/env node
// telemetry/report.mjs — 读 telemetry/data/*.jsonl，按维度聚合 Claude Code 用量。
//
// 零依赖。数据源是 collector.mjs 落盘的 JSONL（每行一个拍平后的 datapoint）。
//
// 用法：
//   node telemetry/report.mjs                         # 默认 --by repo,model --since 30
//   node telemetry/report.mjs --by repo,model,session.id
//   node telemetry/report.mjs --since 7
//   node telemetry/report.mjs --dims                  # 列出数据里实际出现的维度键
//   node telemetry/report.mjs --html out.html         # 额外输出静态 HTML 表
//
// 维度解析优先级：resource 属性 > datapoint 属性。缺失 -> '(unset)'（诚实，不编造）。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- 参数解析 ----
function parseArgs(argv) {
  const opts = { by: 'repo,model', since: 30, html: null, dims: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--by') opts.by = argv[++i];
    else if (a === '--since') opts.since = Number(argv[++i]);
    else if (a === '--html') opts.html = argv[++i];
    else if (a === '--dims') opts.dims = true;
    else if (a === '--data-dir') opts.dataDir = argv[++i];
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const DATA_DIR = opts.dataDir || process.env.TELEMETRY_DATA_DIR || path.join(__dirname, 'data');

const TOKEN_METRIC = 'claude_code.token.usage';
const COST_METRIC = 'claude_code.cost.usage';
const SESSION_METRIC = 'claude_code.session.count';
const TOKEN_TYPES = ['input', 'output', 'cacheRead', 'cacheCreation'];

// ---- 读 JSONL ----
function loadRows(sinceDays) {
  if (!fs.existsSync(DATA_DIR)) return [];
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('metrics-') && f.endsWith('.jsonl'))
    .map((f) => path.join(DATA_DIR, f));
  const rows = [];
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let r;
      try {
        r = JSON.parse(line);
      } catch {
        continue; // 坏行跳过，不崩
      }
      const t = Date.parse(r.ts);
      if (Number.isFinite(t) && t < cutoff) continue;
      rows.push(r);
    }
  }
  return rows;
}

// 维度取值：resource 优先，其次 datapoint attrs，缺失 -> (unset)
function dimValue(row, dim) {
  const res = row.resource || {};
  const attrs = row.attrs || {};
  if (res[dim] != null && res[dim] !== '') return String(res[dim]);
  if (attrs[dim] != null && attrs[dim] !== '') return String(attrs[dim]);
  return '(unset)';
}

// ---- --dims：列出出现过的维度键 ----
function listDims(rows) {
  const keys = new Set();
  for (const r of rows) {
    for (const k of Object.keys(r.resource || {})) keys.add(k);
    for (const k of Object.keys(r.attrs || {})) keys.add(k);
  }
  return [...keys].sort();
}

// ---- 聚合 ----
function aggregate(rows, dims) {
  const groups = new Map();
  const sessionSeen = new Map(); // groupKey -> Set(session.id)
  for (const r of rows) {
    const keyVals = dims.map((d) => dimValue(r, d));
    const key = keyVals.join('');
    if (!groups.has(key)) {
      groups.set(key, {
        keyVals,
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheCreation: 0,
        cost: 0,
        sessions: 0,
      });
      sessionSeen.set(key, new Set());
    }
    const g = groups.get(key);
    const v = Number(r.value) || 0;
    if (r.metric === TOKEN_METRIC) {
      const type = (r.attrs && r.attrs.type) || '';
      if (TOKEN_TYPES.includes(type)) g[type] += v;
    } else if (r.metric === COST_METRIC) {
      g.cost += v;
    } else if (r.metric === SESSION_METRIC) {
      g.sessions += v;
    }
    // session 去重（若 datapoint 带 session.id）
    const sid = (r.resource && r.resource['session.id']) || (r.attrs && r.attrs['session.id']);
    if (sid) sessionSeen.get(key).add(String(sid));
  }
  // 若没有 session.count 指标，用去重的 session.id 数兜底
  for (const [key, g] of groups) {
    if (!g.sessions) g.sessions = sessionSeen.get(key).size;
  }
  return [...groups.values()].sort((a, b) => b.input + b.output - (a.input + a.output));
}

function fmt(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US');
}

// ---- 终端表格 ----
function renderTable(groups, dims) {
  const headers = [...dims, 'input', 'output', 'cacheRead', 'cacheCreation', 'cost($)', 'sessions'];
  const rows = groups.map((g) => [
    ...g.keyVals,
    fmt(g.input),
    fmt(g.output),
    fmt(g.cacheRead),
    fmt(g.cacheCreation),
    g.cost.toFixed(4),
    fmt(g.sessions),
  ]);
  // totals
  const totals = groups.reduce(
    (t, g) => {
      t.input += g.input;
      t.output += g.output;
      t.cacheRead += g.cacheRead;
      t.cacheCreation += g.cacheCreation;
      t.cost += g.cost;
      t.sessions += g.sessions;
      return t;
    },
    { input: 0, output: 0, cacheRead: 0, cacheCreation: 0, cost: 0, sessions: 0 }
  );
  const totalRow = [
    'TOTAL',
    ...dims.slice(1).map(() => ''),
    fmt(totals.input),
    fmt(totals.output),
    fmt(totals.cacheRead),
    fmt(totals.cacheCreation),
    totals.cost.toFixed(4),
    fmt(totals.sessions),
  ];
  const all = [headers, ...rows, totalRow];
  const widths = headers.map((_, c) => Math.max(...all.map((r) => String(r[c]).length)));
  const line = (r) => r.map((cell, c) => String(cell).padEnd(widths[c])).join('  ');
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  const out = [];
  out.push(line(headers));
  out.push(sep);
  for (const r of rows) out.push(line(r));
  out.push(sep);
  out.push(line(totalRow));
  return out.join('\n');
}

// ---- HTML 表 ----
function renderHtml(groups, dims, sinceDays) {
  const headers = [...dims, 'input', 'output', 'cacheRead', 'cacheCreation', 'cost($)', 'sessions'];
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const th = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const trs = groups
    .map(
      (g) =>
        `<tr>${[
          ...g.keyVals.map(esc),
          fmt(g.input),
          fmt(g.output),
          fmt(g.cacheRead),
          fmt(g.cacheCreation),
          g.cost.toFixed(4),
          fmt(g.sessions),
        ]
          .map((c) => `<td>${c}</td>`)
          .join('')}</tr>`
    )
    .join('\n');
  return `<!doctype html><meta charset="utf-8"><title>Claude Code 用量</title>
<style>body{font-family:system-ui,sans-serif;margin:2rem}table{border-collapse:collapse}
th,td{border:1px solid #ccc;padding:.35rem .6rem;text-align:right}
th:first-child,td:first-child{text-align:left}thead{background:#f3f3f3}
footer{color:#888;margin-top:1rem;font-size:.85rem}</style>
<h1>Claude Code 本地用量（最近 ${sinceDays} 天，按 ${esc(dims.join(', '))}）</h1>
<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>
<footer>成本为本地估算，非官方账单。数据来源：telemetry/data/ OTLP JSONL。</footer>`;
}

// ---- main ----
function main() {
  const rows = loadRows(opts.since);

  if (opts.dims) {
    const dims = listDims(rows);
    if (!dims.length) {
      console.log('（暂无数据，先运行 collector 并触发一些 Claude Code 用量）');
      return;
    }
    console.log('可用维度键（resource + datapoint 属性）：');
    for (const d of dims) console.log('  ' + d);
    return;
  }

  const dims = opts.by.split(',').map((s) => s.trim()).filter(Boolean);
  if (!rows.length) {
    console.log(`（最近 ${opts.since} 天在 ${DATA_DIR} 无 metrics 数据）`);
    return;
  }
  const groups = aggregate(rows, dims);
  console.log(`Claude Code 本地用量 · 最近 ${opts.since} 天 · 按 ${dims.join(', ')}`);
  console.log('');
  console.log(renderTable(groups, dims));
  console.log('');
  console.log('注：成本为本地估算非账单（claude_code.cost.usage）。');

  if (opts.html) {
    fs.writeFileSync(opts.html, renderHtml(groups, dims, opts.since));
    console.log(`HTML 已写入 ${opts.html}`);
  }
}

main();
