# Cross-Model Review Queue

> 由 §48 codex-bridge skill 写入。每条记录 Codex (gpt-5.5) 跨模型评审结果，下次会话 SessionStart hook 自动加载。
>
> 历史 review 轮转至 `docs/ai-cto/archive/`（Sakana DGM lineage 全保留，只轮转不删除）。

---

## 2026-06-17T00:19:12+09:00 — Review for b463a77
**Reviewer**: claude-fallback-opus | **Mode**: claude-only

```markdown
八维评审完成。以下为只读报告，未改动任何文件。

---

# 八维审核报告 — commit `b463a77`

**标题**：`feat(v3.15): align Claude model lineup to current gen (Opus 4.8 + Fable 5) (#31)`
**作者/日期**：Unflight · 2026-06-16 · PR #31（squash merge）
**规模**：10 文件 · +140/−60 · 1 新 eval

## 一句话结论

🟢 **可放行**。模型 SSOT 升级（Opus 4.6→4.8 + Fable 5）干净、自洽，配套 eval 053 真执行守护，历史事故记录按铁律 #2 保留——这是一次教科书式的"事实对齐型"改动。仅 2 处 🟡 Minor（命令合并尾巴的 eval 覆盖缺口 + eval 脚本正则未转义）值得后续收口。

## 逐维度

| 维度 | 评级 | 说明 |
|---|---|---|
| 架构 | 🟢 | 单一改动主题（模型阵容），§1.2 明确标注为「铁律 #3 模型名 SSOT」(`handbook.md:22`)，下游路由表全部从该表派生。符合宪法「§1.2 是唯一权威源」的设计意图。 |
| 代码质量 | 🟢 | sweep 彻底：CLAUDE.md / CTO-PLAYBOOK / templates / handbook §14/§32/§34/§38-40/§44 全覆盖，无遗漏的活跃路由残留。多 agent 完备性审计补抓 §44 replay 的 `opus-4-7`/`opus-4-8` dash-form 漏网（`cto-replay.md:44`、`handbook.md:3658`）——这正是单次正则 sweep 会漏的边角。 |
| 性能 | 🟢 | 纯文档/配置改动，无运行时性能影响。eval verification_command 为轻量 grep，可接受。 |
| 安全 | 🟢 | **铁律 #2 严格遵守**：PocketOS 历史事故注释中的 "Opus 4.6" 明确保留不改（commit msg + `053.yaml:9` forbidden_actions 显式列为禁止项）。**铁律 #3 遵守**：非 Claude 模型（gpt-5.5/Gemini 3.1/Nano Banana/gpt-image-2）因无 2026-06 权威源而保持不动，不编造版本号。未触及任何 forbidden 路径。 |
| 测试 | 🟡 | **铁律 #12 部分满足**。新增 `053-model-lineup-v3.15.yaml` 含真 `verification_command`（5 检查点，COUNTS 同步 30→31）——模型改动有 eval 覆盖 ✅。**但** `cto-init.md:26-27`、`cto-models.md` 的命令合并尾巴修复（vibe-check→audit、删 cross-review/harness-audit/cto-refresh 引用）属 v3.14 命令合并的文档对齐，**不被 053 覆盖**，本 commit 内无对应 eval。commit msg 已诚实标注「real-but-defer，单维护者拒绝为 2 行另开 PR」——可接受的工程权衡，但严格按 #12 应有 case。 |
| DX | 🟢 | §1.2 新增「运行形态 + /fast + effort」说明 (`handbook.md:33-35`) 显著降低选型/切换认知负担；model ID 列让铁律 #3「只从表选名」可机械校验。 |
| 功能完整性 | 🟢 | 无硬编码占位/假完成（铁律 #9 不适用——纯文档）。STATUS.md 从 v3.12 真实滚动到 v3.15，质量评分表诚实标 `TBD`「不臆造分数」(`STATUS.md` 质量评分段)——符合反模式 #6 eval-gaming 防线。 |
| UX 可用性 | 🟢 | 表格化 model ID + 价格对比（Fable 5 ~2× $10/$50 vs Opus $5/$25）让成本敏感场景有明确指引；STATUS 删除重复的「🔀 分支状态」段，去冗余。 |

## 关键发现明细

🟡 **Minor-1 · eval 脚本正则未转义**（`053.yaml:43`）
```bash
grep -q 'Opus 4.8' CLAUDE.md && pass=$((pass+1))
```
`4.8` 的 `.` 未转义会匹配任意字符（`Opus 4x8` 也通过）。同文件 check #2/#3 的 `Opus 4\.6` 已正确转义，此处不一致。实际无害（不会有 `4x8` 文本），但同一脚本内转义标准不统一。建议改 `Opus 4\.8`。

🟡 **Minor-2 · 命令合并尾巴缺 eval**（铁律 #12 边角）
`cto-init.md` / `cto-models.md` 的命令引用对齐无 case 覆盖。**已在当前分支 `fix/v3.14-live-cmd-refs` 用 `054-command-merge-live-refs.yaml` 补上**（git status 显示该文件已 staged）——即本次评审所在分支正是该缺口的收口，闭环成立。

📌 **自洽性核验通过**：
- COUNTS.md evals 30→31 ✅ 与新增 053 文件一致
- 模型 ID（`claude-opus-4-8` / `claude-fable-5` / `claude-sonnet-4-6` / `claude-haiku-4-5`）均为有效别名形式，与环境模型表一致，无铁律 #3 违规
- STATUS.md 内文「PR #31 待 merge」是 commit 时点的真实状态（自引用），非 stale

## 下一步（我继续做）

当前分支 `fix/v3.14-live-cmd-refs` 已 staged `054-command-merge-live-refs.yaml` + 4 个命令文档修订——这正是 Minor-2 的收口。建议合并前我跑一次 `eval-runner` 确认 053+054 全绿且无回归，再走 §48 codex 跨模型审。需要我现在触发吗？（这是真分叉点：是否在本轮就跑 eval gate）
```

---

## 2026-07-14 · PR #58 (feat/v4.3-hardening) · codex §48 跨模型审（MCP 通道首用）

| 项 | 内容 |
|---|---|
| 通道 | `mcp__codex__codex` read-only（常驻 server，无 37s 沙箱税 — 本次即 dogfood）|
| 结论 | REQUEST_CHANGES → 6 🟠 全部裁决：4 修复 / 2 保留（有依据）|
| 修复 | ① pre-commit grep rc>=2 fail-closed ② delegate JSONL repo/sandbox 字符集消毒 ③ enroll marker 精确回滚 ④ enroll repo= 追加段可剥离 |
| 保留 | ⑤ forbidden-paths.txt 按正则解释 = 与 forbidden-guard 一致的既有设计（SSOT 受 immutable-guard 保护，fail-closed 已兜误编辑）⑥ CTO_DOUBLE_SIGNED 会话级语义 = ADR-007 已文档化取舍（单次 token 化列为未来增强候选）|
| 附带 | CI 083 失败根因非 codex 发现：新 .sh 无执行位（MSYS 本地伪装 x 位，ubuntu 暴露）→ update-index --chmod=+x |

## 2026-07-18T15:12:19+09:00 — Review for 025edd3
**Reviewer**: codex-gpt5.5 | **Mode**: success | **判定**: 🔴 0 / 🟠 0 / 🟡 0
全文 → [reviews/025edd3.md](reviews/025edd3.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-18T15:14:57+09:00 — Review for 29b4932
**Reviewer**: codex-gpt5.5 | **Mode**: success | **判定**: 🔴 ? / 🟠 ? / 🟡 ?（见全文，v4.4d 前旧格式无 SEVERITY_SUMMARY；全文扫全 transcript 的 🔴51 系 emoji 污染，非真实——codex 真结论 0 Critical / 4 P1 / 12 P2，见 ADR + v4.4d）
全文 → [reviews/29b4932.md](reviews/29b4932.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-18T16:16:22+09:00 — Review for bc34809
**Reviewer**: codex-gpt5.5 | **Mode**: success | **判定**: 🔴 0 / 🟠 2 / 🟡 1
全文 → [reviews/bc34809.md](reviews/bc34809.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-18T16:14:10+09:00 — Review for f80913f
**Reviewer**: codex-gpt5.5 | **Mode**: success | **判定**: 🔴 0 / 🟠 0 / 🟡 1
全文 → [reviews/f80913f.md](reviews/f80913f.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-22T23:00:30+09:00 — Review for 338e238
**Reviewer**: codex-gpt5.6-sol | **Mode**: success | **判定**: 🔴 2 / 🟠 1 / 🟡 1
全文 → [reviews/338e238.md](reviews/338e238.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-22T23:01:49+09:00 — Review for 46e6f9f
**Reviewer**: codex-gpt5.6-sol | **Mode**: success | **判定**: 🔴 0 / 🟠 2 / 🟡 1
全文 → [reviews/46e6f9f.md](reviews/46e6f9f.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-22T23:16:16+09:00 — Review for 534ece8
**Reviewer**: codex-gpt5.6-sol | **Mode**: success | **判定**: 🔴 0 / 🟠 2 / 🟡 1
全文 → [reviews/534ece8.md](reviews/534ece8.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-22T23:15:34+09:00 — Review for 0cbe00b
**Reviewer**: codex-gpt5.6-sol | **Mode**: success | **判定**: 🔴 0 / 🟠 2 / 🟡 1
全文 → [reviews/0cbe00b.md](reviews/0cbe00b.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-22T23:28:02+09:00 — Review for 61a4c18
**Reviewer**: codex-gpt5.6-sol | **Mode**: success | **判定**: 🔴 0 / 🟠 2 / 🟡 1
全文 → [reviews/61a4c18.md](reviews/61a4c18.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-22T23:27:23+09:00 — Review for 3ddadcc
**Reviewer**: codex-gpt5.6-sol | **Mode**: success | **判定**: 🔴 0 / 🟠 2 / 🟡 1
全文 → [reviews/3ddadcc.md](reviews/3ddadcc.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-24T09:32:56+09:00 — Review for 40615bf
**Reviewer**: codex-gpt-5.6-sol | **Mode**: success | **判定**: 🔴 0 / 🟠 0 / 🟡 1
全文 → [reviews/40615bf.md](reviews/40615bf.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-24T09:39:05+09:00 — Review for 40615bf
**Reviewer**: codex-gpt-5.6-sol + agy-gemini-3.6-flash-high | **Mode**: success | **判定**: 🔴 0 / 🟠 0 / 🟡 3
> ℹ️ v4.6 CLI 模型钉死 PR (#68) 的双外部模型审：codex 无 actionable regression；gemini 3×P2 建议（DRY 抽公共 lib / WSL 路径边界 / env 校验）。
全文 → [reviews/40615bf.md](reviews/40615bf.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-25T10:35:23+09:00 — Review for 30ae3bc
**Reviewer**: codex-gpt-5.6-sol | **Mode**: success | **判定**: 🔴 0 / 🟠 0 / 🟡 3
全文 → [reviews/30ae3bc.md](reviews/30ae3bc.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-07-25T20:11:32+09:00 — Review for 93af51c
**Reviewer**: codex-gpt-5.6-sol | **Mode**: success | **判定**: 🔴 ? / 🟠 ? / 🟡 ?（见全文）
全文 → [reviews/93af51c.md](reviews/93af51c.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-09-13T10:29:04+09:00 — Review for 29998d4
**Reviewer**: codex-gpt-5.6-sol | **Mode**: success | **判定**: 🔴 ? / 🟠 ? / 🟡 ?（见全文）
全文 → [reviews/29998d4.md](reviews/29998d4.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-09-13T10:38:24+09:00 — Review for a058745
**Reviewer**: codex-gpt-5.6-sol | **Mode**: success | **判定**: 🔴 0 / 🟠 2 / 🟡 1
全文 → [reviews/a058745.md](reviews/a058745.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-09-13T10:52:39+09:00 — Review for 1d25744
**Reviewer**: codex-gpt-5.6-sol | **Mode**: success | **判定**: 🔴 ? / 🟠 ? / 🟡 ?（见全文）
全文 → [reviews/1d25744.md](reviews/1d25744.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

## 2026-09-13T11:06:45+09:00 — Review for dd3b49a
**Reviewer**: codex-gpt-5.6-sol | **Mode**: success | **判定**: 🔴 ? / 🟠 ? / 🟡 ?（见全文）
全文 → [reviews/dd3b49a.md](reviews/dd3b49a.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）

---

