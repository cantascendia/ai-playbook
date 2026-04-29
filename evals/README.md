# Evals — Golden Trajectories

按手册 §35 Eval-Driven Development 维护的回归测试集。

## 目录结构

```
evals/
├── README.md                  # 本文件
├── golden-trajectories/       # ≥5 条黄金轨迹（项目核心行为）
└── (自动生成 history/)        # eval-runner 历史报告
```

## 运行方式

- 手动：`/cto-eval run`（slash command）
- 程序化：通过 Task 工具调用 `eval-runner` sub-agent

## 触发时机

- 每次修改 CLAUDE.md / commands / agents / skills 后必跑（铁律 #12）
- PR 合并前作为 gate
- 月度回归

## 当前 case 清单（§3.3 中详化）

| ID | 标题 | 优先级 |
|---|---|---|
| 001 | harness-auditor sub-agent 触发 | P0 |
| 002 | eval-runner sub-agent 隔离执行 | P0 |
| 003 | vibe-checker sub-agent 扫描 | P1 |
| 004 | Skills 双位置 SHA 一致性 | P1 |
| 005 | forbidden-paths rule 拆分后仍能拦截 | P0 |
| 006 | test-lock rule 拆分后仍能警告 | P0 |
| 007 | MCP server 工具发现 | P2 |
| 008 | Output style + status line 渲染 | P2 |
