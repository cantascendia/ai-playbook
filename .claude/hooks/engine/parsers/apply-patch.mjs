// apply_patch 解析器（v5.0 WS2）
//
// 为什么需要：Codex 的 PreToolUse 里，文件编辑走 `apply_patch`，其 tool_input **只有 `command`**
// （整段 patch 文本），没有 file_path / path 字段。engine 的四条文件类红线全部依赖 ctx.filePath，
// 因此在 Codex 会话中它们静默放行 —— 不是误拦，是漏拦。SPIKES-2026-09 spike-6 / codex 调研均证实。
//
// 输出：[{ op, path, oldText, newText }]
//   oldText 刻意包含**上下文行 + 删除行**（即除 `+` 外的全部内容行）。
//   原因：immutable 红线 1/4 用 old_string 是否命中「## 铁律 / 铁律 #N」「§32-§35 标题」来判定。
//   若只取 `-` 行，一个仅在铁律段附近插入内容的 patch 就不会命中 —— 正是宪法批评家点名的漏判面。
//
// 解析失败（无法确定改了哪些文件）由调用方按红线 fail-closed 处理，不在本模块决定。

const FILE_HEADER = /^\*\*\*\s+(Add|Update|Delete)\s+File:\s*(.+?)\s*$/;
const MOVE_HEADER = /^\*\*\*\s+Move\s+to:\s*(.+?)\s*$/;
const END_PATCH = /^\*\*\*\s+End\s+Patch\s*$/;

export function parseApplyPatch(text) {
  const src = String(text == null ? '' : text);
  const lines = src.split(/\r?\n/);
  const out = [];
  let cur = null;

  const flush = () => {
    if (!cur) return;
    cur.oldText = cur._old.join('\n');
    cur.newText = cur._new.join('\n');
    delete cur._old; delete cur._new;
    out.push(cur);
    cur = null;
  };

  for (const line of lines) {
    const fh = FILE_HEADER.exec(line);
    if (fh) {
      flush();
      cur = { op: fh[1].toLowerCase(), path: fh[2], _old: [], _new: [] };
      continue;
    }
    const mv = MOVE_HEADER.exec(line);
    if (mv) {
      // `*** Move to:` 跟在某个 File 头之后，表示改名/移动。
      // 目标路径同样要过红线（把 guard 文件"移走"等于移除它）。
      flush();
      cur = { op: 'move', path: mv[1], _old: [], _new: [] };
      continue;
    }
    if (END_PATCH.test(line)) { flush(); continue; }
    if (!cur) continue; // patch 头部噪声（*** Begin Patch 等）
    if (line.startsWith('+')) cur._new.push(line.slice(1));
    else if (line.startsWith('-')) cur._old.push(line.slice(1));
    else if (line.startsWith('@@')) { /* hunk 头，不计入内容 */ }
    else {
      // 上下文行（通常以空格起始）：同时计入 old 与 new —— old 侧是红线段落匹配的关键
      const ctxLine = line.startsWith(' ') ? line.slice(1) : line;
      cur._old.push(ctxLine);
      cur._new.push(ctxLine);
    }
  }
  flush();
  return out;
}

// 便捷判定：命令文本看起来是否是一段 apply_patch
export function looksLikePatch(text) {
  return /^\*\*\*\s+(Begin Patch|Add File:|Update File:|Delete File:)/m.test(String(text == null ? '' : text));
}
