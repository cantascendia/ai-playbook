## 踩坑教训索引（cto plugin）

每条都是真实事故换来的。做相关工作**前**，Read 对应全文：`{{LESSONS_DIR}}/<文件>`。

- **修完一个 bug**（Windows 路径、转义、正则……）→ 先 grep 同一 pattern 全仓扫一遍，测试矩阵带 Windows 反斜杠 case。`2026-05-12-windows-path-pattern-generalization.md`
- **junction/symlink 共享 node_modules 的 worktree** → 不跑会 shell 出 install 的构建（`opennextjs-cloudflare build` / `pnpm preview|deploy`）；见 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 立即停手，永不加 `CI=true`。`2026-07-09-opennext-build-shells-pnpm-install.md`
- **委派 codex（Windows）** → 本地 `codex exec` 沙箱每条 shell 约 37s；用 `codex review` / codex cloud，或把任务写成"自包含、只写文件"。`2026-07-10-codex-exec-windows-sandbox-tax.md`
- **经 shell/heredoc 写含 `\` 的代码** → 反斜杠会被吃掉一半（`\b` 变 U+0008）；用 Write/Edit 工具。"源码看着对但不工作"先查控制字符。`2026-08-20-heredoc-halves-backslashes.md`
- **带 `--only/--limit/--resume` 的收集工具** → 写台账前先读旧的合并；条数减少必须报警。`2026-08-31-tools-must-not-overwrite-their-own-baseline.md`
- **catch-all 异常处理** → 必须打印异常；404/空数组可能是异常伪装。HTTP header 非 ASCII 要编码；异步缓存存 promise 而非值。`2026-09-02-catch-all-turns-crash-into-wrong-answer.md`
- **宣称"可复现/可发布"** → 本地通过不算；冻结文件 `-text`，`.gitignore` 通用名加前导 `/`，节点用 fresh worktree 跑一遍。`2026-09-02-fresh-clone-cannot-reproduce.md`
- **写验证器** → 先正规化再比较会看不见正规化前的 bug；加一个不同层的验证器；已编码的串不再 `encodeURI`。`2026-09-02-verifier-normalizes-away-the-bug.md`
- **CI / remote / 托管平台相关** → 平台是依赖不是常量：平台动词集中一处，每个仓库保留第二个可写 remote。`2026-09-08-platform-account-ban-single-point-of-failure.md`
- **生成 `.htaccess` / nginx 配置** → 本地 server 通过 ≠ Apache 正确；上验证域名对全量台账跑一遍实请求。`2026-09-10-local-server-is-not-apache.md`
- **多代理编排** → 子代理 "completed" ≠ 结束；派接手前先确认前任进程已死；共享文件按多写者设计。`2026-09-11-subagent-completed-is-not-terminal.md`

新教训：`/cto-learn`。
