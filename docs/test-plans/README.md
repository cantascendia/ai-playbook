# Test Plans — trajectory 类规约（非自动化 eval）

> v3.14 bold-audit：这 22 条（001-022）是 **trajectory 类**测试规约——描述"CTO 该走的步骤 /
> 不该做的事 / 验收标准"，但**没有 `verification_command`，从不自动执行**（需真跑 Claude 才能验）。
>
> 此前它们混在 `evals/golden-trajectories/` 里，导致 run-evals 永远报 22 条 SKIP、对外计数虚高。
> 移到这里后：`evals/golden-trajectories/` 只留**可真跑的行为型 eval**（铁律 #12 真执行），
> 计数诚实；这些规约作为**人工/未来 Claude 周期性验证的清单**保留，零信息丢失。

## 用法

- 接入新平台能力或大改 CTO 行为后，可让一个 Claude 会话按这些规约逐条走查（input → expected_steps → forbidden_actions → acceptance_criteria）。
- 若某条规约能写成可脚本断言的 `verification_command`，应升级回 `evals/golden-trajectories/`。

## 清单

001-022：覆盖第零轮启动 / spec-driven / bug 修复 / refactor / 发布 / MCP 发现 / skill 触发 等 CTO 核心流程。
