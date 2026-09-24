// guard 引擎单元测试 —— node --test plugin/hooks/engine/
// 每条案例都是一次真实的历史回归（来源写在用例名里）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.join(__dirname, 'guard.mjs');
const DENY = '"permissionDecision":"deny"';
const ASK = '"permissionDecision":"ask"';

// 夹具默认关 audit —— 测试不得往真实 .claude/agent-logs 写假事件（v4 的日志 100% 是夹具噪声）
function run(name, input, extraEnv = {}) {
  const r = spawnSync(process.execPath, [GUARD, name], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, CTO_AUDIT: '0', CTO_DOUBLE_SIGNED: '', CTO_MAIN_EDIT_ALLOWED: '', CTO_BYPASS_ALLOWED: '', CTO_DESTRUCTIVE_CONFIRMED: '', CTO_MCP_DESTRUCTIVE_CONFIRMED: '', ...extraEnv },
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}
const bash = (cmd, cwd = '.') => ({ tool_name: 'Bash', tool_input: { command: cmd }, cwd });
const edit = (file, cwd) => ({ tool_name: 'Edit', tool_input: { file_path: file }, cwd });

function tmpProject(withLogs = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-test-'));
  if (withLogs) fs.mkdirSync(path.join(dir, '.claude', 'agent-logs'), { recursive: true });
  return dir;
}
function mainRepo() {
  const dir = tmpProject();
  spawnSync('git', ['init', '-b', 'main'], { cwd: dir });
  // unborn HEAD 时 rev-parse 失败 → 放行；需先有 commit 才可测保护分支
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--allow-empty', '-m', 'init'], { cwd: dir });
  return dir;
}

// ═══ forbidden-guard ═══

test('forbidden: auth 路径 → ask（人确认），普通路径放行', () => {
  const dir = tmpProject();
  const r = run('forbidden-guard', edit('src/auth/login.ts', dir));
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes(ASK));
  assert.match(r.stdout, /cto-spec/);
  assert.equal(run('forbidden-guard', edit('src/utils/a.ts', dir)).stdout, '');
});

test('NotebookEdit 的 notebook_path 同样受守（codex review P2）', () => {
  const dir = tmpProject();
  const nb = (p, cwd) => ({ tool_name: 'NotebookEdit', tool_input: { notebook_path: p, new_source: 'x' }, cwd });
  assert.ok(run('forbidden-guard', nb('infra/setup.ipynb', dir)).stdout.includes(ASK));
  const repo = mainRepo();
  assert.ok(run('branch-guard', nb('analysis.ipynb', repo)).stdout.includes(DENY));
});

test('forbidden: CTO_DOUBLE_SIGNED=1 → 静默放行', () => {
  const dir = tmpProject();
  assert.equal(run('forbidden-guard', edit('src/auth/a.ts', dir), { CTO_DOUBLE_SIGNED: '1' }).stdout, '');
});

test('forbidden: Win 反斜杠路径仍命中（lesson windows-path-pattern-generalization）', () => {
  const r = run('forbidden-guard', '{"tool_name":"Edit","tool_input":{"file_path":"C:\\\\p\\\\x\\\\src\\\\auth\\\\login.ts"},"cwd":"C:\\\\p\\\\x"}');
  assert.ok(r.stdout.includes(ASK));
});

test('forbidden: cwd 外绝对路径 —— 剥离失败保留完整路径仍命中', () => {
  assert.ok(run('forbidden-guard', edit('/other/repo/src/auth/login.ts', '/some/where/else')).stdout.includes(ASK));
});

test('forbidden: CI 定义（GitHub + GitLab）默认命中；相似名不误伤', () => {
  const dir = tmpProject();
  for (const f of ['.github/workflows/ci.yml', '.gitlab-ci.yml', '.gitlab/ci/x.yml', 'db/migrations/001.sql', 'infra/main.tf']) {
    assert.ok(run('forbidden-guard', edit(f, dir)).stdout.includes(ASK), f);
  }
  assert.equal(run('forbidden-guard', edit('docs/ci-notes.yml', dir)).stdout, '');
});

test('forbidden: 项目 .claude/forbidden-paths.txt 覆盖默认清单（按字面匹配，. 不是通配）', () => {
  const dir = tmpProject();
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude', 'forbidden-paths.txt'), '# 自定义\nsrc/billing-core/\n.env.prod\n');
  assert.ok(run('forbidden-guard', edit('src/billing-core/x.ts', dir)).stdout.includes(ASK));
  assert.ok(run('forbidden-guard', edit('.env.prod', dir)).stdout.includes(ASK));
  assert.equal(run('forbidden-guard', edit('src/auth/x.ts', dir)).stdout, '', '覆盖后默认清单不再生效');
  assert.equal(run('forbidden-guard', edit('xenvxprod', dir)).stdout, '', '. 必须按字面匹配');
});

test('forbidden: 旧位置 scripts/forbidden-paths.txt 仍被读取（v4 项目兼容）', () => {
  const dir = tmpProject();
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'scripts', 'forbidden-paths.txt'), 'legacy-zone/\n');
  assert.ok(run('forbidden-guard', edit('legacy-zone/a.ts', dir)).stdout.includes(ASK));
});

// ═══ branch-guard（文件）═══

test('branch: 非 git 目录 → 放行', () => {
  assert.equal(run('branch-guard', edit('a.ts', tmpProject())).stdout, '');
});

test('branch: main 上 Edit → deny；CTO_MAIN_EDIT_ALLOWED=1 → 放行', () => {
  const dir = mainRepo();
  assert.ok(run('branch-guard', edit('a.ts', dir)).stdout.includes(DENY));
  assert.equal(run('branch-guard', edit('a.ts', dir), { CTO_MAIN_EDIT_ALLOWED: '1' }).stdout, '');
});

test('branch: main 上写仓库外文件 → 放行（2026-07-02 误拦 ~/.claude/memory）', () => {
  const dir = mainRepo();
  assert.equal(run('branch-guard', edit('/somewhere/else/.claude/memory/note.md', dir)).stdout, '');
});

test('branch: 仓库内绝对路径 / cwd 尾斜杠 / cwd 为子目录 → 仍拦（codex review Major-1）', () => {
  const dir = mainRepo();
  const d = dir.replaceAll('\\', '/');
  assert.ok(run('branch-guard', edit(`${d}/docs/x.md`, dir)).stdout.includes(DENY));
  assert.ok(run('branch-guard', edit(`${d}/docs/x.md`, `${d}/`)).stdout.includes(DENY));
  const sub = path.join(dir, 'packages', 'app');
  fs.mkdirSync(sub, { recursive: true });
  assert.ok(run('branch-guard', edit(`${d}/README.md`, sub)).stdout.includes(DENY));
});

test('branch: Windows 盘符大小写差异仍拦（codex review Major-2）', { skip: process.platform !== 'win32' }, () => {
  const dir = mainRepo();
  const lower = dir.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_m, c) => `${c.toLowerCase()}:`);
  assert.ok(run('branch-guard', edit(`${lower}/docs/x.md`, dir)).stdout.includes(DENY));
});

test('branch: symlink/junction 别名工作树内文件仍拦（codex review round-3）', () => {
  const dir = mainRepo();
  fs.mkdirSync(path.join(dir, 'packages', 'app'), { recursive: true });
  const link = path.join(os.tmpdir(), `guard-link-${path.basename(dir)}`);
  try { fs.symlinkSync(dir, link, 'junction'); } catch { try { fs.symlinkSync(dir, link, 'dir'); } catch { return; } }
  try {
    const l = link.replaceAll('\\', '/');
    assert.ok(run('branch-guard', edit(`${l}/README.md`, `${l}/packages/app`)).stdout.includes(DENY));
  } finally { try { fs.rmSync(link, { recursive: true, force: true }); } catch { /* noop */ } }
});

// ═══ branch-guard（Bash）═══

test('branch-Bash: main 上 commit/merge → deny；feature 分支放行', () => {
  const dir = mainRepo();
  assert.ok(run('branch-guard', bash('git commit -m x', dir)).stdout.includes(DENY));
  assert.ok(run('branch-guard', bash('git merge feat/x', dir)).stdout.includes(DENY));
  spawnSync('git', ['checkout', '-b', 'feat/y'], { cwd: dir });
  assert.equal(run('branch-guard', bash('git commit -m x', dir)).stdout, '');
});

test('branch-Bash: push 看 refspec（HEAD=main 推 feature 必须放行）', () => {
  const dir = mainRepo();
  assert.ok(run('branch-guard', bash('git push origin main', dir)).stdout.includes(DENY));
  assert.ok(run('branch-guard', bash('git push -u origin HEAD:master', dir)).stdout.includes(DENY));
  assert.ok(run('branch-guard', bash('git push', dir)).stdout.includes(DENY));
  assert.equal(run('branch-guard', bash('git push origin feature-x', dir)).stdout, '');
  assert.equal(run('branch-guard', bash('git push -u origin feat/v4.0c-guard-semantics', dir)).stdout, '');
});

test('branch-Bash: 跨仓 cd / git -C 按目标仓 HEAD 判定（v4.7 实测 FP）', () => {
  const mainDir = mainRepo();
  const featDir = mainRepo();
  spawnSync('git', ['checkout', '-b', 'feat/x'], { cwd: featDir });
  const f = featDir.replaceAll('\\', '/');
  const m = mainDir.replaceAll('\\', '/');
  const j = (cmd) => bash(cmd, mainDir);
  assert.equal(run('branch-guard', j(`cd ${f} && git commit -m x`)).stdout, '');
  assert.equal(run('branch-guard', j(`git -C ${f} commit -m x`)).stdout, '');
  assert.ok(run('branch-guard', j(`cd ${m} && git commit -m x`)).stdout.includes(DENY));
  assert.ok(run('branch-guard', j(`git -C ${m} commit -m x`)).stdout.includes(DENY));
  assert.ok(run('branch-guard', j(`cd ${f} && cd ${m} && git commit -m x`)).stdout.includes(DENY));
  assert.ok(run('branch-guard', j('cd /no/such/dir && git commit -m x')).stdout.includes(DENY), '目录不存在 → fail-safe 拦');
});

test('branch-Bash: 同串 checkout -b 后 commit 放行；切回保护分支仍拦', () => {
  const dir = mainRepo();
  assert.equal(run('branch-guard', bash('git checkout -b feat/x && git commit -m x', dir)).stdout, '');
  assert.equal(run('branch-guard', bash('git switch -c feat/y && git commit -m x', dir)).stdout, '');
  assert.ok(run('branch-guard', bash('git checkout -b feat/x && git checkout main && git commit -m x', dir)).stdout.includes(DENY));
  assert.ok(run('branch-guard', bash('git checkout -b main && git commit -m x', dir)).stdout.includes(DENY));
});

test('branch-Bash: 引号 / heredoc / PR 正文里的 git 文本放行（lesson guard-scan-strip-noncode）', () => {
  const dir = mainRepo();
  for (const cmd of [
    'gh pr create --body "please git commit often"',
    'glab mr note create 12 --message "remember to git push origin main"',
    "git log --grep='commit to main'",
    'echo "remember to git commit"',
    "cat > notes.md <<'EOF' git push origin main",
    'git status',
  ]) {
    assert.equal(run('branch-guard', bash(cmd, dir)).stdout, '', cmd);
  }
});

// ═══ bypass-guard ═══

test('bypass: hook 绕过全部 deny —— 含 3 轮对抗验证找到的逃逸族（原 eval 024）', () => {
  for (const cmd of [
    'git commit --no-verify',
    'git commit -n -m x',
    'HUSKY=0 git commit -m x',
    'git stash && git commit && git stash pop',
    'git config core.hooksPath /dev/null',
    'git -C . config core.hooksPath /dev/null',
    'git --git-dir=.git config core.hooksPath /evil',
    'git -c foo=bar config core.hooksPath /evil',
    'git config --global core.hooksPath /tmp/evil',
    'git -c core.hooksPath=/dev/null commit -m x',
    'git config --unset core.hooksPath',
    'GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/evil GIT_CONFIG_COUNT=1 git commit -m x',
    "git config core.hooksPath'' /tmp/evil",
    'git config core.hooksPath"" /tmp/evil',
    'git config "core".hooksPath /evil',
    'git config core."hooksPath" /evil',
    'git config core\\.hooksPath /evil',
    "git config core.hooksPath '>x'",
    "git config core.hooksPath ';h'",
    "git config core.hooksPath '|h'",
    'git${IFS}config${IFS}core.hooksPath${IFS}/tmp/evil',
    'GIT_CONFIG_COUNT=1 GIT_CONFIG_VALUE_0=/dev/null GIT_CONFIG_KEY_0="core.hooksPath"; git commit -m x',
    'git config --get core.hooksPath', // 广义 token：读也拦（fail-safe，读用 git rev-parse --git-path hooks）
  ]) {
    const r = run('bypass-guard', bash(cmd));
    assert.equal(r.status, 0, cmd);
    assert.ok(r.stdout.includes(DENY), `应 deny: ${cmd}`);
  }
});

test('bypass: 正常命令放行 / CTO_BYPASS_ALLOWED=1 放行', () => {
  for (const cmd of ['ls -la', 'git commit -m "fix: x"', 'git rev-parse --git-path hooks']) {
    assert.equal(run('bypass-guard', bash(cmd)).stdout, '', cmd);
  }
  assert.equal(run('bypass-guard', bash('git commit --no-verify'), { CTO_BYPASS_ALLOWED: '1' }).stdout, '');
});

// ═══ destructive-action-guard ═══

test('destructive: 灾难命令 deny', () => {
  for (const cmd of [
    'rm -rf /', 'rm -rf ~', 'rm -rf $HOME', 'echo x && rm -rf /',
    'DROP TABLE users;', 'psql -c "DROP DATABASE prod"', 'redis-cli FLUSHALL',
    'terraform destroy', 'kubectl delete ns prod', 'docker system prune --all --volumes',
    'gh repo delete o/r', 'gh api -X DELETE repos/o/r', 'gh api repos/o/r --method DELETE',
    'glab repo delete o/r', 'glab project delete o/r', 'glab api projects/12345 --method DELETE',
    'glab api --method=DELETE projects/12345', 'glab repo archive o/r', 'glab variable delete MY_SECRET',
    'glab release delete v1 --yes',
  ]) {
    assert.ok(run('destructive-action-guard', bash(cmd)).stdout.includes(DENY), `应 deny: ${cmd}`);
  }
});

test('destructive: 无害命令放行（含只读/写入类 api 调用）', () => {
  for (const cmd of [
    'rm tmp.txt', 'npm test', 'rm -rf node_modules', 'DELETE FROM logs WHERE id<100',
    'echo "DROP TABLE x"', "cat > pr.md <<'EOF' # notes about DROP TABLE in docs",
    'glab mr list --all', 'glab api projects/:id', 'glab api -X POST projects/:id/issues --field title=x',
    'gh api repos/o/r/pulls', 'glab release list',
  ]) {
    assert.equal(run('destructive-action-guard', bash(cmd)).stdout, '', `误拦: ${cmd}`);
  }
});

test('PowerShell 工具同样受守（v4 只 match Bash —— PowerShell 全程无守）', () => {
  const ps = (cmd, cwd = '.') => ({ tool_name: 'PowerShell', tool_input: { command: cmd }, cwd });
  for (const cmd of ['Remove-Item -Recurse -Force C:\\', 'Remove-Item C:/ -Recurse', 'Remove-Item -Recurse $env:USERPROFILE', 'Remove-Item -R ~', 'Format-Volume -DriveLetter D', 'terraform destroy']) {
    assert.ok(run('destructive-action-guard', ps(cmd)).stdout.includes(DENY), `应 deny: ${cmd}`);
  }
  for (const cmd of ['Remove-Item -Recurse -Force node_modules', 'Remove-Item .\\dist -Recurse', 'Get-ChildItem C:\\']) {
    assert.equal(run('destructive-action-guard', ps(cmd)).stdout, '', `误拦: ${cmd}`);
  }
  assert.ok(run('bypass-guard', ps('git commit --no-verify')).stdout.includes(DENY));
  const dir = mainRepo();
  assert.ok(run('branch-guard', ps('git push origin main', dir)).stdout.includes(DENY));
  assert.equal(run('branch-guard', ps('git push origin feat/x', dir)).stdout, '');
});

test('destructive: CTO_DESTRUCTIVE_CONFIRMED=1 放行', () => {
  assert.equal(run('destructive-action-guard', bash('terraform destroy'), { CTO_DESTRUCTIVE_CONFIRMED: '1' }).stdout, '');
});

// ═══ mcp-guard ═══

test('mcp: destructive 工具名 deny / 只读放行', () => {
  assert.ok(run('mcp-guard', { tool_name: 'mcp__x__delete_project', tool_input: {}, cwd: '.' }).stdout.includes(DENY));
  assert.ok(run('mcp-guard', { tool_name: 'mcp__supabase__apply_migration', tool_input: {}, cwd: '.' }).stdout.includes(DENY));
  assert.equal(run('mcp-guard', { tool_name: 'mcp__x__list_projects', tool_input: {}, cwd: '.' }).stdout, '');
});

test('mcp: SQL 内容检测 + WHERE carve-out', () => {
  const q = (query) => run('mcp-guard', { tool_name: 'mcp__x__execute_sql', tool_input: { query }, cwd: '.' }).stdout;
  assert.equal(q('SELECT 1'), '');
  assert.ok(q('TRUNCATE t').includes(DENY));
  assert.ok(q('UPDATE users SET x=1;').includes(DENY));
  assert.equal(q('UPDATE users SET x=1 WHERE id=3'), '');
  assert.ok(q('DROP TABLE a WHERE 1=1').includes(DENY));
});

test('mcp: filesystem 写 forbidden 路径 → ask（tool_input.path 字段；lesson mcp-filesystem-bypasses-all-fileguards）', () => {
  const dir = tmpProject();
  const w = (p) => run('mcp-guard', { tool_name: 'mcp__filesystem__write_file', tool_input: { path: p, content: 'x' }, cwd: dir }).stdout;
  assert.ok(w('src/auth/x.ts').includes(ASK));
  assert.equal(w('src/utils/x.ts'), '');
  assert.equal(w('docs/ai-cto/CONSTITUTION.md'), '', 'v5 起不再守 harness 自身文件');
});

// ═══ 引擎级契约 ═══

test('engine: 未知 guard 放行 + 告警；无效 JSON → 放行', () => {
  const r = run('no-such-guard', '{}');
  assert.equal(r.status, 0);
  assert.match(r.stderr, /未知 guard/);
  assert.equal(run('destructive-action-guard', 'not json at all').stdout, '');
});

test('audit: 拦截写 .claude/agent-logs；CTO_AUDIT=0 时不写（夹具不污染真实日志）', () => {
  const dir = tmpProject(true);
  const logs = () => fs.readdirSync(path.join(dir, '.claude', 'agent-logs'));
  run('destructive-action-guard', bash('terraform destroy', dir)); // run() 默认 CTO_AUDIT=0
  assert.equal(logs().length, 0);
  run('destructive-action-guard', bash('terraform destroy', dir), { CTO_AUDIT: '' });
  const log = fs.readFileSync(path.join(dir, '.claude', 'agent-logs', logs()[0]), 'utf8');
  const entry = JSON.parse(log.trim());
  assert.equal(entry.event, 'destructive-blocked');
  assert.match(entry.details, /terraform destroy/);
});
