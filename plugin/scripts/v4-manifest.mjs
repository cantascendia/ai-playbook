// v4 在本机 / 项目里留下的文件清单 —— install.mjs 与 migrate-v4-project.mjs 共用。
// 只删这里列出的文件与带 V4_HOOK_SIG 签名的 hook 条目；清单外的东西一律保留（codex review P1）。
import fs from 'node:fs';
import path from 'node:path';

export const V4_HOOK_FILES = [
  'branch-guard.sh', 'bypass-guard.sh', 'destructive-action-guard.sh', 'eval-gate.sh', 'forbidden-guard.sh',
  'immutable-guard.sh', 'mcp-guard.sh', 'test-lock-guard.sh', 'trajectory-logger.sh', 'vibe-prompt-guard.sh',
  'lib/common.sh', 'engine/guard.mjs', 'engine/guards.mjs', 'engine/lib.mjs', 'engine/guard.test.mjs',
];
export const V4_RULE_FILES = ['eval-gate.md', 'forbidden-paths.md', 'test-lock.md'];
// v4 learned rules 中已废弃（对应组件已删除）或已浓缩进本仓 .claude/rules/guard-dev.md 的
export const V4_OBSOLETE_LESSONS = [
  '2026-05-11-pattern-detector-time-range-filter.md', '2026-05-12-subproject-vs-ai-playbook-self-distinction.md',
  '2026-05-20-guard-scan-strip-noncode.md', '2026-05-29-mcp-filesystem-bypasses-all-fileguards.md',
  '2026-05-29-mcp-guardrail-not-just-bash.md', '2026-05-30-mcp-description-poison-not-in-hook-stdin.md',
  '2026-07-10-immutable-guard-scope-to-repo-root.md', '2026-07-15-static-regex-cannot-separate-hookspath-rw.md',
  '2026-05-19-business-paths-must-cover-api.md', 'README.md', '.gitkeep',
];
export const V4_SKILLS = ['accessibility-checklist', 'constitution-loader', 'design-system-enforcement', 'eval-gate-policy',
  'forbidden-policy', 'handbook-search', 'i18n-enforcement', 'learned-rules-loader', 'release-readiness',
  'test-lock-rules', 'ux-quality-checklist', 'codex-bridge'];
// Codex 侧（~/.agents/skills、项目 .agents/skills）由 v4 生成的命令镜像
export const V4_SKILL_MIRRORS = ['source-command-cto-audit', 'source-command-cto-resume', 'source-command-cto-skills', 'source-command-cto-start'];
// 显式清单（不用 cto-* 前缀匹配 —— 项目自己的 cto-deploy.md 之类不能被误删，codex review P1）
// v3.14 合并掉的旧名也列上：cross-review / relink-all / refresh / vibe-check / harness-audit
export const V4_COMMANDS = ['audit', 'canary', 'constitution', 'design', 'doctor', 'eval', 'evolve', 'image', 'init', 'link',
  'models', 'release', 'replay', 'resume', 'review', 'skills', 'spec', 'start',
  'cross-review', 'relink-all', 'refresh', 'vibe-check', 'harness-audit'].map((c) => `cto-${c}.md`);
export const V4_AGENTS =['eval-runner', 'harness-auditor', 'pattern-detector', 'reliability-auditor', 'vibe-checker'];
// v4 hook 条目的命令签名
export const V4_HOOK_SIG = /hooks[\\/](immutable|forbidden|branch|test-lock|bypass|destructive-action|mcp|vibe-prompt)-guard\.sh|hooks[\\/](eval-gate|trajectory-logger)\.sh|codex-bridge|docs\/ai-cto\/(CONSTITUTION|STATUS)|agent-logs\/\$\{DAY\}|会话结束摘要|即将压缩上下文|Context about to compact/;

// 删目录里清单内的文件，然后自底向上删掉变空的目录；返回清单外（保留下来）的文件
export function removeKnown(dir, relFiles, rm, dry = false) {
  for (const f of relFiles) rm(path.join(dir, f));
  const left = [];
  if (dry) return left;
  const prune = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) prune(p); else left.push(p);
    }
    try { if (!fs.readdirSync(d).length) fs.rmdirSync(d); } catch { /* 非空 / dry-run */ }
  };
  prune(dir);
  return left;
}

// 去掉 settings 里带 v4 签名的 hook 条目；返回是否有改动
export function stripV4Hooks(settings) {
  let changed = false;
  for (const [ev, entries] of Object.entries(settings.hooks || {})) {
    const kept = entries
      .map((e) => ({ ...e, hooks: (e.hooks || []).filter((h) => !V4_HOOK_SIG.test(h.command || '')) }))
      .filter((e) => e.hooks.length);
    if (kept.length !== entries.length || kept.some((e, i) => e.hooks.length !== entries[i].hooks.length)) changed = true;
    if (kept.length) settings.hooks[ev] = kept; else delete settings.hooks[ev];
  }
  if (settings.hooks && !Object.keys(settings.hooks).length) delete settings.hooks;
  return changed;
}
