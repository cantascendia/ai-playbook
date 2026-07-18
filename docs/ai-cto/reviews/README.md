# §48 跨模型 Review 全文归档（v4.4c 起）

每次 post-commit 的 codex-bridge §48 跨模型审，**全文八维报告**写到本目录 `<short-sha>.md`（每 commit 一文件）。
`docs/ai-cto/REVIEW-QUEUE.md` 只保留**摘要**（reviewer/mode + 🔴/🟠/🟡 严重度计数 + 指回本目录的指针）。

## 为什么分文件

v4.4c 前，codex-bridge 把整份八维报告直接 append 进 REVIEW-QUEUE.md，单个 PR 曾 +2683 行 →
文件 341KB，拖累 SessionStart 注入、人工审阅、pattern-detector 全文扫描。分文件后：
- REVIEW-QUEUE 保持可扫描（一屏看多条摘要 + 严重度分诊）
- 全文不丢（Sakana DGM lineage 保全）——`pattern-detector` / `cto-evolve` 扫本目录取全文找复现模式
- 单文件不再无界增长

## 谁扫这里

- `.claude/agents/pattern-detector.md`：Glob `reviews/*.md` 全文找复现关键词（🔴/🟠 分诊靠 REVIEW-QUEUE 摘要）
- `.claude/commands/cto-evolve.md`：飞轮 detect 阶段输入含 reviews/*.md 全文

## 轮转

累积多了按季度随 REVIEW-QUEUE 一起轮转到 `docs/ai-cto/archive/`（只轮转不删除，谱系全保留）。
