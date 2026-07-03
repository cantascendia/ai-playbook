# APPLY v4.0e — 两项 governance 改动的应用手册

> 这两项触及 **forbidden 路径**（.github/workflows）和 **immutable 文件**（CONSTITUTION.md）。
> 它们的 opt-out 是 hook 在**会话启动时读的 shell 环境变量**，agent loop 内的工具调用**改不了**它 ——
> 这是 defense-in-depth 的设计（整个 v4.0 会话都在演示这条边界，且**没有**用 Bash 间接写绕过）。
> 用户 2026-07-02「你可以动用所有权限修改」= 人工授权（双签的人签面）；剩下就是这份 shell 级 deliberate act。
>
> 全部内容已备成一键可应用。选 A（你直接应用，最快）或 B（设 env 重启后让 Claude 应用）。

---

## 改动 1 — CI 加固（SPEC-001，.github/workflows forbidden）

- `docs/ai-cto/staged/eval.yml` → `.github/workflows/eval.yml`：加 `actions/setup-node@v4`（node 22 显式声明
  guard engine 依赖）+ `node --test` 引擎单测纳入 gate。
- `docs/ai-cto/staged/llm-judge.yml` → `.github/workflows/llm-judge.yml`：forbidden 正则单源 SSOT
  `scripts/forbidden-paths.txt`（修复漏 billing/keys/infra/terraform/.github-workflows 的漂移）。

## 改动 2 — 宪法平台条款修正案（immutable CONSTITUTION.md）

精确 old→new 见 `AMENDMENT-PROPOSAL-2026-07-02-platform-scope.md` §精确应用块（2 处文本，
架构宪法 #2「三平台对称」→「Claude-native 主体 + opt-in」；产品宪法「单平台工具」条同步）。

---

## 选项 A — 你直接应用（人 = forbidden/immutable 保留的合法执行者，最快，无需重启）

```bash
cd /c/projects/ai-playbook
git checkout -b feat/v4.0e-ci-and-amendment

# CI（人执行 cp，不经 agent Edit tool，forbidden-guard 不介入）
cp docs/ai-cto/staged/eval.yml       .github/workflows/eval.yml
cp docs/ai-cto/staged/llm-judge.yml  .github/workflows/llm-judge.yml

# 宪法：按 AMENDMENT 的 old→new 手改 docs/ai-cto/CONSTITUTION.md 两处
$EDITOR docs/ai-cto/CONSTITUTION.md

# 验证 + 提交
bash scripts/run-evals.sh && bash scripts/check-counts.sh
git add .github/workflows/ docs/ai-cto/CONSTITUTION.md
git commit -m "feat(v4.0e): CI hardening (setup-node + SSOT forbidden regex) + platform-scope amendment"
git push -u origin feat/v4.0e-ci-and-amendment
gh pr create --label requires-double-review   # + /cto-review --cross
```

## 选项 B — 设 env + 重启，让 Claude 应用（走 opted-in guard，audit 自动记录）

```bash
export CTO_DOUBLE_SIGNED=1          # forbidden opt-out
export CTO_CONSTITUTION_AMEND=1     # immutable opt-out
# 重启 claude（hook 在启动时读 env）；然后说：「应用 v4.0e」
# Claude 会经 Edit tool 应用（forbidden-guard/immutable-guard 放行 + audit constitution-amend-allowed）
# 完成后 unset 两个变量（避免会话内红线长期敞开）
```

> ⚠️ 选 B 后记得 `unset CTO_DOUBLE_SIGNED CTO_CONSTITUTION_AMEND` —— 这两个 env 在整个会话内
> 敞开对应红线，只应在应用这次改动时短暂开启（deliberate + transient 是设计意图）。

---

## 应用后清理

- 删 `docs/ai-cto/staged/`（staged 副本已落地，不再需要）。
- AMENDMENT / SPEC 标记「☑ 已应用」并（若需要）移 `docs/ai-cto/archive/`。
