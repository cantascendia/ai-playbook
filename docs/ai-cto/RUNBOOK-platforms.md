# RUNBOOK — 三平台守护的启用与核验（v5.0）

> 适用：ai-playbook 自身与由 `/cto-init` 装机的项目。
> 一句话：**文件铺好 ≠ 守护生效**。Claude Code 侧装完即生效；Codex 与 Antigravity 侧各有一道
> 必须由人完成的启用步骤，未完成前**不得**认为红线在该平台成立。

## 0. 当前状态速查

| 平台 | 接线文件 | 生效条件 | 未生效时的真实状态 |
|---|---|---|---|
| Claude Code | `.claude/settings.json` 的 hooks 段 | 复制到位即生效 | — |
| Codex CLI | `.codex/hooks.json` + `.codex/hooks/*.cmd` | **人在该仓库的 Codex TUI 里跑 `/hooks` 批准每个条目的哈希** | hook 被**静默跳过** = 零守护 |
| Antigravity (agy) | `.agents/hooks.json` + `.agents/hooks/guard.cmd` | 文件到位；**文件写 step 名尚未真机确认** | shell 类已覆盖；文件写为「候选覆盖，未经确认」 |

`/cto-doctor` 会逐平台打印上述状态。**未 trust / 未确认一律显示红字，不会标 ✓**——
「以为有守护其实没有」比「明知没有」危险得多。

---

## 1. Codex：必须做的 trust 步骤

### 为什么不能跳过
SPIKES-2026-09 spike-5 实测本机 `~/.codex/config.toml`：

```toml
[hooks.state.'C:\...\<project>\.codex\hooks.json:pre_tool_use:0:0']
trusted_hash = "sha256:6eb353e0..."
```

- Trust 键 = `<hooks.json 绝对路径>:<事件>:<matcher 组下标>:<组内条目下标>`
- **逐条目**登记，不是逐文件
- 键里含**绝对路径** → 每个项目单独批准，无法跨项目复用
- hook 定义的 sha256 变了就要重批

本仓在该表中**曾经一条记录都没有**，也就是 2026-09-10 生成的那份 `.codex/hooks.json` 从未真正运行过。

### 设计上的对策
`.codex/hooks.json` 刻意只有 **3 个 hook 条目**（shell / 文件 / MCP 各一），
同一组里的多个 guard 由 `.claude/hooks/engine/group.mjs` 串联，而不是各占一条。
批准次数因此从 8 次降到 3 次。

### 操作
1. 在该仓库目录下打开 Codex TUI：`codex`
2. 执行 `/hooks`
3. 逐条 review 并批准（会显示命令原文与哈希）
4. 回到本仓执行 `/cto-doctor`，确认 Codex 一栏变为已信任

### 明确禁止
不得在 `scripts/codex-delegate.sh`、`.agents/skills/codex-bridge/run.sh` 或任何日常路径里
使用 `--dangerously-bypass-hook-trust`。那会把委派通道本身变成绕过 trust 的现成后门。
该 flag 只允许出现在 eval / drill 的受控场景。

---

## 2. Antigravity (agy)：已覆盖什么、还缺什么

### 已覆盖（有一手依据）
`.agents/hooks.json` 的 matcher 是 agy 的 step type（= 二进制里 `CORTEX_STEP_TYPE_*` 去前缀小写，
官方文档以 `run_command` / `view_file` / `browser_.*` 为例，命名规则已确认）。分组：

| 组 | matcher | 挂载的 guard |
|---|---|---|
| shell 类 | `run_command\|shell_exec\|send_command_input\|run_extension_code\|git_commit` | bypass / destructive / branch |
| 文件类 | `propose_code\|file_change\|write_blob\|edit_notebook\|delete_directory\|move` | immutable / forbidden / branch / test-lock |
| MCP·SQL | `mcp_tool\|cloud_sql_execute_sql\|cloud_sql_update_schema` | mcp-guard |

注意 `git_commit` 是 agy 的**独立 step**，不一定经 `run_command`，所以单列进 shell 组——
否则绕过类 flag 会从这条路走掉。

### 还缺（诚实标注）
122 个 step type 里，究竟哪个是 agent 实际写文件的动作**尚未真机确认**（`propose_code` 最可能）。
处置：文件类 matcher 用正则一次覆盖全部候选。多跑几次 guard 无害，漏拦才有害。
真机确认后再收窄，并把结论写回 SPIKES-2026-09 spike-6。

### 操作
1. 确认 `.agents/hooks.json` 与 `.agents/hooks/guard.cmd` 在仓库根
2. 在该仓库跑一次 agy 会话，触发一条无害 `run_command`
3. 检查 `.claude/agent-logs/<today>.jsonl` 是否出现对应 audit 行
4. 若无输出，记录到 SPIKES 的 spike-6，并在 doctor 中保持「未确认」状态

---

## 3. 三平台裁决一致性的保证

同一套 `engine/core` 判定服务三个平台，差异只在 I/O：

| | 输入 | 拒绝输出 |
|---|---|---|
| claude | `tool_name` + `tool_input` | `exit 2` + stderr，或紧凑 `hookSpecificOutput` deny JSON |
| codex | 同构；但 `apply_patch` 的路径藏在 patch 文本里 | 与 claude **同构**（官方 hooks 文档一致） |
| agy | camelCase `toolCall.name/args`（参数键 PascalCase） | `{"decision":"deny"}`，**没有 exit-code 通道** |

三条由 eval `095-three-platform-parity` 持续锁定（31 条断言），其中包括：
- Codex `apply_patch` 解析失败时红线 **fail-closed**
- agy 平台下引擎内部异常也必须走 decision JSON（用 exit 2 等于静默放行）
- claude 侧字节契约不得因为多平台改造而改变

---

## 4. 回滚

| 层级 | 动作 | 影响 |
|---|---|---|
| 平台级 | 删除 `.codex/hooks.json` 或 `.agents/hooks.json` | 该平台无 hook，Claude 侧不受影响 |
| 引擎级 | `CTO_GUARD_ENGINE=legacy` | 回到 v3.15 冻结实现（注意：PowerShell / NotebookEdit / 三平台覆盖是 engine-only，回退即失去） |
| 文件级 | `fleet.mjs rollback <path>`（WS10 交付） | 还原 hooks 目录与 settings.json 备份 |
