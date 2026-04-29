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
