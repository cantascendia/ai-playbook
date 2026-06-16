# AI Playbook

个人用的 **Claude Code 安全带 + 项目记忆套件**：装到自己的项目里，让 Claude Code 自动开发时
**不闯祸**（red-line hooks 硬拦截）、**记得住**（docs/ai-cto/ 项目记忆）、**审得到**（跨模型 review）。

> 这不是面向公众的产品，是单一维护者跨自己 ~27 个项目复用的一套 enforcement + 记忆基座。
> 真实计数永远以 `docs/ai-cto/COUNTS.md` 为准（`bash scripts/check-counts.sh` 校验），README 不再硬写数字。

---

## 它实际是什么

去掉叙事，核心是三层：

1. **红线层（enforcement）** — `.claude/hooks/*.sh` 一组 `exit-2` / `permissionDecision:deny` 硬拦截 guard：
   改 CONSTITUTION/14 铁律、碰 forbidden 路径（auth/payment/secrets/...）、`rm -rf /` 类灾难命令、
   MCP 删库、改锁定测试断言 —— 都被拦。配 `scripts/run-evals.sh` 行为型 eval 真跑验证（铁律 #12）。
2. **记忆层** — `docs/ai-cto/`（CONSTITUTION / STATUS / DECISIONS / EVOLUTION-LOG）+ `.claude/rules/learned/`
   Bugbot 式教训沉淀，SessionStart 自动恢复，跨会话不失忆。
3. **指挥层（可选）** — `/cto-*` 斜杠命令（spec-driven / review / release / constitution / eval / evolve 等）
   + handbook（数千行规约，按需 grep 精读，不全塞上下文）。

---

## 装到一个项目

```bash
# 1. clone 本仓库到推荐位置（跨机器一致）
git clone https://github.com/cantascendia/ai-playbook ~/.claude/playbook

# 2. 在本仓库里跑安装器，指向目标项目
/cto-init /path/to/your-project                 # 默认 full 档（仅 Claude Code 配置）
/cto-init /path/to/your-project --profile=minimal   # 小项目：安全 hook + 核心命令
/cto-init /path/to/your-project --with-codex        # 额外装 §48 codex 跨模型 review
```

- **平台范围**：默认只分发 Claude Code 配置；Antigravity / Codex 用 `--with-antigravity` / `--with-codex` opt-in（§49）。
- **跨机器**：换电脑后 `/cto-link` 自动重新发现 ai-playbook 路径（§29.8）。
- 装完即跑 `/cto-doctor` 端到端验证红线真生效。

## 验证装对了

```bash
bash scripts/check-counts.sh                 # 计数 vs 文件系统一致（CI gate）
bash scripts/run-evals.sh                    # 行为型 eval 真跑（hook 红线 / guard）
ls .claude/hooks/*.sh                         # 应见 5 个安全红线 guard：immutable/forbidden/branch/destructive-action/mcp
```

`/cto-doctor` 会模拟 stdin JSON 喂给每个 hook，验证 `exit-2` / deny 真拦截（不是 silent no-op）。

---

## 关键文件

| 路径 | 内容 |
|---|---|
| `CLAUDE.md` | CTO 系统提示词 + 14 铁律（4 层优先级 L1 安全>L2 治理>L3 质量>L4 效率）|
| `playbook/handbook.md` | 完整规约 §1-§50（按需 grep 定位，见 `playbook/INDEX.md`）|
| `playbook/INDEX.md` | 章节语义索引（grep 运行时定位，不含硬编码行号）|
| `docs/ai-cto/CONSTITUTION.md` | 不可妥协约束（immutable-guard 守护，amend 需人授权）|
| `docs/ai-cto/COUNTS.md` | 组件计数唯一权威源 |
| `.claude/hooks/` | 红线 enforcement guard + `lib/common.sh` |
| `evals/golden-trajectories/` | 行为型可执行 eval（真跑）|
| `docs/test-plans/` | trajectory 类规约（无 vc，需人工/Claude 周期验证）|

## 设计原则（为什么长这样）

- **三层 enforcement**：hook 硬拦截（exit-2/deny）+ paths-triggered skill 自动加载 + outputStyle 行为约束。纯 prompt 规则不够（Anthropic issue #40117：Claude 6 次绕过 pre-commit）。
- **Constitution-Anchored**：AI 不得单方面改 14 铁律 / CONSTITUTION（OWASP ASI10 Rogue Agent 防护），amend 走人授权 + audit log。
- **Eval 即 fitness**：agent 配置改动须配可执行 eval（铁律 #12），CI 真跑不是数 yaml。
- **诚实优于营销**：计数引 SSOT、飞轮标 bootstrap、LLM-judge 是建议非阻断、trajectory 规约不冒充自动 eval。

License: MIT · Dogfooded on itself（用自己的 playbook 管理自己）
