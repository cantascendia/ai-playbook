# Learned Rule: 托管账号是单点故障 —— 平台动词必须藏在一个映射层后面，且永远留第二个 remote

**学到的教训**: 2026-09 GitHub 账号 `cantascendia` 被封禁。以为是"换个 remote"，实际是**全链路停摆**：
6 仓库远端不可达 · `gh` token 失效（§48 跨模型 review 的 PR 评论通道断）· 5 个 Actions workflow 不再执行
（**铁律 #12 的 eval gate 在远端归零**，只剩未必安装的本地 pre-commit）· branch protection 消失
（合规宪法 #4 指向不存在的平台）· forbidden SSOT 只认 `.github/workflows/`，GitLab 的 `.gitlab-ci.yml`
不在红线内（**铁律 #13 在新平台失守**）。**Issues / PR 讨论 / Actions run 历史永久丢失**（无 API 可导出）。

根因不是 GitHub，而是**架构**：① 单一托管账号 = 单点故障；② 平台动词（`gh` / PR / Actions /
branch protection / `GITHUB_TOKEN`）**散落在 harness 各处**，没有集中映射层 —— 所以一次封禁需要
全仓 sweep 十几个章节 + 脚本 + skill，而不是改一个常量。

## 触发场景

- 新写 / 审查任何调用托管平台的组件：hook、skill、command、CI 定义、`run.sh` 类桥接脚本
- 关键词：`gh`、`glab`、PR、MR、Actions、workflow、branch protection、`GITHUB_TOKEN`、`CI_JOB_TOKEN`、
  repository secrets、CODEOWNERS、PR label
- 任何"CI 上跑 eval / 自动回帖 / 自动打标签"的设计（铁律 #12 的远端落地面）
- 仓库初始化 / `/cto-init` 分发 / 换机器 / 换组织时

## 应该怎么做

1. **平台动词只经映射层**：现行映射表 = handbook **§51**。新组件不得硬编码平台假设；平台特定调用
   集中在少数入口（CI 定义、codex-bridge `run.sh`），换平台时只改「§51 + 这些入口」。
   写之前先 `grep -n "§51" playbook/handbook.md` 确认当前平台的等价动词。
2. **每个仓库至少两个可写远端**：`git remote -v` 定期核（GitLab + 镜像/自托管）。
   封禁是**账号级**的 —— 同账号下的第二个仓库不算第二来源。
3. **红线只加不删**：换平台时新平台的 CI 定义路径**追加**进 `scripts/forbidden-paths.txt`，
   旧平台条目**保留**（Constitution 不可妥协清单「🟠 仅可加，不可删」）。净效果必须是红线变严。
   改完跑 `bash scripts/check-forbidden-consistency.sh` 确认 §32.1 有对应条目。
4. **CI 令牌语义不可类比**：GitLab 的 `CI_JOB_TOKEN` **不能**发 MR note / 打标签 / 开 issue
   （与 GitHub 自动注入的 `GITHUB_TOKEN` 语义不同）。依赖"CI 自动回帖"的设计必须显式配
   project access token（`GITLAB_TOKEN`），且**由人录入 CI/CD variables**，agent 不经手明文。
5. **迁移后必须 fresh clone 复验**：`git worktree add ../wt-fresh HEAD` 或全新 clone，跑
   `bash scripts/check-counts.sh` + `bash scripts/run-evals.sh`（[[2026-09-02-fresh-clone-cannot-reproduce]]）。
6. **诚实记账**：迁不走的东西（Issues / PR 讨论 / run 历史）写进 STATUS + ADR 的"未迁清单"，
   旧文档里的 PR 编号与平台名**保留原文不篡改**（铁律 #2 —— 那是史实，不是现行配置）。

## 避免什么

- ❌ 把托管平台当"环境常量"而不是**依赖**（依赖需要抽象层 + 第二来源）
- ❌ 新 skill / hook 里直接写 `gh ...`（或直接写 `glab ...` 而不查 §51）—— 下次换平台又是全仓 sweep
- ❌ 换平台时**替换**旧平台的 forbidden 条目（应追加；替换 = 给旧平台项目开洞）
- ❌ 假设新平台的 CI 内置令牌权限和旧平台一样（`CI_JOB_TOKEN` ≠ `GITHUB_TOKEN`）
- ❌ 把 PAT 写进 `.git/config` / `.env` / 文档 / commit 来"快速恢复"（用 SSH key + OAuth device flow）
- ❌ 删掉失效的旧 remote（保留为死指针存 provenance；`fetch` 失败是预期行为，别"修复"它）
- ❌ 迁完只在本机验证就宣布完成（[[2026-09-02-fresh-clone-cannot-reproduce]]）

## 来源

- 2026-09-08 GitHub→GitLab 全量迁移（6 仓库 → `gitlab.com/cantascendia`）
- `docs/ai-cto/SPEC.md` SPEC-002 · `docs/ai-cto/DECISIONS.md` ADR-011 · handbook §51 / §47.4
- `docs/ai-cto/AMENDMENT-PROPOSAL-2026-09-08-gitlab-platform.md`（宪法平台条款修正）
- 关联 [[2026-05-12-windows-path-pattern-generalization]]（发现一处必须全 sweep —— 本次正是反例代价）
- 关联 [[2026-09-02-fresh-clone-cannot-reproduce]]（迁移后的可再现性验证）

## 冷却

- 创建日期: 2026-09-08
- 30 天内不重复提议同类「平台耦合 / 单点故障」pattern
- 季度检查：`glab auth status` 有效性 + CI/CD variables 是否过期（project access token 有有效期）+
  每仓 `git remote -v` 是否仍有第二来源
