# Learned Rule: codex exec 零产出根因 = Windows 沙箱进程税（37s/命令），委派须按"写作型"设计

**学到的教训**: codex exec 在 Windows 上"经常零产出超时"不是模型/网络/额度问题——实测三连定位：
`-s workspace-write` 沙箱给**每个 shell 进程**加 ~37s 启动开销（同命令：沙箱内 37,864ms vs
`-s danger-full-access` 307ms = 123×；本机裸 powershell 0.27s）。多命令任务（读文件→改→自测）
在 37s/条税率下必然超时，超时 SIGTERM 时 apply_patch 还没执行 → 表现为"零文件产出"。
最新 stable（0.144.1）仍如此，升级不解决。

## 触发场景

- 用 `codex exec` 委派编码任务时（任何 Windows 机器）
- codex 任务超时零产出 / 报 PowerShell 8009001d / "Reading additional input from stdin..." 挂起

## 应该怎么做

1. **任务设计成"写作型"**（首选，沙箱可保留）：prompt 自包含贴入所需文件内容/上下文，明确
   「不要读仓库文件、不要跑测试、只用 apply_patch 写」——实证：llm-judge 重写任务如此成功，
   两个探索型任务（要求先读 143 行 yml + 自测）全部超时零产出。验证由 orchestrator 事后做。
2. **调用模板**：`codex exec -s workspace-write -C "<git仓库绝对路径>" -c service_tier=fast "<prompt>" </dev/null`
   - `</dev/null` 显式关 stdin（管道化 stdin 未闭合时 codex 会等 EOF）
   - `-C` 必须指向 git 仓库（非 git 目录直接拒绝退出）
3. **确需 shell 的任务**：要么给足超时预算（37s × 预估命令数 × 2），要么评估
   `-s danger-full-access`（恢复 307ms/命令）——但注意 codex 子进程**不经本仓 guard hook**，
   full-access 只用于受控 prompt + 产物走 staged+review 的任务，绝不用于探索性任务。
4. **探索/验证类工作**：直接给 Opus workflow 编队，不给 codex（本仓实证 Opus 稳定）。

## 避免什么

- ❌ 给 codex 布置"先读 X 再改 Y 然后自测"的多 shell 步任务（Windows 上必超时）
- ❌ 把零产出归因为模型/额度然后盲目重试同样任务
- ❌ 为提速默认挂 `--dangerously-bypass-approvals-and-sandbox`（安全面换性能，需逐任务评估）
- ❌ 忘记 `</dev/null`（stdin 挂起是叠加的第二个卡死源）

## 来源

- 2026-07-10 实测三连：实验1（stdin 等待 + 非 git 拒绝）/ 实验2（沙箱内 echo=37.9s）/
  实验3（danger-full-access 同命令 307ms）；本机裸 powershell 对照 0.27s（无 profile 文件）
- 失败样本：v4.2 T1/T2 委派 9.5min 超时零产出、docs 任务 4min 超时零产出
- 成功样本：llm-judge 重写（自包含 prompt + apply_patch only，其自述 PowerShell 8009001d 即沙箱层）

## 冷却

- 创建日期: 2026-07-10 / 30 天内不重复提议同类 codex 委派 pattern
