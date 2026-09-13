// v4.0 guard engine 共享库 — stdin JSON 解析 / 路径 normalize / self 检测 / 动作原语
//
// 语义等价移植自 lib/common.sh（v3.14 verdict Phase-1：严禁重设计）。
// JSON.parse 结构性取代 sed fallback 解析器（v3.11 转义引号 / v3.12 字面量 \n 两次安全回归的根因）。
// 注意：JSON.parse 产出真实换行（等价于 bash 的 jq 路径 = canonical 语义），
// 因此 forbidden-paths 行比对不再需要 printf %b 还原步骤。
//
// 字节契约（eval 锁定，不可改）：
//   - deny JSON: {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",...}}
//     紧凑无空格（eval 024/032/033/034/035/051 grep 'permissionDecision":"deny"'）
//   - audit jsonl 字段序: ts,hook,event,details,session；hook 名保留 <name>.sh（ledger/replay 消费）
//   - trajectory jsonl 字段序: ts,schema,event,tool,file,cmd,session；schema 硬编码 "v3.8"
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// ─── 单源正则（与 lib/common.sh 字符串逐字相等 — eval 047 扩展断言锁定）───
export const FORBIDDEN_FALLBACK_PATTERN =
  'auth/|payment/|billing/|secrets/|keys/|migration|crypto/|infra/|terraform/|\\.github/workflows/';
export const DESTRUCTIVE_SQL_CORE =
  '\\bDROP\\s+(TABLE|DATABASE|SCHEMA|INDEX)\\b|\\bTRUNCATE\\b|DELETE\\s+FROM\\s+[a-z_]+\\s*(;|$)';
// hook 绕过模式：必须与 common.sh bypass_patterns() 输出逐字节相等（eval 073 锁定）。
// v4.4b core.hooksPath = 广义 token（拦一切提及）—— 读/写 carve-out 经 3 轮对抗验证证明
// static regex 不可安全区分，回退广义 + 消费方剥引号归一化（见 common.sh 注释 / DECISIONS ADR-010）。
export const BYPASS_PATTERNS =
  '--no-verify|git\\s+commit\\s+-n($|\\s)|core\\.hooksPath|HUSKY=0|hooks-disable|chmod\\s+-x.*husky|git\\s+stash[^|]*&&[^|]*commit|SKIP=|--allow-empty\\s+--dry-run|git\\s+config.*hooksPath';

// ─── MSYS 路径翻译（git-bash 场景）───
// evals / 用户脚本经 git-bash 传入 /c/projects/... 风格 cwd；win32 Node 的 fs 只认 C:/...。
// 仅在触达文件系统 / 子进程时翻译；字符串比对（前缀剥离）保持原样（两侧同风格，剥离自洽）。
export function fsPath(p) {
  const s = String(p);
  if (process.platform === 'win32') {
    const m = /^\/([A-Za-z])(\/.*)?$/.exec(s);
    if (m) return `${m[1].toUpperCase()}:${m[2] || '/'}`;
  }
  return s;
}

// ─── 平台（v5.0 WS1）───
// 同一套 guard 判定要服务三个 harness，它们只在 **I/O 形状** 上不同，判定逻辑完全一致：
//   claude : stdin {tool_name, tool_input:{command|file_path|path|notebook_path}} / 出 exit2+stderr 或 deny JSON
//   codex  : stdin 同构，但 tool_name 只有 Bash|apply_patch|mcp__*，且 apply_patch 的路径藏在 patch 文本里
//   agy    : stdin camelCase {toolCall:{name,args}, workspacePaths[]} / 出 stdout {"decision":"deny"}
// 因此本层只做「输入归一 + 输出变形」，不碰任何 guard 的判定或控制流（不做纯函数化改造）——
// 纯函数化的唯一刚需是 dispatch 单进程串跑多 guard 时不丢 audit，而 dispatch 属 v5.1（带 env 杠杆）。
let PLATFORM = 'claude';
export function setPlatform(p) { if (p === 'codex' || p === 'agy') PLATFORM = p; else PLATFORM = 'claude'; }
export function platform() { return PLATFORM; }

// ─── stdin 解析（common.sh read_hook_input 等价）───
export function readInput(stdinText) {
  let raw = stdinText;
  if (raw === undefined) {
    try { raw = fs.readFileSync(0, 'utf8'); } catch { raw = ''; }
  }
  let j = {};
  try { j = JSON.parse(raw); } catch { j = {}; } // 解析失败 → 全空字段 → 各 guard 放行（bash 同语义）
  if (typeof j !== 'object' || j === null) j = {};
  if (PLATFORM === 'agy') return readInputAgy(raw, j);
  if (PLATFORM === 'codex') return readInputCodex(raw, j);
  const ti = (typeof j.tool_input === 'object' && j.tool_input !== null) ? j.tool_input : {};
  const s = (v) => (typeof v === 'string' ? v : '');
  return {
    rawJson: raw,
    toolName: s(j.tool_name),
    // MCP filesystem 用 tool_input.path 不是 file_path（learned rule 2026-05-29）
    // v5.0 WS0b：NotebookEdit 用 tool_input.notebook_path（SPIKES-2026-09 spike-2 实测；
    // 平台自身优先级为 notebook_path → path → file_path，此处**只在尾部追加**以保持
    // 既有 file_path/path 相对顺序不变 = 零回归；三者在实际工具中互斥，顺序无影响）。
    filePath: s(ti.file_path) || s(ti.path) || s(ti.notebook_path),
    mcpDest: s(ti.destination),
    cmd: s(ti.command),
    oldString: s(ti.old_string),
    newString: s(ti.new_string),
    content: s(ti.content),
    prompt: s(j.prompt),
    cwd: s(j.cwd),
    sessionId: s(j.session_id),
    event: s(j.hook_event_name),
    query: s(ti.query),
    sql: s(ti.sql),
  };
}

// ─── Codex 输入归一（v5.0 WS2）───
// 官方 canonical tool_name 仅 Bash / apply_patch / mcp__server__tool / 本地函数工具；
// Bash 与 apply_patch 的 tool_input 都只有 `command`（apply_patch 的路径藏在 patch 文本里，没有 file_path）。
// → Bash 与 mcp__* 与 claude 同构，原样复用；apply_patch 的多路径拆分由 guard.mjs 负责
//   （翻译成 N 个 claude 形状的 Write 事件递归自调，复用已验证判定路径，而不是在 guard 内改控制流）。
function readInputCodex(raw, j) {
  const ti = (typeof j.tool_input === 'object' && j.tool_input !== null) ? j.tool_input : {};
  const s = (v) => (typeof v === 'string' ? v : '');
  const toolName = s(j.tool_name);
  return {
    rawJson: raw,
    toolName,
    // matcher 层允许把 Edit/Write 当作 apply_patch 的别名，但 input 里恒为 apply_patch
    isApplyPatch: toolName === 'apply_patch' || toolName === 'Edit' || toolName === 'Write',
    filePath: s(ti.file_path) || s(ti.path) || s(ti.notebook_path),
    mcpDest: s(ti.destination),
    cmd: s(ti.command),
    oldString: s(ti.old_string),
    newString: s(ti.new_string),
    content: s(ti.content),
    prompt: s(j.prompt),
    cwd: s(j.cwd),
    sessionId: s(j.session_id),
    event: s(j.hook_event_name),
    query: s(ti.query),
    sql: s(ti.sql),
  };
}

// ─── Antigravity(agy) 输入归一（v5.0 WS3）───
// 契约见 SPIKES-2026-09 spike-6（一手来源：agy 内置 skill agy-customizations/docs/hooks.md）：
//   顶层键 camelCase（conversationId / workspacePaths / stepIdx / toolCall），
//   但**工具参数键是 PascalCase**（args.CommandLine）。
//   payload 自带 workspacePaths[] → 直接拿到 repo root，不必从 hooks.json 位置反推 cwd
//   （这消除了「agy 侧 self/SSOT 判定静默失效」的风险）。
// step type → claude 工具名的映射按**红线面**而非逐个 step 映射，未知 step 归入文件类（fail-safe）。
const AGY_SHELL_STEPS = /^(run_command|shell_exec|send_command_input|run_extension_code|git_commit)$/;
const AGY_MCP_STEPS = /^(mcp_tool|cloud_sql_execute_sql|cloud_sql_update_schema)$/;
function readInputAgy(raw, j) {
  const s = (v) => (typeof v === 'string' ? v : '');
  const tc = (typeof j.toolCall === 'object' && j.toolCall !== null) ? j.toolCall : {};
  const args = (typeof tc.args === 'object' && tc.args !== null) ? tc.args : {};
  const step = s(tc.name);
  // PascalCase 优先（官方示例 args.CommandLine），再退 camelCase / snake_case 变体
  const pick = (...keys) => { for (const k of keys) { if (typeof args[k] === 'string' && args[k]) return args[k]; } return ''; };
  const cmd = pick('CommandLine', 'commandLine', 'command', 'Command');
  const filePath = pick('AbsolutePath', 'absolutePath', 'FilePath', 'filePath', 'TargetFile', 'targetFile', 'Path', 'path');
  const ws = Array.isArray(j.workspacePaths) && typeof j.workspacePaths[0] === 'string' ? j.workspacePaths[0] : '';
  // 映射到 claude 工具名：shell 类 → Bash（沿用全部 Bash 规则）；mcp 类 → mcp__ 前缀；其余 → Write（整写语义）
  let toolName;
  if (AGY_SHELL_STEPS.test(step)) toolName = 'Bash';
  else if (AGY_MCP_STEPS.test(step)) toolName = `mcp__agy__${step}`;
  else toolName = 'Write';
  return {
    rawJson: raw,
    toolName,
    agyStep: step,
    filePath,
    mcpDest: pick('Destination', 'destination'),
    cmd,
    oldString: '',
    newString: pick('CodeEdit', 'codeEdit', 'NewContent', 'newContent'),
    content: pick('Content', 'content'),
    prompt: '',
    cwd: ws,
    sessionId: s(j.conversationId),
    event: 'PreToolUse',
    query: pick('Query', 'query', 'Sql', 'sql'),
    sql: pick('Sql', 'sql'),
  };
}

// ─── 路径 normalize（common.sh normalize_paths 等价）───
// mode 'basename'：剥离失败回退 basename（immutable / test-lock / eval-gate / mcp red-lines）
// mode 'keep'    ：剥离失败保留完整规范化路径（forbidden-guard — 'auth/' 等片段需在绝对路径里也可命中）
export function normalizePaths(ctx, mode = 'basename') {
  const normFile = ctx.filePath.replaceAll('\\', '/');
  const normCwd = (ctx.cwd || '.').replaceAll('\\', '/');
  let rel = normFile.startsWith(normCwd + '/') ? normFile.slice(normCwd.length + 1) : normFile;
  if (/^\/|^[A-Za-z]:\//.test(rel)) {
    rel = mode === 'keep' ? normFile : path.posix.basename(normFile);
  }
  return { normFile, normCwd, rel, basename: path.posix.basename(normFile) };
}

// ─── self vs subproject 检测（immutable-guard.sh:21-34 等价，含 env 覆盖顺序）───
// 读文件首个 markdown H1（只读前 4KB，避免大文件开销；不存在/读失败 → 抛给调用方兜底）
function readFirstHeading(file) {
  const fd = fs.openSync(fsPath(file), 'r');
  try {
    const buf = Buffer.alloc(4096);
    const n = fs.readSync(fd, buf, 0, 4096, 0);
    const m = /^#\s+(.+)$/m.exec(buf.subarray(0, n).toString('utf8'));
    return m ? m[1] : '';
  } finally { fs.closeSync(fd); }
}

export function isAiPlaybookSelf(cwd, env = process.env) {
  let self = false;
  const c = fsPath((cwd || '.').replaceAll('\\', '/'));
  // 信号 1（v3.9.3 原始）：playbook/handbook.md 存在且含 `^## 50.`
  try {
    if (fs.statSync(`${c}/playbook/handbook.md`).isFile() && fs.statSync(`${c}/playbook`).isDirectory()) {
      const hb = fs.readFileSync(`${c}/playbook/handbook.md`, 'utf8');
      if (/^## 50\./m.test(hb) || fs.existsSync(`${c}/CTO-PLAYBOOK.md`)) self = true;
    }
  } catch { /* 不存在 → 非 self */ }
  // 信号 2（v5.0 WS0b）：docs/ai-cto/CONSTITUTION.md 的 H1 自述本仓身份。
  // 为什么需要第二信号：信号 1 把「self 识别」单点绑在 handbook 的路径 + 章节标题上，
  // 任何手册重构（改名 / 移位 / 章节整理）都会让本仓的宪法保护**静默降级为子项目模式**（不报错）。
  // 该文件本身受 immutable-guard 红线 2 守护（AI 改不了），因此可安全用作身份签名。
  // 两信号取 OR：任一成立即 self，互为兜底。
  if (!self) {
    try {
      const h1 = readFirstHeading(`${c}/docs/ai-cto/CONSTITUTION.md`);
      if (/ai-playbook\s*自身仓库/.test(h1)) self = true;
    } catch { /* 不存在 → 保持信号 1 的结论 */ }
  }
  // env 覆盖在自动检测之后；SUBPROJECT 先、SELF 后（同时设 1 时 SELF 胜 — 与 bash 顺序一致）
  if (env.CTO_IS_SUBPROJECT === '1') self = false;
  if (env.CTO_IS_AI_PLAYBOOK_SELF === '1') self = true;
  return self;
}

// ─── SSOT 读取（forbidden-guard.sh / mcp-guard.sh 等价：缺失 → fallback + 告警不静默）───
export function forbiddenPattern(normCwd) {
  const ssot = `${fsPath(normCwd)}/scripts/forbidden-paths.txt`;
  try {
    const lines = fs.readFileSync(ssot, 'utf8').split(/\r?\n/).filter((l) => !/^\s*(#|$)/.test(l));
    const p = lines.join('|').replace(/\|+$/, '');
    if (p) return { pattern: p, source: 'ssot' };
  } catch { /* 缺失 → fallback */ }
  // v4.0：SSOT 缺失时不再无声 — stderr 告警（不阻断），修复 safe-grep 未接线的静默失败面
  process.stderr.write(`⚠️ forbidden-paths SSOT 缺失（${ssot}），使用内置 fallback pattern\n`);
  return { pattern: FORBIDDEN_FALLBACK_PATTERN, source: 'fallback' };
}

// ─── 动作原语 ───
// 文件类 guard：exit 2 + stderr（block_with_reason 等价）
// 平台差异（v5.0）：claude / codex 都支持 exit 2 + stderr 硬阻断（Codex 官方 hooks 文档明载），
// 故字节行为完全一致；agy 只认 stdout 的 decision JSON，没有 exit-code 阻断通道。
export function block(reason) {
  if (PLATFORM === 'agy') return agyDeny(reason);
  process.stderr.write(reason + '\n');
  process.exit(2);
}

// Bash / mcp guard：紧凑 deny JSON + exit 0（deny_with_reason 等价；对冲 GitHub #23284）
// claude 与 codex 的 PreToolUse 拒绝 schema 同构（hookSpecificOutput.permissionDecision=deny），
// 故此处对两者字节一致；agy 用自己的 {"decision":"deny"}。
export function deny(reason) {
  if (PLATFORM === 'agy') return agyDeny(reason);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }) + '\n');
  process.exit(0);
}

// agy 拒绝：stdout JSON + exit 0。只用 deny/allow 两态 —— agy 另有 ask/force_ask，
// 但 Codex 侧不支持 ask，用了会造成三平台裁决不对称，故统一收敛为 deny。
function agyDeny(reason) {
  process.stdout.write(JSON.stringify({ decision: 'deny', reason }) + '\n');
  process.exit(0);
}

// 软提醒：additionalContext JSON（bash jq -Rs 路径等价 — 引擎恒有"jq"，无 stderr 降级分支）
// 平台差异：additionalContext 是 Claude 私有字段；Codex 是否接受未证实（SPIKES spike-5 未完成）、
// agy 无等价物 → 两者降级为 stderr 提示 + exit 0（提示可见，但不阻断，语义与 remind 一致）。
export function remind(text, eventName) {
  if (PLATFORM !== 'claude') {
    process.stderr.write(text + '\n');
    process.exit(0);
  }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: eventName, additionalContext: text },
  }) + '\n');
  process.exit(0);
}

// ─── audit log（common.sh audit_log 等价：字段序 / 最小转义 / 目录缺失静默跳过）───
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
  const cwd = fsPath((ctx.cwd || '.').replaceAll('\\', '/'));
  const dir = `${cwd}/.claude/agent-logs`;
  try {
    if (!fs.statSync(dir).isDirectory()) return;
  } catch { return; }
  // 与 bash 相同的最小转义（仅 " → \"）— 不"改进"，保持字节兼容
  const safe = String(details).replaceAll('"', '\\"');
  const line = `{"ts":"${isoLocal()}","hook":"${hookName}.sh","event":"${event}","details":"${safe}","session":"${ctx.sessionId}"}\n`;
  try { fs.appendFileSync(`${dir}/${localDay()}.jsonl`, line); } catch { /* 静默（bash 2>/dev/null 同语义）*/ }
}

// ─── hooks-overrides 透传（common.sh maybe_run_override 等价：exec 语义 = 透传 stdin + 退出码）───
export function maybeRunOverride(ctx, hookName) {
  const override = `${fsPath((ctx.cwd || '.').replaceAll('\\', '/'))}/.claude/hooks-overrides/${hookName}.sh`;
  try {
    if (!fs.statSync(override).isFile()) return;
  } catch { return; }
  const r = spawnSync('bash', [override], { input: ctx.rawJson, stdio: ['pipe', 'inherit', 'inherit'] });
  process.exit(r.status ?? 0);
}

// ─── git 分支查询（branch-guard 用）───
export function gitBranch(cwd) {
  let dir = fsPath((cwd || '.').replaceAll('\\', '/'));
  try { if (!fs.statSync(dir).isDirectory()) dir = '.'; } catch { dir = '.'; } // bash `cd 失败继续原地` 同语义
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: dir, encoding: 'utf8',
  });
  if (r.status !== 0 || r.error) return '';
  return (r.stdout || '').trim();
}

// ─── git 工作树根「相对上爬」查询（branch-guard 边界判断用）───
// v4.0e（codex §48 修正×2）：返回 `git rev-parse --show-cdup`（从 cwd 到工作树根的相对 `../` 串，
// 根目录时为空）。用它从 cwd 上爬得到工作树根 —— 全程停留在 cwd/file_path 的路径空间，
// 不引入 `--show-toplevel` 的 resolved-real 路径。否则 symlink/junction 别名（cwd 用别名路径、
// toplevel 返回真实路径）会前缀不匹配 → 保护分支上漏拦（codex §48 round-3 false-negative）。
export function gitCdup(cwd) {
  let dir = fsPath((cwd || '.').replaceAll('\\', '/'));
  try { if (!fs.statSync(dir).isDirectory()) dir = '.'; } catch { dir = '.'; }
  const r = spawnSync('git', ['rev-parse', '--show-cdup'], { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0 || r.error) return null; // 非 git / 失败 → null（调用方回退 cwd）
  return (r.stdout || '').trim(); // 根目录 = ''，否则 '../' 重复
}

// ─── 字节截断（bash head -c 等价，按字节非字符）───
export function headBytes(s, n) {
  return Buffer.from(String(s), 'utf8').subarray(0, n).toString('utf8').replace(/�+$/, '');
}

// ─── trajectory 脱敏（trajectory-logger.sh _redact 等价：6 条规则按序）───
export function redact(s) {
  return String(s)
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, '[REDACTED_SK]')
    .replace(/(ghp|gho|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}/g, '[REDACTED_GH]')
    .replace(/AKIA[A-Z0-9]{16}/g, '[REDACTED_AWS]')
    .replace(/xox[baprs]-[A-Za-z0-9-]{10,}/g, '[REDACTED_SLACK]')
    .replace(/[Bb]earer[ \t]+[A-Za-z0-9._+/=-]{20,}/g, 'Bearer [REDACTED]')
    .replace(/((api[_-]?key|token|secret|password)["' ]*[:=]["' ]*)[A-Za-z0-9._+/=-]{12,}/gi, '$1[REDACTED]');
}

// _escape 等价：redact → 转义(\ 先 " 后) → 删换行 → head -c 500。顺序 load-bearing（eval 042）
export function escapeField(s) {
  const redacted = redact(s);
  const escaped = redacted.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  const noNl = escaped.replace(/\n/g, '');
  return headBytes(noNl, 500);
}
