# SPEC 登记簿 — forbidden 路径改动的 spec-driven 入口（§18 / 铁律 #13）

> forbidden-guard / forbidden-paths.md 要求：触碰 forbidden 路径前先查本文件是否有覆盖 spec。
> 每条 spec：specify（本文件）→ plan → tasks → 实现 + `requires-double-review` PR 标签 + 双签。
> 本文件此前不存在（2026-07-02 扫描确认）— v4.0 起建立。

---

## SPEC-001: CI eval gate 加固（.github/workflows — ☑ 已应用 2026-07-08）

> 📌 **2026-09-08 注**：本 spec 的 **GitHub branch-protection 人工步（item 3 末尾的 `gh api ... /branches/main/protection`）
> 已被 SPEC-002 取代** —— GitHub 账号封禁，该 API 不可达。现行阻断配置见 SPEC-002 / handbook §47.4
> （GitLab protected branch：`allowed_to_push = No one` / `allowed_to_merge = Maintainers` / `allow_force_push = false`
> + 项目设置「Pipelines must succeed」）。本 spec 的其余 item（1/2/4/5）作为**历史记录保留原文不改**（铁律 #2）。

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

---

## SPEC-002: GitHub → GitLab 平台迁移（.gitlab-ci.yml / .gitlab/ — ⏹ 已被 SPEC-003 取代 2026-09-18）

> ⏹ **状态变更（2026-09-18）**：GitHub 账号解封，主平台回迁 → 本 SPEC 的"平台归属"部分由
> **SPEC-003** 取代（非目标第 1 条「不恢复 GitHub」已失效）。
> **本 SPEC 的其余成果全部保留并仍然有效**：`.gitlab-ci.yml` / `.gitlab/`（镜像平台定义 + 红线路径）、
> forbidden SSOT 的两条 CI 追加、handbook §51 映射层、独立 job `double-sign-gate`（v4.9 已搬回 GitHub）、
> SSH + OAuth device flow 认证模型。原文保留不篡改（铁律 #2 —— 这是史实）。

- **状态**: ⏹ **已应用，平台归属部分被 SPEC-003 取代**（原 branch `feat/gitlab-migration`，
  已经 `origin/main` 合入；opt-out 经 ADR-007 通道 settings.local.json env
  `CTO_CONSTITUTION_AMEND=1` + `CTO_DOUBLE_SIGNED=1`，用完即删）
- **提案日**: 2026-09-08
- **触发**: GitHub 账号 cantascendia 被封禁（2026-09），gh CLI token 失效、GitHub Actions / branch protection /
  PR 通道全部不可用。人决策（transcript 2026-09-08）：6 仓库全迁 gitlab.com/cantascendia，harness 全量改造，
  模型表一并更新（Fable 5.1 指挥 / Opus 5 执行）。
- **触碰路径**: `.github/workflows/*`（删除）、`.gitlab-ci.yml`（新建，forbidden 新条目）、`.gitlab/`（新建）、
  `scripts/forbidden-paths.txt`（仅追加）、`docs/ai-cto/CONSTITUTION.md`（amendment）、`CLAUDE.md` 铁律 #13 文案、
  `playbook/handbook.md` §32（immutable，amendment）

### 问题（均有实证）

1. 5 个 GitHub Actions workflow（canary / codex-review / eval / llm-judge / self-audit-weekly）在 GitLab 上不会执行 → 铁律 #12 eval gate 在远端为零。
2. codex-bridge `run.sh` PR autopilot 依赖 `gh pr create/comment/api`，gh auth 已失效 → §48 跨模型审 PR 评论通道断。
3. forbidden SSOT + 5 处派生正则只认 `.github/workflows/`，GitLab CI 定义文件 `.gitlab-ci.yml` 不在红线内 → 铁律 #13 在新平台失守。
4. Constitution 合规宪法 #4「GitHub Branch Protection」、§47.4、SPEC-001 的 `gh api ... protection` 均指向不存在的平台。
5. 手册 §1.2 模型表无 Fable 5.1 / Opus 5（铁律 #3 SSOT），本轮编排模型不在表内。

### 验收标准（可量化）

- `.gitlab-ci.yml` 存在，含 job：`eval-gate`（MR + main push 触发；check-counts + guard 单测 + run-evals + yaml/skill/frontmatter 校验）、
  `llm-judge`（仅 MR，advisory，forbidden 正则读 `scripts/forbidden-paths.txt`，MR note 无 token 时优雅跳过）、
  `self-audit-weekly`（`CI_PIPELINE_SOURCE == schedule`，rolling issue 经 GitLab Issues API）、`canary`（手动/分支触发）。
- `.gitlab-ci.yml` 与全部 harness 文件中 **0 处** `gh ` CLI 调用（注释/历史记录文件除外：docs/ai-cto/reviews、REVIEW-QUEUE、archive、agent-logs）。
- `scripts/forbidden-paths.txt` 追加 `.gitlab-ci.yml` 与 `.gitlab/`，`.github/workflows/` 保留（红线只加不删）；5 处派生正则与 SSOT 一致（eval 047 + 新 eval）。
- codex-bridge run.sh 用 glab（`glab mr create` / `glab mr note` / `glab api`）；无 glab 或未登录时 HAS_GLAB=0 优雅跳过。
- Constitution 合规宪法 #4 改为「GitLab Protected Branch」（main：No one push / Maintainers merge，已于 2026-09-08 经 API 设置）；amendment 记录文件存在。
- 手册 §1.2 含 `claude-fable-5-1`（CTO 编排默认）与 `claude-opus-5`（执行 sub-agent 默认），eval 守护。
- `bash scripts/run-evals.sh` 全 PASS（0 FAIL）；`node --test .claude/hooks/engine/guard.test.mjs` 全绿；`bash scripts/check-counts.sh` 通过。
- fresh clone from gitlab.com 后同样通过（learned rule 2026-09-02）。

### 非目标

- 不恢复 GitHub；`github` remote 保留为只读历史指针（fetch 会失败）。
  > ⏹ 2026-09-18 失效：账号解封，见 SPEC-003。原文保留（铁律 #2）。
- 不迁移 GitHub Issues / PR 讨论（无 API 访问）。

---

## SPEC-003: GitHub 解封 → 回迁主平台，GitLab 降为镜像（.github/workflows / .gitlab-ci.yml — ☑ 已应用 2026-09-18）

- **状态**: ☑ **已应用**（branch `merge/github-restore`，一个 merge commit；opt-out 经 ADR-007 通道
  settings.local.json env `CTO_CONSTITUTION_AMEND=1` + `CTO_DOUBLE_SIGNED=1`，用完即删）
- **提案日**: 2026-09-18
- **取代**: SPEC-002 的平台归属部分（其余成果保留）
- **触发**: GitHub 账号 `cantascendia` **解封**，6 仓库原样恢复（提交历史 / branch protection /
  Actions 定义都在）。人决策（2026-09-18）：全部项目回 GitHub，停止依赖 GitLab。
  同时两条 main 已分叉 10 天，必须合并而非二选一。
- **触碰路径**: `.github/workflows/*`（恢复 5 个 + 新增 `double-sign-gate.yml`，forbidden 路径）、
  `.gitlab-ci.yml` / `.gitlab/`（保留不动，forbidden 路径）、`docs/ai-cto/CONSTITUTION.md`（amendment）、
  `playbook/handbook.md` §32/§47.4/§51（immutable，amendment）、`CLAUDE.md` 模型路由表

### 问题（均有实证）

1. 两条 main 各有对方没有的真成果：`github/main` 的 #67-#70（含 v4.8 Claude 5 阵容），
   `origin/main` 的 v4.7 平台迁移全量 + v4.6 Luna 调价。任何一侧直接胜出都会丢工作。
2. 模型表两侧冲突：v4.8 说 Opus 5 默认 / Sonnet 5；v4.7 说 Fable 5.1 编排默认 / Sonnet 4.6。
3. `.github/workflows/` 在 GitLab 线被删 → 解封后主平台闸门为零（铁律 #12 在远端归零，第二次）。
4. §32.2 的机器强制半（`double-sign-gate`）只存在于 GitLab 侧 → 主平台 PR 可绕过双签（铁律 #13 失守）。
5. Constitution 合规宪法 #4 与 §47.4 指向 GitLab，而主平台已回 GitHub（治理文档说谎 = 铁律 #2 反模式）。
6. eval 号段撞号：两条线各有一个 `088` 和一个 `089`，内容不同。

### 验收标准（可量化）

- `.github/workflows/` 含 6 个 workflow：eval / llm-judge / codex-review / self-audit-weekly / canary /
  **double-sign-gate**；全部 YAML 可解析。
- `.github/workflows/double-sign-gate.yml` 对**每个 pull_request** 都跑、**无 `paths:` 过滤**、
  从 `github.event.pull_request.labels.*.name` 零 token 读标签、forbidden 正则读
  `scripts/forbidden-paths.txt`（含 CRLF 兜底）、命中未打标 → `exit 1`。
- `.gitlab-ci.yml` 与 `.gitlab/` **仍存在**且 job/stage 齐全（镜像平台，红线只加不删）。
- `scripts/forbidden-paths.txt` 同时含 `.github/workflows/`、`.gitlab-ci.yml`、`.gitlab/`；
  全部派生副本与 SSOT 一致（eval 047 + `scripts/check-forbidden-consistency.sh`）。
- handbook §1.2 同时含 `claude-opus-5`（**默认**）与 `claude-fable-5-1`（opt-in）；上一代行保留。
- Constitution 合规宪法 #4 改回「GitHub Branch Protection」，并写明 GitLab 为只读镜像。
- handbook §51 为**双向**映射（GitHub 主 / GitLab 镜像）且含 2026-09-18 解封数据点；
  §47.4 拆为 47.4.1（GitHub）+ 47.4.2（GitLab）。
- learned rule `2026-09-08-platform-account-ban-single-point-of-failure.md` 追记解封往返，结论不变。
- eval：092（双平台 CI 定义都在且各自完整）+ 093（两边 double-sign-gate 都是真强制）全 PASS；
  090 断言随 SPEC 变更修订为 v4.8 口径；053 / 087 / 088 / 091 无回归。
- `bash scripts/run-evals.sh` 全 PASS（0 FAIL）；`node --test .claude/hooks/engine/guard.test.mjs` 52/52；
  `bash scripts/check-counts.sh` + `bash scripts/check-forbidden-consistency.sh` 通过。

### 非目标

- **不删除 GitLab 的任何东西**：remote / `.gitlab-ci.yml` / `.gitlab/` / protected branch / §51 章节全保留。
  "停止依赖" = 不再作为主写入面，**不等于**拆掉第二来源。
- 不回迁封禁期间在 GitLab 侧产生的 issue / MR 讨论 / pipeline run 历史（无导出路径，诚实记账见 §51.4）。
- 不改动 §5 的 Antigravity / Codex 第三方模型表（不在本轮范围）。

### 待人处理（agent 不经手平台开关 / 密钥）

1. GitHub 仓库 Settings → Branches：按 §47.4.1 配 main 的 required status checks
   （`eval-gate` + `double-sign-gate`）、require PR、禁 force push。
2. GitHub 仓库 secret `OPENAI_API_KEY`（§48 codex-review）确认仍有效。
3. 决定 GitLab 镜像的同步方式（手动 `git push origin main` 或配 pull mirror），并记入 §51.6 季度核。
4. 本 PR 需第二模型独立复审（§19 / 铁律 #13，已打 `requires-double-review` 标签）。
