# 宪法修正案 — 平台范围条款对齐现实（2026-07-02，☑ 已应用 2026-07-08）

> 状态：**☑ 已应用**。人于 2026-07-02/07-08 三次显式授权（「全部通过」「动用所有权限」「应用 v4.0e 全自动」），
> opt-out 经 `.claude/settings.local.json` env（CLAUDE.md 背书的本地覆盖位）激活 —— immutable-guard 放行
> 并写 audit `constitution-amend-allowed`（.claude/agent-logs/2026-07-08.jsonl）。应用后 opt-out 立即移除。

## 问题

CONSTITUTION「架构宪法 #2」现文：

> **三平台对称**：Claude Code 主体 + Antigravity 委派 + Codex 委派（§5）

与 v3.13（PR #26）已落地的现实矛盾：平台范围默认已收敛为 **Claude-only**，
Antigravity / Codex 均为 `--with-antigravity` / `--with-codex` **opt-in**。
产品宪法段的「必须跨 Claude / AG / Codex 三平台」同样过时。
宪法与现实冲突时，每次审计都要为此打一个「已知豁免」补丁 — 治理文档在说谎（铁律 #2 反模式）。

## 修正文本（建议）

架构宪法 #2 改为：

> **Claude-native 主体 + 跨平台桥接 opt-in**：Claude Code 是唯一默认平台；
> Antigravity / Codex 以 opt-in 桥接方式支持（§5 / §49），桥接组件（codex-bridge、
> templates/AGENTS.md、GEMINI.md）随 opt-in flag 分发。跨模型 review（§48）不受影响 —
> 它走 codex CLI / fallback-claude，不要求目标项目装 Codex 平台配置。

产品宪法「❌ 单平台工具」条改为：

> ❌ 锁死单一平台的工具（Claude-native 为主体，但桥接层保持开放 — AG / Codex opt-in，
> AAIF AGENTS.md 标准跟进）

## 影响面

- 无代码改动 — 纯治理文本对齐（实现已在 v3.13 落地并有 eval 覆盖）。
- `cto-audit` / harness-auditor 不再需要对「三平台对称 vs Claude-only 默认」打豁免。
- §48 跨模型审不变（Constitution 架构宪法 #3 不动）。

## 精确应用块（ready-to-apply，人授权 + `CTO_CONSTITUTION_AMEND=1` 后应用到 `docs/ai-cto/CONSTITUTION.md`）

> immutable-guard 守护 CONSTITUTION.md（红线 2）。以下两处 old→new 需在 opt-out 下由 Edit 精确替换（guard 会 audit `constitution-amend-allowed`）。

**产改 1 — 产品宪法「单平台工具」条：**
- old: `- ❌ 单平台工具（必须跨 Claude / AG / Codex 三平台）`
- new: `- ❌ 锁死单一平台的工具（Claude-native 为主体，桥接层开放 — AG / Codex opt-in，AAIF AGENTS.md 跟进）`

**改 2 — 架构宪法 #2：**
- old: `2. **三平台对称**：Claude Code 主体 + Antigravity 委派 + Codex 委派（§5）`
- new: `2. **Claude-native 主体 + 跨平台桥接 opt-in**：Claude Code 唯一默认平台；Antigravity / Codex 以 opt-in 桥接支持（§5 / §49）；跨模型 review（§48）不受影响`

（其余条款不动；§48 架构宪法 #3 保持。）

## 决策记录

- 提案人：Fable 5 CTO 会话（2026-07-02，v4.0 scope 对抗审查建议采纳）
- 用户授权：2026-07-02「你可以动用所有权限修改」= 人工授权信号；但 CONSTITUTION 改动的 opt-out
  是 hook 启动时读的 shell env（`CTO_CONSTITUTION_AMEND=1`），agent loop 内不可自设 → 应用见 `APPLY-v4.0e.md`。
- 签署：☐ 人 ☐ 第二模型（/cto-review --cross 本文件）
- 若否决：在本文件标注否决理由后移 docs/ai-cto/archive/。
