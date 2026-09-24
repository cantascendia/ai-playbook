# ai-playbook

cantascendia 的个人 AI 工程 harness。仓库根是 Claude Code plugin marketplace，`plugin/` 是产品。
全局工作约定在 `global/CLAUDE.md`（装到 `~/.claude/CLAUDE.md` 与 `~/.codex/AGENTS.md`）。

## 结构

| 路径 | 内容 |
|---|---|
| `plugin/hooks/engine/` | guard 引擎（Node，无依赖）+ 单测 |
| `plugin/hooks/session-start.mjs` | 会话开场注入：教训索引 + 项目状态摘要（≤6KB） |
| `plugin/commands/` | `/cto-init` `/cto-spec` `/cto-review` `/cto-doctor` `/cto-learn` |
| `plugin/skills/ui-quality/` | UI 改动清单 |
| `plugin/lessons/` | 踩坑教训全文 + `INDEX.md`（每个会话注入索引） |
| `global/` | 全局约定 + 输出风格 |
| `scripts/install.mjs` | 部署到本机（plugin + 全局约定 + Codex + 清理 v4 残留，先备份） |
| `scripts/check.mjs` | 结构自检（CI 同款） |
| `scripts/migrate-v4-project.mjs` | 清掉某个项目里的 v4 harness 副本（有未收录的教训会中止） |
| `docs/STATUS.md` · `docs/DECISIONS.md` | 状态 · 决策记录（ADR） |

v4 的全部内容在 tag `v4-final`：`git show v4-final:<路径>`。

## 在这里工作

- 分支 + PR，main 受保护；CI（`.github/workflows/ci.yml`）必须绿
- 提交前：`node --test plugin/hooks/engine/guard.test.mjs scripts/migrate-v4-project.test.mjs && node scripts/check.mjs`
- 改 `plugin/` → 同步把 `plugin/.claude-plugin/plugin.json` 与 `.claude-plugin/marketplace.json` 的 `version` 一起加一（check 会校验一致）
- 合并后运行 `node scripts/install.mjs` 部署到本机，重启会话生效
- 改 guard 前读 `.claude/rules/guard-dev.md`（编辑 `plugin/hooks/**` 时自动加载）

## 设计边界（ADR-013）

- guard 只守**对外部不可逆的破坏**和**高风险路径**，不守这个仓库自己的文字 —— 那由 PR + git 负责
- 常驻上下文有预算：新增任何「每个会话都注入」的内容前，先问它值不值这些 token
- 新教训必须来自真实事故（`/cto-learn` 的门槛），不收假设性风险
- 不钉死模型版本；不维护计数、健康分、评分表这类需要人工同步的数字
