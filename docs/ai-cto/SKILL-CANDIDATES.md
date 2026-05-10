# Skill Candidates — Voyager-style 候选库

> v3.9 飞轮的 **不自动入库** 候选 skill。pattern-detector 发现 N+ 次重复某类操作 →
> 提议封装成 skill → 写入本文件等用户审 → 用户批准后 /cto-evolve apply 写到 .claude/skills/

## 业界依据

- **Voyager (Minecraft)**: 技能库 + 自动课程；唯一 diamond tier ([arxiv 2305.16291](https://arxiv.org/abs/2305.16291))
- **Cline**: 显式 markdown 审计文件，不自动改 system prompt
- **教训**：自动入库 = 风险（skill 描述写偏，AI 误触发，无审计追溯）

## 候选生命周期

```
pattern-detector 发现重复操作
   ↓
写入本文件 candidate 段（status: proposed）
   ↓
用户 review (/cto-evolve status 看到)
   ↓
   ├─ 接受 → /cto-evolve apply <id> → 写到 .claude/skills/<name>/SKILL.md
   ├─ 拒绝 → 标记 status: rejected + reason
   └─ 等待 → status: under-review
   ↓
   入库后从本文件移除（git history 仍可追溯）
```

## Candidate 格式

```markdown
### Candidate <N>: <skill-name>

**Status**: proposed / under-review / rejected / accepted
**Proposed**: YYYY-MM-DD
**Source**: SELF-AUDIT-<date>.md Pattern N

**Description**: <1 句话说明 skill 解决什么场景>

**Trigger**:
- paths: [...]   或
- description keywords: [...]

**Body 摘要**:
- <skill 内容预览>

**置信度**: X% （pattern-detector 给出）
**频次**: 最近 N 次类似操作

**风险评估**:
- 是否触红线: ✅ 仅软配置 / ⚠️ 触及 immutable
- false-positive 风险: 低 / 中 / 高
- token 影响: <估计>

**用户决策**:
- ☐ 接受 → 写入 .claude/skills/<name>/
- ☐ 拒绝
- ☐ 修改后接受
- 评论：______________
```

## 当前候选

（待 pattern-detector 第一次跑后填充）

## 已 accept 的（git history 留痕）

| 日期 | Skill 名 | Source pattern | PR |
|---|---|---|---|

## 已 reject 的

| 日期 | 候选 | 拒绝原因 |
|---|---|---|

## 月度统计

```
Month | Proposed | Accepted | Rejected | Notes
------|----------|----------|----------|------
2026-05 | 0 | 0 | 0 | Bootstrap
```

## 红线（pattern-detector 提议时必守）

- ❌ 不能提议改既有 skill 的 paths（红线层 — 既有 skill 的 paths 是 SSOT）
  - 但可提议**加新** skill 与既有 paths 互补
- ❌ 不能提议覆盖 .claude/skills/{forbidden-policy,test-lock-rules,eval-gate-policy,constitution-loader,handbook-search,learned-rules-loader}（这些是 v3.8/v3.9 核心）
- ❌ 不能提议 skill 与 14 铁律冲突
- ✅ 提议加项目特定 skill（如 amphoreus 的 narrator-style-checker）
- ✅ 提议加跨项目通用 skill（影响所有 21 项目时）

## 引用

- handbook §50 自我进化飞轮（v3.9）
- handbook §21 / §22 Skills 标准
- Voyager: https://arxiv.org/abs/2305.16291
