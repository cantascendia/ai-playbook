# Cross-Model Review Queue

> 由 §48 codex-bridge skill 写入。每条记录 Codex (gpt-5.5) 跨模型评审结果，下次会话 SessionStart hook 自动加载。

---

## 2026-04-29 — Codex review for de3a019 (v3.5 commit)

**Mode**: `codex review --commit HEAD` (CLI 0.125.0, gpt-5.5, read-only sandbox)
**Title**: smoke test - v3.5 README changes
**Status**: ✅ success — 真实发现 3 个 bug（含 1 个 P1 安全）
**Triggered by**: 手动 smoke test（首次端到端验证 §48 链路）

### 总体评价

> The patch introduces workflows and hooks that are meant to automate review, but one workflow permits PR-body shell injection, the Codex review workflow skips configured secrets, and the Stop hook only prints a trigger message without running the review. These are functional and security regressions in the new automation.

### Findings

#### 🔴 [P1] Avoid interpolating PR body into shell

**位置**：`.github/workflows/llm-judge.yml:43`
**问题**：For PRs whose description contains shell syntax such as `$(...)`, this line is expanded directly into the generated bash script before execution, so an untrusted PR author can run arbitrary commands in the workflow while the description length check runs.
**修复建议**：Pass the body through an environment variable or a file instead of embedding `${{ github.event.pull_request.body }}` inside shell code.
**状态**：✅ 已修复（commit 待 push）— PR_BODY 通过 env 传入

#### 🟠 [P2] Make the secret visible to the step condition

**位置**：`.github/workflows/codex-review.yml:49-51`
**问题**：When only `OPENAI_API_KEY` is configured, this condition still evaluates as if the key is empty because the variable is assigned in this same step's `env` block, which is not available to the step-level `if` expression. As a result, the Codex review step is skipped and the skip notice runs even though the secret exists.
**修复建议**：Set the secret at job/workflow env scope or compute an output in a prior step.
**状态**：✅ 已修复 — secret 移到 job-level env + 加 detect step 输出 available bool

#### 🟠 [P2] Trigger the bridge instead of only printing a message

**位置**：`.claude/settings.json:123`
**问题**：For source changes that satisfy this predicate, the Stop hook only echoes that cross-review was triggered; it never invokes the `codex-bridge` skill, CLI, MCP server, or any background process. Users will see a success-like message but `docs/ai-cto/REVIEW-QUEUE.md` will not be produced, so the advertised automatic cross-review path is a no-op.
**修复建议**：Wire the hook to the codex-bridge skill (CLI / MCP) so review actually runs.
**状态**：✅ 已修复 — 新增 `.agents/skills/codex-bridge/run.sh` 实际调 `codex review --commit`，Stop hook 改为 `bash .agents/skills/codex-bridge/run.sh HEAD`

### Acceptance（CTO 决策）

- ✅ 接受全部 3 条 — gpt-5.5 一针见血，每条都是真实 bug
- 修复后将再跑一次 review 验证

### 元数据

- Session ID: `019dd8c3-b746-7090-80a9-292b08c56e80`
- Output 71.5 KB
- Approval mode: never (read-only sandbox)
- Reasoning: medium
- 用 ChatGPT 订阅认证（不需 API key）

---

## 2026-04-29T20:04:09+09:00 — Review for c6db520
**Reviewer**: claude-fallback-opus | **Mode**: fallback-to-claude

> ⚠️ Codex 额度耗尽（1h 冷却中），本次由 Claude 完成。**失去跨模型价值**（Claude 自审有相同认知偏差）。建议恢复 codex 配额后重跑 `/cto-cross-review`。

```markdown
## 八维评审报告 — `c6db520`

> `test: v3.6 sandbox for fallback verify` — 新增 `src/sandbox/example.ts`（4 行）

| 维度 | 评级 | 发现 |
|---|---|---|
| **架构** | ✅ | sandbox 隔离目录，不影响主模块，无耦合风险 |
| **代码质量** | 🔴 Critical | L3: `return a - b` — 函数名 `add` 但实现是减法。**故意植入的 bug**（注释已标明），但若此文件被误引用即为生产缺陷 |
| **性能** | ✅ | 纯算术函数，无性能问题 |
| **安全** | ✅ | 无 I/O、无外部依赖、无敏感路径 |
| **测试** | ⚠️ | 无配套单元测试。作为"测试 sandbox"文件，自身反而没有 test case 验证 `add(2,3) === 5` 的预期行为 |
| **DX** | ⚠️ | L1 注释说明了意图（故意 bug），但 commit message 未提及这是**红队/canary 测试**用途，后续维护者看 git log 无法判断是否该修 |
| **功能完整性** | ✅ | sandbox 范围内，功能本身就是验证用途，scope 合理 |
| **UX** | ✅ | 非用户可见路径，不适用 |

### 汇总

| 级别 | 数量 | 关键项 |
|---|---|---|
| 🔴 Critical | 1 | `add` 实现为减法（L3），需确保 `src/sandbox/` 在 tsconfig `exclude` 或 `.npmignore` 中，防止被打包 |
| ⚠️ Warning | 2 | 缺配套测试；commit message 缺意图说明 |
| ✅ Pass | 5 | 架构 / 性能 / 安全 / 功能 / UX |

### 建议

1. 🔴 确认 `src/sandbox/` 已被 `tsconfig.json` 的 `exclude` 排除——否则 `import { add } from './sandbox/example'` 可被自动补全引入生产代码
2. 🟡 补一个 `src/sandbox/example.test.ts`，断言 `add(2,3)` 应返回 `5`（这样 fallback reviewer 的检测能力才能被量化验证）
3. 🟡 commit message 建议改为 `test: add intentional-bug sandbox for cross-review fallback verify`，让 git log 自解释
```

---
