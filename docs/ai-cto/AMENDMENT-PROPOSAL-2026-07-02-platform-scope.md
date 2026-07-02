# 宪法修正案草案 — 平台范围条款对齐现实（2026-07-02）

> 状态：**草案，待人决策**。CONSTITUTION.md 由 immutable-guard 守护，AI 不单方面修改。
> 通过路径：人审阅本案 → `export CTO_CONSTITUTION_AMEND=1` 单次解锁 → 双签 + amendment 记录。

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

## 决策记录

- 提案人：Fable 5 CTO 会话（2026-07-02，v4.0 scope 对抗审查建议采纳）
- 签署：☐ 人 ☐ 第二模型（/cto-review --cross 本文件）
- 若否决：在本文件标注否决理由后移 docs/ai-cto/archive/。
