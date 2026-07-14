#!/usr/bin/env node
// scripts/telemetry-enroll.mjs — 给所有已部署 ai-playbook 的项目注入 OTel 遥测 env（v4.3 F2）
//
// 做什么：扫描 <projects-root> 下所有含 .claude/hooks/immutable-guard.sh 的项目（= 已部署 harness），
// 向各项目 .claude/settings.local.json（gitignored，机器本地）深合并 telemetry env 块：
//   CLAUDE_CODE_ENABLE_TELEMETRY=1 + OTLP http/json → localhost:4318 + OTEL_RESOURCE_ATTRIBUTES=repo=<项目名>
// 这样 telemetry/report.mjs 的 repo 维度对每个项目自动成立（官方无内置 cwd/repo 属性，必须注入）。
//
// 安全设计：
//   - 默认 dry-run（只列计划）；--apply 才写
//   - 深合并：项目已有的 settings.local.json 键全部保留；env 内已有的键不覆盖
//     （唯 OTEL_RESOURCE_ATTRIBUTES：若已存在但缺 repo= 则追加 repo=，已有 repo= 则不动）
//   - collector 未运行时 OTel SDK 导出失败是静默的，不影响 Claude Code 主流程
//   - 回滚：--remove 删除本脚本注入的键（其余键保留）
//
// 用法：
//   node scripts/telemetry-enroll.mjs /c/projects            # dry-run
//   node scripts/telemetry-enroll.mjs /c/projects --apply
//   node scripts/telemetry-enroll.mjs /c/projects --remove --apply
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const argv = process.argv.slice(2);
const root = argv.find((a) => !a.startsWith('--'));
const APPLY = argv.includes('--apply');
const REMOVE = argv.includes('--remove');
if (!root) { console.log('用法: node scripts/telemetry-enroll.mjs <projects-root> [--apply] [--remove]'); process.exit(1); }

const ENDPOINT = process.env.TELEMETRY_ENDPOINT || 'http://localhost:4318';
const MANAGED_KEYS = [
  'CLAUDE_CODE_ENABLE_TELEMETRY', 'OTEL_METRICS_EXPORTER', 'OTEL_LOGS_EXPORTER',
  'OTEL_EXPORTER_OTLP_PROTOCOL', 'OTEL_EXPORTER_OTLP_ENDPOINT', 'OTEL_METRIC_EXPORT_INTERVAL',
];

// 发现已部署项目：<root>/* 与 <root>/*/*（覆盖 monorepo 子应用），凭 immutable-guard.sh 指纹
function discover(rootDir) {
  const found = [];
  const probe = (dir) => {
    if (existsSync(join(dir, '.claude', 'hooks', 'immutable-guard.sh'))) found.push(dir);
  };
  for (const e of readdirSync(rootDir)) {
    const d = join(rootDir, e);
    try { if (!statSync(d).isDirectory()) continue; } catch { continue; }
    if (e.includes('.bak') || e.startsWith('.')) continue;
    probe(d);
    // 二级（monorepo 子应用，如 nilou-network/*、hoyokit/hoyokit）
    try {
      for (const s of readdirSync(d)) {
        const sd = join(d, s);
        if (s.includes('.bak') || s.startsWith('.')) continue;
        try { if (statSync(sd).isDirectory()) probe(sd); } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  return found;
}

function enroll(projDir) {
  const repo = basename(projDir);
  const slFile = join(projDir, '.claude', 'settings.local.json');
  let settings = {};
  let hadFile = false;
  if (existsSync(slFile)) {
    hadFile = true;
    try { settings = JSON.parse(readFileSync(slFile, 'utf8')); } catch {
      return { repo, action: 'SKIP', reason: 'settings.local.json 非法 JSON，不碰（人工处理）' };
    }
  }
  settings.env = settings.env || {};
  const env = settings.env;
  let changed = [];

  if (REMOVE) {
    for (const k of MANAGED_KEYS) { if (k in env) { delete env[k]; changed.push(`-${k}`); } }
    if (typeof env.OTEL_RESOURCE_ATTRIBUTES === 'string' && env.OTEL_RESOURCE_ATTRIBUTES === `repo=${repo}`) {
      delete env.OTEL_RESOURCE_ATTRIBUTES; changed.push('-OTEL_RESOURCE_ATTRIBUTES');
    }
  } else {
    const wanted = {
      CLAUDE_CODE_ENABLE_TELEMETRY: '1',
      OTEL_METRICS_EXPORTER: 'otlp',
      OTEL_LOGS_EXPORTER: 'otlp',
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/json',
      OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT,
      OTEL_METRIC_EXPORT_INTERVAL: '10000',
    };
    for (const [k, v] of Object.entries(wanted)) {
      if (!(k in env)) { env[k] = v; changed.push(`+${k}`); } // 不覆盖既有
    }
    if (!env.OTEL_RESOURCE_ATTRIBUTES) {
      env.OTEL_RESOURCE_ATTRIBUTES = `repo=${repo}`; changed.push('+OTEL_RESOURCE_ATTRIBUTES');
    } else if (!/(^|,)repo=/.test(env.OTEL_RESOURCE_ATTRIBUTES)) {
      env.OTEL_RESOURCE_ATTRIBUTES += `,repo=${repo}`; changed.push('~OTEL_RESOURCE_ATTRIBUTES(+repo)');
    }
  }

  if (!changed.length) return { repo, action: 'NOOP', reason: '已就绪' };
  if (APPLY) writeFileSync(slFile, JSON.stringify(settings, null, 2) + '\n');
  return { repo, action: APPLY ? (REMOVE ? 'REMOVED' : 'ENROLLED') : 'PLAN', reason: `${hadFile ? '合并' : '新建'} ${changed.join(' ')}` };
}

const projects = discover(root);
console.log(`发现 ${projects.length} 个已部署项目（含 monorepo 子应用）${APPLY ? '' : ' — DRY-RUN（--apply 才写）'}`);
let counts = {};
for (const p of projects) {
  const r = enroll(p);
  counts[r.action] = (counts[r.action] || 0) + 1;
  console.log(`  [${r.action}] ${r.repo.padEnd(24)} ${r.reason}`);
}
console.log(`\n汇总: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
