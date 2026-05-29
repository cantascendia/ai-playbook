# COUNTS — ai-playbook 组件计数 SSOT

> 飞轮第 7 轮 redundancy-hunter 发现：命令数在 6+ 处不一致（17/18/21/10/23）。
> 本文件是**唯一计数权威源**。README / CLAUDE.md / STATUS / handbook 引用本表，不硬写数字。
> 改组件数量时**只**更新本文件 + 跑 `bash scripts/check-counts.sh` 校验。

最后核实：2026-05-29（飞轮第 7-8 轮 team 迭代）

| 组件 | 数量 | 位置 |
|---|---|---|
| cto-* commands | **23** | `.claude/commands/cto-*.md` |
| sub-agents | **5** | `.claude/agents/*.md`（eval-runner / harness-auditor / pattern-detector / reliability-auditor / vibe-checker）|
| hooks (.sh) | **9** | `.claude/hooks/*.sh`（immutable / forbidden / bypass / branch / test-lock / destructive-action / vibe-prompt / eval-gate / trajectory-logger）+ lib/common.sh |
| skills (.claude) | **11** | `.claude/skills/*/SKILL.md` |
| skills (.agents) | **6** | `.agents/skills/*/`（跨平台镜像，含 codex-bridge）|
| evals | **36** | `evals/golden-trajectories/*.yaml`（001-036；023-036 含 `verification_command` 真执行，001-022 trajectory 类）|
| eval 可执行类 | **14** | 含 `verification_command`，`scripts/run-evals.sh` 真跑（v3.12）；其余 22 为 trajectory 类（SKIP，需真跑 Claude）|
| rules | **3** | `.claude/rules/*.md`（eval-gate / forbidden-paths / test-lock）|
| learned-rules | **4** | `.claude/rules/learned/*.md`（active；archived 见 archived/）|
| handbook 章节 | **§1-§50**（§49 缺号，待补/重编）| `playbook/handbook.md`（4287 行）|
| 已部署项目 | **27** | nilou-network 6 + 其他 21 |

## 版本

| 版本 | Health | ARE | 关键 |
|---|---|---|---|
| v3.12 (当前) | TBD | TBD | 真 eval executor（run-evals.sh）— 铁律 #12 从"空壳"变真执行；首跑即抓到 v3.11 _json_get 把 `\n` 转空格破坏 forbidden-paths 多行比对的安全回归 |
| v3.11 | TBD | TBD | 飞轮第 7-8 轮 team 迭代 |
| v3.10.2 | 96 | 86 | destructive gate + 安全回归（已修）|
| v3.9.3 | 94 | 72→86 | subproject 检测 |

## 校验

`scripts/check-counts.sh` 自动比对真实文件数 vs 本表，CI gate。
旧的散落数字（README「21」/ CLAUDE.md「17」/ STATUS「18」/ handbook「10」）需逐一改为引用本表。
