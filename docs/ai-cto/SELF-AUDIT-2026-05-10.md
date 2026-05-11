# Self-Audit 2026-05-10

> Pattern Detector v3.9 自动生成。**仅报告**，不修改任何其他文件。

## 总览

- 数据范围：2026-04-11 (30 天前) -> 2026-05-10
- Trajectory 条目数：约 250 条（5 个 jsonl 文件：2026-04-29, 04-30, 05-06, 05-09, 05-10）
- Codex review 数：8 次（7 次 codex-gpt5.5 成功 + 1 次 fallback-to-claude）
- Commits（30 天内）：25 个（8 fix + 17 feat）
- 检出 pattern：6 个（置信度全部 >= 70%）
- Evals 数：28 个（其中 3 个为 v3.9 新增：026/027/028）

---

## Pattern 1: Windows sandbox CreateProcessWithLogonW 1326 — codex review 每轮必失败第一步 (置信度 95% — A/C 混合)

**频次**：最近 30 天 7 轮 codex review 全部命中（2026-05-10 一天内 6 次独立 session）

**示例证据**：
- commit cc71d47 2026-05-10 12:00 review session 019e0fd4：PowerShell 调 git show，3 次 1326 错误，最终 fallback 到 GitHub MCP，结论为无发现但置信度低
- commit c590fa8 2026-05-10 12:02 review session 019e0fd5：同样 4 次 1326，github_fetch_commit 失败，明确输出 confidence is low because the commit diff could not be inspected directly
- commit d82d9cc 2026-05-10 12:39 review session 019e0ff7：5 次 1326，依赖 MCP 获取，MCP 成功后找到 2 个 P2 bug
- commit 6c385ea 2026-05-10 13:54 review session 019e103c：同样 1326 + MCP fallback，找到 3 个 P1（Write/MultiEdit immutable bypass + section-34 漏洞）
- REVIEW-QUEUE.md 内 7 次 review session 全部含 CreateProcessWithLogonW failed: 1326 错误行（共 87 次出现）

**根因假设**：Codex CLI 0.125.0 在 Windows 沙箱中用 CreateProcessWithLogonW 运行 PowerShell（需凭据）。Windows sandbox 隔离模式不支持此 API（错误码 1326）。所有 review session 必须走 GitHub MCP fallback 路径。当 github_fetch_commit MCP 也失败时（cc71d47、c590fa8 两次），review 结论退化为 no findings with low confidence——漏报风险存在。

**建议改进**（按 ROI 排序）：
- 选项 A（最高 ROI）: 在 .agents/skills/codex-bridge/run.sh 里加 --no-sandbox 或 Windows 专用 approval: suggest 模式，绕过 CreateProcessWithLogonW
  - 影响文件：.agents/skills/codex-bridge/run.sh
  - 工作量估时：30 分钟
  - 是否触及红线：仅软配置，不触 immutable
- 选项 B: 新建 learned rule 记录 Windows 环境 codex review 依赖 GitHub MCP，MCP 失败时主动降级 claude fallback
  - 影响文件：.claude/rules/learned/2026-05-10-codex-windows-sandbox-fallback.md（新建）
  - 工作量估时：20 分钟
  - 是否触及红线：仅新建 learned rule，不触 immutable
- 选项 C: 在 .github/workflows/codex-review.yml 加 runs-on: ubuntu-latest 子 job 用 Linux runner 做 git-local review
  - 影响文件：.github/workflows/codex-review.yml（属 forbidden-paths，需 spec-driven + 双签）
  - 工作量估时：2 小时
  - 是否触及红线：触及 .github/workflows/（铁律 #13，需 spec-driven）

**冷却检查**：
- 上次提议此 pattern：从未（EVOLUTION-LOG 显示 bootstrap 阶段，无历史提议）
- 距今：首次提议
- 决策：可提议

---

## Pattern 2: trajectory logger jsonl schema 缺 tool/file/session 字段 — replay 数据不可用 (置信度 88% — C 类)

**频次**：5 个 jsonl 文件（2026-04-29 至 05-10 全部）均只含 ts 和 type 字段，无 tool_name / file / cmd / session

**示例证据**：
- .claude/agent-logs/2026-05-10.jsonl 行 1：仅含 ts 和 type:tool_call，无 tool 或 file 字段
- .claude/agent-logs/2026-04-29.jsonl 行 1：同样只有 ts+type 两字段，共 94 行
- commit cc71d47 2026-05-09 message：SubagentStop hook 写 jsonl 而非追加到 STATUS.md — 说明 v3.6.3 之前根本没有 jsonl
- trajectory-logger.sh 当前版本（schema v3.8）应写 tool/file/cmd/session，但 5 个文件全部 250+ 条目都没有这些字段
- eval 023 acceptance_criteria 要求 agent-logs jsonl 含 forbidden-blocked audit 记录 — 当前数据结构不满足

**根因假设**：trajectory-logger.sh 从 stdin 读 hook JSON，但 HOOK_TOOL_NAME、HOOK_FILE_PATH、HOOK_SESSION_ID 等变量在 read_hook_input 后均为空字符串。可能原因：Claude Code hook 实际传来的 stdin JSON schema 字段名与 common.sh 里的 _json_get 解析路径不匹配。printf 写出的 jsonl 是合法 JSON 但所有自定义字段都是空字符串，形成有日志但没内容的假象。eval 020 和 eval 023 的日志验收条件实际上均无法通过。

**建议改进**（按 ROI 排序）：
- 选项 A（最高 ROI）: 在 trajectory-logger.sh 里加 CTO_TRAJECTORY_DEBUG=1 诊断模式，打印 read_hook_input 解析后的变量值；验证 Claude Code 实际传来的 stdin JSON schema；修复 common.sh _json_get 使用正确字段路径
  - 影响文件：.claude/hooks/trajectory-logger.sh、.claude/hooks/lib/common.sh
  - 工作量估时：45 分钟
  - 是否触及红线：仅 hook 软逻辑，不触 immutable
- 选项 B: 在 eval 020（trajectory-logging）acceptance_criteria 加 grep 验证（检测 tool 字段非空），使 CI 能检测此 regression
  - 影响文件：evals/golden-trajectories/020-trajectory-logging.yaml
  - 工作量估时：30 分钟
  - 是否触及红线：不触 immutable

**冷却检查**：
- 上次提议此 pattern：从未
- 距今：首次提议
- 决策：可提议

---

## Pattern 3: immutable-guard 在 Windows worktree 路径剥离盲区 — bash 字符串操作不兼容 (置信度 78% — A/B 混合)

**频次**：6 轮 codex dogfood 中 4 轮发现 immutable-guard 绕过路径（均已修）；Windows 路径分隔符问题是潜在残余风险，尚未被任何 review 发现

**示例证据**：
- commit 6c385ea codex review P1：Write/MultiEdit 绕过 old_string 比对（已修 b0cb86f/1a74eef）
- commit b0cb86f codex review P1：cwd 为空时构建 /scripts/forbidden-paths.txt 绝对路径（已修 1a74eef）
- immutable-guard.sh 当前代码行 16：REL 通过 bash 字符串剥离 HOOK_FILE_PATH#CWD/ 计算
- 当前 worktree 路径：C:\projectsi-playbook\.claude\worktrees\sweet-kare（含反斜杠）
- bash 字符串剥离操作符 # 在 CWD 含反斜杠时无法匹配正斜杠前缀，导致 REL 等于完整绝对路径，guard 静默放行
- 6 轮 codex review 均通过 GitHub MCP 审代码（无法本地执行 bash），Windows-specific 问题未被发现

**根因假设**：immutable-guard.sh 在 bash/Unix 路径假设下设计，Windows worktree 环境（HOOK_FILE_PATH 和 CWD 含反斜杠）使字符串剥离逻辑失效，导致相对路径判断永不匹配，所有 immutable 检查静默失效。这是 Pattern 1 的下游影响：codex 无法本地执行，所以 Windows-specific bash 行为从未被测试。

**建议改进**（按 ROI 排序）：
- 选项 A（最高 ROI）: 在 immutable-guard.sh 顶部加 Windows 路径规范化（反斜杠转正斜杠后再做 REL 剥离）；同时在 eval 026 加 Windows 路径格式测试 case
  - 影响文件：.claude/hooks/immutable-guard.sh（加强 guard，非削弱）、evals/golden-trajectories/026-immutable-redline.yaml
  - 工作量估时：30 分钟（含本地 Windows 测试）
  - 是否触及红线：加强 guard 非削弱，建议人审后实施
- 选项 B: 仅扩充 eval 026 verification_command，加 Windows 绝对路径格式的测试 case，用 CI 暴露问题
  - 影响文件：evals/golden-trajectories/026-immutable-redline.yaml
  - 工作量估时：20 分钟
  - 是否触及红线：不触 immutable

**冷却检查**：
- 上次提议此 pattern：从未（Windows 路径分隔符问题从未被历史提议过）
- 距今：首次提议
- 决策：可提议

---

## Pattern 4: codex review 重复触发同分支多 commit — cost cap 未初始化 (置信度 75% — E 类)

**频次**：2026-05-10 单天 6 次独立 codex review session，bytes 累计约 40,717

**示例证据**：
- CODEX-REVIEW-LOG.md 2026-05-10 12:00 到 14:02 共 6 次 review，均在 feat/v3.9-self-evolution-flywheel 分支，相邻 commit 间隔 2-15 分钟
- CODEX-REVIEW-LOG.md 行 13-17：PR autopilot 尝试时写入 pull request create failed GraphQL Head sha cannot be blank 和 2 uncommitted changes 警告，git 状态不干净时仍触发了 review
- eval 028 cost-cap 规定月度 cap 20 USD（cap_cents=2000），但 docs/ai-cto/.evolve-cost-month.json 文件尚不存在
- settings.json Stop hook：每次会话结束无条件调 codex-bridge/run.sh HEAD，无幂等 SHA 去重检查

**根因假设**：Stop hook 在每次会话结束时无条件触发 codex review，即使 HEAD SHA 与上次 review 相同。活跃开发日（10+ commit/天）产生多次 review。cost cap 文件未初始化（eval 028 的实现尚未落地），无法触发超限降级。PR autopilot 在 git 状态不干净时也触发了 review，浪费 token。

**建议改进**（按 ROI 排序）：
- 选项 A（最高 ROI）: 在 codex-bridge/run.sh 加 SHA 幂等检查（.claude/agent-logs/.last-reviewed-sha 文件），跳过已 review 的 HEAD SHA；同时初始化 docs/ai-cto/.evolve-cost-month.json 激活 cost cap
  - 影响文件：.agents/skills/codex-bridge/run.sh、docs/ai-cto/.evolve-cost-month.json（新建）
  - 工作量估时：30 分钟
  - 是否触及红线：不触 immutable
- 选项 B: 新建 learned rule 规定 codex review 触发前提条件（git status clean + HEAD SHA 未被 review 过）
  - 影响文件：.claude/rules/learned/2026-05-10-codex-review-trigger-conditions.md（新建）
  - 工作量估时：15 分钟
  - 是否触及红线：仅新建 learned rule

**冷却检查**：
- 上次提议此 pattern：从未
- 距今：首次提议
- 决策：可提议

---

## Pattern 5: hook silent no-op 模式反复重演 — edge case 防御性设计框架缺失 (置信度 85% — B 类)

**频次**：8 次 codex review 中，4 次（50%）发现某场景 hook 静默通过，形成 hook 存在但失效的重复模式

**示例证据**：
- commit de3a019 2026-04-29 review P2：Stop hook 只 echo 触发消息，从不调用 codex-bridge — 已修 5dea8fb
- commit d82d9cc 2026-05-10 review P2：UserPromptSubmit hook 用 test -x 检查，fresh checkout 无 executable bit 时永远跳过 vibe-prompt-guard.sh — 已修 d93ccbb
- commit d82d9cc 2026-05-10 review P2：Edit/Write PostToolUse 触发 trajectory-logger，plus wildcard * hook 再次触发同一 logger，重复日志条目 — 已修 d93ccbb
- commit 6c385ea 2026-05-10 review P1：immutable-guard Write 分支 HOOK_OLD_STRING 为空，条件判断跳过，整文件覆写通过 — 已修 b0cb86f/1a74eef
- commit 0b7c6f9 2026-05-10 review P1：forbidden-policy SKILL.md paths 字段原为 quoted scalar，loader 解析为单一字符串不匹配任何路径，skill 永不触发 — 已修 866f07b

**根因假设**：hook 和 skill 在设计时覆盖了主路径（happy path），但 edge case 静默 exit 0 或无效触发。5 个不同 bug 共享同一根因：缺乏系统性的 hook 防御性设计 checklist。每次发现一个就修一个，但没有框架防止下次再犯。该模式在 v3.7 到 v3.9 三个版本中持续出现，说明这是结构性问题而非单点 bug。

**建议改进**（按 ROI 排序）：
- 选项 A（最高 ROI）: 写 learned rule 建立 hook 防御性设计三问，每次写新 hook 必须回答：(1) 关键变量为空时 exit 0 还是报错？(2) 文件不存在时 fallback 行为？(3) 平台差异（Windows 路径/executable bit）是否处理？
  - 影响文件：.claude/rules/learned/2026-05-10-hook-defensive-patterns.md（新建）
  - 工作量估时：30 分钟
  - 是否触及红线：仅新建 learned rule，不触 immutable
- 选项 B: 在 eval 023（hook-enforcement）acceptance_criteria 加 edge case 测试，覆盖 tool=Write+empty old_string、fresh checkout 无 executable bit、wildcard 重复触发场景
  - 影响文件：evals/golden-trajectories/023-hook-enforcement.yaml
  - 工作量估时：45 分钟
  - 是否触及红线：不触 immutable

**冷却检查**：
- 上次提议此 pattern：从未（v3.8 立项动机是整体 hook 不生效，本次是更细的 edge case 层，不重复）
- 距今：首次提议
- 决策：可提议

---

## Pattern 6: codex session rollout items 错误导致 REVIEW-QUEUE 结论重复写入 (置信度 72% — A/E 混合)

**频次**：7 次成功 codex review 中，全部在 session 结束时产生 failed to record rollout items 错误（共 14 个 thread id 失败），所有 review 结论在 REVIEW-QUEUE.md 中出现两次

**示例证据**：
- review session 019e0ff7（d82d9cc 2026-05-10 12:39）：ERROR codex_core::session: failed to record rollout items: thread 019e0ff7-ce96... not found
- review session 019e1008（0b7c6f9 2026-05-10 12:57）：ERROR codex_core::session: failed to record rollout items: thread 019e1008-a044... not found
- review session 019e103c（6c385ea 2026-05-10 13:54）：ERROR codex_core::session: failed to record rollout items: thread 019e103c-fc7c... not found
- review session 019e1043（b0cb86f 2026-05-10 14:02）：ERROR codex_core::session: failed to record rollout items: thread 019e1043-d2c5... not found
- REVIEW-QUEUE.md 中每次 review 的 codex 结论段均出现两次（重复写入），增加阅读噪声，bytes 计数可能被高估

**根因假设**：Codex CLI 在 Windows 沙箱 CreateProcessWithLogonW 1326 错误影响下，session 线程管理失效。rollout items 写入失败后，Codex 内部重试机制将 stdout 结论重新打印一次。codex-bridge/run.sh 全量追加 stdout 到 REVIEW-QUEUE.md，导致重复内容也被写入。这是 Pattern 1 的次生症状，修复 Pattern 1 后此问题可能自动消失。

**建议改进**（按 ROI 排序）：
- 选项 A（最高 ROI）: 在 codex-bridge/run.sh 写入 REVIEW-QUEUE.md 之前对 codex stdout 去重，检测末尾段与上一段是否相同，相同则去除重复
  - 影响文件：.agents/skills/codex-bridge/run.sh
  - 工作量估时：20 分钟
  - 是否触及红线：不触 immutable
- 选项 B: 过滤 codex stdout 中的 ERROR codex_core 行再写入 REVIEW-QUEUE，降低内部错误噪声
  - 影响文件：.agents/skills/codex-bridge/run.sh
  - 工作量估时：15 分钟
  - 是否触及红线：不触 immutable

**冷却检查**：
- 上次提议此 pattern：从未
- 距今：首次提议
- 决策：可提议

---

## 综合优先级矩阵

| Pattern | 类型 | 置信度 | 业务影响 | 工作量 | 优先级 |
|---|---|---|---|---|---|
| P1: Windows sandbox 1326 导致 review 漏报 | A/C | 95% | 高（review 可靠性） | 小 | P0 |
| P5: Hook silent no-op 模式反复重演 | B | 85% | 高（安全 enforcement） | 中 | P1 |
| P2: Trajectory jsonl 字段全部为空 | C | 88% | 中（replay/audit 功能缺失） | 小 | P1 |
| P3: Windows 路径剥离盲区（immutable bypass 风险） | A/B | 78% | 高（红线绕过） | 小 | P1 |
| P4: Codex review 重复触发（cost cap 未初始化） | E | 75% | 低（cost 效率） | 极小 | P2 |
| P6: Rollout items 错误导致结论重复 | A/E | 72% | 低（日志质量） | 小 | P2 |

---

## 冷却总览

EVOLUTION-LOG.md 确认：2026-05 | 0 patterns detected | bootstrap — 所有 6 个 pattern 均为首次提议，无冷却约束。
