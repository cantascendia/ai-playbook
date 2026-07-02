# EVOLUTION-PROPOSAL — 飞轮第 7-8 轮 Multi-Agent Team 迭代

> 触发：用户 "创建多 agent teams 团队互相讨论，从源头重新审查，迭代更新 playbook"
> 日期：2026-05-29
> Team: playbook-iteration（architect-critic + redundancy-hunter + sota-researcher + team-lead）
> 方法：3 teammate 并行深审 + 互相讨论（peer SendMessage）+ 网上 SOTA 调研 + team-lead 综合

## 综合发现（三方交叉验证后）

### 🔴🔴 已实施（本会话 P0）

| # | 发现 | 来源 | 状态 |
|---|---|---|---|
| 1 | test-lock/eval-gate Windows 路径静默失效（learned rule 警告但 v3.9.2 漏 sweep）| redundancy-hunter | ✅ 修 + normalize_paths 抽 common.sh + 27 项目（commit 68c08b3）|
| 2 | **v3.10.2 安全回归** — quote-stripping 打穿，psql/rm/aws 引号命令逃逸 | architect-critic | ✅ 修（commit a1d4c8a）|
| 3 | **_json_get 转义引号根因** — 无 jq(Win) 环境含引号命令被截断，所有 hook 漏检 | architect-critic 链 | ✅ 修 + 27 项目（commit a1d4c8a）|

### 🔴 P0 待实施（本 PR 继续）

| # | 发现 | 来源 | 方案 |
|---|---|---|---|
| 4 | 计数 SSOT 6+ 处漂移（命令 17/18/21/10/23 真实=23；agent 写 4 真实=5；eval 写 19 真实=33；hook 写 6 真实=10）| redundancy + architect | 建 docs/ai-cto/COUNTS.md 单一源 + 修各处引用 |
| 5 | 14 铁律全文重复 3 处（CLAUDE.md / templates/CLAUDE.md / INDEX.md）→ ACE context collapse | redundancy + sota + architect 三方 | CLAUDE.md 为唯一 SSOT；INDEX.md 改引用行号；templates 占位符注入 |
| 6 | **MCP 工具无 guardrail** — PreToolUse 只 match Bash，mcp__ Supabase execute_sql/delete_branch / Vercel / fs 绕过 destructive/bypass guard | architect P0-3 + sota OWASP ASI | settings.json PreToolUse 加 mcp__ matcher → mcp-guard.sh |

### 🟠 P1 待实施（v3.11 第二批）

| # | 发现 | 来源 | 方案 |
|---|---|---|---|
| 7 | 铁律 #12 eval 空壳（eval-runner 不真跑 Claude，CI 只 count yaml + assert 字段存在）= §32.5 反模式 #6 eval-gaming | architect P0-1 + redundancy 双确认 | 诚实降级措辞（v3.11）+ 真 executor promptfoo/braintrust（v4.0）|
| 8 | 补铁律 #15「破坏性动作需确认 / 最小权限」（destructive-guard 无对应铁律）| architect P1-5 | CLAUDE.md 加 #15 + 1:1 绑 destructive-action-guard |
| 9 | 三规则 rules/*.md 瘦身为指针表（省 ~360 行重复加载，60-70% context 阈值）| redundancy P1 + sota C | rules/*.md ≤15 行指针；完整 how-to 留 skill |
| 10 | cto-review + cto-cross-review 合并 `cto-review [--cross]`（已验证 §48 桥零依赖该 command）| redundancy + architect 双确认 | 合并人工入口，自动桥不变 |
| 11 | 飞轮改 append-only delta（ACE 防 context collapse — handbook/CLAUDE.md 别整篇重写）| sota B (ACE 2510.04618) | EVOLUTION-LOG/STATUS 已是 append；handbook 改 incremental |

### 🟡 P2 待实施（v3.11 第三批 / v4.0）

| # | 发现 | 来源 |
|---|---|---|
| 12 | handbook 4287 行拆 4 册（core §1-17 / practices §18-31 / constitution §32-37 / advanced §38-50）+ §49 缺号 | architect P1-8 |
| 13 | §17.3 doc 模板（~260 行）外置到 templates/ | architect |
| 14 | 5 skill 跨平台字节级重复 → 单源构建期同步 | redundancy P2 |
| 15 | sub-agent 文件末尾"自辩 prose"改 manifest 声明 | architect + redundancy |
| 16 | OWASP ASI04 skill/MCP 签名校验 + ASI06 memory poisoning 完整性 + ASI07 inter-agent 认证 | sota A |
| 17 | AAIF / AGENTS.md spec 合规声明 | sota D |
| 18 | /cto-replay 升级真 checkpoint/time-travel | sota v4.0 |

## ai-playbook 被 SOTA 验证为领先的设计（不动）

- 铁律 #12 无 eval 不进 main = DGM evaluator-grounded 工程化（虽 eval 执行层待补）
- learned-rules Bugbot 模式 = 业界共识（active=4 < 30 阈值，无沉积，§50 飞轮健康）
- handbook-search INDEX 按需加载 = Skills 渐进披露
- 三平台路由委派 = 五大厂编排收敛雏形
- /cto-replay + /cto-canary = trajectory 重放 + canary

## 飞轮迭代价值实证（第 7-8 轮）

| 轮 | 发现机制 | 关键 |
|---|---|---|
| 7 | redundancy-hunter | test-lock/eval-gate Windows bug（learned rule 漏 sweep 第 3 次）|
| 8 | architect-critic | **v3.10.2 安全回归**（单 critic 即写 quote-stripping 的我自己发现不了）|

**核心结论**：multi-agent 交叉审 > 单 critic 自审。architect-critic 抓到我上轮引入的安全回归，追根因到 _json_get 转义 bug —— 这是 Reflexion + MAR「多 critic 防幻觉/防盲区」设计的最强实证。

## 实施批次

- **批 1（本会话已完成）**：#1 #2 #3 安全修复
- **批 2（本 PR 继续）**：#4 计数 SSOT + #5 14 铁律去重 + #6 MCP guardrail
- **批 3（v3.11 后续 PR）**：#7-#11
- **批 4（v4.0）**：#12-#18
