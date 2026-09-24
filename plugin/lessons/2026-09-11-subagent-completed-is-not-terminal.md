# Learned Rule: 子代理「completed」通知不等于结束 —— 它会被自己的后台任务唤醒；共享写入必须按"多写者"设计

**学到的教训**: hsr-demo 素材采集（2026-09-10）视频线 B 代理报"completed"后我立刻派了接手代理 B-2。
实际 B 只是**被自己起的后台 bash 唤醒前暂停了一轮**，稍后继续跑 YouTube 下载。两个代理同时改
`videos.py`、同时写同一个 manifest 分片 → 记录互相覆盖（59 条 vs 磁盘 72 个文件），B 站还因并发被 412 限流。
同一天客户端解包又踩三次同源坑：Windows `os.replace` 撞读锁（WinError 5）、两进程共用同名 `.tmp`
（FileNotFoundError）、7 万条记录整份 `json.dumps` + 6 个导出线程 → MemoryError。

## 触发场景

- 收到 `task-notification status=completed` 想派"接手/成功者"代理时
- 多个子代理/进程写同一个索引、manifest、ledger 文件（尤其 Windows）
- 子代理用 nohup 起长任务；会话重启（`--resume`）后
- 给 Monitor 写过滤器；对几万文件的目录跑 `du`/`Get-ChildItem -Recurse`

## 应该怎么做

1. **派接手代理前先证实前任真死了**：`ListAgents` 看状态 + `Get-CimInstance Win32_Process` 查它起的进程。
   通知里的 note 写明"agent stops with no live background children… may notify more than once"——按字面理解。
2. **一条线一个写者**是默认；做不到就让 save 具备四件套：保存前与磁盘合并（in-memory 优先）、
   `os.replace` 对 PermissionError 退避重试、临时文件名带 pid、流式 `json.dump` 不缩进。
3. **nohup 子进程随 Claude Code 进程一起死**：长任务必须可断点续跑（按输出文件/marker 跳过），
   会话恢复后第一件事是查日志末尾 + 进程存活，再决定重启。
4. **Monitor 过滤器只匹配会采取行动的行**：失败签名 + 里程碑（每 1000）+ 终态；每 10 条一报会被自动停掉。
5. **大目录别在 120 s 工具调用里 `du`**：用日志里的计数、或 manifest 汇总；要算体积就后台跑。

## 避免什么

- ❌ 看到 completed 就 spawn 同名任务的第二个代理（先查进程）
- ❌ 两个进程共用 `<name>.tmp` 做原子替换
- ❌ 一次 `json.dumps` 整份几万条记录再 `write_text`（两倍内存）
- ❌ 前台 `du -sh` 十万文件目录（超时后被扔进后台，结果没人看）

## 来源

- hsr-demo 2026-09-10：B 线双写（ListAgents 显示 B-videos 仍 running）；common.py 四次修复
  commit 338d5c1 / 4c5caf1 / 3ba96a8 / cfdb3af；E3 报告 nohup 动画任务 17/84 随进程退出
- 关联 [[2026-08-31-tools-must-not-overwrite-their-own-baseline]]（部分写入覆盖正本的同型）

## 冷却

- 创建日期: 2026-09-11 / 30 天内不重复提议同类"多写者 / 通知语义"pattern
