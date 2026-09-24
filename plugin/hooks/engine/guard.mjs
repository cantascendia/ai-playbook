#!/usr/bin/env node
// guard 引擎入口：node guard.mjs <guard-name>；stdin = Claude Code / Codex PreToolUse hook JSON。
import { readInput } from './lib.mjs';
import { forbiddenGuard, branchGuard, bypassGuard, destructiveActionGuard, mcpGuard } from './guards.mjs';

const GUARDS = {
  'forbidden-guard': forbiddenGuard,
  'branch-guard': branchGuard,
  'bypass-guard': bypassGuard,
  'destructive-action-guard': destructiveActionGuard,
  'mcp-guard': mcpGuard,
};

const name = process.argv[2] || '';
const fn = GUARDS[name];
if (!fn) {
  process.stderr.write(`⚠️ guard engine: 未知 guard '${name}'，放行\n`);
  process.exit(0);
}

try {
  fn(readInput());
  process.exit(0);
} catch (e) {
  // 引擎内部异常 → fail-closed（exit 2 = 阻断），护栏不因引擎 bug 出现真空
  process.stderr.write(`⚠️ guard engine 内部异常（${name}）：${e && e.message ? e.message : e}\n`);
  process.exit(2);
}
