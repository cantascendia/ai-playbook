# ai-playbook

一个人 + 三家 AI 订阅（Claude Max · ChatGPT Pro · Google AI Pro）的工程工作流，打包成 Claude Code plugin。

它做四件事：

1. **护栏**：agent 不执行不可逆动作（删库、删仓库、递归删根目录、`terraform destroy`、绕过 git hook、直接改/推 main）；
   改 auth / 支付 / secrets / migration / infra / CI 定义前弹窗让人确认。Bash、PowerShell、MCP 工具都覆盖。
2. **跨模型 review**：`/cto-review` 先自审，再让 Codex（`codex review`）或 Gemini 独立审同一份 diff，合并成一份结论。
3. **spec 先行**：`/cto-spec` 一个功能一个 spec 文件，高风险改动先写清楚为什么、做什么、怎么验收。
4. **教训不丢**：每个真实事故写成一条 lesson，会话开场注入一行索引，做相关工作前读全文。

## 安装

```bash
git clone https://github.com/cantascendia/ai-playbook C:/projects/ai-playbook
node C:/projects/ai-playbook/scripts/install.mjs
```

安装脚本会：注册本仓库为 marketplace 并装 `cto` plugin（user scope）、写 `~/.claude/CLAUDE.md` 与 `~/.codex/AGENTS.md`、
给 Codex 配同一套 guard、清理 v4 的逐项目副本。改动前的文件备份到 `~/.claude/backup/<时间>/`。先看会改什么：`--dry-run`。

项目接入：在项目里运行 `/cto-init`。

## 日常工作流

```
想法 → /cto-spec（高风险必走）→ 分支上实现 → /cto-review（Claude + Codex/Gemini）→ PR → CI → 你 merge
                                                                         ↓
                                                    踩到新坑 → /cto-learn → 下个会话所有项目都知道
```

| 订阅 | 用在 |
|---|---|
| Claude Max | 主力：规划、实现、重构、多代理编排（Claude Code 桌面端 / CLI） |
| ChatGPT Pro | `codex review --base main` 做独立 review；可隔离的任务丢 Codex cloud 并行 |
| Google AI Pro | `agy -p` 做第三方 review、长上下文阅读、图像 |

## 仓库结构

见 [CLAUDE.md](CLAUDE.md)。设计决策见 [docs/DECISIONS.md](docs/DECISIONS.md)（v5 的来由：ADR-013）。
v4（handbook、宪法、71 条 eval、飞轮……）完整保存在 tag `v4-final`。
