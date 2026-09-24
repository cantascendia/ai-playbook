#!/usr/bin/env node
// SessionStart：注入 (1) 踩坑教训索引（全文按需 Read）(2) 当前项目状态摘要（≤30 行）。
// 预算：整段输出 ≤ 6KB。全文不注入 —— v4 每次开场塞 ~170KB，这是 v5 要根治的。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');
const out = [];

try {
  const index = fs.readFileSync(path.join(lessonsDir, 'INDEX.md'), 'utf8').trim();
  out.push(index.replace('{{LESSONS_DIR}}', lessonsDir.replaceAll('\\', '/')));
} catch { /* 索引缺失 → 跳过 */ }

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* 无 stdin */ }
const cwd = input.cwd || process.cwd();
for (const rel of ['docs/STATUS.md', 'docs/ai-cto/STATUS.md']) {
  try {
    const lines = fs.readFileSync(path.join(cwd, rel), 'utf8').split(/\r?\n/);
    let head = lines.slice(0, 30).join('\n').trim();
    // 按字节截断：长行的 STATUS 30 行也可能上万字节（v4 的 STATUS 单行就有 1KB+）
    if (Buffer.byteLength(head) > 2048) head = Buffer.from(head).subarray(0, 2048).toString('utf8').replace(/�+$/, '') + '\n…（截断，完整内容请 Read）';
    out.push(`## 项目状态（${rel} 开头，共 ${lines.length} 行）\n\n${head}`);
    break;
  } catch { /* 下一个 */ }
}

if (out.length) process.stdout.write(out.join('\n\n') + '\n');
