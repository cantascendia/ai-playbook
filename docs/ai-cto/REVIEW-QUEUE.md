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
