# Learned Rule: MCP 工具 description 投毒不能用 PreToolUse hook 扫（PoC 结论）

**学到的教训**: SOTA team v2 审计提议给 mcp-guard 加"MCP 工具 description 投毒扫描"（A4）。PoC 验证前提后**否决**：PreToolUse hook 的 stdin JSON 只含 `tool_input`（LLM 传给工具的**参数**），**不含 MCP 工具注册时的 description 元数据**——description 在 MCP server 的工具 schema 里，由 LLM 在选工具时读取，不进 hook payload。所以在 hook 里扫 `tool_input.description` 是 no-op（除非工具恰好有个叫 description 的业务参数，那也不是工具自述）。加这种扫描 = **虚假安全感，比不做更危险**（adversarial verifier 警告坐实）。

## 触发场景

- 任何提议"用 PreToolUse / mcp-guard hook 检测 MCP 工具描述/元数据投毒"的场景
- OWASP ASI04 供应链 / MCP tool poisoning（CVE-2025-54136 类）威胁建模时
- 想在 hook 层防"恶意 MCP server 改工具 description 注入指令"

## 应该怎么做

1. **承认 hook 层看不到工具 description**：PreToolUse stdin = `{tool_name, tool_input, cwd, ...}`，tool_input 是调用参数不是工具自述。
2. **description 投毒的正确防御层**：
   - **注册/manifest 校验**：对 `.mcp.json` / 已启用 server 的工具清单做签名/哈希基线校验（server 可信链）。
   - **外部专用工具**：`mcp-scan` 等在工具注册层扫 description 注入（独立于 agent loop）。
   - **least-agency**：默认 `enabledMcpjsonServers: []` + ToolSearch 按需加载（§4.3），减少暴露面。
3. **mcp-guard 继续守它能守的**：工具名语义（delete/drop）+ execute_sql 内容 + filesystem 写红线文件（这些**在** tool_input 里，hook 能看到）。

## 避免什么

- ❌ 在 mcp-guard 加 `tool_input.description` 扫描（字段不存在 → 静默失效 = 虚假安全）
- ❌ baseline 对比机制（攻击者已控 server 则首写 baseline 即恶意 = 循环论证）
- ❌ 把"hook 能拦 Bash/filesystem destructive"错推为"hook 也能拦工具 description 投毒"

## 来源

- SOTA team v2 审计 2026-05-30 提案 A4（uncertain，技术前提存疑接近 refuted）
- 对抗验证 squad：核心假设"hook stdin 含 tool_input.description"未经证实
- PoC 结论（推理 + Claude Code hook 协议 handbook §41.8 stdin JSON 字段定义）

## 冷却

- 创建日期: 2026-05-30
- 30 天内不重复提议同类 hook-层 description 扫描
- 若 Anthropic 未来在 hook stdin 加工具元数据字段 → 重新评估
