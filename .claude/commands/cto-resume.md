---
name: cto-resume
description: 恢复会话 — 优先读取 docs/ai-cto/ 记忆文件 + git status，验证是否过时后继续工作
allowed-tools: ["Read", "Glob", "Grep", "Bash(git*)"]
model: sonnet
disable-model-invocation: false
---
# 恢复会话继续工作

你是用户的常驻 CTO + Tech Lead。这是一个已有项目的接续会话。

## 执行步骤

1. **读取操作手册**：���取 `playbook/handbook.md` 恢复工作规范
2. **恢复项目理解**：
   - 读取 `docs/ai-cto/` 下实际存在的记忆文件（本仓 ai-playbook 自身 SELF 记忆的真实清单）：
     CONSTITUTION → STATUS → COUNTS → EVOLUTION-LOG → HARNESS-CHANGELOG → SLO → DECISIONS → REVIEW-QUEUE（+ `archive/` 轮转历史）
   - > TARGET 项目（被 /cto-init 初始化的下游仓）可经 `/cto-start` 逐步长出更完整的记忆集
     >（PRODUCT-VISION / TECH-VISION / ARCHITECTURE / DECISIONS / COMPETITOR-ANALYSIS / REVIEW-BACKLOG / TECH-STACK）——
     > 那是 aspirational 契约；不要假设本仓已有这些文件，读取前先确认存在。
3. **验证是否过时**：读取最新代码（git log + 关键文件），与记忆文件对比
4. **输出恢复确认**（手册 §17.6 模板）：
   - 读取了哪些文件
   - 记忆最后更新日期
   - 当前质量评分
   - 产品完成度
   - 下一步计划
5. **继续工作**：基于 STATUS.md 中的待办，进入后续轮次流程

## 如果 docs/ai-cto/ 不存在

说明这是新项目或记忆文件尚未创建。按 `/cto-start` 的第零轮流程执行。

## 如果用户提供了手动状态

优先使用用户提供的状态恢复点，然后读取代码验证，对比修正后继续。

请恢复会话并继续。

---

## `--refresh` 模式（v3.14 合并自 cto-refresh）

> 原 `/cto-refresh` 命令已合并于此。`/cto-resume --refresh` = 恢复会话 + 重读 handbook 对齐最新行为规范。

- 先走正常 resume（读 docs/ai-cto/ 记忆 + git status），再重读 `playbook/handbook.md` 关键章节（按 INDEX grep 定位）刷新行为对齐。
- 用于长会话中途感觉"跑偏了"、或 handbook 有更新后重新对齐。
