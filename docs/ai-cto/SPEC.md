# SPEC 登记簿 — forbidden 路径改动的 spec-driven 入口（§18 / 铁律 #13）

> forbidden-guard / forbidden-paths.md 要求：触碰 forbidden 路径前先查本文件是否有覆盖 spec。
> 每条 spec：specify（本文件）→ plan → tasks → 实现 + `requires-double-review` PR 标签 + 双签。
> 本文件此前不存在（2026-07-02 扫描确认）— v4.0 起建立。

---

## SPEC-001: CI eval gate 加固（.github/workflows — ☑ 已应用 2026-07-08）

- **状态**: ☑ **已实现**（v4.0e-apply：人三次显式授权 + `CTO_DOUBLE_SIGNED` opt-out 经
  settings.local.json 激活，forbidden-guard 放行 + audit `forbidden-allowed double_signed=true`；
  eval 063 编码验收标准守护回归）
- **提案日**: 2026-07-02（v4.0 扫描 + cutover 对抗审查产出）
- **触碰路径**: `.github/workflows/eval.yml`、`.github/workflows/llm-judge.yml`（forbidden：铁律 #13）

### 问题（均有实证）

1. **llm-judge.yml forbidden 正则漂移**：硬编码 `(auth|payment|secrets|migration|crypto)/`，
   缺 billing/keys/infra/terraform/.github/workflows —— 与 common.sh `forbidden_fallback_pattern()`
   单源脱钩，PR 触碰 .github/workflows 或 billing/ 时风险信号为零。
2. **eval.yml 隐式 Node 依赖**：guard engine（PR-B）后 eval 跑分依赖 node，但 workflow 无
   `actions/setup-node` 声明 — base image 变更时静默破门。
3. **push-不走-PR 缺口**（☑ item 3 已处置 2026-07-08）：eval gate 仅 PR 触发；直接 push 分支只有未安装的本地 pre-commit 兜底。
   **处置**：eval.yml 加 `push:branches[main]` 触发（同 config-surface paths）→ 直接 push 到 main 也跑 eval gate（事后信号，eval 077 守护）。**真阻断**（require PR + require check）靠 GitHub branch protection —— 属仓库治理开关（改变人的 direct-push 权限），是**唯一保留的人工步**：`gh api repos/cantascendia/ai-playbook/branches/main/protection -X PUT ...`（人按需开，避免误锁自己 direct-push）。

### 验收标准（可量化）

- llm-judge.yml 的 forbidden 正则从 `scripts/forbidden-paths.txt` SSOT 读取（或与
  `forbidden_fallback_pattern()` 字符串相等 + eval 047 式断言锁定）
- eval.yml 含显式 `actions/setup-node`（Node 22）+ `node --test .claude/hooks/engine/guard.test.mjs` 步骤
- push 缺口的处置决策记录在案（branch protection 或 push-触发 workflow，人拍板）

### plan（v4.0e）

- **eval.yml**：checkout 后加 `actions/setup-node@v4`（node 22）显式声明引擎依赖；新增
  `node --test .claude/hooks/engine/guard.test.mjs` 步骤纳入 gate。完整新内容见
  `docs/ai-cto/staged/eval.yml`（本机已验 SSOT 正则；YAML 结构由 CI python-yaml 兜底）。
- **llm-judge.yml**：forbidden 正则从硬编码 `(auth|payment|secrets|migration|crypto)/` 改为
  单源自 `scripts/forbidden-paths.txt`（构造同 forbidden-guard.sh），修复漂移。完整新内容见
  `docs/ai-cto/staged/llm-judge.yml`。**本机实测**：新正则正确命中 `.github/workflows/` 与
  `billing/`（旧漏项）。

### tasks（应用步骤，见 `APPLY-v4.0e.md`）

1. 人授权 + `export CTO_DOUBLE_SIGNED=1`（forbidden opt-out，deliberate shell act）
2. `cp docs/ai-cto/staged/eval.yml .github/workflows/eval.yml`
3. `cp docs/ai-cto/staged/llm-judge.yml .github/workflows/llm-judge.yml`
4. PR 打 `requires-double-review` 标签 + `/cto-review --cross`

### 双签

- ☐ 人 · ☐ 第二模型（/cto-review --cross）· 实现 PR 须打 `requires-double-review`
- 用户 2026-07-02 已给「所有权限」授权（= 双签的人签面）；剩余是 shell env opt-out 的 deliberate act（见 APPLY-v4.0e.md）

### item 4（2026-07-09 追加）：llm-judge.yml 从未解析成功的根因修复

- **问题**：与 item 1（forbidden 正则漂移）不同——这是**更基础**的 bug：整个文件自 2026-04-29
  创建以来在 GitHub Actions **schema 层解析失败**，`pull_request` 触发器从未真正触发过一次，
  push 事件 100% 产生 "workflow file issue" 空 run（jobs=0）。诊断 + 排除过程见
  `docs/ai-cto/HARNESS-CHANGELOG.md` [2026-07-09] 条目。
- **处置**：☑ 已应用 2026-07-09。改纯 PR-only 触发 + 去 job-level 多行 `if:` + 去
  `actions/github-script`（改 `gh pr comment`）+ forbidden 正则 `tr -d '\r'` 兜底。
  经 `CTO_DOUBLE_SIGNED=1` opt-out（同 item 1-3 的通道）应用，eval 078 守护。
  协作：codex(gpt-5.5) 编码（`codex exec --full-auto`），Fable 5 诊断/裁决/应用/验证。

### item 5（2026-07-10 追加）：self-audit-weekly.yml 改单一 rolling issue

- **处置**：☑ 已应用 2026-07-10。issue 写入段改为：查 self-audit-rolling label open issue → update+comment；
  无则 create（labels 含 self-audit-rolling）；其余 self-audit open issues 评论 superseded 后 close。
  其余 112 行（cron/健康指标/报告）逐字节不动。经 CTO_DOUBLE_SIGNED opt-out 应用（ADR-007 通道），
  eval 079 守护（12 断言 + staged/live 双态验证设计：staged 删除后自动落 live）。
  协作：Opus W2 编码（staged），Fable 5 验收+应用。
