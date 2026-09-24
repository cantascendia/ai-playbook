# Learned Rule: `opennextjs-cloudflare build` 内部会 shell 出 `pnpm install` —— junctioned worktree 里等于毁库

**学到的教训**: Wortova 事故（2026-07-09）：代理在 junction 共享 node_modules 的 worktree 里跑
`opennextjs-cloudflare build`，其内部 AWS builder 执行 `pnpm build` → pnpm 的 depsStatusCheck
判定依赖不符 → **自动触发 `pnpm install`** → Windows 上先报
`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`，代理加 `CI=true` 重跑 = 授权 pnpm **穿过 junction
清空并重建主仓 node_modules**。主仓 `.bin/` 半失踪、并行构建全灭。代理随后又用裸
`pnpm install --frozen-lockfile` 试图"修复"，二次触发 purge（违反既有 rule 的 NEVER-bare-pnpm）。

## 触发场景

- 任何在 **junction/symlink 共享 node_modules 的 worktree** 里运行的构建工具
- 关键词：`opennextjs-cloudflare build`、`pnpm preview`、`pnpm deploy`（都内嵌 OpenNext build）
- 更一般化：**任何会 shell 出包管理器 install 的工具**（turbo、nx、某些 postinstall 链同理）
- Windows + `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 出现时 = 你正站在悬崖边，
  加 `CI=true` 不是修复而是**授权毁库**

## 应该怎么做

1. **OpenNext/部署类构建只许在主仓跑，由架构师亲自跑**——worktree 代理的验证链止步于
   `next build --webpack`（它不 shell install）
2. 代理任务 prompt 的验证清单里**显式排除** `pnpm preview`/`opennextjs-cloudflare build`
3. 见到 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` → **停手上报**，永不加 CI=true 硬闯
4. 结构性护栏优于自觉：worktree 创建时写入 `.npmrc`（如 `frozen-lockfile=true` +
   verify-deps-before-run=false）或干脆不给 worktree 里的 pnpm 可写权限
5. 毁库修复 = 叫停全部代理 + 杀竞争进程 + **主仓单点** `pnpm install`，绝不让多个 install 并行

## 避免什么

- ❌ worktree 里跑任何内嵌 install 的构建工具（不只是裸 pnpm install）
- ❌ 用 `CI=true` 绕过 pnpm 的 no-TTY 保护（那个保护存在的意义就是拦这个）
- ❌ 发现库坏了就地 `pnpm install` 自救（junction 下= 二次毁库）
- ❌ 两个代理同时 install 同一个共享 store

## 来源

- Wortova 事故 2026-07-09：cache-fix 代理自首报告（含完整机制溯源）+ 架构师主仓修复
- 关联 [[2026-05-12-windows-path-pattern-generalization]]（发现一处 sweep 全部）
- pnpm depsStatusCheck / OpenNext buildNextApp.js execSync("pnpm build")

## 冷却

- 创建日期: 2026-07-09 / 30 天内不重复提议同类 pattern
- 待办：Wortova 环境政策 v3.2 写入"worktree 禁 OpenNext 构建"条款
