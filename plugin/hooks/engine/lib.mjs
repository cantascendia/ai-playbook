// guard engine 共享库 — stdin JSON 解析 / 路径 normalize / 动作原语 / audit
//
// 字节契约：
//   - deny/ask JSON: {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny"|"ask",...}} 紧凑无空格
//   - audit jsonl 字段序: ts,hook,event,details,session
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// ─── 单源正则 ───
// forbidden 默认清单：项目可用 .claude/forbidden-paths.txt 覆盖（每行一个路径片段，# 注释）
export const FORBIDDEN_DEFAULT_PATTERN =
  'auth/|payment/|billing/|secrets/|keys/|migration|crypto/|infra/|terraform/|ansible/|\\.github/workflows/|\\.gitlab-ci\\.yml|\\.gitlab/';
export const DESTRUCTIVE_SQL_CORE =
  '\\bDROP\\s+(TABLE|DATABASE|SCHEMA|INDEX)\\b|\\bTRUNCATE\\b|DELETE\\s+FROM\\s+[a-z_]+\\s*(;|$)';
// hook 绕过模式。core.hooksPath = 广义 token（拦一切提及）：读/写 carve-out 经 3 轮对抗验证
// 证明 static regex 不可安全区分（lesson: static-regex-cannot-separate-hookspath-rw）。
export const BYPASS_PATTERNS =
  '--no-verify|git\\s+commit\\s+-n($|\\s)|core\\.hooksPath|HUSKY=0|hooks-disable|chmod\\s+-x.*husky|git\\s+stash[^|]*&&[^|]*commit|SKIP=|--allow-empty\\s+--dry-run|git\\s+config.*hooksPath';

// ─── MSYS 路径翻译（git-bash 传入 /c/projects/... 风格 cwd；win32 Node 的 fs 只认 C:/...）───
export function fsPath(p) {
  const s = String(p);
  if (process.platform === 'win32') {
    const m = /^\/([A-Za-z])(\/.*)?$/.exec(s);
    if (m) return `${m[1].toUpperCase()}:${m[2] || '/'}`;
  }
  return s;
}

// ─── stdin 解析 ───
export function readInput(stdinText) {
  let raw = stdinText;
  if (raw === undefined) {
    try { raw = fs.readFileSync(0, 'utf8'); } catch { raw = ''; }
  }
  let j = {};
  try { j = JSON.parse(raw); } catch { j = {}; } // 解析失败 → 全空字段 → 各 guard 放行
  if (typeof j !== 'object' || j === null) j = {};
  const ti = (typeof j.tool_input === 'object' && j.tool_input !== null) ? j.tool_input : {};
  const s = (v) => (typeof v === 'string' ? v : '');
  return {
    toolName: s(j.tool_name),
    // MCP filesystem 用 tool_input.path，NotebookEdit 用 notebook_path（lesson: mcp-filesystem-bypasses-all-fileguards）
    filePath: s(ti.file_path) || s(ti.path) || s(ti.notebook_path),
    cmd: s(ti.command),
    cwd: s(j.cwd),
    sessionId: s(j.session_id),
    query: s(ti.query),
    sql: s(ti.sql),
  };
}

// ─── 路径 normalize ───
// 剥离 cwd 前缀失败时保留完整规范化路径 —— 'auth/' 等片段在绝对路径里也要能命中
export function relPath(ctx) {
  const normFile = ctx.filePath.replaceAll('\\', '/');
  const normCwd = (ctx.cwd || '.').replaceAll('\\', '/');
  const rel = normFile.startsWith(normCwd + '/') ? normFile.slice(normCwd.length + 1) : normFile;
  return { normFile, normCwd, rel };
}

// ─── forbidden 清单：项目 .claude/forbidden-paths.txt → 旧位置 scripts/forbidden-paths.txt → 内置默认 ───
export function forbiddenRegex(normCwd) {
  for (const f of ['.claude/forbidden-paths.txt', 'scripts/forbidden-paths.txt']) {
    try {
      const lines = fs.readFileSync(`${fsPath(normCwd)}/${f}`, 'utf8').split(/\r?\n/)
        .filter((l) => !/^\s*(#|$)/.test(l)).map((l) => l.trim());
      if (lines.length) return new RegExp(`(${lines.map(escapeRe).join('|')})`);
    } catch { /* 下一个候选 */ }
  }
  return new RegExp(`(${FORBIDDEN_DEFAULT_PATTERN})`);
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── 动作原语 ───
function decide(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  }) + '\n');
  process.exit(0);
}
// deny：取消工具调用，理由回给 Claude
export const deny = (reason) => decide('deny', reason);
// ask：弹权限确认给人（高风险但常见的合法工作 —— 让人一键放行，而不是改 env 变量）
export const ask = (reason) => decide('ask', reason);

// ─── audit log（`.claude/agent-logs/` 存在才写；CTO_AUDIT=0 关闭 —— 测试夹具不污染真实日志）───
export function isoLocal(d = new Date()) {
  const p = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${sign}${p(Math.trunc(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

export function localDay(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function auditLog(ctx, hookName, event, details) {
  if (process.env.CTO_AUDIT === '0') return;
  const dir = `${fsPath((ctx.cwd || '.').replaceAll('\\', '/'))}/.claude/agent-logs`;
  try {
    if (!fs.statSync(dir).isDirectory()) return;
  } catch { return; }
  const safe = String(details).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replace(/\r?\n/g, ' ');
  const line = `{"ts":"${isoLocal()}","hook":"${hookName}","event":"${event}","details":"${safe}","session":"${ctx.sessionId}"}\n`;
  try { fs.appendFileSync(`${dir}/${localDay()}.jsonl`, line); } catch { /* 静默 */ }
}

// ─── git 查询（branch-guard 用）───
function gitIn(cwd, args) {
  let dir = fsPath((cwd || '.').replaceAll('\\', '/'));
  try { if (!fs.statSync(dir).isDirectory()) dir = '.'; } catch { dir = '.'; }
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0 || r.error) return null;
  return (r.stdout || '').trim();
}
export const gitBranch = (cwd) => gitIn(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']) || '';
// `--show-cdup`（相对 `../` 串）而非 `--show-toplevel`（resolved-real 路径）：
// 全程停留在 cwd/file_path 的路径空间，symlink/junction 别名下前缀仍匹配。
export const gitCdup = (cwd) => gitIn(cwd, ['rev-parse', '--show-cdup']);

// ─── 字节截断（按字节非字符）───
export function headBytes(s, n) {
  return Buffer.from(String(s), 'utf8').subarray(0, n).toString('utf8').replace(/�+$/, '');
}

export const basename = (p) => path.posix.basename(p);
