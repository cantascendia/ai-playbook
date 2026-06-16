#!/usr/bin/env node
// ledger/run.mjs — 事故账本完整闭环编排（v3.14 B）
//
// collect（采集 27 项目事故）→ distill（聚类，≥2 项目印证才 corroborated）→ propagate（反向传播）。
//
// 用法：
//   node ledger/run.mjs                       # 自检：--self collect + distill + dry-run propagate
//   node ledger/run.mjs <projects-root>       # 全舰队 collect + distill + dry-run propagate（看计划）
//   node ledger/run.mjs <projects-root> --auto # 完整闭环：含 propagate --apply（只传 corroborated）
//
// 闭环安全（与 propagate.mjs 一致）：默认 dry-run；--auto 只传 ≥2 项目印证的 corroborated rule；
// 传播物是 advisory learned-rule（子项目红线 hook 覆盖之，坏 rule 不能关 guard）；全程 provenance 可审计。
import { execSync } from 'node:child_process';

const argv = process.argv.slice(2);
const root = argv.find((a) => !a.startsWith('--'));
const AUTO = argv.includes('--auto');
// 时间戳由调用方注入（脚本内不取系统时间，保 run 可重放 — 对齐 §44 replay 原则）
const stamp = process.env.LEDGER_STAMP || new Date().toISOString().slice(0, 19);

function run(cmd) { console.log(`\n$ ${cmd}`); execSync(cmd, { stdio: 'inherit', env: { ...process.env, LEDGER_STAMP: stamp } }); }

console.log('=== ledger 闭环 ===');
run(`node ledger/collect.mjs ${root || '--self'}`);
run('node ledger/distill.mjs');
if (root) {
  run(`node ledger/propagate.mjs ${root}${AUTO ? ' --apply' : ''}`);
} else {
  console.log('\n（--self 模式：跳过 propagate；给 <projects-root> 看全舰队传播计划，加 --auto 真传播）');
}
console.log('\n✅ ledger 闭环完成。drafts 见 ledger/drafts/；传播默认 dry-run，--auto 才写。');
