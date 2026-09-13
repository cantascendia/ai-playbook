#!/usr/bin/env node
// v4.0 guard engine 入口 — 由 .claude/hooks/<name>.sh thin shim 调起：
//   exec node "$SCRIPT_DIR/engine/guard.mjs" <hook-name>
// stdin = Claude Code hook JSON；行为与 legacy bash 实现语义等价（32 条 golden-trajectory eval 平价门）。
// 回滚杠杆：CTO_GUARD_ENGINE=legacy（shim 层回退旧 .sh 实现，引擎不参与）。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readInput, maybeRunOverride, setPlatform, platform, deny, block } from './lib.mjs';
import { parseApplyPatch, looksLikePatch } from './parsers/apply-patch.mjs';
import {
  immutableGuard, forbiddenGuard, branchGuard, testLockGuard,
  evalGate, vibePromptGuard, trajectoryLogger,
  bypassGuard, destructiveActionGuard, mcpGuard,
} from './guards.mjs';

const GUARDS = {
  'immutable-guard': { fn: immutableGuard, override: true },
  'forbidden-guard': { fn: forbiddenGuard, override: true },
  'branch-guard': { fn: branchGuard, override: true },
  'test-lock-guard': { fn: testLockGuard, override: true },
  'eval-gate': { fn: evalGate, override: true },
  'vibe-prompt-guard': { fn: vibePromptGuard, override: false }, // legacy 无 override 委派，保持一致
  'trajectory-logger': { fn: trajectoryLogger, override: false },
  'bypass-guard': { fn: bypassGuard, override: true },
  'destructive-action-guard': { fn: destructiveActionGuard, override: true },
  'mcp-guard': { fn: mcpGuard, override: true },
};

// v5.0：argv = <hook-name> [--platform claude|codex|agy]；env CTO_GUARD_PLATFORM 为兜底。
// 未知平台一律按 claude 处理（setPlatform 内部归一），不因参数拼写错误而静默改变裁决面。
const ARGV = process.argv.slice(2);
const name = ARGV.find((a) => !a.startsWith('--')) || '';
const pIdx = ARGV.indexOf('--platform');
setPlatform(pIdx >= 0 ? ARGV[pIdx + 1] : (process.env.CTO_GUARD_PLATFORM || 'claude'));

const REDLINE = new Set(['immutable-guard', 'forbidden-guard', 'bypass-guard', 'destructive-action-guard', 'mcp-guard']);

const entry = GUARDS[name];
if (!entry) {
  process.stderr.write(`⚠️ guard engine: 未知 hook '${name}'，放行（fail-open + 告警）\n`);
  process.exit(0);
}

// Codex 的 apply_patch 把「改了哪些文件」藏在 patch 文本里（tool_input 只有 command）。
// 处理方式：解析出每个目标路径，翻译成 **claude 形状的 Write 事件**递归自调本引擎 ——
// 从而 100% 复用已被 44 单测 + eval 验证过的判定路径，而不是在 guard 内部新增多路径控制流。
// 语义对应：Update/Add/Delete/Move 都是整文件级动作，与 Write 同级；old_string 带上下文行，
// 使 immutable 红线 1/4 的段落匹配在 Codex 侧同样成立。
function applyPatchFanout(ctx, hookName) {
  const self = fileURLToPath(import.meta.url);
  const entries = looksLikePatch(ctx.cmd) ? parseApplyPatch(ctx.cmd) : [];
  if (!entries.length) {
    // 解析不出目标路径 = 无法证明这次 patch 安全。红线 guard fail-closed，软 guard 放行。
    if (REDLINE.has(hookName)) {
      const why = `🛑 v5.0 CODEX apply_patch 解析失败：无法确定本次 patch 触及的文件，按红线 fail-closed 拒绝。\n`
        + `hook=${hookName}\n若确为误判，请改用逐文件编辑或人工审核后重试。`;
      if (hookName === 'immutable-guard' || hookName === 'forbidden-guard') block(why);
      deny(why);
    }
    process.exit(0);
  }
  for (const e of entries) {
    const child = spawnSync(process.execPath, [self, hookName], {
      input: JSON.stringify({
        tool_name: 'Write',
        tool_input: { file_path: e.path, content: e.newText, old_string: e.oldText, new_string: e.newText },
        cwd: ctx.cwd,
        session_id: ctx.sessionId,
        hook_event_name: ctx.event || 'PreToolUse',
      }),
      encoding: 'utf8',
    });
    const denied = child.status === 2 || /"permissionDecision":"deny"/.test(child.stdout || '');
    if (denied) {
      // claude 与 codex 的拒绝 schema 同构（deny JSON / exit 2 + stderr），原样转发即可。
      if (child.stdout) process.stdout.write(child.stdout);
      if (child.stderr) process.stderr.write(child.stderr);
      process.exit(child.status === 2 ? 2 : 0);
    }
  }
  process.exit(0);
}

try {
  const ctx = readInput();
  if (entry.override) maybeRunOverride(ctx, name);
  if (platform() === 'codex' && ctx.isApplyPatch && !ctx.filePath && ctx.cmd) {
    applyPatchFanout(ctx, name);
  }
  entry.fn(ctx);
} catch (e) {
  // 引擎内部异常：软 hook fail-open；红线 guard fail-closed（红线不因引擎 bug 出现真空）
  // v5.0：agy 没有 exit-code 阻断通道，fail-closed 必须改走 stdout decision，否则等于静默放行。
  const msg = `⚠️ guard engine 内部异常（${name}）：${e && e.message ? e.message : e}`;
  if (!REDLINE.has(name)) { process.stderr.write(msg + '\n'); process.exit(0); }
  if (platform() === 'agy') deny(msg);
  process.stderr.write(msg + '\n');
  process.exit(2);
}
