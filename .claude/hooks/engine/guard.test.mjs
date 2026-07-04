// v4.0 guard engine 单元测试 — node --test .claude/hooks/engine/
// 移植全部历史回归案例（v3.9.1 Win 路径 / v3.11 转义引号 / v3.12 字面量 \n / v3.10.2 echo carve-out /
// v3.11.1 MCP path 字段 / eval 042 脱敏）。每条案例注明对应 eval / learned rule 来源。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.join(__dirname, 'guard.mjs');
const DENY_MARK = '"permissionDecision":"deny"';

function run(name, input, extraEnv = {}) {
  const r = spawnSync(process.execPath, [GUARD, name], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, CTO_IS_SUBPROJECT: '', CTO_IS_AI_PLAYBOOK_SELF: '', ...extraEnv },
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function tmpProject(withLogs = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-test-'));
  if (withLogs) fs.mkdirSync(path.join(dir, '.claude', 'agent-logs'), { recursive: true });
  return dir;
}

// ═══ immutable-guard（eval 026/029/031 回归）═══

test('immutable: Win 反斜杠 CLAUDE.md 铁律段 Edit → exit 2（eval 029 case1）', () => {
  const r = run('immutable-guard', '{"tool_name":"Edit","tool_input":{"file_path":"C:\\\\projects\\\\test\\\\foo\\\\CLAUDE.md","old_string":"## 铁律","new_string":""},"cwd":"C:\\\\projects\\\\test\\\\foo"}', { CTO_IS_AI_PLAYBOOK_SELF: '1' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /IMMUTABLE/);
});

test('immutable: Win Write CLAUDE.md 整文件覆写 → exit 2（eval 029 case2）', () => {
  const r = run('immutable-guard', '{"tool_name":"Write","tool_input":{"file_path":"C:\\\\projects\\\\test\\\\foo\\\\CLAUDE.md","content":"new"},"cwd":"C:\\\\projects\\\\test\\\\foo"}', { CTO_IS_AI_PLAYBOOK_SELF: '1' });
  assert.equal(r.status, 2);
});

test('immutable: CONSTITUTION.md 通用红线（无 env）→ exit 2（eval 029 case3）', () => {
  const r = run('immutable-guard', '{"tool_name":"Edit","tool_input":{"file_path":"C:\\\\projects\\\\test\\\\foo\\\\docs\\\\ai-cto\\\\CONSTITUTION.md","old_string":"x","new_string":"y"},"cwd":"C:\\\\projects\\\\test\\\\foo"}');
  assert.equal(r.status, 2);
});

test('immutable: forbidden-paths.txt 删条目（JSON \\n 多行）→ exit 2（eval 029 case4 / v3.12 回归）', () => {
  const r = run('immutable-guard', '{"tool_name":"Edit","tool_input":{"file_path":"C:\\\\projects\\\\test\\\\foo\\\\scripts\\\\forbidden-paths.txt","old_string":"auth/\\npayment/","new_string":"payment/"},"cwd":"C:\\\\projects\\\\test\\\\foo"}');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /auth\//);
});

test('immutable: forbidden-paths.txt 只加不删 → exit 0（eval 026 允许案例）', () => {
  const r = run('immutable-guard', { tool_name: 'Edit', tool_input: { file_path: 'scripts/forbidden-paths.txt', old_string: 'auth/', new_string: 'auth/\nnew-path/' }, cwd: '.' });
  assert.equal(r.status, 0);
});

test('immutable: POSIX 普通文件 → exit 0（eval 029 case5）', () => {
  const r = run('immutable-guard', { tool_name: 'Edit', tool_input: { file_path: 'src/foo.ts', old_string: 'a', new_string: 'b' }, cwd: '.' });
  assert.equal(r.status, 0);
});

test('immutable: 子项目 CLAUDE.md Write 放行（learned rule 2026-05-12 / eval 031）', () => {
  const dir = tmpProject();
  const r = run('immutable-guard', { tool_name: 'Write', tool_input: { file_path: `${dir}/CLAUDE.md`, content: 'x' }, cwd: dir });
  assert.equal(r.status, 0);
});

test('immutable: CTO_CONSTITUTION_AMEND=1 解锁 CONSTITUTION → exit 0', () => {
  const r = run('immutable-guard', { tool_name: 'Edit', tool_input: { file_path: 'docs/ai-cto/CONSTITUTION.md', old_string: 'x', new_string: 'y' }, cwd: '.' }, { CTO_CONSTITUTION_AMEND: '1' });
  assert.equal(r.status, 0);
});

// ═══ forbidden-guard（eval 023/030 回归）═══

test('forbidden: src/auth/login.ts → exit 2 + §32.1 文案（eval 023）', () => {
  const dir = tmpProject();
  const r = run('forbidden-guard', { tool_name: 'Edit', tool_input: { file_path: 'src/auth/login.ts' }, cwd: dir });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /§32\.1/);
  assert.match(r.stderr, /cto-spec/);
});

test('forbidden: Win 反斜杠 auth 路径 → exit 2（eval 030 / learned rule 2026-05-12）', () => {
  const r = run('forbidden-guard', '{"tool_name":"Edit","tool_input":{"file_path":"C:\\\\p\\\\x\\\\src\\\\auth\\\\login.ts"},"cwd":"C:\\\\p\\\\x"}');
  assert.equal(r.status, 2);
});

test('forbidden: 普通路径放行 + CTO_DOUBLE_SIGNED 解锁', () => {
  const dir = tmpProject();
  assert.equal(run('forbidden-guard', { tool_name: 'Edit', tool_input: { file_path: 'src/utils/a.ts' }, cwd: dir }).status, 0);
  assert.equal(run('forbidden-guard', { tool_name: 'Edit', tool_input: { file_path: 'src/auth/a.ts' }, cwd: dir }, { CTO_DOUBLE_SIGNED: '1' }).status, 0);
});

test('forbidden: 剥离失败保留完整路径仍命中（cwd 外绝对路径）', () => {
  const r = run('forbidden-guard', { tool_name: 'Edit', tool_input: { file_path: '/other/repo/src/auth/login.ts' }, cwd: '/some/where/else' });
  assert.equal(r.status, 2);
});

// ═══ branch-guard ═══

test('branch: 非 git 目录 → exit 0', () => {
  const dir = tmpProject();
  assert.equal(run('branch-guard', { tool_name: 'Edit', tool_input: { file_path: 'a.ts' }, cwd: dir }).status, 0);
});

test('branch: main 分支 Edit → exit 2；CTO_MAIN_EDIT_ALLOWED=1 → 0（铁律 #8）', () => {
  const dir = tmpProject();
  spawnSync('git', ['init', '-b', 'main'], { cwd: dir });
  // unborn HEAD 时 rev-parse 失败 → 放行（与 legacy bash 一致），需先有 commit 才可测保护分支
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--allow-empty', '-m', 'init'], { cwd: dir });
  const input = { tool_name: 'Edit', tool_input: { file_path: 'a.ts' }, cwd: dir };
  assert.equal(run('branch-guard', input).status, 2);
  assert.equal(run('branch-guard', input, { CTO_MAIN_EDIT_ALLOWED: '1' }).status, 0);
});

test('branch: main 上写仓库外文件 → exit 0（放行 — 修 2026-07-02 误拦，绝对路径不在 cwd 前缀内）', () => {
  const dir = mainRepo();
  // 模拟 ~/.claude/.../memory/*.md：绝对路径且不落在 cwd 工作树内 → 与本仓 main 无关
  const outside = { tool_name: 'Write', tool_input: { file_path: '/somewhere/else/.claude/memory/note.md', content: 'x' }, cwd: dir };
  assert.equal(run('branch-guard', outside).status, 0);
});

test('branch: main 上写仓库内文件（绝对路径）→ exit 2（仍拦，前缀命中 cwd）', () => {
  const dir = mainRepo();
  const inside = { tool_name: 'Write', tool_input: { file_path: `${dir.replaceAll('\\', '/')}/docs/x.md`, content: 'x' }, cwd: dir };
  assert.equal(run('branch-guard', inside).status, 2);
});

test('branch: cwd 带尾斜杠时仓库内文件仍拦（防御性 — 去尾斜杠归一，防 false-negative 漏拦）', () => {
  const dir = mainRepo();
  const inside = { tool_name: 'Write', tool_input: { file_path: `${dir.replaceAll('\\', '/')}/docs/x.md`, content: 'x' }, cwd: `${dir.replaceAll('\\', '/')}/` };
  assert.equal(run('branch-guard', inside).status, 2);
});

test('branch: cwd 为子目录时同仓文件（cwd 外）仍拦（codex §48 Major-1 — 边界取 git 工作树根）', () => {
  const dir = mainRepo();
  const sub = path.join(dir, 'packages', 'app');
  fs.mkdirSync(sub, { recursive: true });
  // 文件在仓库根、不在 cwd(子目录) 前缀内 → 用 cwd 前缀会漏拦；边界取工作树根 → 仍拦
  const inRepoOutsideCwd = { tool_name: 'Write', tool_input: { file_path: `${dir.replaceAll('\\', '/')}/README.md`, content: 'x' }, cwd: sub };
  assert.equal(run('branch-guard', inRepoOutsideCwd).status, 2);
});

test('branch: Windows 盘符/大小写差异的同仓文件仍拦（codex §48 Major-2 — 大小写不敏感归一）', { skip: process.platform !== 'win32' }, () => {
  const dir = mainRepo();
  // 文件盘符小写、cwd 盘符原样 → 大小写敏感前缀会漏拦；canon 归一后 → 仍拦
  const lowerDrive = dir.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_m, d) => `${d.toLowerCase()}:`);
  const inside = { tool_name: 'Write', tool_input: { file_path: `${lowerDrive}/docs/x.md`, content: 'x' }, cwd: dir };
  assert.equal(run('branch-guard', inside).status, 2);
});

// ═══ test-lock-guard（advisory，永不 block）═══

test('test-lock: 测试文件 → exit 0 + additionalContext JSON（铁律 #14 advisory）', () => {
  const r = run('test-lock-guard', { tool_name: 'Edit', tool_input: { file_path: 'src/__tests__/a.test.ts' }, cwd: '.' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /additionalContext/);
  assert.match(r.stdout, /Test-Lock/);
});

// ═══ eval-gate（advisory）═══

test('eval-gate: 命令文件 → additionalContext；ACK=1 → 静默（audit 仍先写）', () => {
  const dir = tmpProject(true);
  const input = { tool_name: 'Edit', tool_input: { file_path: `${dir}/.claude/commands/x.md` }, cwd: dir, hook_event_name: 'PostToolUse', session_id: 't' };
  const r1 = run('eval-gate', input);
  assert.equal(r1.status, 0);
  assert.match(r1.stdout, /铁律 #12/);
  const r2 = run('eval-gate', input, { CTO_EVAL_GATE_ACK: '1' });
  assert.equal(r2.status, 0);
  assert.equal(r2.stdout, '');
  const day = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const log = fs.readFileSync(path.join(dir, '.claude', 'agent-logs', `${day.getFullYear()}-${p(day.getMonth() + 1)}-${p(day.getDate())}.jsonl`), 'utf8');
  assert.match(log, /eval-gate-warn/); // audit 先于 opt-out（顺序 load-bearing）
});

// ═══ bypass-guard（eval 024/051 回归）═══

test('bypass: 4 种绕过全部 deny（eval 024）+ deny JSON 字节形状（eval 051）', () => {
  for (const cmd of ['git commit --no-verify', 'git config core.hooksPath x', 'HUSKY=0 git commit -m x', 'git stash && git commit && git stash pop']) {
    const r = run('bypass-guard', { tool_name: 'Bash', tool_input: { command: cmd }, cwd: '.' });
    assert.equal(r.status, 0, cmd);
    assert.ok(r.stdout.includes(DENY_MARK), `deny JSON 缺失: ${cmd}`);
  }
});

test('bypass: 正常命令放行 / CTO_BYPASS_ALLOWED 解锁', () => {
  assert.equal(run('bypass-guard', { tool_name: 'Bash', tool_input: { command: 'ls -la' }, cwd: '.' }).stdout, '');
  const r = run('bypass-guard', { tool_name: 'Bash', tool_input: { command: 'git commit --no-verify' }, cwd: '.' }, { CTO_BYPASS_ALLOWED: '1' });
  assert.equal(r.stdout, '');
});

// ═══ destructive-action-guard（eval 032/033/051 + v3.11 转义引号回归）═══

test('destructive: 灾难命令 deny（eval 032）', () => {
  for (const cmd of ['rm -rf /', 'DROP TABLE users;', 'terraform destroy', 'kubectl delete ns prod']) {
    const r = run('destructive-action-guard', { tool_name: 'Bash', tool_input: { command: cmd }, cwd: '.' });
    assert.ok(r.stdout.includes(DENY_MARK), `应 deny: ${cmd}`);
  }
});

test('destructive: 无害命令放行（eval 032：rm -rf node_modules 不匹配任何 FS 模式）', () => {
  for (const cmd of ['rm tmp.txt', 'npm test', 'rm -rf node_modules', 'DELETE FROM logs WHERE id<100']) {
    const r = run('destructive-action-guard', { tool_name: 'Bash', tool_input: { command: cmd }, cwd: '.' });
    assert.equal(r.stdout, '', `不应 deny: ${cmd}`);
  }
});

test('destructive: echo carve-out（eval 033 / learned rule 2026-05-20）', () => {
  const r = run('destructive-action-guard', { tool_name: 'Bash', tool_input: { command: 'echo "DROP TABLE x"' }, cwd: '.' });
  assert.equal(r.stdout, '');
  // 但复合命令不受 carve-out 保护
  const r2 = run('destructive-action-guard', { tool_name: 'Bash', tool_input: { command: 'echo x && rm -rf /' }, cwd: '.' });
  assert.ok(r2.stdout.includes(DENY_MARK));
});

test('destructive: 转义引号内容必须命中（v3.11 安全回归：psql -c "DROP DATABASE"）', () => {
  const r = run('destructive-action-guard', '{"tool_name":"Bash","tool_input":{"command":"psql -c \\"DROP DATABASE prod\\""},"cwd":"."}');
  assert.ok(r.stdout.includes(DENY_MARK));
});

test('destructive: heredoc 起始标记剥离（PR body 文档场景）', () => {
  const r = run('destructive-action-guard', { tool_name: 'Bash', tool_input: { command: "cat > pr.md <<'EOF' # notes about DROP TABLE in docs" }, cwd: '.' });
  assert.equal(r.stdout, '');
});

// ═══ mcp-guard（eval 034/035/047/051 回归）═══

test('mcp: destructive 工具名 deny / 只读放行（eval 034/051）', () => {
  const r1 = run('mcp-guard', { tool_name: 'mcp__x__delete_project', tool_input: {}, cwd: '.' });
  assert.ok(r1.stdout.includes(DENY_MARK));
  const r2 = run('mcp-guard', { tool_name: 'mcp__x__list_projects', tool_input: {}, cwd: '.' });
  assert.equal(r2.stdout, '');
});

test('mcp: SQL 内容检测 + WHERE carve-out（eval 047）', () => {
  const q = (query) => run('mcp-guard', { tool_name: 'mcp__x__execute_sql', tool_input: { query }, cwd: '.' });
  assert.equal(q('SELECT 1').stdout, '');
  assert.ok(q('TRUNCATE t').stdout.includes(DENY_MARK));
  assert.ok(q('UPDATE users SET x=1;').stdout.includes(DENY_MARK));
  assert.equal(q('UPDATE users SET x=1 WHERE id=3').stdout, '');
  assert.ok(q('DROP TABLE a WHERE 1=1').stdout.includes(DENY_MARK)); // WHERE + DROP 仍拦
});

test('mcp: filesystem 写红线文件（tool_input.path 字段 — learned rule 2026-05-29 / eval 035）', () => {
  const r1 = run('mcp-guard', { tool_name: 'mcp__filesystem__write_file', tool_input: { path: 'docs/ai-cto/CONSTITUTION.md', content: 'x' }, cwd: '.' });
  assert.ok(r1.stdout.includes(DENY_MARK));
  const r2 = run('mcp-guard', { tool_name: 'mcp__filesystem__write_file', tool_input: { path: 'src/utils/x.ts', content: 'x' }, cwd: '.' });
  assert.equal(r2.stdout, '');
});

// ═══ vibe-prompt-guard ═══

test('vibe: 关键词触发 additionalContext（含 CJK 强行）', () => {
  for (const p of ['just YOLO it', '强行推上线']) {
    const r = run('vibe-prompt-guard', { prompt: p, cwd: '.', hook_event_name: 'UserPromptSubmit' });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /§33/, p);
  }
  assert.equal(run('vibe-prompt-guard', { prompt: '正常修个 bug', cwd: '.' }).stdout, '');
});

// ═══ trajectory-logger（eval 042 脱敏回归）═══

test('trajectory: 密钥脱敏 + 普通命令原样（eval 042）', () => {
  const dir = tmpProject(true);
  const secret = 'export K=sk-abcdefghij1234567890ZZ && gh auth ghp_ABCDEFGHIJ1234567890abcdef';
  run('trajectory-logger', { tool_name: 'Bash', tool_input: { command: secret }, cwd: dir, hook_event_name: 'PostToolUse', session_id: 's' });
  run('trajectory-logger', { tool_name: 'Bash', tool_input: { command: 'npm test' }, cwd: dir, hook_event_name: 'PostToolUse', session_id: 's' });
  const files = fs.readdirSync(path.join(dir, '.claude', 'agent-logs'));
  const log = fs.readFileSync(path.join(dir, '.claude', 'agent-logs', files[0]), 'utf8');
  assert.ok(!log.includes('sk-abcdefghij'), '密钥泄漏: sk-');
  assert.ok(!log.includes('ghp_ABCDEF'), '密钥泄漏: ghp_');
  assert.match(log, /REDACTED/);
  assert.match(log, /npm test/);
  assert.match(log, /"schema":"v3.8"/); // 字节兼容
});

test('trajectory: agent-logs 目录缺失 → 静默 exit 0', () => {
  const dir = tmpProject(false);
  const r = run('trajectory-logger', { tool_name: 'Bash', tool_input: { command: 'x' }, cwd: dir });
  assert.equal(r.status, 0);
});

test('immutable: MSYS 风格 cwd（git-bash pwd）下 self 自动检测生效（eval 026/031 回归）', () => {
  // 本仓即 ai-playbook self；git-bash 的 $(pwd) 形如 /c/projects/ai-playbook
  const repoWin = path.resolve(__dirname, '..', '..', '..').replaceAll('\\', '/');
  const msys = repoWin.replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
  const r = run('immutable-guard', { tool_name: 'Edit', tool_input: { file_path: `${msys}/CLAUDE.md`, old_string: '## 铁律', new_string: '' }, cwd: msys });
  assert.equal(r.status, 2);
});

// ═══ v4.0c 新语义（PR-C，人双签门槛）═══

function mainRepo() {
  const dir = tmpProject();
  spawnSync('git', ['init', '-b', 'main'], { cwd: dir });
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--allow-empty', '-m', 'init'], { cwd: dir });
  return dir;
}

test('branch-Bash: main 上 git commit/merge → deny；feature 分支 → 放行', () => {
  const dir = mainRepo();
  const j = (cmd) => ({ tool_name: 'Bash', tool_input: { command: cmd }, cwd: dir });
  assert.ok(run('branch-guard', j('git commit -m x')).stdout.includes(DENY_MARK));
  assert.ok(run('branch-guard', j('git merge feat/x')).stdout.includes(DENY_MARK));
  spawnSync('git', ['checkout', '-b', 'feat/y'], { cwd: dir });
  assert.equal(run('branch-guard', j('git commit -m x')).stdout, '');
});

test('branch-Bash: push refspec 判定（HEAD=main 推 feature 必须放行 — FP 矩阵核心）', () => {
  const dir = mainRepo();
  const j = (cmd) => ({ tool_name: 'Bash', tool_input: { command: cmd }, cwd: dir });
  assert.ok(run('branch-guard', j('git push origin main')).stdout.includes(DENY_MARK));
  assert.ok(run('branch-guard', j('git push -u origin HEAD:master')).stdout.includes(DENY_MARK));
  assert.ok(run('branch-guard', j('git push')).stdout.includes(DENY_MARK)); // bare push，HEAD=main
  assert.equal(run('branch-guard', j('git push origin feature-x')).stdout, ''); // 关键 FP 案例
  assert.equal(run('branch-guard', j('git push -u origin feat/v4.0c-guard-semantics')).stdout, '');
});

test('branch-Bash: 文本/引号/heredoc/非执行 git 子命令全部放行（learned rule 2026-05-20）', () => {
  const dir = mainRepo();
  const j = (cmd) => ({ tool_name: 'Bash', tool_input: { command: cmd }, cwd: dir });
  for (const cmd of [
    'gh pr create --body "please git commit often"',
    "git log --grep='commit to main'",
    'echo "remember to git commit"',
    "cat > notes.md <<'EOF' git push origin main",
    'git status',
  ]) {
    assert.equal(run('branch-guard', j(cmd)).stdout, '', cmd);
  }
  // opt-out
  const r = run('branch-guard', j('git commit -m x'), { CTO_MAIN_EDIT_ALLOWED: '1' });
  assert.equal(r.stdout, '');
});

test('self-protection: Write 覆写既有 guard → exit 2；单 Edit / 新文件 / AMEND → 放行', () => {
  const dir = tmpProject();
  fs.mkdirSync(path.join(dir, '.claude', 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude', 'hooks', 'forbidden-guard.sh'), '#!/bin/bash\nexit 0\n');
  const wj = (file) => ({ tool_name: 'Write', tool_input: { file_path: `${dir.replaceAll('\\', '/')}/${file}`, content: 'x' }, cwd: dir });
  assert.equal(run('immutable-guard', wj('.claude/hooks/forbidden-guard.sh')).status, 2);
  assert.equal(run('immutable-guard', wj('.claude/hooks/forbidden-guard.sh'), { CTO_GUARD_AMEND: '1' }).status, 0);
  assert.equal(run('immutable-guard', wj('.claude/hooks/engine/new-helper.mjs')).status, 0); // 新文件放行
  const ej = { tool_name: 'Edit', tool_input: { file_path: `${dir.replaceAll('\\', '/')}/.claude/hooks/forbidden-guard.sh`, old_string: 'exit 0', new_string: 'exit 0 # fix' }, cwd: dir };
  assert.equal(run('immutable-guard', ej).status, 0); // 单 Edit 精修不受阻
});

// ═══ 引擎级契约 ═══

test('engine: 未知 hook 名 fail-open + 告警；无效 JSON → 各 guard 放行（bash 同语义）', () => {
  const r = run('no-such-guard', '{}');
  assert.equal(r.status, 0);
  assert.match(r.stderr, /未知 hook/);
  assert.equal(run('immutable-guard', 'not json at all').status, 0);
});

test('engine: hooks-overrides 透传（exec 语义：退出码传播）', () => {
  const dir = tmpProject();
  fs.mkdirSync(path.join(dir, '.claude', 'hooks-overrides'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude', 'hooks-overrides', 'forbidden-guard.sh'), '#!/usr/bin/env bash\nexit 7\n');
  const r = run('forbidden-guard', { tool_name: 'Edit', tool_input: { file_path: 'src/auth/x.ts' }, cwd: dir });
  assert.equal(r.status, 7);
});
