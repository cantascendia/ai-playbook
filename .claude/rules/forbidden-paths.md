# Forbidden 路径强制规则（手册 §32.1）

## 触发条件

修改以下路径模式时必须遵守：
- `**/auth/**`、`**/crypto/**`
- `**/payment/**`、`**/billing/**`
- `**/secrets/**`、`**/keys/**`
- `**/migration/**`、`**/migrations/**`、`**/database/migrations/**`
- `**/infra/**`、`**/terraform/**`、`**/ansible/**`
- `.github/workflows/**`
- `.gitlab-ci.yml`、`.gitlab/**`

## 强制铁律

- **不允许 vibe coding**（铁律 #13 / 手册 §33）
- **必须双签**（手册 §32 + §19）：CTO + senior engineer + 第二模型独立审一遍
  （**流程约束，非平台强制** —— CODEOWNERS approval rules 需 GitLab Premium；Free 层的人工半 =
  MR 模板勾选框 + main 保护分支「Maintainers merge」）
- **必须 spec-driven**（手册 §18）：先 SPEC → PLAN → TASKS → 实现
- **MR 必须打 `requires-double-review` 标签**（GitLab）——
  唯一的机器强制点：`.gitlab-ci.yml` 的 `double-sign-gate` job 读 `$CI_MERGE_REQUEST_LABELS`（不需 token），
  改动命中 forbidden SSOT 而标签缺失 → job 失败。`llm-judge` job 在配了 `GITLAB_TOKEN` 时自动补打标签，
  未配则跳过（需人手动打）。
- **测试覆盖**：高风险路径必须 ≥ 80% mutation score（§20.3）

## 6 大典型反模式（手册 §32.5）

避免：
1. Vibe Shipping（不读代码就部署）
2. Yes-man AI（顺从用户错误想法）
3. Hallucination Amplification（错误代码反复迭代加深）
4. Dependency Hallucination（编造不存在的库）
5. Context Starvation（上下文不足瞎写）
6. Eval Gaming（指标对但目标偏）

## 检测命令

```bash
# 触及 forbidden 路径的 commit
git log --oneline -50 | xargs -I {} bash -c 'git show --name-only {} | grep -qE "(auth|payment|secrets|migration|crypto)/|\.gitlab-ci\.yml|\.gitlab/" && echo {}' 2>/dev/null

# 触及 forbidden 路径的 staged 文件
git diff --cached --name-only | grep -E "(auth|payment|secrets|migration|crypto)/|\.gitlab-ci\.yml|\.gitlab/"
```

完整定义见手册 §32 AI 代码生成的人工审核边界。
