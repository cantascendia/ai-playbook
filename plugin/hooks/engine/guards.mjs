// guard 实现 —— 只守「对外部不可逆的破坏」与「高风险路径」，不守 harness 自己的文字。
// v5 删除：immutable / test-lock / eval-gate / vibe-prompt / trajectory-logger（见 docs/DECISIONS.md ADR-013）。
import fs from 'node:fs';
import {
  relPath, forbiddenRegex, deny, ask, auditLog, gitBranch, gitCdup, headBytes, fsPath,
  DESTRUCTIVE_SQL_CORE, BYPASS_PATTERNS as BYPASS_PATTERNS_SRC,
} from './lib.mjs';

const env = () => process.env;
// Bash 与 PowerShell 都是 shell 工具 —— v4 只 match Bash，PowerShell 全程无守（v5 修）
const isShell = (t) => t === 'Bash' || t === 'PowerShell';
const splitLines = (s) => String(s).split(/\r?\n/);

// ═══ forbidden-guard ═══（auth / payment / secrets / migration / infra / CI 定义 → 请人确认）
export function forbiddenGuard(ctx) {
  if (!ctx.filePath) process.exit(0);
  const { normCwd, rel } = relPath(ctx);
  if (!forbiddenRegex(normCwd).test(rel)) process.exit(0);
  if (env().CTO_DOUBLE_SIGNED === '1') {
    auditLog(ctx, 'forbidden-guard', 'forbidden-allowed', `path=${rel} env=1`);
    process.exit(0);
  }
  auditLog(ctx, 'forbidden-guard', 'forbidden-ask', `path=${rel}`);
  ask(`⚠️ 高风险路径：\`${rel}\`（auth / 支付 / secrets / migration / infra / CI 定义）

这类改动错一次代价不可逆。放行前确认：已有 spec（/cto-spec）且改动会经跨模型 review（/cto-review）。
清单可在项目 .claude/forbidden-paths.txt 覆盖。`);
}

// ═══ branch-guard ═══（保护分支上禁直接 Edit，禁 git commit/merge/push 到保护分支）
const PROTECTED_BRANCHES = new Set(['main', 'master', 'production', 'prod', 'release']);
const PROTECTED_RE = '(main|master|production|prod|release)';

// 解析真实 git 子命令，不做子串匹配 —— PR body / git log --grep / echo 文本必须放行。
function stripQuotedAndHeredoc(cmd) {
  return splitLines(cmd).map((l) => l.replace(/<<-?'?[A-Za-z_]+'?.*$/, '')).join('\n')
    .replace(/'[^']*'/g, ' ')
    .replace(/"(\\.|[^"\\])*"/g, ' ');
}

function gitSubcommand(segment) {
  const toks = segment.trim().split(/\s+/);
  if (toks[0] !== 'git') return { sub: '', rest: [] };
  const eatsArg = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
  for (let i = 1; i < toks.length; i++) {
    const t = toks[i];
    if (t.startsWith('-')) { if (eatsArg.has(t)) i++; continue; }
    return { sub: t, rest: toks.slice(i + 1) };
  }
  return { sub: '', rest: [] };
}

// push 看 refspec 而非 HEAD（HEAD=main 时 push feature 分支必须放行）；无 refspec → 回退看 HEAD。
function pushTargetsProtected(rest, headProtected) {
  const refspecs = rest.filter((t) => !t.startsWith('-')).slice(1); // 第一个非 flag = remote
  if (refspecs.length === 0) return headProtected;
  return refspecs.some((r) => new RegExp(`(^|:)${PROTECTED_RE}$`).test(r));
}

// 跨仓/复合命令感知：按 segment 顺序跟踪 cd / git -C 与同串内的分支切换。
// fail-safe：目录解析不出 / 非 git 仓 → 回退会话 cwd 的 HEAD（宁可拦）。
function resolveDir(base, arg) {
  if (!arg) return base;
  const a = arg.replaceAll('\\', '/').replace(/^["']|["']$/g, '');
  if (/^\/|^[A-Za-z]:\//.test(a)) return a.replace(/\/+$/, '') || a;
  const b = String(base || '.').replaceAll('\\', '/').replace(/\/+$/, '');
  const parts = b.split('/');
  for (const seg of a.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') { if (parts.length > 1) parts.pop(); continue; }
    parts.push(seg);
  }
  return parts.join('/') || b;
}

function branchGuardBash(ctx) {
  if (!ctx.cmd) process.exit(0);
  const sessionBranch = gitBranch(ctx.cwd);
  const segments = stripQuotedAndHeredoc(ctx.cmd).split(/&&|\|\||;|\||\n/);
  let curDir = ctx.cwd;
  let switchedToSafe = false;
  const branchCache = new Map();
  const branchOf = (dir) => {
    const k = String(dir);
    if (!branchCache.has(k)) {
      let b = '';
      try {
        // 目录必须真实存在才按它判 —— 否则 git 会回退到 guard 进程自己的 cwd → 漏拦
        if (fs.statSync(fsPath(String(dir).replaceAll('\\', '/'))).isDirectory()) b = gitBranch(dir);
      } catch { b = ''; }
      branchCache.set(k, b || sessionBranch);
    }
    return branchCache.get(k);
  };

  for (const seg of segments) {
    const toks = seg.trim().split(/\s+/);
    if (toks[0] === 'cd' && toks[1] && toks[1] !== '-') { curDir = resolveDir(curDir, toks[1]); continue; }
    const { sub, rest } = gitSubcommand(seg);
    if (sub === 'checkout' || sub === 'switch') {
      const target = rest.filter((t) => !t.startsWith('-'))[0];
      if (target) switchedToSafe = !PROTECTED_BRANCHES.has(target);
      continue;
    }
    const ci = toks.indexOf('-C');
    const segDir = ci > 0 && toks[ci + 1] ? resolveDir(curDir, toks[ci + 1]) : curDir;
    const branch = switchedToSafe ? '' : branchOf(segDir);
    const headProtected = PROTECTED_BRANCHES.has(branch);
    let hit = '';
    if ((sub === 'commit' || sub === 'merge') && headProtected) hit = `git ${sub}（HEAD=${branch}）`;
    if (sub === 'push' && pushTargetsProtected(rest, headProtected)) hit = `git push → 保护分支（HEAD=${branch}）`;
    if (hit) {
      if (env().CTO_MAIN_EDIT_ALLOWED === '1') {
        auditLog(ctx, 'branch-guard', 'main-commit-allowed', `branch=${branch} cmd=${headBytes(ctx.cmd, 200)}`);
        process.exit(0);
      }
      auditLog(ctx, 'branch-guard', 'main-commit-blocked', `branch=${branch} hit=${hit} cmd=${headBytes(ctx.cmd, 200)}`);
      deny(`🛑 保护分支：${hit}

命令：\`${headBytes(ctx.cmd, 300)}\`

main/master/production/prod/release 不接受直接 commit/merge/push —— 先建分支走 PR：
  git checkout -b feat/<short-name>`);
    }
  }
  process.exit(0);
}

// 目标文件是否落在当前 git 工作树内（仓库外文件如 ~/.claude/... 与本仓 main 无关 → 放行）。
// 工作树根 = 从 cwd 按 --show-cdup 上爬；canonPath 归一 MSYS 盘符 / 尾斜杠 / Windows 大小写。
function canonPath(p) {
  let s = fsPath(String(p).replaceAll('\\', '/')).replace(/\/+$/, '');
  if (process.platform === 'win32') s = s.toLowerCase();
  return s;
}
function fileInsideWorktree(ctx) {
  const rawFile = String(ctx.filePath).replaceAll('\\', '/');
  if (!/^\/|^[A-Za-z]:\//.test(rawFile)) return true; // 相对路径 → 恒在工作树内
  let root = String(ctx.cwd || '.').replaceAll('\\', '/').replace(/\/+$/, '');
  const cdup = gitCdup(ctx.cwd);
  if (cdup) {
    const levels = cdup.split('/').filter((s) => s === '..').length;
    for (let i = 0; i < levels; i++) root = root.replace(/\/[^/]+$/, '');
  }
  const base = canonPath(root);
  const f = canonPath(rawFile);
  return f === base || f.startsWith(base + '/');
}

export function branchGuard(ctx) {
  if (isShell(ctx.toolName)) return branchGuardBash(ctx);
  if (!ctx.filePath) process.exit(0);
  const branch = gitBranch(ctx.cwd);
  if (!branch || !PROTECTED_BRANCHES.has(branch)) process.exit(0);
  if (!fileInsideWorktree(ctx)) process.exit(0);
  if (env().CTO_MAIN_EDIT_ALLOWED === '1') {
    auditLog(ctx, 'branch-guard', 'main-edit-allowed', `branch=${branch} file=${ctx.filePath}`);
    process.exit(0);
  }
  auditLog(ctx, 'branch-guard', 'main-edit-blocked', `branch=${branch} file=${ctx.filePath}`);
  deny(`🛑 当前在保护分支 \`${branch}\` 上直接改文件：${ctx.filePath}

先建分支再动手：git checkout -b feat/<short-name>`);
}

// ═══ bypass-guard ═══（绕过 pre-commit / git hooks → deny）
// shell 执行前会吃掉引号/反斜杠 —— guard 必须看 shell 看到的形态：
// `core.hooks'Path'` / `"core.hooksPath"` / `core\.hooksPath` 都归一为可命中串（只删不增 = 匹配面超集）。
const BYPASS_PATTERNS = new RegExp(BYPASS_PATTERNS_SRC, 'm');
export function bypassGuard(ctx) {
  if (!isShell(ctx.toolName) || !ctx.cmd) process.exit(0);
  if (!BYPASS_PATTERNS.test(ctx.cmd.replace(/['"\\]/g, ''))) process.exit(0);
  if (env().CTO_BYPASS_ALLOWED === '1') {
    auditLog(ctx, 'bypass-guard', 'bypass-allowed', `cmd=${headBytes(ctx.cmd, 200)}`);
    process.exit(0);
  }
  auditLog(ctx, 'bypass-guard', 'bypass-blocked', `cmd=${headBytes(ctx.cmd, 200)}`);
  deny(`🛑 检测到绕过 git hook / pre-commit 的命令

命令：\`${headBytes(ctx.cmd, 300)}\`

hook 失败 → 修根因，不是跳过检查。确需跳过：请用户自己在终端执行。`);
}

// ═══ destructive-action-guard ═══（不可逆动作 → deny，由人自己执行）
// 仅剥离 heredoc 起始标记至行尾；引号内容保留检测（psql -c "DROP ..." 必须命中）。
const FS_PATTERNS = `rm\\s+-rf\\s+["']?/($|\\s|["'])|rm\\s+-rf\\s+["']?~($|\\s|["'])|rm\\s+-rf\\s+["']?\\$HOME|rm\\s+-rf\\s+["']?\\.\\s|rm\\s+-rf\\s+["']?\\*($|\\s)|find\\s+/?\\s.*-delete|>\\s*/dev/sda|mkfs|dd\\s+if=.*of=/dev/`;
const DB_PATTERNS = `${DESTRUCTIVE_SQL_CORE}|psql.*-c.*DROP|mongo.*dropDatabase|redis-cli.*FLUSHALL`;
// `[^|;&]*` 只把「同一条命令内」的 flag 圈进来，不跨管道/分号/`&&`；GET/POST 类 api 调用仍放行。
const CLOUD_PATTERNS = `terraform\\s+destroy|vercel\\s+rm\\s.*--yes|railway\\s+(down|destroy)|supabase\\s+project\\s+delete|aws\\s+s3\\s+rb\\s+["']?s3://.*--force|aws\\s+rds\\s+delete-db-instance|aws\\s+ec2\\s+terminate-instances.*--force|gh\\s+repo\\s+delete|gh\\s+secret\\s+remove|gh\\s+api\\s+[^|;&]*(--method[= ]DELETE|-X\\s*DELETE)|glab\\s+repo\\s+delete|glab\\s+project\\s+delete|glab\\s+api\\s+[^|;&]*(--method[= ]DELETE|-X\\s*DELETE)|glab\\s+repo\\s+archive|glab\\s+project\\s+archive|glab\\s+variable\\s+delete|glab\\s+release\\s+delete|firebase\\s+(use\\s+.*&&.*deploy|projects:delete)|heroku\\s+apps:destroy|fly\\s+apps\\s+destroy|kubectl\\s+delete\\s+(ns|namespace|cluster|all)|docker\\s+system\\s+prune\\s+--all\\s+--volumes`;
// PowerShell：递归删除盘符根 / 用户目录，格式化磁盘
const PS_PATTERNS = `Remove-Item(?=[^|;\\n]*\\s-R(ecurse)?\\b)[^|;\\n]*\\s["']?([A-Za-z]:[\\\\/]?|~|/|\\$HOME|\\$env:USERPROFILE)["']?(\\s|$)|Format-Volume|Clear-Disk`;
const COMBINED_DESTRUCTIVE = new RegExp(`${FS_PATTERNS}|${DB_PATTERNS}|${CLOUD_PATTERNS}|${PS_PATTERNS}`, 'im');

export function destructiveActionGuard(ctx) {
  if (!isShell(ctx.toolName) || !ctx.cmd) process.exit(0);
  const scanCmd = splitLines(ctx.cmd).map((l) => l.replace(/<<-?'?[A-Za-z_]+'?.*$/, '')).join('\n');
  // 纯 echo/printf 输出（无 shell 操作符）→ 文本不是执行
  if (/^[ \t]*(echo|printf)[ \t]/m.test(scanCmd) && !/&&|\|\||;|\$\(|\|\s/.test(scanCmd)) process.exit(0);
  if (!COMBINED_DESTRUCTIVE.test(scanCmd)) process.exit(0);
  if (env().CTO_DESTRUCTIVE_CONFIRMED === '1') {
    auditLog(ctx, 'destructive-action-guard', 'destructive-allowed', `cmd=${headBytes(ctx.cmd, 200)}`);
    process.exit(0);
  }
  auditLog(ctx, 'destructive-action-guard', 'destructive-blocked', `cmd=${headBytes(ctx.cmd, 200)}`);
  deny(`🛑 不可逆动作（文件抹除 / DB DROP / 云资源或仓库销毁）

命令：\`${headBytes(ctx.cmd, 300)}\`

agent 不执行这类命令。把命令和影响范围告诉用户，由用户自己在终端执行。`);
}

// ═══ mcp-guard ═══（MCP 工具权限常比 Bash 大 —— 直连生产 DB / 云资源）
const DESTRUCTIVE_MCP_TOOL = /_(delete|drop|destroy|purge|wipe)($|_)|_delete_|delete_(branch|project|database|namespace|bucket|file|table|deployment|secret)|apply_migration|reset_branch/i;
const MCP_FS_WRITE = /__(write_file|edit_file|move_file|create_file|create_directory)$/i;
const DESTRUCTIVE_SQL = new RegExp(`${DESTRUCTIVE_SQL_CORE}|\\bUPDATE\\s+[a-z_]+\\s+SET\\b.*(;|$)`, 'im');
const SQL_WHERE_CARVEOUT = /DELETE\s+FROM.*\bWHERE\b|UPDATE\s+.*\bWHERE\b/i;
const SQL_HARD = /\bDROP\b|\bTRUNCATE\b/i;

export function mcpGuard(ctx) {
  if (!ctx.toolName.startsWith('mcp__')) process.exit(0);
  let reason = '';
  if (DESTRUCTIVE_MCP_TOOL.test(ctx.toolName)) {
    reason = `工具名命中 destructive 语义: ${ctx.toolName}`;
  } else {
    // 不扫工具 description：PreToolUse stdin 不含它（lesson: mcp-description-poison-not-in-hook-stdin）
    const sqlText = [ctx.query, ctx.sql].filter(Boolean).join(' ');
    if (sqlText && DESTRUCTIVE_SQL.test(sqlText) && !(SQL_WHERE_CARVEOUT.test(sqlText) && !SQL_HARD.test(sqlText))) {
      reason = `SQL 含 destructive 操作: ${headBytes(sqlText, 150)}`;
    }
  }
  if (reason) {
    if (env().CTO_MCP_DESTRUCTIVE_CONFIRMED === '1') {
      auditLog(ctx, 'mcp-guard', 'mcp-destructive-allowed', `tool=${ctx.toolName}`);
      process.exit(0);
    }
    auditLog(ctx, 'mcp-guard', 'mcp-destructive-blocked', `tool=${ctx.toolName} reason=${reason}`);
    deny(`🛑 MCP 不可逆操作：${reason}

只读操作（list_ / get_ / search_ / SELECT）不受影响。确需执行：请用户自己操作。`);
  }
  // MCP filesystem 写类工具不经 Edit/Write matcher → 在这里补跑 forbidden 判定
  if (MCP_FS_WRITE.test(ctx.toolName) && ctx.filePath) forbiddenGuard(ctx);
  process.exit(0);
}
