# §48 跨模型 Review 全文归档（v4.4c 起分文件；**v5.0 起本地-only**）

每次 post-commit 的 codex-bridge §48 跨模型审，**全文八维报告**写到本目录 `<short-sha>.md`（每 commit 一文件）。
`docs/ai-cto/REVIEW-QUEUE.md` 只保留**摘要**（reviewer/mode + 🔴/🟠/🟡 严重度计数 + 指回本目录的指针）。

## ⚠️ v5.0（ADR-011）：本目录的全文**不进版本库**

`.gitignore` 覆盖 `docs/ai-cto/reviews/*.md`（本 README 除外）。既有的 17 份已 `git rm --cached` 取消跟踪，
**本地文件保留**。

**为什么改**：v4.4d 为保 lineage 让全文入 git，但 Stop hook 每次会话结束都产一份、单文件可达 600KB，
到 2026-09-13 本目录已达 **12MB**（v4.4c 的「摘要化」只治了 REVIEW-QUEUE 主文件，没治全文目录）。
而这些内容大部分是 reviewer 的 exec transcript（命令回显、报错、检索结果），信息密度很低。

**lineage 如何保全**（Sakana DGM 原则未被违反）：
- `REVIEW-QUEUE.md` 保留每次审的时间戳、reviewer、mode、严重度计数与文件指针 → **哪个 sha 被审过、结论如何，仍可追溯且入 git**
- 全文留在本机，供 `pattern-detector` / `cto-evolve` 扫描
- git 历史里已提交过的全文依然存在，只是不再新增

## 为什么当初分文件（v4.4c，仍然成立）

v4.4c 前，codex-bridge 把整份八维报告直接 append 进 REVIEW-QUEUE.md，单个 PR 曾 +2683 行 →
文件 341KB，拖累 SessionStart 注入、人工审阅、pattern-detector 全文扫描。

## 谁扫这里

- `.claude/agents/pattern-detector.md`：Glob `reviews/*.md` 全文找复现关键词（🔴/🟠 分诊靠 REVIEW-QUEUE 摘要）
- `.claude/commands/cto-evolve.md`：飞轮 detect 阶段输入含 reviews/*.md 全文

两者都在**本机**运行，因此不受「不入 git」影响。但在**新克隆的机器上本目录会是空的** —— 这是有意取舍：
飞轮本来就是人触发的本机分析，跨机共享的是结论（REVIEW-QUEUE 摘要 + learned rules），不是原始 transcript。

## 轮转

REVIEW-QUEUE.md 主文件按季度轮转到 `docs/ai-cto/archive/`（只轮转不删除）。
本目录因已不入 git，无需轮转；本地文件多了可自行清理，不影响任何 gate。
