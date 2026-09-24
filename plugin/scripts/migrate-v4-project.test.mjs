import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// 迁移只删 v4 清单内的东西；未收录的教训必须中止（codex review P1）
const MIG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrate-v4-project.mjs');

test('migrate-v4-project: 只删 v4 清单内文件，保留项目自己的配置；未收录教训 → 中止', () => {
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-'));
const w = (rel, c = 'x') => { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), c); };
w('.claude/hooks/immutable-guard.sh'); w('.claude/hooks/lib/common.sh'); w('.claude/hooks/engine/guards.mjs');
w('.claude/hooks/my-own-hook.sh', 'user'); // 用户自己的
w('.claude/rules/eval-gate.md'); w('.claude/rules/my-rule.md', 'user');
w('.claude/rules/learned/2026-08-20-heredoc-halves-backslashes.md');
w('.claude/rules/learned/2099-01-01-unrecorded.md', 'lesson');
w('.claude/commands/cto-audit.md'); w('.claude/commands/deploy.md', 'user');
w('.claude/skills/handbook-search/SKILL.md'); w('.claude/skills/my-skill/SKILL.md', 'user');
w('.claude/settings.json', JSON.stringify({
  env: { A: '1' }, statusLine: { type: 'command', command: '.claude/statusline.sh' },
  hooks: {
    PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'bash .claude/hooks/bypass-guard.sh' }, { type: 'command', command: 'bash .claude/hooks/my-own-hook.sh' }] }],
    PostToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'bash .claude/hooks/trajectory-logger.sh' }] }],
  },
}));
const run = () => spawnSync(process.execPath, [MIG, d], { encoding: 'utf8' });

let r = run();
assert.equal(r.status, 1, 'unrecorded lesson must abort');
assert.ok(fs.existsSync(path.join(d, '.claude/hooks/immutable-guard.sh')), 'abort must not delete anything');
fs.rmSync(path.join(d, '.claude/rules/learned/2099-01-01-unrecorded.md'));

r = run();
assert.equal(r.status, 0, r.stderr);
const ex = (p) => fs.existsSync(path.join(d, p));
for (const gone of ['.claude/hooks/immutable-guard.sh', '.claude/hooks/lib', '.claude/hooks/engine', '.claude/rules/eval-gate.md', '.claude/rules/learned', '.claude/commands/cto-audit.md', '.claude/skills/handbook-search']) assert.ok(!ex(gone), `should delete ${gone}`);
for (const kept of ['.claude/hooks/my-own-hook.sh', '.claude/rules/my-rule.md', '.claude/commands/deploy.md', '.claude/skills/my-skill/SKILL.md']) assert.ok(ex(kept), `should keep ${kept}`);
const s = JSON.parse(fs.readFileSync(path.join(d, '.claude/settings.json'), 'utf8'));
assert.deepEqual(s.env, { A: '1' });
assert.equal(s.statusLine, undefined);
assert.deepEqual(s.hooks, { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'bash .claude/hooks/my-own-hook.sh' }] }] });
});
