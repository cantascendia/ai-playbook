# Evals — Golden Trajectories（铁律 #12）

按手册 §35 Eval-Driven Development 维护的**真执行**回归测试集。
每条 agent-config 改动（commands / agents / skills / CLAUDE.md / handbook）必须配套 eval（铁律 #12）。

## 目录结构

```
evals/
├── README.md                  # 本文件
└── golden-trajectories/       # 可执行 eval case（NNN-<slug>.yaml）
```

> v3.14 起，22 条「trajectory 类」规约（需真跑 Claude、无 `verification_command` 不能本地静态执行）
> 已移出本目录到 **`docs/test-plans/`**，计数诚实化 —— 那些是人工 / Claude 周期验证的行为规约，
> 不进 `run-evals.sh` 的自动集。本目录只保留**有 `verification_command` 真执行**的 case。
> （不存在「自动生成的 `history/` 目录」—— 旧 README 的该描述已废除。）

## 运行机制

- 一键跑全量：`bash scripts/run-evals.sh`（git-bash）
- 跑指定前缀：`bash scripts/run-evals.sh 023 032`
- 详细输出：`EVAL_VERBOSE=1 bash scripts/run-evals.sh`
- slash：`/cto-eval run`

`run-evals.sh` 提取每条 yaml 的 `verification_command` 块并**真执行**，按输出判定：
- stdout 含 `FAIL` 或 `fail=[1-9]` → **FAIL**（exit 1，阻 merge）
- 含 `PASS` 或 `pass=` 且无 fail → **PASS**
- 无 `verification_command` → **SKIP**（trajectory 类，应已移到 docs/test-plans/）

## `verification_command` house style（house contract）

每条 case 的 `verification_command` 必须：
1. 用显式计数器起手：`pass=0; fail=0`
2. 每个断言 `pass=$((pass+1))` 或 `{ fail=$((fail+1)); echo "FAIL: <原因>"; }`
3. 收尾打印计数行：`echo "pass=$pass fail=$fail (expect N/0)"`
4. 最后一行是唯一的 PASS/FAIL marker：`[ "$fail" = "0" ] && echo PASS || echo FAIL`

参考 `029-windows-path-redline.yaml` 为标准模板。

## `zzz-` 保留前缀

`run-evals.sh` 在**无 filter 全量跑**时跳过 `zzz-*` id（`case "$id" in zzz-*) continue ;;`）。
该前缀专供 meta-eval（`036-eval-executor.yaml`）在 temp 目录造人造 PASS/FAIL 样本、
按 id 过滤单独跑，避免污染全量集。**不要**用 `zzz-` 命名真 case。

## 触发时机

- 每次修改 CLAUDE.md / commands / agents / skills / handbook 后必跑（铁律 #12）
- PR 合并前作为 gate（`.github/workflows/eval.yml` 已接入 + `scripts/check-counts.sh` SSOT 校验）
- 月度回归

## 当前 case 集（写作时 `ls evals/golden-trajectories/*.yaml`）

live 集为 **023–057**（含 054、056、057；`zzz-*` 为 meta-eval 保留临时前缀，不计入）。
精确计数以 `docs/ai-cto/COUNTS.md` 为 SSOT（本文件不硬写数字）。逐条清单直接 `ls` 目录，
或看每条 yaml 的 `description` / `priority`。

trajectory 类规约（001–022，需人工 / Claude 周期验证）见 **`docs/test-plans/`**。
