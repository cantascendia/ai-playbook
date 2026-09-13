#!/usr/bin/env node
// guard 分组启动器（v5.0 WS2/WS3）
//
//   node group.mjs <platform> <guard-a> <guard-b> ...
//
// 作用：读一次 stdin，依次喂给若干 guard **各自的独立进程**，任一拒绝即转发其输出并结束。
//
// 为什么需要（Codex）：SPIKES-2026-09 spike-5 实测 —— Codex 的 hook trust 是
// **逐 hook 条目**按 `<hooks.json 绝对路径>:<event>:<组下标>:<条目下标>` 登记 sha256 的，
// 一个项目每多一个 hook 条目就多一次人工批准，且任何重新生成都会让全部条目失信。
// 把「一个 matcher 组里的 N 个 guard」收成一条命令，直接把 Codex 侧的批准次数从 8 次降到 3 次。
//
// 与被推迟到 v5.1 的 dispatch 的区别（重要，不要混为一谈）：
//   - 本模块：**多进程**，每个 guard 仍是独立进程，控制流与 audit 写入与今天逐条挂载完全等价 → 零行为风险。
//   - v5.1 dispatch：**单进程**内串跑多个 guard，需要先把 guard 纯函数化，否则第一个 process.exit
//     会吞掉后续 guard 的 auditLog。那才是需要 env 杠杆保护的改造。
//
// 拒绝判定按平台形状识别：exit 2 / hookSpecificOutput.permissionDecision=deny / {"decision":"deny"}。
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.join(HERE, 'guard.mjs');

const [platform, ...guards] = process.argv.slice(2);
if (!platform || guards.length === 0) {
  process.stderr.write('usage: group.mjs <platform> <guard...>\n');
  process.exit(0); // 用法错误不应变成红线真空以外的副作用；fail-open + 告警（同 guard.mjs 未知 hook 语义）
}

let input = '';
try { input = fs.readFileSync(0, 'utf8'); } catch { input = ''; }

for (const g of guards) {
  const r = spawnSync(process.execPath, [GUARD, g, '--platform', platform], {
    input, encoding: 'utf8',
  });
  const out = r.stdout || '';
  const denied = r.status === 2
    || /"permissionDecision":"deny"/.test(out)
    || /"decision":"deny"/.test(out);
  if (denied) {
    if (out) process.stdout.write(out);
    if (r.stderr) process.stderr.write(r.stderr);
    process.exit(r.status === 2 ? 2 : 0);
  }
  // 非拒绝时也要透传软提醒（additionalContext / stderr 提示），否则 test-lock / eval-gate 的提醒会丢
  if (out) process.stdout.write(out);
  if (r.stderr) process.stderr.write(r.stderr);
}
process.exit(0);
