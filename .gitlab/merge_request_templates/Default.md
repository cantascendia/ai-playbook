## 摘要

<!-- 这次改了什么、为什么。≥ 50 字（llm-judge 会检查 MR description 长度）。 -->

## Forbidden 路径（手册 §32.1 / 铁律 #13）

- [ ] **未**触及 forbidden 路径
- [ ] 触及了 forbidden 路径 → 列出：`` ``
      （`scripts/forbidden-paths.txt` 是 SSOT：auth / crypto / payment / billing / secrets /
      keys / migration(s) / infra / terraform / ansible / `.github/workflows/` /
      `.gitlab-ci.yml` / `.gitlab/`）

触及 forbidden 路径时必须：spec-driven（SPEC → PLAN → TASKS，禁 vibe coding）+ 双签
（CTO + 第二模型独立审）+ 给本 MR 打 **`requires-double-review`** 标签。

- [ ] 已打 `requires-double-review` 标签（仅在触及 forbidden 路径时勾选）

## Eval 证据（铁律 #12）

改动 `CLAUDE.md` / `.claude/commands/**` / `.claude/agents/**` / `.claude/hooks/**` /
`.agents/skills/**` / `playbook/handbook.md` 时，必须有覆盖本次改动的 golden trajectory
并跑通全量 eval。

- [ ] 覆盖本次改动的 eval case：`evals/golden-trajectories/___.yaml`
- [ ] `bash scripts/run-evals.sh` 全 PASS（0 FAIL）
- [ ] `bash scripts/check-counts.sh` 通过
- [ ] `node --test .claude/hooks/engine/guard.test.mjs` 全绿

```
<!-- 粘贴 run-evals.sh 结果末尾的汇总行 -->
```

## 合并前

- [ ] `eval-gate` pipeline 通过（main 为 protected branch：No one push / Maintainers merge，
      且「Pipelines must succeed」已开启）
- [ ] 测试断言未被改动以迁就实现（铁律 #14 Test-Lock）

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
