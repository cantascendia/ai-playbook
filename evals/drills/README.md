# Quarterly Drills — 可执行的 fallback 演练

> 把 `docs/ai-cto/archive/QUARTERLY-DRILLS.md` 的 4 个场景从「TBD 文档」变成**每季度一键可跑**的
> 可执行演练。真断言 §43 ARE fallback 链**真的接上了**（log marker / exit code / cooldown 文件），
> 不是设计文档自欺。脚本化日期：2026-07-08。

## 一键跑

```bash
bash evals/drills/run.sh              # 跑全部
DRILL_VERBOSE=1 bash evals/drills/run.sh   # 显示每条演练完整输出
```

任一演练 `RESULT: FAIL` → 整体 `DRILLS: FAILED`（exit 1）。`SKIP` / `SKIP-manual` 不算失败。

## 铁律：演练**绝不**碰真状态

所有演练只在 **临时目录 / 临时 git 仓 / mock 命令** 里跑：

- 场景 1 用临时 `git init` 仓当 `REPO_ROOT`，`codex`/`claude`/`gh` 全 mock，`branch=main` → PR autopilot 跳过。
- 场景 2/3/4 用 `drill_make_self_sandbox` 建"看起来像 ai-playbook 自身"的临时仓跑只读 guard。

不 mutate 真仓 / 真 git / 真云（铁律 #2/#9；任务硬约束）。

## 演练清单

| 脚本 | 对应场景 | 类型 | 断言的 fallback 链 |
|---|---|---|---|
| `01-codex-quota-fallback.sh` | 场景 1 | 自动 | codex 返回 rate_limit → 写 `.codex-quota-cooldown` + `mode=fallback-to-claude` 由 claude 补位；冷却内重跑 codex 被 SKIP |
| `02-jq-missing-sed-fallback.sh` | 场景 2 | 自动 | 无 jq → `common.sh` sed parser 解析 hook JSON → 仍拦红线（exit 2），不静默 fail-open |
| `03-node-missing-legacy-fallback.sh` | 引擎兜底 | 自动 | `CTO_GUARD_ENGINE=legacy` / 屏蔽 node → shim 回退 legacy bash 实现 → 仍拦红线（exit 2），零红线真空 |
| `04-cwd-missing-fallback.sh` | 场景 4 | 自动 | hook input 缺 `cwd` → `CWD="."` 兜底定位 `forbidden-paths.txt` → 仍拦红线（exit 2）；含 Windows 反斜杠变体 |
| `05-settings-optout.manual.sh` | 场景 3 | **手动** | 见下 |

## 为什么场景 3 是手动（不是偷懒，是诚实）

场景 3（`settings.local.json` 关 hook → 仍能 audit）要观察的核心是：用户清空 `PreToolUse` 后，
**新起一个真 Claude 会话**时 `SessionStart` 能否比对 effective vs 配置的 hooks 并输出差异警告。
这需要真实会话（`SessionStart` 只在真会话启动触发，headless 脚本起不了）+ 用户主动写
`settings.local.json`（演练不会去写真仓）。

**额外诚实发现（2026-07-08）**：当前 `.claude/settings.json` 的 `SessionStart` 只做「回显项目记忆
+ 提示 enforcement 已部署」，**尚未实现**「比对 effective vs 配置 hooks 数并警告」这一步 —— 这是待补
的实现缺口，不是脚本能验的东西。所以 `05` 如实报 `SKIP-manual` 并附运营步骤，不伪装通过。

运营手动跑法：改 `settings.local.json` 清空 `PreToolUse` → 新开会话 → 确认差异警告 + `git log`
可见自己关了 hook（`settings.local.json` 已 gitignored）。

## RESULT 协议

每条演练最后一行输出 `RESULT:`，`run.sh` 据此判定：

| 行 | 含义 |
|---|---|
| `RESULT: PASS` | fallback 真接上 |
| `RESULT: FAIL <reason>` | fallback 没接上 / 静默 fail-open —— 真问题 |
| `RESULT: SKIP <reason>` | 本平台无法模拟该外部状态（诚实跳过，非失败） |
| `RESULT: SKIP-manual <reason>` | 需真实外部/会话状态，headless 不可自动化 |

## 平台说明

- 本机 / Windows git-bash 默认**无 jq** → 演练 02 直接跑真实 sed fallback 生产路径。
  某 CI 若装了 jq 且与 `/usr/bin` 混住无法安全屏蔽 → 演练 02 `SKIP` + 理由（不伪造）。
- node 若在独立目录（如 `Program Files/nodejs`）→ 演练 03 用 PATH 屏蔽真跑「node 缺失」；
  node 缺失或混住 → 退回 `CTO_GUARD_ENGINE=legacy` 杠杆覆盖。

## 与 SLO / §43 的关系

- `evals/slo-checks/08-quarterly-drill-freshness.sh` 报告演练新鲜度（advisory）；本目录负责**真跑**。
- 每季度：`bash evals/drills/run.sh` → 全 PASS/SKIP-manual → 在 `QUARTERLY-DRILLS.md` 演练记录补一行日期。
