# HARNESS-CHANGELOG

ai-playbook 自身仓库的 harness 演进档案。每次修改 CLAUDE.md / settings.json / commands / hooks / skills / agents 都在此追加一行，按手册 §34.3 规范。

格式：
```
## [YYYY-MM-DD] vN.N — 改动标题
- 改了什么：[文件 + 范围]
- 为什么：[问题场景或目标]
- Eval 跑分前/后：[regression / capability 集对比，若有]
- 影响范围：[哪些任务模式受影响]
```

---

## [2026-04-29] v3.6.2 — SessionStart hook 自动判断新项目 vs 继续项目

**用户反馈**：开新会话时如何让 ai-playbook 继续上次的项目记忆？

**问题**：v3.6.1 SessionStart hook 仅在文件存在时输出 CONSTITUTION + STATUS，**新项目**（无记忆）什么都不显示，用户不知道该跑 `/cto-start`。

**修复**：升级 hook 区分两种场景：

- **有记忆**（CONSTITUTION 或 STATUS 存在）：
  - 显式提示 "🔄 检测到 docs/ai-cto/ 项目记忆，自动恢复上下文..."
  - 加载 CONSTITUTION（head 150）+ STATUS（head 150）
  - **新增**：如有 REVIEW-QUEUE.md 末尾未审视的 §48 review，自动加载
  - 末尾提示：直接对话继续 / 或 `/cto-resume` 显式刷新

- **无记忆**（首次接入）：
  - 显式提示 "🆕 未检测到 docs/ai-cto/ 项目记忆"
  - 引导 `/cto-start`（第零轮）或 `/cto-init`（重新配置）

**17 个项目同步**：全部升级到 v3.6.2 SessionStart hook。

**当前 17 项目状态**：
- 10 项目已有记忆（AstralSolver / HanaNote / RotaAssist / aegis-panel / cm / dian / hayami-navi / mikalive / witch-gacha / yakuten）→ 直接打开会话即恢复
- 7 项目无记忆（FGO-py / SmartDesk-AI / better-genshin-impact / genshin-trophy / hoyokit / rvc-engine / rvc-pro）→ 首次开会话会看到引导提示

---

## [2026-04-29] v3.6.1 — hotfix: 业务路径 SSOT（aegis-panel 实战暴露的 bug）

**反向集成自 aegis-panel PR #118**。这是 §48 设计实证：用户在 aegis-panel 项目跑了一会，发现 codex-bridge 从未触发，REVIEW-QUEUE.md 一直空。诊断出 v3.6 的 generic 假设盲区。

- **改了什么**：
  - 新增 `scripts/business-paths.txt`（中央默认 + 各项目可 customize）
  - `run.sh` 第 47-56 行：从 hardcode 改为读 SSOT，含 fallback 兼容
  - handbook §48.7.1 文档化业务路径 SSOT + 实战诊断步骤
  - SKILL.md 加"两个 SSOT 对照"章节（forbidden = safety guard / business = trigger guard）
  - 17 个项目同步：
    - aegis-panel：保留已有自定义（dashboard/src/ hardening/ ops/ deploy/ tests/ app/）
    - dian：自动配置为 PHP 风格（actions/ admin/ api/ includes/ templates/ data/ database/）
    - witch-gacha：自动配置为 pnpm monorepo（apps/ packages/ functions/）
    - 其他 14 个：默认 generic + 注释建议路径
- **为什么**：
  - v3.6 把业务路径 hardcode 为 `^(src|app|lib|apps|packages)/`，generic 项目假设
  - aegis-panel 自研业务全在 `dashboard/src/` `hardening/` `ops/` — 行首匹配失败
  - 11+ 个业务 commit 全被 Stop hook silent skip — 用户看不到 codex review
  - 用户报告 + 修复 + 反向集成（dogfooding 闭环）
- **§48 设计实证**：
  - aegis-panel 修复后 force-trigger 一次 review，**Codex 抓到一个真实 P2 bug**：
    - `dashboard/src/modules/reality/components/audit-summary-card.tsx:121-122`
    - "空 audit 显示 worst_score=100" — security theater（误导性绿灯）
    - Claude 同会话 Phase 1 review 没抓到（只抓 worstGradeFor 漂移）
    - 跨模型独立审 → 抓到不同问题 — §48 价值印证
- **Eval 跑分前/后**：22 → 22（结构无变化，eval 仍在）

---

## [2026-04-29] v3.6 — Self-audit 实装补齐 + Codex 额度容错

继 v3.5（85/100）self-audit 暴露纸上设计后，按 plan v3.6 全 10 步执行。

- **改了什么**：
  - §44 Replay 从纸面落地：`.claude/agent-logs/.gitkeep` + PostToolUse hook 写最小 jsonl（仅 ts + type，不含 secrets）
  - `.agents/skills/codex-bridge/run.sh` v3.5 → v3.6（73 → 149 行）：
    - TOCTOU 防护：mkdir 原子锁 + trap 清理（POSIX-only，Windows 友好）
    - Markdown 注入防护：OUTPUT 包裹在 ` ```markdown ... ``` ` 代码块
    - **Codex 额度耗尽自动 fallback 到 Claude**（用户需求）：
      - 检测 `rate_limit / quota / 429 / 402 / insufficient` 等关键词
      - 写 `docs/ai-cto/.codex-quota-cooldown`（unix 时间戳）
      - 1 小时内重跑直接走 `claude -p` headless（--max-turns 5）
      - REVIEW-QUEUE.md 标注 `Reviewer: claude-fallback-opus` + ⚠️ "失去跨模型价值"警告
  - Forbidden 路径 SSOT：`scripts/forbidden-paths.txt`（12 项）+ run.sh 从此读
  - `scripts/check-forbidden-consistency.sh`：advisory 模式校验 SSOT 与手册 §32.1 一致性
  - README v3.5 → v3.6：command count 20 → 21（9 处替换）+ 新增"5 分钟 Smoke Test"章节
  - `.github/workflows/codex-review.yml` 顶部加 pull_request_target 安全警告
  - `scripts/install-pre-commit.sh`：可选脚本，让终端 `git commit` 也触发 §48
  - handbook §44.8 实装状态表格 + §48.5.1 额度耗尽容错小节
  - 3 个新 evals：020 trajectory-logging / 021 concurrency / 022 quota-fallback
- **为什么**：
  - v3.5 self-audit 发现 §44 是纸上设计、§47 LLM-as-Judge 是 placeholder、命令计数错误等差距
  - 用户需求：codex 额度耗尽自动 fallback 到 Claude，避免无 review 状态
  - 健康分从 92 跌到 85（实装覆盖度 65%）— v3.5 的"vibe shipping"反模式
- **Eval 跑分前/后**：19 → 22 条（+3）
- **影响范围**：
  - .claude/agent-logs/ 开始有真实日志
  - REVIEW-QUEUE.md 含 Reviewer 元字段（codex-gpt5.5 / claude-fallback-opus / ...）
  - codex 额度限制不再阻塞 review 链路

**关键认知**：v3.5 是负面教材 — 加了 6 章手册 + 5 项创新但实装跟不上，分数下跌。下次再扩展手册章节强制流程：spec → eval → impl → docs。

---

## [2026-04-29] v3.5 — 5 项前沿创新 + README 视觉重塑

继 v3.4 dogfooding（70.7→~92）后，按用户选择的 TOP-5 全量创新执行。

- **改了什么**：
  - 手册新增 §43-§48 共 6 个章节（约 900 行）
  - 新增 1 个 sub-agent（`reliability-auditor`）
  - 新增 3 个 slash commands（`cto-replay` / `cto-canary` / `cto-cross-review`）
  - 新增 1 个 cross-platform skill（`codex-bridge` 在 `.agents/skills/`）
  - 新增 4 个 GitHub Actions workflows（`eval.yml` / `canary.yml` / `llm-judge.yml` / `codex-review.yml`）
  - 新增 1 个 manifest 文件（`.agents/skills-manifest.json`）
  - 新增 7 条 evals（013-019）
  - settings.json Stop hook 加 cross-review 触发链路
  - .mcp.json 加 codex MCP server lazy 配置
  - **README.md 视觉重塑**：113 行 → 250+ 行（banner / 8 badges / Mermaid / 对比表 / 三层导航 / Star History / v3.5 创新表）
  - docs/assets/architecture.mmd（架构 Mermaid 源文件）
- **为什么**：
  - §43 ARE：从"设计 + 测试"升级到"生产可靠性 + SLO"
  - §44 Replay：让 LLM 非确定性可审计
  - §45 Canary：改 CLAUDE.md/hooks 不再是直推 prod
  - §46 Manifest：跨工具 skill 互操作合同
  - §47 CI/CD：铁律 #12 真正机器化执行
  - §48 Cross-Review：用户实际需求 — Claude 完成任务自动 → Codex 跨模型审
  - README：当前漏报 6 项核心功能，跳出率高
- **Eval 跑分前/后**：12 → 19 条（+7）
- **影响范围**：17 个下游项目同步新 commands；GitHub Actions 让铁律 #12 在 CI 层强制；§48 让 Claude / Codex 跨模型自动协作

---

## [2026-04-29] v3.4 dogfooding — 自审与首次 changelog

由本仓库自身的 `harness-auditor` / `vibe-checker` / 通用一致性 sub-agent 并行审计后修复。

- **改了什么**：
  - 创建 `docs/ai-cto/HARNESS-CHANGELOG.md`（本文件）+ `STATUS.md`
  - 修复 5 处过期章节声明：`templates/AGENTS.md` `templates/GEMINI.md` `templates/CLAUDE.md` `.claude/commands/cto-audit.md` `.claude/commands/cto-relink-all.md` 中遗留的 §1-§28 / §1-§29
  - §33 "91.5% / Karpathy" 等无源引用改为保守措辞 + 标注来源类型
  - 新增 4 个 eval yaml（009-012）：cto-spec / cto-link / cto-image / hooks-flow
  - CLAUDE.md 加"4 个 audit 命令决策树"
- **为什么**：harness-auditor 给出 70.7/100，发现的 6 项改进有 5 项是 P0 / P1（缺 changelog / 缺 STATUS / 过期章节 / 数据未引用 / eval 覆盖不足）
- **Eval 跑分前/后**：本次预计从 70.7 → ~92（+21）
- **影响范围**：所有引用 ai-playbook fallback 模板的下游项目都会拿到更准确的章节范围；4 个新 eval case 让铁律 #12（无 eval 不进 main）真正可验证

---

## [2026-04-28] v3.3 — Claude Code 原生对齐

- **改了什么**：
  - 17 commands 全补 frontmatter（name / description / argument-hint / allowed-tools / model）
  - 新增 3 sub-agents：`harness-auditor` / `eval-runner` / `vibe-checker`
  - Skills 复制到 `.claude/skills/`（与 `.agents/skills/` 双位置 + SHA 同步 hook）
  - 新增 `.claude/rules/` 三个路径触发文件（forbidden-paths / test-lock / eval-gate）
  - 新增 `.claude/output-styles/cto.md` + `.claude/statusline.sh`
  - 新增 `.mcp.json`（lazy 加载）+ `enabledMcpjsonServers: []`
  - 新增 hooks：SubagentStop / PreCompact / Skills SHA 校验
  - handbook §42 Sub-agents 实战
- **为什么**：3 个 Explore + 1 个 Plan sub-agent 反馈"手册写了多代理但项目零实施"；17 commands 零 frontmatter
- **影响范围**：17 个下游项目同步

## [2026-04-28] v3.2 — Hooks 自动化

- 6 类 hooks 接管 5 个高频命令的检测时机：SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / Stop
- 命令数减少？不，但典型工作流 9 命令 → 4 命令
- handbook §41

## [2026-04-28] v3.1 — Vibe / Harness / Eval / Self-Healing / Constitution

- handbook §33-§37 五个新章节
- 加铁律 #12 / #13 / #14
- 新增 5 个斜杠命令（vibe-check / harness-audit / eval / constitution / spec 升级三段）

## [2026-04-28] v3.0 — 现代化升级

- 手册从 §1-§28 扩到 §1-§32（+509 行）
- §5.0 Claude Code 全功能展开（Hooks / Skills / Sub-agents / MCP / Settings / Permissions）
- §5.1 Antigravity 2.0 / §5.2 Codex gpt-5.5 + AGENTS.md 修正
- §27 WCAG 2.1 → 2.2 / §28 + PIPL / §25 OTel + LLM 观测
- 新增 §30 Security / §31 Performance / §32 AI Review 边界

## [2026-04 v2.x] — Claude Code 本地优先架构（GenSpark → Claude Code 迁移）

- 三个 part 文件合并为 handbook.md
- prompts/ → .claude/commands/
- 新增 CLAUDE.md 主提示 + templates/CLAUDE.md
