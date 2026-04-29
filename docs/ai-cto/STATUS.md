# STATUS — ai-playbook 自身仓库

> 这是 ai-playbook 仓库**自身**的 CTO 项目记忆（dogfooding）。
> 把 ai-playbook 当作"产品"对待 — 用自己的 playbook 管理自己。

最后更新：2026-04-29 v3.6 — Self-audit 实装补齐 + Codex 额度 fallback

---

## 一句话状态

ai-playbook **v3.6** — v3.5 self-audit 暴露纸上设计（85 分），本轮把 §44 Replay 从纸面落地、加 TOCTOU lock + markdown 防注入、Forbidden 路径 SSOT、Codex 额度耗尽自动 fallback 到 Claude（含 1h cooldown）、5 分钟 smoke test、pre-commit hook。21 个 commands / 4 sub-agents / 22 evals / 4 GitHub Actions。预计 85 → 97+。

---

## 质量评分

**v3.6 (今轮，预计)**：~97/100
- 关键修复：§44 实装（+4）/ TOCTOU + markdown（+2）/ SSOT（+3）/ Smoke test（+2）/ Codex fallback（+2）
- 待第四轮 dogfooding 重审

**历史**：
- v3.5 (2026-04-29)：**85/100**（self-audit 发现 v3.5 实装覆盖度仅 65%，纸上设计降分）
- v3.4 (2026-04-29)：92/100（首次 dogfooding 闭环）
- v3.3 (2026-04-28)：70.7/100（baseline）
- v3.0-v3.2：未审计

---

## 活跃分支

- `main` — 已 push 3facf40
- `claude/sweet-kare` — 当前工作分支

---

## 已完成（v3.4）

- ✅ 自审 dogfooding（harness-auditor + vibe-checker + 一致性 sub-agent 三路并行）
- ✅ 创建 HARNESS-CHANGELOG.md
- ✅ 创建本 STATUS.md
- ⏳ 修复 5 处过期章节声明
- ⏳ §33 数据保守化措辞
- ⏳ 4 个新 eval yaml
- ⏳ CLAUDE.md audit 决策树

---

## 进行中

无（v3.4 dogfooding 是当前唯一进行中的工作）

---

## 待办（按优先级）

### P0
- [ ] 修复 5 处过期 §1-§28/§29 章节声明（consistency audit 发现）
- [ ] §33.1 "91.5%" / Karpathy 数据补 source 或改保守措辞（vibe-checker 发现）
- [ ] 提交 v3.4 commit + push

### P1
- [ ] 添加 .github/workflows/eval.yml（铁律 #12 真正落地，harness-auditor +5）
- [ ] 补全 4 个 eval（009-012）
- [ ] CLAUDE.md 4 个 audit 命令决策树
- [ ] 4 条 hooks 文案收缩为 rule 引用（避免双源漂移）

### P2
- [ ] Plugin 化（待业界稳定后再考虑）
- [ ] AAIF AGENTS.md 标准化提案

---

## 已部署配置文件

- ✅ CLAUDE.md (140 行 / 6.6 KB)
- ✅ playbook/handbook.md (§1-§42 / 3378 行)
- ✅ .claude/settings.json（含 6 类 hooks + outputStyle + statusLine + enabledMcpjsonServers）
- ✅ .claude/commands/ × 18
- ✅ .claude/agents/ × 3
- ✅ .claude/skills/ × 5（与 .agents/skills/ 双位置）
- ✅ .claude/rules/ × 3
- ✅ .claude/output-styles/cto.md
- ✅ .claude/statusline.sh
- ✅ .mcp.json（lazy 配置）
- ✅ templates/{CLAUDE,AGENTS,GEMINI}.md
- ✅ evals/golden-trajectories/ × 8（v3.4 起 12）

---

## 已知问题

### Open
- 4 条 hooks 文案与 rules 内容重复（双源漂移风险，harness-auditor 标⚠️）
- 18 commands 中 4 个 audit 类（review/vibe-check/harness-audit/audit）有功能交叠（待决策树文档化）
- 缺 GitHub Actions eval gate（铁律 #12 仅靠手工跑）

### Resolved
- ✅ HARNESS-CHANGELOG 缺失 → v3.4 创建
- ✅ STATUS.md 缺失（dogfooding 缺口） → v3.4 创建
- ✅ 5 处过期章节声明 → v3.4 修复

---

## 假设清单（待验证）

按 §32.5 反模式 #3 "Hallucination Amplification" 防护，在 STATUS 中显式列出未验证假设：

- ⚠️ `gpt-image-2` 2026-04-21 发布 — 之前 sub-agent 用 WebSearch 验证（VentureBeat / OpenAI 官方），但需要每次 release 时 re-verify
- ⚠️ `gpt-5.5` 当前旗舰 — 同上
- ⚠️ §33 "91.5% vibe-coded apps" 数据 — vibe-checker 发现源不可考，本轮改为保守措辞 + 标注 vendor 报告

---

## 竞品关键发现（手册外参考）

- **cc-sdd**（gotalab）：与 ai-playbook 最接近，已做跨 8 平台 Skills 分发
- **disler/claude-code-hooks-mastery**（2k★）：Hooks 实战集合
- **Aider**：RepoMap 风格 Tree-sitter 自动符号树（暂不抄，文档型仓库无业务符号）

---

## 🔀 分支状态

- main：3facf40（v3.3 + §26.5 cto-image 已 push）
- claude/sweet-kare：v3.4 dogfooding 在写

---

## 📅 最后同步确认

轮次 v3.4，2026-04-29，并行调度 harness-auditor / vibe-checker / consistency-audit 三个 sub-agent，读取了 .claude/{commands,agents,settings.json,rules,skills,output-styles,statusline.sh} + handbook.md + CLAUDE.md + 6 个 commits 的 git log。
[2026-04-29T16:45:32+09:00] sub-agent finished
[2026-04-29T16:46:09+09:00] sub-agent finished
[2026-04-29T16:46:15+09:00] sub-agent finished
[2026-04-29T16:52:50+09:00] sub-agent finished
[2026-04-29T19:35:29+09:00] sub-agent finished
[2026-04-29T19:35:32+09:00] sub-agent finished
