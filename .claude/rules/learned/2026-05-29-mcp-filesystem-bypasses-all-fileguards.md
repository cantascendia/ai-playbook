# Learned Rule: file-path 红线必须覆盖 MCP filesystem 工具（不只内置 Edit/Write）

**学到的教训**: immutable/forbidden/test-lock/branch guard 只 match 内置 `Edit|Write|MultiEdit`。
但 `mcp__filesystem__write_file/edit_file/move_file/create_file` 能写**任何**文件（含 CLAUDE.md /
CONSTITUTION / forbidden-paths.txt / 锁定测试）且**完全不触发**这些 guard → 整个红线体系可被
"改用 MCP filesystem 工具"一句话绕过。architect-critic 飞轮第 8 轮实测坐实。

额外坑：MCP filesystem 用 `tool_input.path`，不是内置工具的 `tool_input.file_path` → 即使加了
matcher，common.sh 不取 path 也拿不到路径。

## 应该怎么做

1. read_hook_input 同时取 `tool_input.path`（file_path 为空时回退）
2. mcp-guard 对写类 MCP（write_file/edit_file/move_file/create_file/create_directory）重跑
   immutable + forbidden + test-lock 红线判断
3. settings.json PreToolUse 加 `"matcher": "mcp__.*"` → mcp-guard
4. forbidden 检查带 hardcoded fallback（SSOT 缺失时）

## 避免什么

- ❌ 假设 file-path guard 只需 match Edit|Write|MultiEdit（MCP filesystem 全绕过）
- ❌ 只在 mcp-guard 防 destructive SQL/delete，忘了 filesystem write 改红线文件
- ❌ 用 file_path 取 MCP filesystem 路径（它用 path）

## 来源
- architect-critic 飞轮第 8 轮 multi-agent team 审查（2026-05-29）
- OWASP ASI Top 10 (2026) ASI02 Tool Misuse + ASI10 Rogue Agent
- v3.11.1 mcp-guard filesystem 覆盖

## 冷却
- 创建日期: 2026-05-29 / 30 天内不重复
