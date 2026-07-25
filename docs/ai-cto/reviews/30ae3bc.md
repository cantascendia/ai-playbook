# §48 跨模型 Review — 30ae3bc
**2026-07-25T10:35:23+09:00** · Reviewer: codex-gpt-5.6-sol · Mode: success

2026-07-25T01:35:24.725414Z ERROR codex_models_manager::cache: failed to load models cache: missing field `supports_reasoning_summaries` at line 88 column 5
OpenAI Codex v0.144.1
--------
workdir: C:\projects\ai-playbook
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR]
reasoning effort: low
reasoning summaries: none
session id: 019f96e9-b085-7e91-b14f-527e722fe328
--------
user
commit 30ae3bc: ai-playbook §48 cross-model review
warning: Skill descriptions were shortened to fit the 2% skills context budget. Codex can still see every skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for the rest.
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short; git show --stat --oneline --decorate --no-renames 30ae3bc5752f3ecede931bab0252a9339ac2a4cb; git show --format=fuller --no-ext-diff --unified=80 30ae3bc5752f3ecede931bab0252a9339ac2a4cb' in C:\projects\ai-playbook
 succeeded in 957ms:
 M docs/ai-cto/CODEX-REVIEW-LOG.md
30ae3bc (HEAD -> main, origin/main, origin/HEAD) fix(v4.6): pin CLI model invocation — codex/agy no longer drift with client config defaults (#68)
 .agents/skills/codex-bridge/run.sh                 | 27 +++++---
 docs/ai-cto/CODEX-REVIEW-LOG.md                    |  8 +++
 docs/ai-cto/COUNTS.md                              |  2 +-
 docs/ai-cto/REVIEW-QUEUE.md                        | 13 ++++
 docs/ai-cto/reviews/40615bf.md                     | 80 ++++++++++++++++++++++
 .../golden-trajectories/087-model-lineup-v4.5.yaml |  5 +-
 .../golden-trajectories/088-cli-model-pinning.yaml | 56 +++++++++++++++
 playbook/handbook.md                               |  4 +-
 scripts/agy-delegate.sh                            | 25 ++++---
 scripts/codex-delegate.sh                          | 12 ++--
 10 files changed, 207 insertions(+), 25 deletions(-)
commit 30ae3bc5752f3ecede931bab0252a9339ac2a4cb
Author:     Unflight <121331723+cantascendia@users.noreply.github.com>
AuthorDate: Sat Jul 25 10:31:53 2026 +0900
Commit:     GitHub <noreply@github.com>
CommitDate: Sat Jul 25 10:31:53 2026 +0900

    fix(v4.6): pin CLI model invocation — codex/agy no longer drift with client config defaults (#68)
    
    * fix(v4.6): pin CLI model invocation — codex/agy no longer drift with client config defaults
    
    Root cause: `codex review` / `codex exec` without explicit model eat
    ~/.codex/config.toml default, which the desktop client rewrites (this
    machine: gpt-5.6-terra). codex-bridge then reviewed with terra while
    hardcoding REVIEWER label "codex-gpt5.6-sol" — label forgery. agy
    fallback had no default model, no --print-timeout (hang risk), and
    died entirely when agy sat in WinGet\Links but off the parent PATH.
    
    Fixes (all live-probed 2026-07-24):
    - codex-bridge/run.sh: `codex review -c model=$CODEX_REVIEW_MODEL`
      (default gpt-5.6-sol); REVIEWER label derived from actual model;
      agy fallback defaults gemini-3.6-flash-high + --print-timeout +
      WinGet Links AGY_BIN fallback probe
    - scripts/codex-delegate.sh: explicit `-m` (CODEX_MODEL default
      gpt-5.6-sol); telemetry records actual model, not a literal
    - scripts/agy-delegate.sh: default gemini-3.6-flash-high (dash-form
      ID — agy 1.1.5 rejects space-form strings) + AGY_BIN fallback
    - handbook §48.5.1: fix dead space-form model string example
    - eval 088 added (17 assertions); eval 087 assertion updated for
      derived REVIEWER label (spec change, default tier still sol);
      COUNTS 65→66; full suite 66 PASS / 0 FAIL
    
    Verified: codex exec -m gpt-5.6-sol 10.4s OK; agy --model
    gemini-3.6-flash-high 9.3s OK; both delegate wrappers e2e OK with
    correct telemetry model labels.
    
    Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
    
    * chore(audit): dual cross-model review artifacts for 40615bf (codex sol + agy gemini-3.6-flash, PR #68)
    
    Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
    
    ---------
    
    Co-authored-by: Claude Opus 4.8 <noreply@anthropic.com>

diff --git a/.agents/skills/codex-bridge/run.sh b/.agents/skills/codex-bridge/run.sh
index 24ee0dc..5ec14d8 100644
--- a/.agents/skills/codex-bridge/run.sh
+++ b/.agents/skills/codex-bridge/run.sh
@@ -37,222 +37,233 @@ if ! mkdir "$LOCK_DIR" 2>/dev/null; then
 fi
 trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT INT TERM
 
 TARGET="${1:-HEAD}"
 SHA=$(git rev-parse "$TARGET" 2>/dev/null)
 SHORT_SHA=$(echo "$SHA" | cut -c1-7)
 
 # safe-grep：grep 退出码 0=match, 1=no-match, 2+=real error（避免静默吞错）
 SAFE_GREP="$REPO_ROOT/scripts/safe-grep.sh"
 [ ! -x "$SAFE_GREP" ] && SAFE_GREP=""
 
 run_grep() {
   if [ -n "$SAFE_GREP" ]; then
     bash "$SAFE_GREP" "$@"
   else
     grep "$@" || true
   fi
 }
 
 # 1. Forbidden 路径过滤（SSOT 来自 scripts/forbidden-paths.txt）
 SSOT="scripts/forbidden-paths.txt"
 if [ -f "$SSOT" ]; then
   PATTERN=$(grep -v '^#' "$SSOT" | grep -v '^$' | tr '\n' '|' | sed 's/|$//')
 elif command -v forbidden_fallback_pattern >/dev/null 2>&1; then
   PATTERN="$(forbidden_fallback_pattern)"  # v3.13 O7：单源（修旧版漏 billing/keys/terraform/.github）
 else
   PATTERN='auth/|payment/|billing/|secrets/|keys/|migration|crypto/|infra/|terraform/|\.github/workflows/'
 fi
 FORBIDDEN=$(git diff --name-only "${TARGET}~1" "${TARGET}" 2>/dev/null | run_grep -E "$PATTERN")
 
 if [ -n "$FORBIDDEN" ] && [ "${FORCE:-0}" != "1" ]; then
   echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=skipped-forbidden | reason=touched_${FORBIDDEN}" \
     >> docs/ai-cto/CODEX-REVIEW-LOG.md
   exit 0
 fi
 
 # 2. Business 路径过滤（SSOT 来自 scripts/business-paths.txt）
 BIZ_SSOT="scripts/business-paths.txt"
 if [ -f "$BIZ_SSOT" ]; then
   BIZ_PATTERN=$(grep -v '^#' "$BIZ_SSOT" | grep -v '^$' | sed 's|^|^|' | tr '\n' '|' | sed 's/|$//')
 else
   BIZ_PATTERN='^(src|app|lib|apps|packages)/'
 fi
 DIFF_FILES=$(git diff --name-only "${TARGET}~1" "${TARGET}" 2>/dev/null)
 BUSINESS=$(echo "$DIFF_FILES" | run_grep -E "$BIZ_PATTERN")
 
 # v3.13 O4（SOTA team 审计）：安全/enforcement 相关改动必审，绝不当"non-business"跳过。
 # 旧 bug：BIZ_PATTERN 只认 src/app/lib，把 .claude/hooks（红线 guard）判 non-business →
 # v3.10–v3.12 全部安全改动自 2026-05-12 起零跨模型审 18 天。系统最核心的"跨模型防盲区"在
 # 最高风险改动上空转。修：SECURITY_PATTERN 命中即视为 review-worthy（business OR security）。
 SECURITY_PATTERN='^\.claude/hooks/|^\.claude/commands/|^\.claude/skills/|^\.agents/skills/|^scripts/|^CLAUDE\.md$|^playbook/handbook\.md$|^docs/ai-cto/CONSTITUTION\.md$|^\.claude/settings\.json$'
 SECURITY=$(echo "$DIFF_FILES" | run_grep -E "$SECURITY_PATTERN")
 
 if [ -z "$BUSINESS" ] && [ -z "$SECURITY" ] && [ "${FORCE:-0}" != "1" ]; then
   echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=skipped-non-business | reason=docs_or_config_only_no_security" \
     >> docs/ai-cto/CODEX-REVIEW-LOG.md
   exit 0
 fi
 # 记录触发原因（business / security / both）便于审计
 [ -n "$SECURITY" ] && echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=review-triggered | reason=security_relevant_change" \
   >> docs/ai-cto/CODEX-REVIEW-LOG.md
 
 # 3. Debounce：同 commit 不重复 review
 # PR #11 重放（2026-07-10）：任何「成功落 review」的模式都算已审 —— codex 成功(success) /
 # claude 补位(claude-only / fallback-to-claude)。只认 success 时 codex 配额耗尽走 fallback 后
 # 同 SHA 会被反复重审（实证：CODEX-REVIEW-LOG 里 ba74d2a 记了 16 次）。
 # 边界：codex-failed+claude-failed **不算**已审（没落 review，应允许下次重试）。
 if [ -f docs/ai-cto/CODEX-REVIEW-LOG.md ] && \
    grep -qE "sha=${SHORT_SHA}\b.*mode=(success|claude-only|fallback-to-claude|agy-only|fallback-to-agy)" docs/ai-cto/CODEX-REVIEW-LOG.md 2>/dev/null; then
   echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=skipped-debounce | reason=already_reviewed" \
     >> docs/ai-cto/CODEX-REVIEW-LOG.md
   exit 0
 fi
 
 # 4. 检测 codex / agy / claude / gh 可用性
 HAS_CODEX=0
 HAS_AGY=0
 HAS_CLAUDE=0
 HAS_GH=0
 command -v codex >/dev/null 2>&1 && HAS_CODEX=1
-command -v agy >/dev/null 2>&1 && HAS_AGY=1
+# agy PATH 兜底（v4.6）：winget 装到 WinGet\Links，父进程在安装前启动时 PATH 里没有 →
+# command -v 找不到但二进制真实存在。兜底探测 Links 目录（LOCALAPPDATA 仅 Windows 有，POSIX 下跳过）。
+AGY_BIN="agy"
+if command -v agy >/dev/null 2>&1; then
+  HAS_AGY=1
+elif [ -n "${LOCALAPPDATA:-}" ]; then
+  for cand in "$LOCALAPPDATA/Microsoft/WinGet/Links/agy.exe" "$LOCALAPPDATA/Microsoft/WinGet/Links/agy"; do
+    [ -x "$cand" ] && AGY_BIN="$cand" && HAS_AGY=1 && break
+  done
+fi
 command -v claude >/dev/null 2>&1 && HAS_CLAUDE=1
 command -v gh >/dev/null 2>&1 && HAS_GH=1
 
 # 4a. Codex 配额冷却
 COOLDOWN_FILE="docs/ai-cto/.codex-quota-cooldown"
 SKIP_CODEX=0
 if [ -f "$COOLDOWN_FILE" ]; then
   COOLDOWN_TS=$(cat "$COOLDOWN_FILE" 2>/dev/null || echo 0)
   NOW=$(date +%s 2>/dev/null || echo 0)
   if [ "$NOW" -gt 0 ] && [ "$COOLDOWN_TS" -gt 0 ] && [ $((NOW - COOLDOWN_TS)) -lt 3600 ]; then
     SKIP_CODEX=1
   fi
 fi
 
 if [ "$HAS_CODEX" = "0" ] && [ "$HAS_AGY" = "0" ] && [ "$HAS_CLAUDE" = "0" ]; then
   echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=ci_pending | reason=no_local_reviewer" \
     >> docs/ai-cto/CODEX-REVIEW-LOG.md
   exit 0
 fi
 
 # 5. 异步跑 review + PR sync
 {
   TS=$(date -Iseconds 2>/dev/null || date)
   REVIEWER=""
   MODE=""
   FAIL_CHAIN=""   # v4.4d FIX4: 保留 codex/agy 真实失败链（fallback 时不丢，防"claude-only 假诊断"掩盖复发 bug）
   OUTPUT=""
   STATUS=1
 
   # 5a. 主路径：codex review
+  # v4.6 模型固定：不再吃 ~/.codex/config.toml 默认（桌面端会把它改成 terra 等其他档）——
+  # review 档位显式钉死 gpt-5.6-sol（可 env 覆盖），REVIEWER 标签取实际模型（不再硬编码假标签）。
+  CODEX_REVIEW_MODEL="${CODEX_REVIEW_MODEL:-gpt-5.6-sol}"
   if [ "$HAS_CODEX" = "1" ] && [ "$SKIP_CODEX" = "0" ]; then
-    OUTPUT=$(codex review --commit "$SHA" --title "ai-playbook §48 cross-model review" 2>&1)
+    OUTPUT=$(codex review -c model="$CODEX_REVIEW_MODEL" --commit "$SHA" --title "ai-playbook §48 cross-model review" 2>&1)
     STATUS=$?
     if [ $STATUS -eq 0 ]; then
-      REVIEWER="codex-gpt5.6-sol"   # v4.5: Codex 客户端 2026-07-06 起 GPT-5.6 Sol（WebSearch 验证）
+      REVIEWER="codex-${CODEX_REVIEW_MODEL}"   # v4.6: 标签=实际调用模型（cost gate 用 codex- 前缀匹配，不受影响）
       MODE="success"
     elif echo "$OUTPUT" | grep -qiE "(rate.?limit|quota|exceeded|insufficient|usage.?limit|429|402)"; then
       echo "$(date +%s 2>/dev/null || echo 0)" > "$COOLDOWN_FILE"
       MODE="codex-quota-exhausted"
       STATUS=99
     else
       MODE="codex-failed"
     fi
   fi
 
   # 5a2. Fallback 到 Antigravity CLI（agy · Gemini）— v4.4：跨模型价值保留档
   # codex(GPT) 不可用时先走 agy(Gemini) 再走 claude —— Gemini ≠ GPT ≠ Claude，
   # agy 补位仍是跨模型审；claude 补位才是「失去跨模型价值」的最后档。
   # 自包含 prompt（diff 直接贴入）：print 模式无交互授权，不能让 agent 自己跑 git。
+  # v4.6 模型固定：默认 gemini-3.6-flash-high（dash 形式 ID，agy 1.1.5 实测有效；
+  # 空格形式 "Gemini 3.1 Pro (High)" 会被拒绝）。加 --print-timeout 防 print 模式无限挂起。
+  AGY_REVIEW_MODEL="${AGY_REVIEW_MODEL:-gemini-3.6-flash-high}"
   if [ -z "$REVIEWER" ] && [ "$HAS_AGY" = "1" ]; then
     DIFF_CONTENT=$(git show --stat --patch "$SHA" 2>/dev/null | head -c 60000)
     AGY_PROMPT="你是跨模型代码审阅者。按八维（架构/代码质量/性能/安全/测试/DX/功能完整性/UX）逐条 ✅⚠️🔴 + 文件:行号 评审以下 commit ${SHORT_SHA} 的 diff。仅输出 markdown 报告，不要调用任何工具、不要读文件。
 报告**最后单独一行**输出机器可解析的严重度汇总（n 为你本次实际判定的各级问题数，非格式范例）：
 SEVERITY_SUMMARY: P0=<n> P1=<n> P2=<n>
 
 ${DIFF_CONTENT}"
-    if [ -n "${AGY_REVIEW_MODEL:-}" ]; then
-      AGY_OUTPUT=$(agy -p "$AGY_PROMPT" --model "$AGY_REVIEW_MODEL" </dev/null 2>&1)
-    else
-      AGY_OUTPUT=$(agy -p "$AGY_PROMPT" </dev/null 2>&1)
-    fi
+    AGY_OUTPUT=$("$AGY_BIN" -p "$AGY_PROMPT" --model "$AGY_REVIEW_MODEL" --print-timeout "${AGY_PRINT_TIMEOUT:-5m}" </dev/null 2>&1)
     AGY_STATUS=$?
     if [ $AGY_STATUS -eq 0 ] && [ -n "$AGY_OUTPUT" ]; then
       OUTPUT="$AGY_OUTPUT"
       REVIEWER="agy-gemini"
       if [ "$MODE" = "codex-quota-exhausted" ] || [ "$SKIP_CODEX" = "1" ]; then
         MODE="fallback-to-agy"
       else
         MODE="agy-only"
       fi
       STATUS=0
     else
       MODE="${MODE:+${MODE}+}agy-failed"
     fi
   fi
 
   # 5b. Fallback 到 Claude
   if [ -z "$REVIEWER" ] && [ "$HAS_CLAUDE" = "1" ]; then
     PROMPT="按手册 §10.5 八维评审 commit ${SHORT_SHA} 的改动。先用 Bash 跑 'git show ${SHA}' 看 diff，再按八维（架构/代码质量/性能/安全/测试/DX/功能/UX）逐条 ✅⚠️🔴 + 行号。仅输出 markdown 报告，不修改任何文件。报告最后单独一行输出机器可解析的严重度汇总（n 为你实际判定的各级问题数）：SEVERITY_SUMMARY: P0=<n> P1=<n> P2=<n>"
     CLAUDE_OUTPUT=$(claude -p "$PROMPT" --max-turns 5 2>&1)
     CLAUDE_STATUS=$?
     if [ $CLAUDE_STATUS -eq 0 ]; then
       OUTPUT="$CLAUDE_OUTPUT"
       REVIEWER="claude-fallback-opus"
       # v4.4d FIX4: codex/agy **真报错**也算 fallback（不只配额）——旧逻辑只认 quota/SKIP，
       # codex-failed / agy-failed 一律落 claude-only → PR comment 输出"codex 未装"假诊断掩盖复发 bug。
       # 放宽判定：MODE 含 codex-quota-exhausted / codex-failed / agy-failed 或 SKIP_CODEX=1 → fallback-to-claude。
       # 保留原始失败链到 FAIL_CHAIN（另存变量，不污染 MODE，避免破坏下游 [ "$MODE" = "fallback-to-claude" ] 等值判定）。
       if echo "$MODE" | grep -qE "codex-quota-exhausted|codex-failed|agy-failed" || [ "$SKIP_CODEX" = "1" ]; then
         FAIL_CHAIN="$MODE"
         MODE="fallback-to-claude"
       else
         MODE="claude-only"   # 真·从未试 codex/agy（都未装/未登录）—— 唯一诚实的 claude-only
       fi
       STATUS=0
     else
       MODE="${MODE}+claude-failed"
     fi
   fi
 
   # 6. 写 review（仅成功）—— v4.4c 防膨胀：全文 → reviews/<sha>.md（lineage 保全），
   #    REVIEW-QUEUE.md 只留摘要 + 严重度计数 + 指针（原实现每次 append 全量八维报告，
   #    单 PR 曾 +2683 行 → 341KB，SessionStart 注入/人工审阅/pattern-detector 扫描全受累）。
   if [ $STATUS -eq 0 ] && [ -n "$OUTPUT" ]; then
     mkdir -p docs/ai-cto/reviews
     REVIEW_FILE="docs/ai-cto/reviews/${SHORT_SHA}.md"
     {
       echo "# §48 跨模型 Review — $SHORT_SHA"
       echo "**$TS** · Reviewer: $REVIEWER · Mode: $MODE"
       echo ""
       echo "$OUTPUT"
     } > "$REVIEW_FILE"
     git add "$REVIEW_FILE" 2>/dev/null || true   # v4.4d FIX2: 入 git，否则 reviews/<sha>.md 永远 untracked → Sakana lineage 断链（软失败，非 git 仓/无权限不阻断）
     # 严重度计数（v4.4d FIX1 反污染）：从 reviewer 输出的机器可解析 SEVERITY_SUMMARY 行解析，
     # **不再扫全文 emoji** —— 旧 bug：codex transcript 把 SKILL.md/handbook 里的 ✅⚠️🔴 格式范例原样回显，
     # 全文 grep 计出 🔴51 等虚高危（29b4932 实证：写 🔴51/🟠43/🟡42，codex 真结论仅 4×P1+12×P2 零 Critical）。
     # 取**最后一条** SEVERITY_SUMMARY（reviewer 终判，非文中范例）。
     SEV_LINE=$(printf '%s' "$OUTPUT" | grep -oE 'SEVERITY_SUMMARY:[[:space:]]*P0=[0-9]+[[:space:]]+P1=[0-9]+[[:space:]]+P2=[0-9]+' | tail -1)
     if [ -n "$SEV_LINE" ]; then
       # sed 捕获组只取 =后的值（不能用 grep -oE '[0-9]+'：会连 P0/P1/P2 标签里的 0/1/2 一起抓 → 多行污染）
       R_CRIT=$(printf '%s' "$SEV_LINE" | sed -nE 's/.*P0=([0-9]+).*/\1/p')   # P0→🔴
       R_MAJ=$(printf '%s' "$SEV_LINE" | sed -nE 's/.*P1=([0-9]+).*/\1/p')    # P1→🟠
       R_MIN=$(printf '%s' "$SEV_LINE" | sed -nE 's/.*P2=([0-9]+).*/\1/p')    # P2→🟡
       SEV_NOTE=""
     else
       # 缺行（codex 主路径用自带 rubric / reviewer 没照做）：诚实标"未知"，绝不回退扫全文 emoji（那正是污染源）
       R_CRIT="?"; R_MAJ="?"; R_MIN="?"; SEV_NOTE="（见全文）"
     fi
     {
       echo ""
       echo "## $TS — Review for $SHORT_SHA"
       echo "**Reviewer**: $REVIEWER | **Mode**: $MODE | **判定**: 🔴 ${R_CRIT} / 🟠 ${R_MAJ} / 🟡 ${R_MIN}${SEV_NOTE}"
       if [ "$MODE" = "fallback-to-claude" ]; then
         echo "> ⚠️ 跨模型补位链未成功（\`${FAIL_CHAIN:-codex 不可用}\`），本次由 Claude 自审补位。**失去跨模型价值**（Claude 自审有相同认知偏差）。若 failchain 非额度耗尽，可能是复发 bug 需排查。"
       elif [ "$MODE" = "fallback-to-agy" ] || [ "$MODE" = "agy-only" ]; then
         echo "> ℹ️ 本次由 Antigravity CLI（Gemini）补位完成。**跨模型价值保留**（Gemini ≠ GPT ≠ Claude）。"
       fi
       echo "全文 → [reviews/${SHORT_SHA}.md](reviews/${SHORT_SHA}.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）"
       echo ""
       echo "---"
     } >> docs/ai-cto/REVIEW-QUEUE.md
diff --git a/docs/ai-cto/CODEX-REVIEW-LOG.md b/docs/ai-cto/CODEX-REVIEW-LOG.md
index 77bc956..2cc1c37 100644
--- a/docs/ai-cto/CODEX-REVIEW-LOG.md
+++ b/docs/ai-cto/CODEX-REVIEW-LOG.md
@@ -87,80 +87,88 @@ pull request create failed: GraphQL: No commits between main and fix/v3.14-live-
 2026-07-03T22:33:59+09:00 | sha=3321496 | mode=codex-failed+claude-failed | reviewer=none
 2026-07-03T22:32:11+09:00 | sha=3321496 | mode=claude-only | reviewer=claude-fallback-opus | bytes=5981
 2026-07-03T22:32:11+09:00 | sha=3321496 | step=pr-comment-check | pr=#43 | marker=<!-- codex-bridge:3321496 -->
 2026-07-03T22:32:11+09:00 | sha=3321496 | step=existing-check | found=0
 2026-07-03T22:32:11+09:00 | sha=3321496 | step=pr-comment-post | status=0 | out=https://github.com/cantascendia/ai-playbook/pull/43#issuecomment-4876854726 
 2026-07-03T22:32:11+09:00 | sha=3321496 | mode=pr-comment-posted | pr=#43
 2026-07-03T22:30:54+09:00 | sha=3321496 | mode=claude-only | reviewer=claude-fallback-opus | bytes=5283
 2026-07-03T22:30:54+09:00 | sha=3321496 | step=pr-comment-check | pr=#43 | marker=<!-- codex-bridge:3321496 -->
 2026-07-03T22:30:54+09:00 | sha=3321496 | step=existing-check | found=1
 2026-07-04T11:53:35+09:00 | sha=b9c2380 | mode=skipped-non-business | reason=docs_or_config_only_no_security
 2026-07-04T11:59:20+09:00 | sha=47bb8e4 | mode=review-triggered | reason=security_relevant_change
 2026-07-04T11:59:20+09:00 | sha=47bb8e4 | mode=codex-failed+claude-failed | reviewer=none
 2026-07-04T12:21:16+09:00 | sha=47bb8e4 | mode=review-triggered | reason=security_relevant_change
 2026-07-04T12:21:16+09:00 | sha=47bb8e4 | mode=codex-failed+claude-failed | reviewer=none
 2026-07-04T12:35:40+09:00 | sha=da6b48f | mode=review-triggered | reason=security_relevant_change
 2026-07-04T12:35:41+09:00 | sha=da6b48f | mode=codex-failed+claude-failed | reviewer=none
 2026-07-04T12:51:16+09:00 | sha=a41a88e | mode=review-triggered | reason=security_relevant_change
 2026-07-04T12:53:21+09:00 | sha=a41a88e | mode=review-triggered | reason=security_relevant_change
 2026-07-04T12:55:15+09:00 | sha=a41a88e | mode=review-triggered | reason=security_relevant_change
 2026-07-04T12:55:16+09:00 | sha=a41a88e | mode=codex-failed+claude-failed | reviewer=none
 2026-07-04T12:53:21+09:00 | sha=a41a88e | mode=claude-only | reviewer=claude-fallback-opus | bytes=5943
 2026-07-04T12:53:21+09:00 | sha=a41a88e | step=pr-comment-check | pr=#43 | marker=<!-- codex-bridge:a41a88e -->
 2026-07-04T12:53:21+09:00 | sha=a41a88e | step=existing-check | found=0
 2026-07-04T12:53:21+09:00 | sha=a41a88e | step=pr-comment-post | status=0 | out=https://github.com/cantascendia/ai-playbook/pull/43#issuecomment-4880556717 
 2026-07-04T12:53:21+09:00 | sha=a41a88e | mode=pr-comment-posted | pr=#43
 2026-07-04T12:51:16+09:00 | sha=a41a88e | mode=claude-only | reviewer=claude-fallback-opus | bytes=6767
 2026-07-04T12:51:16+09:00 | sha=a41a88e | step=pr-comment-check | pr=#43 | marker=<!-- codex-bridge:a41a88e -->
 2026-07-04T12:51:16+09:00 | sha=a41a88e | step=existing-check | found=1
 2026-07-04T13:07:05+09:00 | sha=e014895 | mode=review-triggered | reason=security_relevant_change
 2026-07-04T13:07:05+09:00 | sha=e014895 | mode=codex-failed+claude-failed | reviewer=none
 2026-07-14T23:28:49+09:00 | sha=cada49a | mode=review-triggered | reason=security_relevant_change
 2026-07-14T23:28:49+09:00 | sha=cada49a | mode=success | reviewer=codex-gpt5.5 | bytes=297490
 2026-07-14T23:53:54+09:00 | sha=cada49a | mode=review-triggered | reason=security_relevant_change
 2026-07-14T23:53:54+09:00 | sha=cada49a | mode=skipped-debounce | reason=already_reviewed
 2026-07-18T14:07:30+09:00 | sha=cada49a | mode=review-triggered | reason=security_relevant_change
 2026-07-18T14:07:30+09:00 | sha=cada49a | mode=skipped-debounce | reason=already_reviewed
 2026-07-18T14:50:06+09:00 | sha=387b046 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T14:43:49+09:00 | sha=9475768 | mode=success | reviewer=codex-gpt5.5 | bytes=469820
 2026-07-18T14:50:06+09:00 | sha=387b046 | mode=success | reviewer=codex-gpt5.5 | bytes=224241
 2026-07-18T15:14:57+09:00 | sha=29b4932 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T15:12:19+09:00 | sha=025edd3 | mode=success | reviewer=codex-gpt5.5 | bytes=201598
 2026-07-18T15:14:57+09:00 | sha=29b4932 | mode=success | reviewer=codex-gpt5.5 | bytes=157249
 2026-07-18T15:25:50+09:00 | sha=29b4932 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T15:25:50+09:00 | sha=29b4932 | mode=skipped-debounce | reason=already_reviewed
 2026-07-18T15:33:33+09:00 | sha=29b4932 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T15:33:34+09:00 | sha=29b4932 | mode=skipped-debounce | reason=already_reviewed
 2026-07-18T15:41:14+09:00 | sha=29b4932 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T15:41:14+09:00 | sha=29b4932 | mode=skipped-debounce | reason=already_reviewed
 2026-07-18T16:16:22+09:00 | sha=bc34809 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T16:16:22+09:00 | sha=bc34809 | mode=success | reviewer=codex-gpt5.5 | bytes=248418
 2026-07-18T16:14:10+09:00 | sha=f80913f | mode=success | reviewer=codex-gpt5.5 | bytes=228076
 2026-07-18T16:42:26+09:00 | sha=bc34809 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T16:42:26+09:00 | sha=bc34809 | mode=skipped-debounce | reason=already_reviewed
 2026-07-18T16:44:34+09:00 | sha=bc34809 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T16:44:34+09:00 | sha=bc34809 | mode=skipped-debounce | reason=already_reviewed
 2026-07-18T16:48:56+09:00 | sha=bc34809 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T16:48:56+09:00 | sha=bc34809 | mode=skipped-debounce | reason=already_reviewed
 2026-07-18T17:02:33+09:00 | sha=bc34809 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T17:02:33+09:00 | sha=bc34809 | mode=skipped-debounce | reason=already_reviewed
 2026-07-18T17:10:49+09:00 | sha=bc34809 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T17:10:49+09:00 | sha=bc34809 | mode=skipped-debounce | reason=already_reviewed
 2026-07-18T17:16:07+09:00 | sha=bc34809 | mode=review-triggered | reason=security_relevant_change
 2026-07-18T17:16:07+09:00 | sha=bc34809 | mode=skipped-debounce | reason=already_reviewed
 2026-07-22T23:01:49+09:00 | sha=46e6f9f | mode=review-triggered | reason=security_relevant_change
 2026-07-22T23:00:30+09:00 | sha=338e238 | mode=success | reviewer=codex-gpt5.6-sol | bytes=331041
 2026-07-22T23:01:49+09:00 | sha=46e6f9f | mode=success | reviewer=codex-gpt5.6-sol | bytes=775103
 2026-07-22T23:16:16+09:00 | sha=534ece8 | mode=review-triggered | reason=security_relevant_change
 2026-07-22T23:16:16+09:00 | sha=534ece8 | mode=success | reviewer=codex-gpt5.6-sol | bytes=1612772
 2026-07-22T23:15:34+09:00 | sha=0cbe00b | mode=success | reviewer=codex-gpt5.6-sol | bytes=559143
 2026-07-22T23:28:02+09:00 | sha=61a4c18 | mode=review-triggered | reason=security_relevant_change
 2026-07-22T23:28:02+09:00 | sha=61a4c18 | mode=success | reviewer=codex-gpt5.6-sol | bytes=1374012
 2026-07-22T23:27:23+09:00 | sha=3ddadcc | mode=success | reviewer=codex-gpt5.6-sol | bytes=2054465
 2026-07-16T16:24:10+09:00 | sha=ef1827c | mode=skipped-non-business | reason=docs_or_config_only_no_security
 2026-07-16T16:26:23+09:00 | sha=ef1827c | mode=skipped-non-business | reason=docs_or_config_only_no_security
 2026-07-16T16:23:57+09:00 | sha=72fb7e4 | mode=success | reviewer=codex-gpt5.5 | bytes=360735
 2026-07-16T16:23:57+09:00 | sha=72fb7e4 | step=pr-comment-check | pr=#59 | marker=<!-- codex-bridge:72fb7e4 -->
 2026-07-16T16:23:57+09:00 | sha=72fb7e4 | step=existing-check | found=0
 2026-07-16T16:23:57+09:00 | sha=72fb7e4 | step=pr-comment-post | status=1 | out=GraphQL: Body is too long (maximum is 65536 characters) (addComment) 
 2026-07-16T16:23:57+09:00 | sha=72fb7e4 | mode=pr-comment-failed | file=/tmp/codex-comment-72fb7e4.md
 2026-07-23T09:15:26+09:00 | sha=45139f5 | mode=skipped-non-business | reason=docs_or_config_only_no_security
+2026-07-24T08:55:23+09:00 | sha=e067e89 | mode=skipped-non-business | reason=docs_or_config_only_no_security
+2026-07-24T09:32:56+09:00 | sha=40615bf | mode=review-triggered | reason=security_relevant_change
+2026-07-24T09:32:56+09:00 | sha=40615bf | mode=success | reviewer=codex-gpt-5.6-sol | bytes=246027
+2026-07-24T09:32:56+09:00 | sha=40615bf | step=pr-comment-check | pr=#68 | marker=<!-- codex-bridge:40615bf -->
+2026-07-24T09:32:56+09:00 | sha=40615bf | step=existing-check | found=0
+2026-07-24T09:32:56+09:00 | sha=40615bf | step=pr-comment-post | status=0 | out=https://github.com/cantascendia/ai-playbook/pull/68#issuecomment-5064926299 
+2026-07-24T09:32:56+09:00 | sha=40615bf | mode=pr-comment-posted | pr=#68
+2026-07-24T09:39:05+09:00 | sha=40615bf | mode=success | reviewer=codex-gpt-5.6-sol+agy-gemini-3.6-flash-high | bytes=5016 | manual=pr68-dual-review
diff --git a/docs/ai-cto/COUNTS.md b/docs/ai-cto/COUNTS.md
index d5bc2a7..5d4e9fa 100644
--- a/docs/ai-cto/COUNTS.md
+++ b/docs/ai-cto/COUNTS.md
@@ -1,47 +1,47 @@
 # COUNTS — ai-playbook 组件计数 SSOT
 
 > 飞轮第 7 轮 redundancy-hunter 发现：命令数在 6+ 处不一致（17/18/21/10/23）。
 > 本文件是**唯一计数权威源**。README / CLAUDE.md / STATUS / handbook 引用本表，不硬写数字。
 > 改组件数量时**只**更新本文件。
 > ✅ **`scripts/check-counts.sh` 已实现并接入 CI**（v3.13 R1 交付，green）。
 > 它比对本表数字 vs 文件系统真实计数 + grep 散落数字一致性，不符即 `exit 1`。
 > 已 wired 进 `.github/workflows/eval.yml`（`chmod +x scripts/check-counts.sh && bash scripts/check-counts.sh`），
 > 每次触及 COUNTS/命令/子代理/hooks/技能/eval 集的 push/PR 自动跑，作为计数漂移的自动 enforcer 兜底。
 
 最后核实：2026-07-14（v4.3 hardening）
 
 | 组件 | 数量 | 位置 |
 |---|---|---|
 | cto-* commands | **18** | `.claude/commands/cto-*.md`（v3.14 23→18：合并 cross-review→review--cross / relink-all→link--all / refresh→resume--refresh / vibe-check+harness-audit→audit。**分发：minimal 8 / full 11 核心 / +6 advanced opt-in**）|
 | sub-agents | **5** | `.claude/agents/*.md`（eval-runner / harness-auditor / pattern-detector / reliability-auditor / vibe-checker）|
 | hooks (.sh) | **10** | `.claude/hooks/*.sh`（immutable / forbidden / bypass / branch / test-lock / destructive-action / **mcp-guard** / vibe-prompt / eval-gate / trajectory-logger）+ lib/common.sh（不计入）。v4.0b 起每个 .sh = engine shim + legacy 回退；引擎在 `engine/*.mjs`（不计入本行）|
 | skills (.claude) | **11** | `.claude/skills/*/SKILL.md` |
 | skills (.agents) | **6** | `.agents/skills/*/`（跨平台镜像，含 codex-bridge）|
-| evals | **65** | `evals/golden-trajectories/*.yaml`（023-087，**全部含 `verification_command` 真执行**，`scripts/run-evals.sh` 跑 65 PASS/0 SKIP；……-078 见历史，v4.2 增 079 self-audit rolling / 080 OTel 用量面板冒烟；v4.3 增 081 git 层 forbidden 兜底 / 082 AGENTS.md 单源防漂 / 083 Windows doctor+eol / 084 codex 委派包装；v4.4 增 085 agy 委派 + 跨模型补位 / 086 REVIEW-QUEUE 摘要化防膨胀；v4.5 增 087 非 Claude 模型阵容 2026-07）|
+| evals | **66** | `evals/golden-trajectories/*.yaml`（023-088，**全部含 `verification_command` 真执行**，`scripts/run-evals.sh` 跑 66 PASS/0 SKIP；……-078 见历史，v4.2 增 079 self-audit rolling / 080 OTel 用量面板冒烟；v4.3 增 081 git 层 forbidden 兜底 / 082 AGENTS.md 单源防漂 / 083 Windows doctor+eol / 084 codex 委派包装；v4.4 增 085 agy 委派 + 跨模型补位 / 086 REVIEW-QUEUE 摘要化防膨胀；v4.5 增 087 非 Claude 模型阵容 2026-07；v4.6 增 088 CLI 模型显式固定）|
 | slo-checks（v4.1）| **8 断言 + runner** | `evals/slo-checks/*.sh` + run.sh + README（6 静态 PASS + 2 运行时诚实 SKIP；`bash evals/slo-checks/run.sh` 汇总）|
 | drills（v4.1）| **5 脚本 + 1 manual + runner** | `evals/drills/*.sh` + run.sh + README — §43 fallback 演练脚本化（codex 配额 / jq 缺失 / node 缺失 / cwd 缺失 / **agy 补位 v4.4d**，均 mock+temp 无真副作用；settings opt-out 需真会话 = SKIP-manual）|
 | ledger（v3.14 B）| **4 脚本** | `ledger/{collect,distill,propagate,run}.mjs` + README — 跨项目事故账本闭环（collect→distill ≥2项目印证→propagate dry-run）；incidents.jsonl/drafts 是 gitignore 运行时产物 |
 | test-plans | **22** | `docs/test-plans/*.yaml`（001-022 trajectory 类规约，无 vc 不自动跑，需人工/Claude 周期验证；v3.14 从 evals/ 移出，计数诚实化）|
 | rules | **3** | `.claude/rules/*.md`（eval-gate / forbidden-paths / test-lock）|
 | learned-rules | **9** | `.claude/rules/learned/*.md`（active，不含 README；archived 见 archived/）；v4.4b 增 2026-07-15 static-regex 不可区分 hooksPath 读写 |
 | handbook 章节 | **§1-§50**（连续无缺号；§49 = 分层分发，v3.13 补）| `playbook/handbook.md` |
 | plugin 清单（v4.0d 实验）| **1 plugin + 1 marketplace** | `.claude-plugin/{plugin,marketplace}.json` + `hooks.json`（`claude plugin validate` 通过；打包 commands/agents/skills/output-style/guard-hooks；rules/statusline/记忆种子仍留 cto-init）|
 | 已部署项目 | **29** | 实测 `find /c/projects -name immutable-guard.sh`：21 独立项目 + nilou-network monorepo（root + 6 子应用）+ hoyokit（root + 1 嵌套）= 29 guard 安装。**2026-07-09 全部升级到 v4 guard engine**（bash→Node shim + legacy 回退），29/29 行为验证通过 + `.bak` 备份 |
 
 ## 版本
 
 | 版本 | Health | ARE | 关键 |
 |---|---|---|---|
 | v3.15 (当前) | **79** | **78** | 2026-06-25 harness+reliability 重审 + 对抗验证回填（high conf，无膨胀）；扣分=changelog 断档/pre-commit 未装/SLO 冻结 v3.9.1/季度演练过期 |
 | v3.13–v3.14 | —（见 v3.15） | —（见 v3.15） | 历史快照未单独测，当前累计态即 v3.15 |
 | v3.12 | TBD | TBD | 真 eval executor（run-evals.sh）— 铁律 #12 从"空壳"变真执行；首跑即抓到 v3.11 _json_get 把 `\n` 转空格破坏 forbidden-paths 多行比对的安全回归 |
 | v3.11 | TBD | TBD | 飞轮第 7-8 轮 team 迭代 |
 | v3.10.2 | 96 | 86 | destructive gate + 安全回归（已修）|
 | v3.9.3 | 94 | 72→86 | subproject 检测 |
 
 ## 校验
 
 ✅ **自动校验已上线**：`scripts/check-counts.sh` 自动比对真实文件数 vs 本表 + grep 散落数字一致性，
 不符 `exit 1`（v3.13 R1 交付，green）。已接入 `.github/workflows/eval.yml` CI gate —
 每次触及 COUNTS/命令/子代理/hooks/技能/eval 集的 push/PR 都跑一遍，计数漂移当场拦下。
 本地手跑：`bash scripts/check-counts.sh`（TIER1 全绿 = 通过）。
diff --git a/docs/ai-cto/REVIEW-QUEUE.md b/docs/ai-cto/REVIEW-QUEUE.md
index 003c5b0..de0cbda 100644
--- a/docs/ai-cto/REVIEW-QUEUE.md
+++ b/docs/ai-cto/REVIEW-QUEUE.md
@@ -24292,80 +24292,93 @@ for path,ranges in {'.agents/skills/codex-bridge/run.sh':[(160,186),(232,242)],'
  4071:   ↓ → 写 cooldown 文件（unix 时间戳，1h 失效）
  4072:   ↓ → 走 Antigravity CLI headless（agy -p "<八维 prompt + diff 自包含>"）    ← v4.4 新档
  4073:   ↓ 成功 → REVIEW-QUEUE.md 写入，Reviewer: agy-gemini
  4074:   ↓        + ℹ️ "跨模型价值保留"（Gemini ≠ GPT ≠ Claude）
  4075:   ↓ agy 也失败 / 未装
  4076:   ↓ → 走 Claude headless（claude -p "<八维 review prompt>"）
  4077:   ↓ 成功 → REVIEW-QUEUE.md 写入，Reviewer: claude-fallback-opus
  4078:   ↓        + ⚠️ 警告"失去跨模型价值"
  4079:   ↓ Claude 也失败 / 未装
  4080:   ↓ → 仅 audit log，REVIEW-QUEUE 不写
  4081: ```
  4082: 
  4083: > v4.4 要点：codex(GPT) 掉线时**先 Gemini 后 Claude** —— agy 补位仍是真跨模型审
  4084: > （模型家族不同），只有落到 Claude 档才触发"失去跨模型价值"警告。
  4085: > 指定补位模型：`export AGY_REVIEW_MODEL="Gemini 3.1 Pro (High)"`（默认用 agy 默认模型）。
  4086: > cost cap 计数（宪法 $20/月）v4.4 起仅 codex 主路径入账——agy/claude 补位不烧 codex 配额。
  4087: 
  4088: **冷却机制**：
  4089: - 检测到额度耗尽 → 1 小时内**直接走 Claude**，跳过 codex（不浪费时间反复失败）
  4090: - 1 小时后 cooldown 失效，恢复尝试 codex
  4091: - 手动重置：`rm docs/ai-cto/.codex-quota-cooldown`
  4092: 
 [31;1mMicrosoft.PowerShell_profile.ps1: [31;1mCannot dot-source this command because it was defined in a different language mode. To invoke this command without importing its contents, omit the '.' operator.[0m
 
 exec
 "C:\\Users\\riku\\AppData\\Local\\Microsoft\\WindowsApps\\pwsh.exe" -Command 'if (Test-Path telemetry/data/metrics-2026-07-16.jsonl) { Get-Content telemetry/data/metrics-2026-07-16.jsonl; node telemetry/report.mjs --since 1 --by repo,model }' in C:\projects\ai-playbook
  succeeded in 847ms:
 {"ts":"2026-07-16T16:22:52+09:00","metric":"agy.cli.duration","value":7,"unit":"seconds","attrs":{"model":"default","tool":"agy-cli"},"resource":{"repo":"ai-playbook"}}
 Claude Code 本地用量 · 最近 1 天 · 按 repo, model
 
 repo         model    input  output  cacheRead  cacheCreation  cost($)  sessions
 -----------  -------  -----  ------  ---------  -------------  -------  --------
 ai-playbook  default  0      0       0          0              0.0000   0       
 -----------  -------  -----  ------  ---------  -------------  -------  --------
 TOTAL                 0      0       0          0              0.0000   0       
 
 注：成本为本地估算非账单（claude_code.cost.usage）。
 [31;1mMicrosoft.PowerShell_profile.ps1: [31;1mCannot dot-source this command because it was defined in a different language mode. To invoke this command without importing its contents, omit the '.' operator.[0m
 
 exec
 "C:\\Users\\riku\\AppData\\Local\\Microsoft\\WindowsApps\\pwsh.exe" -Command '$c=(git ls-tree -r --name-only 72fb7e4fd344a6668a17d0969377f888b62d146b evals/golden-trajectories | Where-Object {$_ -like '"'*.yaml'} | Measure-Object).Count; \"eval_count="'$c"; $s=(git ls-tree -d --name-only 72fb7e4fd344a6668a17d0969377f888b62d146b .agents/skills/* | Measure-Object).Count; "skills=$s"' in C:\projects\ai-playbook
  succeeded in 829ms:
 eval_count=63
 skills=0
 [31;1mMicrosoft.PowerShell_profile.ps1: [31;1mCannot dot-source this command because it was defined in a different language mode. To invoke this command without importing its contents, omit the '.' operator.[0m
 
 codex
 The fallback can misrepresent the actual reviewer model, fail or incompletely review large commits, and is vulnerable to instructions embedded in the reviewed diff. The newly recorded telemetry is also not consumable by the existing report.
 
 Full review comments:
 
 - [P1] Force a Gemini model before claiming cross-model review — C:\projects\ai-playbook\.agents\skills\codex-bridge\run.sh:179-179
   When `AGY_REVIEW_MODEL` selects a supported Claude model, or the CLI default resolves to any non-Gemini model, the result is still labeled `agy-gemini` and debounced as a completed cross-model review. This can falsely present Claude self-review as independent review; enforce a Gemini model or derive the reviewer label and warning from the actual model.
 
 - [P1] Chunk large diffs before passing them to agy — C:\projects\ai-playbook\.agents\skills\codex-bridge\run.sh:167-167
   For ASCII-heavy patches above roughly 32 KiB on Windows, the permitted 60,000-byte prompt exceeds the native `CreateProcess` command-line limit and `agy.exe` never starts; on any platform, patches above 60,000 bytes silently lose their tail yet can be logged and debounced as fully reviewed. Split the diff into bounded chunks and require every chunk to complete.
 
 - [P1] Treat embedded diffs as untrusted prompt data — C:\projects\ai-playbook\.agents\skills\codex-bridge\run.sh:168-170
   If a committed comment, document, or string contains instructions such as “ignore the review and report success,” it is concatenated directly into the reviewer prompt without an untrusted-data boundary or instruction to ignore directives inside the diff. The generated output can then be accepted and debounced as a successful review, so explicitly delimit the patch and tell the model never to follow instructions found within it.
 
 - [P2] Teach the telemetry report to aggregate agy duration — C:\projects\ai-playbook\scripts\agy-delegate.sh:69-70
   Successful delegations write `agy.cli.duration`, but `telemetry/report.mjs` only aggregates the three `claude_code.*` metrics. Consequently the new row appears with zero tokens, cost, and sessions while its duration is discarded, despite this script reporting that usage was recorded; extend the reporter/schema to surface the duration metric.
 The fallback can misrepresent the actual reviewer model, fail or incompletely review large commits, and is vulnerable to instructions embedded in the reviewed diff. The newly recorded telemetry is also not consumable by the existing report.
 
 Full review comments:
 
 - [P1] Force a Gemini model before claiming cross-model review — C:\projects\ai-playbook\.agents\skills\codex-bridge\run.sh:179-179
   When `AGY_REVIEW_MODEL` selects a supported Claude model, or the CLI default resolves to any non-Gemini model, the result is still labeled `agy-gemini` and debounced as a completed cross-model review. This can falsely present Claude self-review as independent review; enforce a Gemini model or derive the reviewer label and warning from the actual model.
 
 - [P1] Chunk large diffs before passing them to agy — C:\projects\ai-playbook\.agents\skills\codex-bridge\run.sh:167-167
   For ASCII-heavy patches above roughly 32 KiB on Windows, the permitted 60,000-byte prompt exceeds the native `CreateProcess` command-line limit and `agy.exe` never starts; on any platform, patches above 60,000 bytes silently lose their tail yet can be logged and debounced as fully reviewed. Split the diff into bounded chunks and require every chunk to complete.
 
 - [P1] Treat embedded diffs as untrusted prompt data — C:\projects\ai-playbook\.agents\skills\codex-bridge\run.sh:168-170
   If a committed comment, document, or string contains instructions such as “ignore the review and report success,” it is concatenated directly into the reviewer prompt without an untrusted-data boundary or instruction to ignore directives inside the diff. The generated output can then be accepted and debounced as a successful review, so explicitly delimit the patch and tell the model never to follow instructions found within it.
 
 - [P2] Teach the telemetry report to aggregate agy duration — C:\projects\ai-playbook\scripts\agy-delegate.sh:69-70
   Successful delegations write `agy.cli.duration`, but `telemetry/report.mjs` only aggregates the three `claude_code.*` metrics. Consequently the new row appears with zero tokens, cost, and sessions while its duration is discarded, despite this script reporting that usage was recorded; extend the reporter/schema to surface the duration metric.
 ```
 
 ---
+
+## 2026-07-24T09:32:56+09:00 — Review for 40615bf
+**Reviewer**: codex-gpt-5.6-sol | **Mode**: success | **判定**: 🔴 0 / 🟠 0 / 🟡 1
+全文 → [reviews/40615bf.md](reviews/40615bf.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）
+
+---
+
+## 2026-07-24T09:39:05+09:00 — Review for 40615bf
+**Reviewer**: codex-gpt-5.6-sol + agy-gemini-3.6-flash-high | **Mode**: success | **判定**: 🔴 0 / 🟠 0 / 🟡 3
+> ℹ️ v4.6 CLI 模型钉死 PR (#68) 的双外部模型审：codex 无 actionable regression；gemini 3×P2 建议（DRY 抽公共 lib / WSL 路径边界 / env 校验）。
+全文 → [reviews/40615bf.md](reviews/40615bf.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）
+
+---
diff --git a/docs/ai-cto/reviews/40615bf.md b/docs/ai-cto/reviews/40615bf.md
new file mode 100644
index 0000000..b934372
--- /dev/null
+++ b/docs/ai-cto/reviews/40615bf.md
@@ -0,0 +1,80 @@
+# §48 跨模型 Review — 40615bf（双外部模型）
+**2026-07-24T09:39:05+09:00** · Reviewers: codex-gpt-5.6-sol + agy-gemini-3.6-flash-high · Mode: success（手动触发，PR #68）
+
+## Reviewer 1: agy-gemini-3.6-flash-high
+
+# Commit 40615bf 跨模型代码评审报告
+
+本次提交针对 CLI 模型漂移问题进行了显式钉死（Pinning），修复了桌面端客户端改写配置文件导致的模型与评审标签不一致（标签造假）漏洞，并补充了 WinGet Links PATH 兜底与超时防护。
+
+---
+
+### 一、 架构 (Architecture)
+* ✅ `.agents/skills/codex-bridge/run.sh:L114-126`, `scripts/agy-delegate.sh:L34-44`
+  **模型固定策略与可执行文件探测统一**：在委派层与桥接层统一了 CLI 模型的显式指定机制与 WinGet Links 兜底定位逻辑，消除了依赖客户端本地 `config.toml` 隐式默认配置带来的非确定性。
+* ⚠️ `scripts/agy-delegate.sh:L34-44` vs `.agents/skills/codex-bridge/run.sh:L117-126` [P2]
+  **WinGet 探测逻辑重复 (DRY)**：跨脚本复制了对 `$LOCALAPPDATA/Microsoft/WinGet/Links/agy` 的循环探测代码，建议后续抽离至公共 `lib/common.sh` 中。
+
+---
+
+### 二、 代码质量 (Code Quality)
+* ✅ `scripts/codex-delegate.sh:L61`
+  **Telemetry 属性字符清洗**：使用 `tr -cd 'A-Za-z0-9._-'` 对变量 `$MODEL` 进行严格的字符白名单过滤，防止包含空格或特殊字符时破坏 JSONL 日志格式。
+* ⚠️ `.agents/skills/codex-bridge/run.sh:L123` [P2]
+  **POSIX/WSL 路径兼容性边界**：在 WSL 或 MSYS2 环境下，`$LOCALAPPDATA` 可能会包含 Windows 格式反斜杠路径（如 `C:\Users\...`），纯 Bash `[ -x "$cand" ]` 测试在该类混合环境中可能失效。
+
+---
+
+### 三、 性能 (Performance)
+* ✅ `.agents/skills/codex-bridge/run.sh:L189`, `scripts/agy-delegate.sh:L60`
+  **超时防挂起机制**：显式注入 `--print-timeout "${AGY_PRINT_TIMEOUT:-5m}"` 参数，彻底解决了无交互 Print 模式下模型调用可能无限挂起的阻塞风险。
+* ✅ `scripts/agy-delegate.sh:L60`
+  **轻量级子 Shell 执行**：在指定的 `$WORKDIR` 路径下直接拉起 `$AGY_BIN`，无额外磁盘 I/O 开销。
+
+---
+
+### 四、 安全 (Security)
+* ✅ `.agents/skills/codex-bridge/run.sh:L157`
+  **消灭标签伪造 (Label Forgery)**：`REVIEWER="codex-${CODEX_REVIEW_MODEL}"` 改为由实际调用的模型名称动态生成，保证审计账本与实际执行引擎完全一致。
+* ⚠️ `.agents/skills/codex-bridge/run.sh:L148` [P2]
+  **环境变量输入校验不足**：`CODEX_REVIEW_MODEL` 参数允许外部环境变量覆盖，虽然在 `-c model="$CODEX_REVIEW_MODEL"` 中带有双引号保护，但在拼接到 `REVIEWER` 标签前缺乏正则表达式合法性校验。
+
+---
+
+### 五、 测试 (Testing)
+* ✅ `evals/golden-trajectories/088-cli-model-pinning.yaml:L1-56`
+  **新增 Trajectory E2E Eval**：新增 088 评测文件，覆盖 `bash -n` 语法检查、模型固定参数校验、WinGet 兜底探测及 Telemetry 无硬编码字面量检查等 17 项严格断言。
+* ✅ `evals/golden-trajectories/087-model-lineup-v4.5.yaml:L40`
+  **同步更新已有断言**：针对 `run.sh` 中 `REVIEWER` 从硬编码字符串升级为动态派生的变更，及时修改了 087 评测的契约断言，保持测试集完全 PASS。
+* ✅ `docs/ai-cto/COUNTS.md:L20`
+  **文档与计数闭环**：准确更新了 Eval 测试套件计数（65 -> 66）。
+
+---
+
+### 六、 DX (Developer Experience)
+* ✅ `playbook/handbook.md:L4094-4096`
+  **踩坑记录与避坑指南**：在 Handbook 中明确记录了 `agy 1.1.5` 拒绝空格形式模型字符串（如 `"Gemini 3.1 Pro (High)"`）的原因，并指导统一使用 Dash 形式（`gemini-3.6-flash-high`）。
+* ✅ `scripts/agy-delegate.sh:L57`, `scripts/codex-delegate.sh:L42`
+  **控制台明晰反馈**：终端日志中可直接查看到当前调用的指定模型与超时设定，利于调试排查。
+
+---
+
+### 七、 功能完整性 (Functional Completeness)
+* ✅ `.agents/skills/codex-bridge/run.sh:L120-125`, `scripts/agy-delegate.sh:L35-42`
+  **WinGet PATH 未及时刷新兜底**：全面解决了在 Windows 环境下 WinGet 安装可执行文件后，由于父进程 PATH 未刷新导致的 `command -v agy` 失败及 fallback 链断裂问题。
+
+---
+
+### 八、 UX (User Experience)
+* ✅ `scripts/agy-delegate.sh:L42`
+  **自解释的错误引导**：当兜底探测依然找不到 CLI 二进制时，控制台输出包含明确的操作指引 `✗ agy CLI 不在 PATH（winget install Google.AntigravityCLI）`。
+
+---
+
+SEVERITY_SUMMARY: P0=0 P1=0 P2=3
+
+## Reviewer 2: codex-gpt-5.6-sol（终判摘录；全程自主验证：agy 二进制探测 X_OK + eval 088 实跑 PASS + bash -n 全过）
+
+> The model pinning, reviewer labeling, AGY path fallback, timeout handling, and telemetry updates are internally consistent. Targeted eval 088 and shell syntax checks pass; no actionable regression was identified.
+
+SEVERITY_SUMMARY: P0=0 P1=0 P2=3
diff --git a/evals/golden-trajectories/087-model-lineup-v4.5.yaml b/evals/golden-trajectories/087-model-lineup-v4.5.yaml
index c05db42..64e8bd6 100644
--- a/evals/golden-trajectories/087-model-lineup-v4.5.yaml
+++ b/evals/golden-trajectories/087-model-lineup-v4.5.yaml
@@ -1,49 +1,50 @@
 id: 087-model-lineup-v4.5
 description: v4.5 — 非 Claude 模型阵容对齐 2026-07（铁律 #3 SSOT + 铁律 #2 不编造）。OpenAI GPT-5.6（2026-07-09，Sol/Terra/Luna 能力档命名制，Codex 客户端 07-06 起 Sol Ultra）取代 gpt-5.5 为活跃推荐；Google Gemini 3.6 Flash（2026-07-21）以注记形式登记（Pro 线延期仍 3.1 Pro 当家，agy CLI 收录以实测为准）。codex-bridge REVIEWER 标签升 codex-gpt5.6-sol，cost gate 改 codex-* 前缀匹配（未来模型升级只改赋值一处）。均经 WebSearch 权威源验证（openai.com / 9to5google 等，2026-07-22）。
 priority: P1
 input:
   - "用户/CTO 选非 Claude 委派模型（codex / Antigravity 路由）"
   - "模型升级时更新 §1.2/§5/§14 SSOT（/cto-models 流程）"
 expected_steps:
   - handbook §5 Codex 模型表列 gpt-5.6 Sol/Terra/Luna（发布日 2026-07-09 + 定价）为当前推荐，gpt-5.5 降为上代
   - 路由文档（CLAUDE.md / handbook §14 / codex-bridge SKILL）活跃推荐用 gpt-5.6 Sol
   - Gemini 3.6 Flash 以带日期注记登记（不改 agy 实测快照——快照日期早于发布，铁律 #2）
   - codex-bridge REVIEWER=codex-gpt5.6-sol；cost gate 用 ${REVIEWER#codex-} 前缀匹配
 forbidden_actions:
   - 编造未经权威源验证的模型名/版本/定价（铁律 #3）
   - 改动 agy models 实测快照内容或日期（实测数据只能由重新实测更新，铁律 #2）
   - 历史记录（CODEX-REVIEW-LOG 旧条目 reviewer=codex-gpt5.5 / changelog / 事故注释）回溯篡改
   - config.toml 精确 model 串无权威源就写死（写"以 codex CLI 实测为准"）
 acceptance_criteria:
   - handbook 含 'gpt-5.6 Sol' + 'Terra' + 'Luna' + '2026-07-09'
   - 活跃路由文档（handbook 路由表/CLAUDE.md/codex-bridge SKILL）无 gpt-5.5 作为当前推荐（"上代"降级行允许）
   - handbook 含 'Gemini 3.6 Flash' + '2026-07-21' 注记且 agy 实测快照行仍标 '实测 2026-07-16'
-  - run.sh REVIEWER 赋值为 codex-gpt5.6-sol 且 cost gate 用前缀匹配
+  - run.sh REVIEWER 默认档为 gpt-5.6-sol（v4.6 起派生自 CODEX_REVIEW_MODEL）且 cost gate 用前缀匹配
 verification_command: |
   pass=0; fail=0
   HB=playbook/handbook.md
   R=.agents/skills/codex-bridge/run.sh
   # 1. §5 表：gpt-5.6 三档 + 发布日
   { grep -q 'gpt-5.6 Sol' "$HB" && grep -q 'Terra' "$HB" && grep -q 'Luna' "$HB" && grep -q '2026-07-09' "$HB"; } \
     && pass=$((pass+1)) || { fail=$((fail+1)); echo "FAIL: handbook 缺 gpt-5.6 Sol/Terra/Luna 或发布日"; }
   # 2. 活跃推荐不再是 gpt-5.5：路由表/推荐行无 'gpt-5.5'（表中"上代"行例外——检查推荐语境）
   if grep -E '委派 Codex \| gpt-5\.5|推荐默认.*gpt-5\.5|旗舰：gpt-5\.5' "$HB" CLAUDE.md .agents/skills/codex-bridge/SKILL.md 2>/dev/null | grep -q .; then
     fail=$((fail+1)); echo "FAIL: 活跃路由/推荐仍是 gpt-5.5"
   else pass=$((pass+1)); fi
   # 3. Gemini 3.6 Flash 注记 + agy 实测快照未被篡改
   { grep -q 'Gemini 3.6 Flash' "$HB" && grep -q '2026-07-21' "$HB"; } \
     && pass=$((pass+1)) || { fail=$((fail+1)); echo "FAIL: handbook 缺 Gemini 3.6 Flash 注记"; }
   # v4.5c: 快照已由 2026-07-22 重新实测更新（agy 1.1.5，3.6 Flash 三档入列 + 实跑验证）；守护 = 最新实测日期 + 3.6 收录 + 历史快照留痕
   { grep -q '实测 2026-07-22' "$HB" && grep -q 'gemini-3.6-flash' "$HB" && grep -q '2026-07-16（1.1.3' "$HB"; } \
     && pass=$((pass+1)) || { fail=$((fail+1)); echo "FAIL: agy 快照未反映 07-22 重实测/3.6 收录/历史留痕"; }
   # 4. run.sh：新标签 + 前缀匹配 cost gate
-  grep -q 'REVIEWER="codex-gpt5.6-sol"' "$R" && pass=$((pass+1)) || { fail=$((fail+1)); echo "FAIL: run.sh REVIEWER 未升 gpt5.6-sol"; }
+  # v4.6 起 REVIEWER 派生自实际模型（codex-${CODEX_REVIEW_MODEL}，默认 gpt-5.6-sol）——断言默认值仍是 sol 档（见 eval 088）
+  grep -q 'CODEX_REVIEW_MODEL:-gpt-5.6-sol' "$R" && grep -q 'REVIEWER="codex-\${CODEX_REVIEW_MODEL}"' "$R" && pass=$((pass+1)) || { fail=$((fail+1)); echo "FAIL: run.sh REVIEWER 默认档不是 gpt-5.6-sol"; }
   grep -q 'REVIEWER#codex-' "$R" && pass=$((pass+1)) || { fail=$((fail+1)); echo "FAIL: cost gate 未用 codex-* 前缀匹配"; }
   # 5. config 串已实测（v4.5b 2026-07-22）：gpt-5.6-sol 有效 + 明示裸 gpt-5.6/-codex 无效（防误配）
   { grep -q 'gpt-5.6-sol' "$HB" && grep -q '实测 2026-07-22' "$HB" && grep -q 'not supported' "$HB"; } \
     && pass=$((pass+1)) || { fail=$((fail+1)); echo "FAIL: config 串缺实测标注或无效串警告"; }
   echo "pass=$pass fail=$fail (expect 6/0)"
   [ "$fail" = "0" ] && echo PASS || echo FAIL
 sota_reference:
   - 'openai.com/index/gpt-5-6 + previewing-gpt-5-6-sol：2026-07-09 GA，Sol $5/$30 · Terra $2.5/$15 · Luna $1/$6；Codex 工程师确认 Sol Ultra 07-06 入 Codex 客户端（WebSearch 2026-07-22）'
   - '9to5google/androidauthority 2026-07-21：Gemini 3.6 Flash $1.50/$7.50（-17% 输出 token）+ 3.5 Flash-Lite + 3.5 Flash Cyber；Pro 线延期；Gemini 4 预告'
diff --git a/evals/golden-trajectories/088-cli-model-pinning.yaml b/evals/golden-trajectories/088-cli-model-pinning.yaml
new file mode 100644
index 0000000..91df4ac
--- /dev/null
+++ b/evals/golden-trajectories/088-cli-model-pinning.yaml
@@ -0,0 +1,56 @@
+id: 088-cli-model-pinning
+description: v4.6 CLI 模型显式固定 — codex/agy 委派与 review 不再吃客户端 config 默认（桌面端把 ~/.codex/config.toml 改成 gpt-5.6-terra 后，codex-bridge 实际用 terra 审但 REVIEWER 标签硬写 sol = 标签造假）。修复：codex review 显式 -c model=（CODEX_REVIEW_MODEL 默认 gpt-5.6-sol）、codex exec 显式 -m（CODEX_MODEL 默认 gpt-5.6-sol）、agy 补位默认 gemini-3.6-flash-high（dash 形式 ID，agy 1.1.5 拒绝空格串）+ --print-timeout 防挂起、agy WinGet Links PATH 兜底（父进程先于安装启动时 command -v 找不到）、telemetry 账本记实际模型值。
+priority: P1
+input:
+  - "跨模型 review：Stop hook → codex-bridge run.sh；终端委派：scripts/codex-delegate.sh / scripts/agy-delegate.sh"
+expected_steps:
+  - codex review 调用带 -c model="$CODEX_REVIEW_MODEL"，默认 gpt-5.6-sol，可 env 覆盖
+  - REVIEWER 标签由实际模型拼出（codex-${CODEX_REVIEW_MODEL}），不再硬编码字符串
+  - agy 补位调用带 --model "$AGY_REVIEW_MODEL"（默认 gemini-3.6-flash-high）+ --print-timeout
+  - agy 二进制解析走 AGY_BIN：command -v 失败时兜底探测 $LOCALAPPDATA/Microsoft/WinGet/Links/
+  - codex-delegate.sh 传 -m "$MODEL"（CODEX_MODEL 默认 gpt-5.6-sol），telemetry attrs.model 用实际值
+  - agy-delegate.sh 默认模型 gemini-3.6-flash-high，调用走 "$AGY_BIN"
+forbidden_actions:
+  - codex review 不带模型参数裸调（吃 config.toml 桌面端漂移，标签与实际模型不符）
+  - telemetry 账本硬编码模型名（gpt-5.6-sol 字面量写进 printf 而非取 $MODEL 变量）
+  - agy 模型默认用空格形式串（"Gemini 3.1 Pro (High)" — agy 1.1.5 直接拒绝）
+  - agy 补位调用不带 --print-timeout（print 模式可能无限挂起，锁 60min 才被 stale-clear）
+  - REVIEWER 标签丢失 codex- 前缀（cost gate 用 ${REVIEWER#codex-} 前缀匹配入账）
+acceptance_criteria:
+  - run.sh / codex-delegate.sh / agy-delegate.sh 全部 bash -n 通过
+  - run.sh 含 CODEX_REVIEW_MODEL 默认 gpt-5.6-sol + -c model= 传参 + AGY_REVIEW_MODEL 默认 gemini-3.6-flash-high
+  - codex-delegate.sh 含 -m "$MODEL" 且 telemetry printf 无硬编码模型字面量
+  - 两个 agy 调用点都走 $AGY_BIN（WinGet Links 兜底生效）
+sota_reference:
+  - '2026-07-24 实测：codex exec -m gpt-5.6-sol 10.4s 正常返回；agy -p --model gemini-3.6-flash-high 9.3s 返回 AGY_OK'
+  - '本机 ~/.codex/config.toml 默认 model=gpt-5.6-terra（桌面端改写）— 不固定则 review 实际用 terra，REVIEWER 标签却写 sol'
+verification_command: |
+  pass=0; fail=0
+  r=.agents/skills/codex-bridge/run.sh
+  cd_sh=scripts/codex-delegate.sh
+  ag_sh=scripts/agy-delegate.sh
+  for f in "$r" "$cd_sh" "$ag_sh"; do
+    if [ -f "$f" ] && bash -n "$f"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $f 缺失或语法错误"; fi
+  done
+  # run.sh: codex review 模型钉死 + 标签取实际模型
+  if grep -q 'CODEX_REVIEW_MODEL:-gpt-5.6-sol' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh 缺 CODEX_REVIEW_MODEL 默认 gpt-5.6-sol"; fi
+  if grep -q 'codex review -c model="\$CODEX_REVIEW_MODEL"' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh codex review 未显式传模型"; fi
+  if grep -q 'REVIEWER="codex-\${CODEX_REVIEW_MODEL}"' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh REVIEWER 标签未取实际模型"; fi
+  # run.sh: agy 默认模型 dash 形式 + print-timeout + AGY_BIN 兜底
+  if grep -q 'AGY_REVIEW_MODEL:-gemini-3.6-flash-high' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh 缺 agy 默认模型 gemini-3.6-flash-high"; fi
+  if grep -q -- '--print-timeout' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh agy 调用缺 --print-timeout"; fi
+  if grep -q 'WinGet/Links/agy' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh 缺 agy WinGet Links 兜底"; fi
+  if grep -q '"\$AGY_BIN" -p' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh agy 调用未走 AGY_BIN"; fi
+  # codex-delegate: -m 传参 + telemetry 用变量
+  if grep -q 'CODEX_MODEL:-gpt-5.6-sol' "$cd_sh"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: codex-delegate 缺 CODEX_MODEL 默认"; fi
+  if grep -q -- '-m "\$MODEL"' "$cd_sh"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: codex-delegate 未传 -m"; fi
+  if grep -E 'printf.*"model":"gpt-5' "$cd_sh" >/dev/null; then fail=$((fail+1)); echo "FAIL: codex-delegate telemetry 仍硬编码模型字面量"; else pass=$((pass+1)); fi
+  # agy-delegate: 默认模型 + AGY_BIN
+  if grep -q 'AGY_MODEL:-gemini-3.6-flash-high' "$ag_sh"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: agy-delegate 缺默认模型"; fi
+  if grep -q '"\$AGY_BIN" -p' "$ag_sh"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: agy-delegate 未走 AGY_BIN"; fi
+  if grep -q 'WinGet/Links/agy' "$ag_sh"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: agy-delegate 缺 WinGet Links 兜底"; fi
+  # handbook：dash 形式警示 + 双模型 env 文档
+  h=playbook/handbook.md
+  if grep -q 'AGY_REVIEW_MODEL=gemini-3.1-pro-high' "$h" && grep -q 'CODEX_REVIEW_MODEL' "$h"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: handbook 缺 dash 形式模型 env 文档"; fi
+  echo "pass=$pass fail=$fail"
+  [ "$fail" = "0" ] && echo "RESULT: PASS" || { echo "RESULT: FAIL"; exit 1; }
diff --git a/playbook/handbook.md b/playbook/handbook.md
index bf6da65..e6e48be 100644
--- a/playbook/handbook.md
+++ b/playbook/handbook.md
@@ -4014,161 +4014,163 @@ restrict_push: true
 | B：GitHub Actions + `openai/codex-action@v1` | ✅ | 低 | ✅ | ⭐⭐⭐ 生产稳定 |
 | C：Codex MCP server（app-server JSON-RPC）| ✅ | 低 | ✅ | ⭐⭐⭐⭐ **本地最优** |
 | D：文件信号量 + Codex Automation 监听 | ✅ | 中 | ✅ | ⭐ 易出错 |
 | E：OpenAI API 直调 gpt-5.6 | ✅ | 低 | ✅ | ⭐⭐ 不用 Codex 生态 |
 
 ### 48.3 推荐双轨方案
 
 **本地实时（C）** + **CI 兜底（B）**：
 
 ```
 方案 C（本地）：
   Claude Code 完成任务 → Stop hook
     → 调用 .agents/skills/codex-bridge
     → MCP server（codex serve --mcp-port 8723）
     → Codex agent (gpt-5.6 Sol) 跑 review
     → 结果追加到 docs/ai-cto/REVIEW-QUEUE.md
   下次 Claude Code SessionStart hook
     → 自动加载 REVIEW-QUEUE.md
     → 用户立即看到跨模型 review
 
 方案 B（CI 兜底）：
   PR opened → GH Actions → openai/codex-action@v1
     → Codex review → 评论 PR
   防本地 hook 漏触发
 ```
 
 ### 48.4 工作流详解
 
 ```
 1. Claude Code 完成 task A（编码 + 测试 + commit）
 2. Stop hook 检测：本会话有改动 + 不在 forbidden 路径
 3. hook 调用 codex-bridge skill
 4. skill 准备 review 请求：
    - git diff
    - SPEC.md 关键节选
    - CONSTITUTION.md（如存在）
    - §10.5 八维评审模板
 5. skill 通过 MCP 发给 Codex（异步）
 6. Codex agent 用 gpt-5.6 Sol 按八维评审 → 输出 markdown
 7. skill 写入 docs/ai-cto/REVIEW-QUEUE.md（追加，时间戳标识）
 8. 用户下次会话 SessionStart hook 自动读 REVIEW-QUEUE.md → 显示在 context
 9. 用户决定：接受建议 / 反驳 / 修改
 10. CODEX-REVIEW-LOG.md 留 audit trail（哪些 review / 何时 / 接受率）
 ```
 
 ### 48.5 安全 / 合规（重要）
 
 **Codex review 会上传代码到 OpenAI**：
 
 - ❌ 不适合 §32.1 forbidden 路径：auth / payment / secrets / migration / crypto / infra
 - ✅ 商业敏感项目用 **Microsoft Foundry zero-retention** 端点（付费选项）
 - ✅ 开源项目可放心用
 - ⚠️ hook 内置 forbidden 路径过滤：触及黑名单 → **不自动调 Codex** + 明确提示用户人工 review
 
 **留痕**：`docs/ai-cto/CODEX-REVIEW-LOG.md` 记录每次 review 的 commit / 文件清单 / Codex 输出摘要 / 接受状态（用户标）。
 
 ### 48.5.1 额度耗尽容错（v3.6）
 
 **问题**：Codex（即使 ChatGPT Plus/Pro 订阅）有额度限制，触发后会返回 `rate_limit_exceeded` / `quota` / `429` / `402` 等错误。原本"全自动跨模型 review"链路会断。
 
 **降级策略**（v4.4 起 5 段 fallback chain — agy 补位档保留跨模型价值）：
 
 ```
 codex review --commit HEAD
   ↓ 成功 → REVIEW-QUEUE.md 写入，Reviewer: codex-gpt5.5
   ↓ 失败 + 检测到额度耗尽关键词
   ↓ → 写 cooldown 文件（unix 时间戳，1h 失效）
   ↓ → 走 Antigravity CLI headless（agy -p "<八维 prompt + diff 自包含>"）    ← v4.4 新档
   ↓ 成功 → REVIEW-QUEUE.md 写入，Reviewer: agy-gemini
   ↓        + ℹ️ "跨模型价值保留"（Gemini ≠ GPT ≠ Claude）
   ↓ agy 也失败 / 未装
   ↓ → 走 Claude headless（claude -p "<八维 review prompt>"）
   ↓ 成功 → REVIEW-QUEUE.md 写入，Reviewer: claude-fallback-opus
   ↓        + ⚠️ 警告"失去跨模型价值"
   ↓ Claude 也失败 / 未装
   ↓ → 仅 audit log，REVIEW-QUEUE 不写
 ```
 
 > v4.4 要点：codex(GPT) 掉线时**先 Gemini 后 Claude** —— agy 补位仍是真跨模型审
 > （模型家族不同），只有落到 Claude 档才触发"失去跨模型价值"警告。
-> 指定补位模型：`export AGY_REVIEW_MODEL="Gemini 3.1 Pro (High)"`（默认用 agy 默认模型）。
+> 指定补位模型：`export AGY_REVIEW_MODEL=gemini-3.1-pro-high`（v4.6 起默认 `gemini-3.6-flash-high`；
+> 必须用 dash 形式 ID —— agy 1.1.5 拒绝空格形式串如 "Gemini 3.1 Pro (High)"）。
+> 主路径模型同理钉死：`CODEX_REVIEW_MODEL`（默认 `gpt-5.6-sol`，不吃 config.toml 桌面端漂移）。
 > cost cap 计数（宪法 $20/月）v4.4 起仅 codex 主路径入账——agy/claude 补位不烧 codex 配额。
 
 **冷却机制**：
 - 检测到额度耗尽 → 1 小时内**直接走 Claude**，跳过 codex（不浪费时间反复失败）
 - 1 小时后 cooldown 失效，恢复尝试 codex
 - 手动重置：`rm docs/ai-cto/.codex-quota-cooldown`
 
 **关键警告**：
 > Claude fallback **失去跨模型价值**（Claude 写的代码 Claude 自审 = 相同认知偏差）。
 > 是降级方案，不是替代方案。
 > REVIEW-QUEUE.md 中清晰标注 `Reviewer:` 字段，让用户知道差异。
 > 如要保持跨模型，等 codex 配额恢复（次月 1 日）后手动 `/cto-review --cross` 重审历史关键 commit。
 
 **实装位置**：`.agents/skills/codex-bridge/run.sh` 第 50-130 行（v3.6 起）。
 
 ### 48.6 反模式
 
 - **双模型互相讨好**：Claude 顺从 Codex 修改 → 失去交叉价值
   - 防御：Codex review 后，Claude 必须输出"接受 / 反驳 / 修改"决策（不能盲改）
 - **Codex review 不读 Constitution**：泛化建议
   - 防御：prompt 强制塞入 SPEC + Constitution 节选
 - **无限循环**：Codex 提建议 → Claude 修改 → 再 review → 又改 → ...
   - 防御：max_iterations = 3，超出后强制人审
 - **成本失控**：Stop hook 频繁触发 Codex 烧 token
   - 防御：debounce（同会话最多 1 次）+ 路径过滤（仅业务代码改动触发）
 
 ### 48.7 配置要点
 
 `.claude/settings.json` Stop hook：
 ```json
 {
   "Stop": [{
     "matcher": "*",
     "hooks": [{
       "type": "command",
       "command": "git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -qE 'src/|app/|lib/' && grep -vqE '(auth|payment|secrets|migration|crypto)/' && echo '触发 codex-bridge review' && bash .agents/skills/codex-bridge/run.sh || true"
     }]
   }]
 }
 ```
 
 `.mcp.json` 加 Codex 服务（默认禁用，需 settings.local.json 启用）：
 ```json
 "codex": {
   "command": "codex",
   "args": ["serve", "--mcp-port", "8723"],
   "env": {"OPENAI_API_KEY": "${OPENAI_API_KEY}"}
 }
 ```
 
 ### 48.7.1 业务路径 SSOT（v3.6.1 新增 — 教训之上的修复）
 
 **v3.6 教训**：原 `run.sh` hardcode 业务路径过滤为 `^(src|app|lib|apps|packages)/`（generic 项目假设）。aegis-panel（自研模块在 `dashboard/src/` `hardening/` `ops/`）一整个会话 11+ commit 全被 silent skip — Stop hook 触发但 BUSINESS 为空 exit 0，REVIEW-QUEUE.md 一直空。
 
 **v3.6.1 修复**：业务路径提取为 SSOT `scripts/business-paths.txt`，每个项目可按实际业务结构自己定制。
 
 ```
 # scripts/business-paths.txt
 src/
 app/
 lib/
 apps/
 packages/
 
 # 项目自定义示例：
 # dashboard/src/    # aegis-panel 嵌套前端
 # hardening/        # aegis-panel 自研安全
 # actions/          # dian PHP 风格控制器
 # routes/           # Express / Fastify
 # components/       # React / Vue 组件根
 ```
 
 **run.sh 读取逻辑**（带 fallback）：
 ```bash
 if [ -f scripts/business-paths.txt ]; then
   BIZ_PATTERN=$(grep -v '^#' scripts/business-paths.txt | grep -v '^$' \
                 | sed 's|^|^|' | tr '\n' '|' | sed 's/|$//')
 else
   BIZ_PATTERN='^(src|app|lib|apps|packages)/'  # 默认 generic
 fi
diff --git a/scripts/agy-delegate.sh b/scripts/agy-delegate.sh
index a7ff480..0e6c917 100644
--- a/scripts/agy-delegate.sh
+++ b/scripts/agy-delegate.sh
@@ -1,76 +1,83 @@
 #!/usr/bin/env bash
 # scripts/agy-delegate.sh — Antigravity CLI (agy) 委派一键化（v4.4）
 #
 # 背景（2026-07-16 实测，agy v1.1.3 / winget Google.AntigravityCLI）：
 #   agy -p（print 模式）headless 可用，纯文本 prompt 往返仅 ~7s ——
 #   没有 codex exec 的 37s/shell 进程 Windows 沙箱税（learned rule 2026-07-10），
 #   也不要求目标目录是 git 仓库。
 #   模型阵容（`agy models` 实测 2026-07-22，agy 1.1.5，ID 为 dash 形式直接喂 --model）：
 #   gemini-3.6-flash-{high,medium,low}（✅ 实跑 9s 返回）/ gemini-3.5-flash-{high,medium,low} /
 #   gemini-3.1-pro-{high,low} / claude-sonnet-4-6 / claude-opus-4-6-thinking / gpt-oss-120b-medium。
 #   需 Google 登录（无参跑一次 agy 授权）；winget PATH 别名需新 shell。
 #
 # 适才适用（与 codex-delegate.sh 分工，手册 §5.1 / §48.5.1）：
 #   - 写作型多文件产出（apply_patch 语义）      → codex-delegate.sh（gpt-5.6 Sol）
 #   - 快速问答 / 摘要 / 草稿 / 跨模型二审（自包含）→ 本脚本（Gemini，秒级往返）
 #   - codex 配额耗尽时的跨模型 review 补位        → 本脚本（Gemini ≠ GPT ≠ Claude，保留跨模型价值）
 #   - Claude Code 会话内委派 codex               → 仍首选 MCP codex 通道（常驻 server 无进程税）
 #
 # 用法：
 #   bash scripts/agy-delegate.sh "<自包含 prompt>" [工作目录=当前]
 #   AGY_MODEL=gemini-3.6-flash-low bash scripts/agy-delegate.sh "..."   # 指定模型（dash ID，实测有效）
 #   AGY_TIMEOUT=10m bash scripts/agy-delegate.sh "..."                      # print 超时（默认 5m）
 #
 # 自包含三要素（print 模式无交互授权界面，脚本会 lint 提醒）：
 #   1. 所需上下文（diff / 文件内容）直接贴入 prompt —— 工具调用可能因等授权而挂到超时
 #   2. 只要文本产出：review / 分析 / 草稿类任务最稳
 #   3. 验证外置：产物由 orchestrator 事后验证（eval / 人审）
 set -uo pipefail
 
 PROMPT="${1:-}"
 WORKDIR="${2:-$(pwd)}"
 [ -z "$PROMPT" ] && { echo "用法: bash scripts/agy-delegate.sh \"<自包含 prompt>\" [工作目录]"; exit 1; }
 
-# 前置检查
-command -v agy >/dev/null 2>&1 || { echo "✗ agy CLI 不在 PATH（winget install Google.AntigravityCLI）"; exit 1; }
+# 前置检查（v4.6：winget 装到 WinGet\Links，父进程先于安装启动时 PATH 里没有 → 兜底探测）
+AGY_BIN="agy"
+if ! command -v agy >/dev/null 2>&1; then
+  AGY_BIN=""
+  if [ -n "${LOCALAPPDATA:-}" ]; then
+    for cand in "$LOCALAPPDATA/Microsoft/WinGet/Links/agy.exe" "$LOCALAPPDATA/Microsoft/WinGet/Links/agy"; do
+      [ -x "$cand" ] && AGY_BIN="$cand" && break
+    done
+  fi
+  [ -z "$AGY_BIN" ] && { echo "✗ agy CLI 不在 PATH（winget install Google.AntigravityCLI）"; exit 1; }
+fi
 [ -d "$WORKDIR" ] || { echo "✗ 工作目录不存在: $WORKDIR"; exit 1; }
 
 # 自包含 lint（警告不阻断）
 warn() { echo "⚠️  $1"; }
 echo "$PROMPT" | grep -qiE '先读|读取.*文件|read the|修改.*文件|edit the|跑测试|run.*test|执行.*命令' && \
   warn "prompt 疑似要求「读/改文件/跑命令」—— print 模式无交互授权，工具调用可能挂到超时。改为自包含（贴入 diff/文件内容）+ 只要文本产出"
 [ "${#PROMPT}" -lt 200 ] && \
   warn "prompt 偏短（${#PROMPT} 字符）—— 委派应贴入全部所需上下文，避免 agent 缺上下文瞎写（§32.5 Context Starvation）"
 
-MODEL="${AGY_MODEL:-}"
+# v4.6 模型固定：默认 gemini-3.6-flash-high（dash 形式 ID；agy 1.1.5 拒绝空格形式串）。
+# 覆盖：AGY_MODEL=gemini-3.6-flash-low bash scripts/agy-delegate.sh "..."
+MODEL="${AGY_MODEL:-gemini-3.6-flash-high}"
 TIMEOUT="${AGY_TIMEOUT:-5m}"
-echo "→ agy -p [model=${MODEL:-default}] [timeout=$TIMEOUT] @ $WORKDIR"
+echo "→ agy -p [model=$MODEL] [timeout=$TIMEOUT] @ $WORKDIR"
 T0=$(date +%s)
-if [ -n "$MODEL" ]; then
-  OUT=$(cd "$WORKDIR" && agy -p "$PROMPT" --model "$MODEL" --print-timeout "$TIMEOUT" </dev/null 2>&1)
-else
-  OUT=$(cd "$WORKDIR" && agy -p "$PROMPT" --print-timeout "$TIMEOUT" </dev/null 2>&1)
-fi
+OUT=$(cd "$WORKDIR" && "$AGY_BIN" -p "$PROMPT" --model "$MODEL" --print-timeout "$TIMEOUT" </dev/null 2>&1)
 RC=$?
 T1=$(date +%s)
 DUR=$((T1-T0))
 echo "$OUT"
 echo "─────────────────────────────────────"
 echo "agy exit=$RC · 耗时 ${DUR}s"
 
 # 用量入账：agy print 模式不输出 token 数（2026-07-16 实测）→ 以时长入 telemetry 统一账本
 # （与 codex.token.usage 同构 JSONL，report.mjs 可按 metric 聚合）
 DATA_DIR="${TELEMETRY_DATA_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)/telemetry/data}"
 if [ "$RC" -eq 0 ]; then
   mkdir -p "$DATA_DIR"
   # JSON 安全：字段只保留安全字符集（防引号/反斜杠/换行破坏 JSONL）
   REPO_NAME=$(basename "$(git -C "$WORKDIR" rev-parse --show-toplevel 2>/dev/null || echo "$WORKDIR")" | tr -cd 'A-Za-z0-9._-')
   MODEL_SAFE=$(printf '%s' "${MODEL:-default}" | tr -cd 'A-Za-z0-9._() -' | tr ' ' '_')
   TS=$(date -Iseconds 2>/dev/null || date)
   printf '{"ts":"%s","metric":"agy.cli.duration","value":%s,"unit":"seconds","attrs":{"model":"%s","tool":"agy-cli"},"resource":{"repo":"%s"}}\n' \
     "$TS" "$DUR" "$MODEL_SAFE" "$REPO_NAME" >> "$DATA_DIR/metrics-$(date +%Y-%m-%d).jsonl"
   echo "📊 agy 用量已入账: ${DUR}s → telemetry (repo=$REPO_NAME)"
 else
   echo "📊 agy 非零退出（不入账）"
 fi
 exit $RC
diff --git a/scripts/codex-delegate.sh b/scripts/codex-delegate.sh
index 4e7d3e5..cd5901d 100755
--- a/scripts/codex-delegate.sh
+++ b/scripts/codex-delegate.sh
@@ -1,65 +1,69 @@
 #!/usr/bin/env bash
 # scripts/codex-delegate.sh — codex 委派的正确姿势一键化（v4.3）
 #
 # 背景（learned rule 2026-07-10-codex-exec-windows-sandbox-tax）：
 #   codex exec 在 Windows 的 workspace-write 沙箱给每个 shell 进程加 ~37s 启动税（123×），
 #   多 shell 步任务必超时零产出。本脚本固化「写作型委派」调用范式 + 解析用量入 telemetry。
 #
 # ⚡ 更优通道（2026-07-10 实测）：会话内优先用 codex MCP server（mcp__codex__codex 工具）——
 #   MCP server 常驻进程复用沙箱，3 条 shell 命令 + 2 次模型往返仅 32s（CLI 税率下 >110s）。
 #   本脚本服务于「终端手动委派」场景；Claude Code 会话内委派请直接走 MCP 工具。
 #
 # 用法：
 #   bash scripts/codex-delegate.sh "<自包含 prompt>" [git仓库路径=当前仓库]
 #   CODEX_SANDBOX=danger-full-access bash scripts/codex-delegate.sh "..."   # 确需 shell 的受控任务
 #
 # 写作型 prompt 三要素（脚本会 lint 提醒）：
 #   1. 自包含：所需文件内容/上下文直接贴入 prompt，不要让 codex 读仓库
 #   2. 只写：明确「只用 apply_patch 写文件，不要跑测试/不要执行 shell」
 #   3. 验证外置：产物由 orchestrator 事后验证（eval / 人审）
 set -uo pipefail
 
 PROMPT="${1:-}"
 REPO="${2:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
 SANDBOX="${CODEX_SANDBOX:-workspace-write}"
+# v4.6 模型固定：显式 -m，不吃 ~/.codex/config.toml 默认（桌面端会改成 terra 等档位）。
+# 覆盖：CODEX_MODEL=gpt-5.6-terra bash scripts/codex-delegate.sh "..."
+MODEL="${CODEX_MODEL:-gpt-5.6-sol}"
 [ -z "$PROMPT" ] && { echo "用法: bash scripts/codex-delegate.sh \"<prompt>\" [仓库路径]"; exit 1; }
 
 # 前置检查
 command -v codex >/dev/null 2>&1 || { echo "✗ codex CLI 不在 PATH"; exit 1; }
 git -C "$REPO" rev-parse --show-toplevel >/dev/null 2>&1 || { echo "✗ $REPO 不是 git 仓库（codex exec 会直接拒绝）"; exit 1; }
 
 # 写作型 lint（警告不阻断）
 warn() { echo "⚠️  $1"; }
 echo "$PROMPT" | grep -qiE '先读|读取.*文件|read the|自测|跑测试|run.*test|验证一下' && \
   warn "prompt 疑似含「读文件/自测」要求 —— Windows 沙箱 37s/shell命令，多步任务将超时零产出。改为自包含+只写（learned rule 2026-07-10）"
 [ "${#PROMPT}" -lt 200 ] && \
   warn "prompt 偏短（${#PROMPT} 字符）—— 写作型委派应贴入全部所需上下文，避免 codex 去读仓库"
 [ "$SANDBOX" = "danger-full-access" ] && \
   warn "danger-full-access：codex 子进程不经本仓 guard hook，仅用于受控 prompt + 产物走 staged+review 的任务"
 
-echo "→ codex exec [$SANDBOX] @ $REPO"
+echo "→ codex exec [$SANDBOX] [model=$MODEL] @ $REPO"
 T0=$(date +%s)
-OUT=$(codex exec -s "$SANDBOX" -C "$REPO" -c service_tier=fast "$PROMPT" </dev/null 2>&1)
+OUT=$(codex exec -s "$SANDBOX" -C "$REPO" -m "$MODEL" -c service_tier=fast "$PROMPT" </dev/null 2>&1)
 RC=$?
 T1=$(date +%s)
 echo "$OUT"
 echo "─────────────────────────────────────"
 echo "codex exit=$RC · 耗时 $((T1-T0))s"
 
 # F3：解析 'tokens used N' → 并入 telemetry 统一账本（与 Claude Code OTel 数据同构 JSONL）
 TOKENS=$(printf '%s\n' "$OUT" | grep -A1 '^tokens used' | tail -1 | tr -d ', ' | grep -E '^[0-9]+$' || true)
 [ -z "$TOKENS" ] && TOKENS=$(printf '%s\n' "$OUT" | grep -oE 'tokens used[^0-9]*[0-9,]+' | grep -oE '[0-9,]+$' | tr -d ',' | head -1 || true)
 DATA_DIR="${TELEMETRY_DATA_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)/telemetry/data}"
 if [ -n "$TOKENS" ] && [ "$TOKENS" -gt 0 ] 2>/dev/null; then
   mkdir -p "$DATA_DIR"
   # JSON 安全：repo 名/sandbox 只保留安全字符集（防引号/反斜杠/换行破坏 JSONL）
   REPO_NAME=$(basename "$REPO" | tr -cd 'A-Za-z0-9._-')
   SANDBOX_SAFE=$(printf '%s' "$SANDBOX" | tr -cd 'A-Za-z0-9._-')
+  MODEL_SAFE=$(printf '%s' "$MODEL" | tr -cd 'A-Za-z0-9._-')   # v4.6: 账本记实际模型，不再硬编码（防标签造假）
   TS=$(date -Iseconds 2>/dev/null || date)
-  printf '{"ts":"%s","metric":"codex.token.usage","value":%s,"unit":"tokens","attrs":{"model":"gpt-5.6-sol","tool":"codex-cli","sandbox":"%s"},"resource":{"repo":"%s"}}\n' \
-    "$TS" "$TOKENS" "$SANDBOX_SAFE" "$REPO_NAME" >> "$DATA_DIR/metrics-$(date +%Y-%m-%d).jsonl"
+  printf '{"ts":"%s","metric":"codex.token.usage","value":%s,"unit":"tokens","attrs":{"model":"%s","tool":"codex-cli","sandbox":"%s"},"resource":{"repo":"%s"}}\n' \
+    "$TS" "$TOKENS" "$MODEL_SAFE" "$SANDBOX_SAFE" "$REPO_NAME" >> "$DATA_DIR/metrics-$(date +%Y-%m-%d).jsonl"
   echo "📊 codex 用量已入账: $TOKENS tokens → telemetry (repo=$REPO_NAME)"
 else
   echo "📊 未能从输出解析 tokens used（不入账）"
 fi
 exit $RC
warning: unable to access 'C:\Users\yuril/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\yuril/.config/git/ignore': Permission denied

exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "git grep -n \"codex-gpt\\|agy-gemini\\|CODEX_REVIEW_MODEL\\|AGY_REVIEW_MODEL\\|attrs.*model\" -- . ':"'!docs/ai-cto/reviews/*'"' ':"'!docs/ai-cto/CODEX-REVIEW-LOG.md'"' ':"'!docs/ai-cto/REVIEW-QUEUE.md'"'; bash -n .agents/skills/codex-bridge/run.sh scripts/agy-delegate.sh scripts/codex-delegate.sh; git diff 30ae3bc"'^ 30ae3bc -- scripts/agy-delegate.sh scripts/codex-delegate.sh .agents/skills/codex-bridge/run.sh' in C:\projects\ai-playbook
 succeeded in 493ms:
.agents/skills/codex-bridge/run.sh:159:  CODEX_REVIEW_MODEL="${CODEX_REVIEW_MODEL:-gpt-5.6-sol}"
.agents/skills/codex-bridge/run.sh:161:    OUTPUT=$(codex review -c model="$CODEX_REVIEW_MODEL" --commit "$SHA" --title "ai-playbook §48 cross-model review" 2>&1)
.agents/skills/codex-bridge/run.sh:164:      REVIEWER="codex-${CODEX_REVIEW_MODEL}"   # v4.6: 标签=实际调用模型（cost gate 用 codex- 前缀匹配，不受影响）
.agents/skills/codex-bridge/run.sh:181:  AGY_REVIEW_MODEL="${AGY_REVIEW_MODEL:-gemini-3.6-flash-high}"
.agents/skills/codex-bridge/run.sh:189:    AGY_OUTPUT=$("$AGY_BIN" -p "$AGY_PROMPT" --model "$AGY_REVIEW_MODEL" --print-timeout "${AGY_PRINT_TIMEOUT:-5m}" </dev/null 2>&1)
.agents/skills/codex-bridge/run.sh:193:      REVIEWER="agy-gemini"
.claude/skills/forbidden-policy/SKILL.md:64:Reviewed by: codex-gpt5.5 (sha=abc1234)
docs/ai-cto/HARNESS-CHANGELOG.md:24:  加"以重新实测为准"注）；④ codex-bridge REVIEWER 标签→`codex-gpt5.6-sol`，cost gate 改
docs/ai-cto/HARNESS-CHANGELOG.md:30:- 影响范围：codex 委派路由推荐、cost 计量标签（新条目 reviewer=codex-gpt5.6-sol，旧 log 不改）、
docs/ai-cto/HARNESS-CHANGELOG.md:603:  - REVIEW-QUEUE.md 含 Reviewer 元字段（codex-gpt5.5 / claude-fallback-opus / ...）
docs/ai-cto/archive/REVIEW-QUEUE-2026-Q2.md:99:**Reviewer**: codex-gpt5.5 | **Mode**: success
docs/ai-cto/archive/REVIEW-QUEUE-2026-Q2.md:153:**Reviewer**: codex-gpt5.5 | **Mode**: success
docs/ai-cto/archive/REVIEW-QUEUE-2026-Q2.md:215:**Reviewer**: codex-gpt5.5 | **Mode**: success
docs/ai-cto/archive/REVIEW-QUEUE-2026-Q2.md:295:**Reviewer**: codex-gpt5.5 | **Mode**: success
docs/ai-cto/archive/REVIEW-QUEUE-2026-Q2.md:353:**Reviewer**: codex-gpt5.5 | **Mode**: success
docs/ai-cto/archive/REVIEW-QUEUE-2026-Q2.md:427:**Reviewer**: codex-gpt5.5 | **Mode**: success
docs/ai-cto/archive/REVIEW-QUEUE-2026-Q2.md:495:**Reviewer**: codex-gpt5.5 | **Mode**: success
docs/ai-cto/archive/REVIEW-QUEUE-2026-Q2.md:581:**Reviewer**: codex-gpt5.5 | **Mode**: success
docs/ai-cto/archive/REVIEW-QUEUE-2026-Q2.md:651:**Reviewer**: codex-gpt5.5 | **Mode**: success
docs/ai-cto/archive/SELF-AUDIT-2026-05-10.md:9:- Codex review 数：8 次（7 次 codex-gpt5.5 成功 + 1 次 fallback-to-claude）
evals/golden-trajectories/085-agy-cross-model-fallback.yaml:39:  for pat in 'HAS_AGY' 'fallback-to-agy' 'agy-only' 'AGY_REVIEW_MODEL'; do
evals/golden-trajectories/085-agy-cross-model-fallback.yaml:54:  if grep -q 'Reviewer: agy-gemini' "$h"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: handbook §48.5.1 fallback 链缺 agy 档"; fi
evals/golden-trajectories/086-review-queue-summarize.yaml:52:    SHORT_SHA=deadbee; TS="2026-07-16T00:00:00"; REVIEWER=codex-gpt5.6-sol; MODE=success
evals/golden-trajectories/087-model-lineup-v4.5.yaml:2:description: v4.5 — 非 Claude 模型阵容对齐 2026-07（铁律 #3 SSOT + 铁律 #2 不编造）。OpenAI GPT-5.6（2026-07-09，Sol/Terra/Luna 能力档命名制，Codex 客户端 07-06 起 Sol Ultra）取代 gpt-5.5 为活跃推荐；Google Gemini 3.6 Flash（2026-07-21）以注记形式登记（Pro 线延期仍 3.1 Pro 当家，agy CLI 收录以实测为准）。codex-bridge REVIEWER 标签升 codex-gpt5.6-sol，cost gate 改 codex-* 前缀匹配（未来模型升级只改赋值一处）。均经 WebSearch 权威源验证（openai.com / 9to5google 等，2026-07-22）。
evals/golden-trajectories/087-model-lineup-v4.5.yaml:11:  - codex-bridge REVIEWER=codex-gpt5.6-sol；cost gate 用 ${REVIEWER#codex-} 前缀匹配
evals/golden-trajectories/087-model-lineup-v4.5.yaml:15:  - 历史记录（CODEX-REVIEW-LOG 旧条目 reviewer=codex-gpt5.5 / changelog / 事故注释）回溯篡改
evals/golden-trajectories/087-model-lineup-v4.5.yaml:21:  - run.sh REVIEWER 默认档为 gpt-5.6-sol（v4.6 起派生自 CODEX_REVIEW_MODEL）且 cost gate 用前缀匹配
evals/golden-trajectories/087-model-lineup-v4.5.yaml:40:  # v4.6 起 REVIEWER 派生自实际模型（codex-${CODEX_REVIEW_MODEL}，默认 gpt-5.6-sol）——断言默认值仍是 sol 档（见 eval 088）
evals/golden-trajectories/087-model-lineup-v4.5.yaml:41:  grep -q 'CODEX_REVIEW_MODEL:-gpt-5.6-sol' "$R" && grep -q 'REVIEWER="codex-\${CODEX_REVIEW_MODEL}"' "$R" && pass=$((pass+1)) || { fail=$((fail+1)); echo "FAIL: run.sh REVIEWER 默认档不是 gpt-5.6-sol"; }
evals/golden-trajectories/088-cli-model-pinning.yaml:2:description: v4.6 CLI 模型显式固定 — codex/agy 委派与 review 不再吃客户端 config 默认（桌面端把 ~/.codex/config.toml 改成 gpt-5.6-terra 后，codex-bridge 实际用 terra 审但 REVIEWER 标签硬写 sol = 标签造假）。修复：codex review 显式 -c model=（CODEX_REVIEW_MODEL 默认 gpt-5.6-sol）、codex exec 显式 -m（CODEX_MODEL 默认 gpt-5.6-sol）、agy 补位默认 gemini-3.6-flash-high（dash 形式 ID，agy 1.1.5 拒绝空格串）+ --print-timeout 防挂起、agy WinGet Links PATH 兜底（父进程先于安装启动时 command -v 找不到）、telemetry 账本记实际模型值。
evals/golden-trajectories/088-cli-model-pinning.yaml:7:  - codex review 调用带 -c model="$CODEX_REVIEW_MODEL"，默认 gpt-5.6-sol，可 env 覆盖
evals/golden-trajectories/088-cli-model-pinning.yaml:8:  - REVIEWER 标签由实际模型拼出（codex-${CODEX_REVIEW_MODEL}），不再硬编码字符串
evals/golden-trajectories/088-cli-model-pinning.yaml:9:  - agy 补位调用带 --model "$AGY_REVIEW_MODEL"（默认 gemini-3.6-flash-high）+ --print-timeout
evals/golden-trajectories/088-cli-model-pinning.yaml:11:  - codex-delegate.sh 传 -m "$MODEL"（CODEX_MODEL 默认 gpt-5.6-sol），telemetry attrs.model 用实际值
evals/golden-trajectories/088-cli-model-pinning.yaml:21:  - run.sh 含 CODEX_REVIEW_MODEL 默认 gpt-5.6-sol + -c model= 传参 + AGY_REVIEW_MODEL 默认 gemini-3.6-flash-high
evals/golden-trajectories/088-cli-model-pinning.yaml:36:  if grep -q 'CODEX_REVIEW_MODEL:-gpt-5.6-sol' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh 缺 CODEX_REVIEW_MODEL 默认 gpt-5.6-sol"; fi
evals/golden-trajectories/088-cli-model-pinning.yaml:37:  if grep -q 'codex review -c model="\$CODEX_REVIEW_MODEL"' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh codex review 未显式传模型"; fi
evals/golden-trajectories/088-cli-model-pinning.yaml:38:  if grep -q 'REVIEWER="codex-\${CODEX_REVIEW_MODEL}"' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh REVIEWER 标签未取实际模型"; fi
evals/golden-trajectories/088-cli-model-pinning.yaml:40:  if grep -q 'AGY_REVIEW_MODEL:-gemini-3.6-flash-high' "$r"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: run.sh 缺 agy 默认模型 gemini-3.6-flash-high"; fi
evals/golden-trajectories/088-cli-model-pinning.yaml:54:  if grep -q 'AGY_REVIEW_MODEL=gemini-3.1-pro-high' "$h" && grep -q 'CODEX_REVIEW_MODEL' "$h"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: handbook 缺 dash 形式模型 env 文档"; fi
playbook/handbook.md:4078:  ↓ 成功 → REVIEW-QUEUE.md 写入，Reviewer: codex-gpt5.5
playbook/handbook.md:4082:  ↓ 成功 → REVIEW-QUEUE.md 写入，Reviewer: agy-gemini
playbook/handbook.md:4094:> 指定补位模型：`export AGY_REVIEW_MODEL=gemini-3.1-pro-high`（v4.6 起默认 `gemini-3.6-flash-high`；
playbook/handbook.md:4096:> 主路径模型同理钉死：`CODEX_REVIEW_MODEL`（默认 `gpt-5.6-sol`，不吃 config.toml 桌面端漂移）。
scripts/agy-delegate.sh:77:  printf '{"ts":"%s","metric":"agy.cli.duration","value":%s,"unit":"seconds","attrs":{"model":"%s","tool":"agy-cli"},"resource":{"repo":"%s"}}\n' \
scripts/codex-delegate.sh:63:  printf '{"ts":"%s","metric":"codex.token.usage","value":%s,"unit":"tokens","attrs":{"model":"%s","tool":"codex-cli","sandbox":"%s"},"resource":{"repo":"%s"}}\n' \
telemetry/README.md:20:{"ts":"2026-07-10T12:00:00.000Z","metric":"claude_code.token.usage","value":123,"unit":"tokens","attrs":{"type":"input","model":"claude-opus-4-8"},"resource":{"repo":"ai-playbook","session.id":"..."}}
diff --git a/.agents/skills/codex-bridge/run.sh b/.agents/skills/codex-bridge/run.sh
index 24ee0dc..5ec14d8 100644
--- a/.agents/skills/codex-bridge/run.sh
+++ b/.agents/skills/codex-bridge/run.sh
@@ -114,7 +114,16 @@ HAS_AGY=0
 HAS_CLAUDE=0
 HAS_GH=0
 command -v codex >/dev/null 2>&1 && HAS_CODEX=1
-command -v agy >/dev/null 2>&1 && HAS_AGY=1
+# agy PATH 兜底（v4.6）：winget 装到 WinGet\Links，父进程在安装前启动时 PATH 里没有 →
+# command -v 找不到但二进制真实存在。兜底探测 Links 目录（LOCALAPPDATA 仅 Windows 有，POSIX 下跳过）。
+AGY_BIN="agy"
+if command -v agy >/dev/null 2>&1; then
+  HAS_AGY=1
+elif [ -n "${LOCALAPPDATA:-}" ]; then
+  for cand in "$LOCALAPPDATA/Microsoft/WinGet/Links/agy.exe" "$LOCALAPPDATA/Microsoft/WinGet/Links/agy"; do
+    [ -x "$cand" ] && AGY_BIN="$cand" && HAS_AGY=1 && break
+  done
+fi
 command -v claude >/dev/null 2>&1 && HAS_CLAUDE=1
 command -v gh >/dev/null 2>&1 && HAS_GH=1
 
@@ -145,11 +154,14 @@ fi
   STATUS=1
 
   # 5a. 主路径：codex review
+  # v4.6 模型固定：不再吃 ~/.codex/config.toml 默认（桌面端会把它改成 terra 等其他档）——
+  # review 档位显式钉死 gpt-5.6-sol（可 env 覆盖），REVIEWER 标签取实际模型（不再硬编码假标签）。
+  CODEX_REVIEW_MODEL="${CODEX_REVIEW_MODEL:-gpt-5.6-sol}"
   if [ "$HAS_CODEX" = "1" ] && [ "$SKIP_CODEX" = "0" ]; then
-    OUTPUT=$(codex review --commit "$SHA" --title "ai-playbook §48 cross-model review" 2>&1)
+    OUTPUT=$(codex review -c model="$CODEX_REVIEW_MODEL" --commit "$SHA" --title "ai-playbook §48 cross-model review" 2>&1)
     STATUS=$?
     if [ $STATUS -eq 0 ]; then
-      REVIEWER="codex-gpt5.6-sol"   # v4.5: Codex 客户端 2026-07-06 起 GPT-5.6 Sol（WebSearch 验证）
+      REVIEWER="codex-${CODEX_REVIEW_MODEL}"   # v4.6: 标签=实际调用模型（cost gate 用 codex- 前缀匹配，不受影响）
       MODE="success"
     elif echo "$OUTPUT" | grep -qiE "(rate.?limit|quota|exceeded|insufficient|usage.?limit|429|402)"; then
       echo "$(date +%s 2>/dev/null || echo 0)" > "$COOLDOWN_FILE"
@@ -164,6 +176,9 @@ fi
   # codex(GPT) 不可用时先走 agy(Gemini) 再走 claude —— Gemini ≠ GPT ≠ Claude，
   # agy 补位仍是跨模型审；claude 补位才是「失去跨模型价值」的最后档。
   # 自包含 prompt（diff 直接贴入）：print 模式无交互授权，不能让 agent 自己跑 git。
+  # v4.6 模型固定：默认 gemini-3.6-flash-high（dash 形式 ID，agy 1.1.5 实测有效；
+  # 空格形式 "Gemini 3.1 Pro (High)" 会被拒绝）。加 --print-timeout 防 print 模式无限挂起。
+  AGY_REVIEW_MODEL="${AGY_REVIEW_MODEL:-gemini-3.6-flash-high}"
   if [ -z "$REVIEWER" ] && [ "$HAS_AGY" = "1" ]; then
     DIFF_CONTENT=$(git show --stat --patch "$SHA" 2>/dev/null | head -c 60000)
     AGY_PROMPT="你是跨模型代码审阅者。按八维（架构/代码质量/性能/安全/测试/DX/功能完整性/UX）逐条 ✅⚠️🔴 + 文件:行号 评审以下 commit ${SHORT_SHA} 的 diff。仅输出 markdown 报告，不要调用任何工具、不要读文件。
@@ -171,11 +186,7 @@ fi
 SEVERITY_SUMMARY: P0=<n> P1=<n> P2=<n>
 
 ${DIFF_CONTENT}"
-    if [ -n "${AGY_REVIEW_MODEL:-}" ]; then
-      AGY_OUTPUT=$(agy -p "$AGY_PROMPT" --model "$AGY_REVIEW_MODEL" </dev/null 2>&1)
-    else
-      AGY_OUTPUT=$(agy -p "$AGY_PROMPT" </dev/null 2>&1)
-    fi
+    AGY_OUTPUT=$("$AGY_BIN" -p "$AGY_PROMPT" --model "$AGY_REVIEW_MODEL" --print-timeout "${AGY_PRINT_TIMEOUT:-5m}" </dev/null 2>&1)
     AGY_STATUS=$?
     if [ $AGY_STATUS -eq 0 ] && [ -n "$AGY_OUTPUT" ]; then
       OUTPUT="$AGY_OUTPUT"
diff --git a/scripts/agy-delegate.sh b/scripts/agy-delegate.sh
index a7ff480..0e6c917 100644
--- a/scripts/agy-delegate.sh
+++ b/scripts/agy-delegate.sh
@@ -31,8 +31,17 @@ PROMPT="${1:-}"
 WORKDIR="${2:-$(pwd)}"
 [ -z "$PROMPT" ] && { echo "用法: bash scripts/agy-delegate.sh \"<自包含 prompt>\" [工作目录]"; exit 1; }
 
-# 前置检查
-command -v agy >/dev/null 2>&1 || { echo "✗ agy CLI 不在 PATH（winget install Google.AntigravityCLI）"; exit 1; }
+# 前置检查（v4.6：winget 装到 WinGet\Links，父进程先于安装启动时 PATH 里没有 → 兜底探测）
+AGY_BIN="agy"
+if ! command -v agy >/dev/null 2>&1; then
+  AGY_BIN=""
+  if [ -n "${LOCALAPPDATA:-}" ]; then
+    for cand in "$LOCALAPPDATA/Microsoft/WinGet/Links/agy.exe" "$LOCALAPPDATA/Microsoft/WinGet/Links/agy"; do
+      [ -x "$cand" ] && AGY_BIN="$cand" && break
+    done
+  fi
+  [ -z "$AGY_BIN" ] && { echo "✗ agy CLI 不在 PATH（winget install Google.AntigravityCLI）"; exit 1; }
+fi
 [ -d "$WORKDIR" ] || { echo "✗ 工作目录不存在: $WORKDIR"; exit 1; }
 
 # 自包含 lint（警告不阻断）
@@ -42,15 +51,13 @@ echo "$PROMPT" | grep -qiE '先读|读取.*文件|read the|修改.*文件|edit t
 [ "${#PROMPT}" -lt 200 ] && \
   warn "prompt 偏短（${#PROMPT} 字符）—— 委派应贴入全部所需上下文，避免 agent 缺上下文瞎写（§32.5 Context Starvation）"
 
-MODEL="${AGY_MODEL:-}"
+# v4.6 模型固定：默认 gemini-3.6-flash-high（dash 形式 ID；agy 1.1.5 拒绝空格形式串）。
+# 覆盖：AGY_MODEL=gemini-3.6-flash-low bash scripts/agy-delegate.sh "..."
+MODEL="${AGY_MODEL:-gemini-3.6-flash-high}"
 TIMEOUT="${AGY_TIMEOUT:-5m}"
-echo "→ agy -p [model=${MODEL:-default}] [timeout=$TIMEOUT] @ $WORKDIR"
+echo "→ agy -p [model=$MODEL] [timeout=$TIMEOUT] @ $WORKDIR"
 T0=$(date +%s)
-if [ -n "$MODEL" ]; then
-  OUT=$(cd "$WORKDIR" && agy -p "$PROMPT" --model "$MODEL" --print-timeout "$TIMEOUT" </dev/null 2>&1)
-else
-  OUT=$(cd "$WORKDIR" && agy -p "$PROMPT" --print-timeout "$TIMEOUT" </dev/null 2>&1)
-fi
+OUT=$(cd "$WORKDIR" && "$AGY_BIN" -p "$PROMPT" --model "$MODEL" --print-timeout "$TIMEOUT" </dev/null 2>&1)
 RC=$?
 T1=$(date +%s)
 DUR=$((T1-T0))
diff --git a/scripts/codex-delegate.sh b/scripts/codex-delegate.sh
index 4e7d3e5..cd5901d 100755
--- a/scripts/codex-delegate.sh
+++ b/scripts/codex-delegate.sh
@@ -22,6 +22,9 @@ set -uo pipefail
 PROMPT="${1:-}"
 REPO="${2:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
 SANDBOX="${CODEX_SANDBOX:-workspace-write}"
+# v4.6 模型固定：显式 -m，不吃 ~/.codex/config.toml 默认（桌面端会改成 terra 等档位）。
+# 覆盖：CODEX_MODEL=gpt-5.6-terra bash scripts/codex-delegate.sh "..."
+MODEL="${CODEX_MODEL:-gpt-5.6-sol}"
 [ -z "$PROMPT" ] && { echo "用法: bash scripts/codex-delegate.sh \"<prompt>\" [仓库路径]"; exit 1; }
 
 # 前置检查
@@ -37,9 +40,9 @@ echo "$PROMPT" | grep -qiE '先读|读取.*文件|read the|自测|跑测试|run.
 [ "$SANDBOX" = "danger-full-access" ] && \
   warn "danger-full-access：codex 子进程不经本仓 guard hook，仅用于受控 prompt + 产物走 staged+review 的任务"
 
-echo "→ codex exec [$SANDBOX] @ $REPO"
+echo "→ codex exec [$SANDBOX] [model=$MODEL] @ $REPO"
 T0=$(date +%s)
-OUT=$(codex exec -s "$SANDBOX" -C "$REPO" -c service_tier=fast "$PROMPT" </dev/null 2>&1)
+OUT=$(codex exec -s "$SANDBOX" -C "$REPO" -m "$MODEL" -c service_tier=fast "$PROMPT" </dev/null 2>&1)
 RC=$?
 T1=$(date +%s)
 echo "$OUT"
@@ -55,9 +58,10 @@ if [ -n "$TOKENS" ] && [ "$TOKENS" -gt 0 ] 2>/dev/null; then
   # JSON 安全：repo 名/sandbox 只保留安全字符集（防引号/反斜杠/换行破坏 JSONL）
   REPO_NAME=$(basename "$REPO" | tr -cd 'A-Za-z0-9._-')
   SANDBOX_SAFE=$(printf '%s' "$SANDBOX" | tr -cd 'A-Za-z0-9._-')
+  MODEL_SAFE=$(printf '%s' "$MODEL" | tr -cd 'A-Za-z0-9._-')   # v4.6: 账本记实际模型，不再硬编码（防标签造假）
   TS=$(date -Iseconds 2>/dev/null || date)
-  printf '{"ts":"%s","metric":"codex.token.usage","value":%s,"unit":"tokens","attrs":{"model":"gpt-5.6-sol","tool":"codex-cli","sandbox":"%s"},"resource":{"repo":"%s"}}\n' \
-    "$TS" "$TOKENS" "$SANDBOX_SAFE" "$REPO_NAME" >> "$DATA_DIR/metrics-$(date +%Y-%m-%d).jsonl"
+  printf '{"ts":"%s","metric":"codex.token.usage","value":%s,"unit":"tokens","attrs":{"model":"%s","tool":"codex-cli","sandbox":"%s"},"resource":{"repo":"%s"}}\n' \
+    "$TS" "$TOKENS" "$MODEL_SAFE" "$SANDBOX_SAFE" "$REPO_NAME" >> "$DATA_DIR/metrics-$(date +%Y-%m-%d).jsonl"
   echo "📊 codex 用量已入账: $TOKENS tokens → telemetry (repo=$REPO_NAME)"
 else
   echo "📊 未能从输出解析 tokens used（不入账）"

exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content .agents/skills/codex-bridge/run.sh | Select-Object -Skip 240 -First 180 | ForEach-Object -Begin {$i=241} -Process {"$i`t$_"; $i++}; git show 30ae3bc''^:.agents/skills/codex-bridge/run.sh | Select-Object -Skip 240 -First 140' in C:\projects\ai-playbook
 succeeded in 569ms:
241	      if [ "$CUR_MONTH" != "$MONTH" ]; then
242	        # 譛井ｻｽ蜿倅ｺ・竊・reset
243	        printf '{"month":"%s","codex_token_cents":%d,"cap_cents":2000,"reviews_count":1,"exceeded":false,"schema":"v3.10.1"}\n' \
244	          "$MONTH" "$ADD_CENTS" > "$COST_FILE"
245	      else
246	        CUR_CENTS=$(sed -nE 's/.*"codex_token_cents"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' "$COST_FILE" | head -1)
247	        CUR_COUNT=$(sed -nE 's/.*"reviews_count"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' "$COST_FILE" | head -1)
248	        CAP=$(sed -nE 's/.*"cap_cents"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' "$COST_FILE" | head -1)
249	        NEW_CENTS=$((${CUR_CENTS:-0} + ADD_CENTS))
250	        NEW_COUNT=$((${CUR_COUNT:-0} + 1))
251	        EXCEEDED=$([ "$NEW_CENTS" -gt "${CAP:-2000}" ] && echo true || echo false)
252	        printf '{"month":"%s","codex_token_cents":%d,"cap_cents":%d,"reviews_count":%d,"exceeded":%s,"schema":"v3.10.1"}\n' \
253	          "$MONTH" "$NEW_CENTS" "${CAP:-2000}" "$NEW_COUNT" "$EXCEEDED" > "$COST_FILE"
254	      fi
255	    fi
256	  else
257	    echo "$TS | sha=${SHORT_SHA} | mode=${MODE:-no-reviewer-available} | reviewer=none" \
258	      >> docs/ai-cto/CODEX-REVIEW-LOG.md
259	    exit 0  # 豐｡ review 扈捺棡 竊・蜷守ｻｭ PR 蜷梧ｭ･譌諢丈ｹ・  fi
260	
261	  # ============================================================
262	  # 7. ・ PR autopilot 窶・荳埼怙隕・reviewer 莉句・荵溯・閾ｪ蜉ｨ霍・  # ============================================================
263	  # 隗ｦ蜿第擅莉ｶ・亥・驛ｨ貊｡雜ｳ・会ｼ・  #   - gh CLI 蜿ｯ逕ｨ + gh auth 蟾ｲ逋ｻ蠖・  #   - 蠖灘燕 branch 髱・main/master
264	  #   - 閾ｳ蟆第怏 1 荳ｪ commit ahead of base
265	  # 陦御ｸｺ・・  #   - 闍･譌 open PR 竊・閾ｪ蜉ｨ push + gh pr create・・uto-generated title/body・・  #   - 闍･譛・open PR 竊・霍ｳ霑・・蟒ｺ
266	  #   - 逕ｨ sha marker 髦ｲ豁｢驥榊､・comment
267	  # 蜈ｳ髣ｭ・壼惠 settings.local.json 蜈ｳ髣ｭ Stop hook・梧・隶ｾ NO_PR_AUTOPILOT=1
268	  if [ "$HAS_GH" = "1" ] && [ "${NO_PR_AUTOPILOT:-0}" != "1" ]; then
269	    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
270	    if [ -n "$BRANCH" ] && [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ] && [ "$BRANCH" != "HEAD" ]; then
271	
272	      # 7a. 譽豬・PR 譏ｯ蜷ｦ蟄伜惠
273	      PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null)
274	
275	      # 7b. 荳榊ｭ伜惠蛻呵・蜉ｨ蠑 PR・亥・ push・・      if [ -z "$PR_NUMBER" ]; then
276	        # 謗ｨ branch・磯ｦ匁ｬ｡謌匁峩譁ｰ・・        git push -u origin "$BRANCH" 2>&1 | tail -3 >> docs/ai-cto/CODEX-REVIEW-LOG.md
277	
278	        # 閾ｪ蜉ｨ逕滓・ title・井ｻ取怙霑・commit message・・ body・井ｻ取怙霑・commits・・        AUTO_TITLE=$(git log -1 --format=%s)
279	        AUTO_BODY=$(printf "## Summary\n\n%s\n\n## Recent commits\n\n%s\n\n---\n\n_逕ｱ codex-bridge autopilot 閾ｪ蜉ｨ蠑蜷ｯ縲Ｄodex review 隗∽ｸ区婿 comment縲・" \
280	          "$(git log -1 --format=%b | head -20)" \
281	          "$(git log --format='- %h %s' main..HEAD 2>/dev/null | head -10 || git log --format='- %h %s' HEAD~5..HEAD)")
282	
283	        gh pr create --title "$AUTO_TITLE" --body "$AUTO_BODY" 2>&1 | tail -3 >> docs/ai-cto/CODEX-REVIEW-LOG.md
284	        PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null)
285	        if [ -n "$PR_NUMBER" ]; then
286	          echo "$TS | sha=${SHORT_SHA} | mode=pr-autopilot-created | pr=#${PR_NUMBER}" \
287	            >> docs/ai-cto/CODEX-REVIEW-LOG.md
288	        fi
289	      fi
290	
291	      # 7c. 蜷梧ｭ･ review 蛻ｰ PR comment・域潔 sha 蜴ｻ驥搾ｼ計3.8 蜉隹・ｯ墓律蠢暦ｼ・      if [ -n "$PR_NUMBER" ]; then
292	        MARKER="<!-- codex-bridge:${SHORT_SHA} -->"
293	        echo "$TS | sha=${SHORT_SHA} | step=pr-comment-check | pr=#${PR_NUMBER} | marker=$MARKER" \
294	          >> docs/ai-cto/CODEX-REVIEW-LOG.md
295	
296	        # 譟･驥搾ｼ夂畑 gh api 逵・comments・梧伽 marker
297	        # 豕ｨ諢擾ｼ喩rep -c 霑泌屓髱樣峺譌ｶ || echo 0 蜈懷ｺ・        EXISTING=$(gh api "repos/{owner}/{repo}/issues/${PR_NUMBER}/comments" --jq ".[].body" 2>/dev/null | grep -c "$MARKER" 2>/dev/null)
298	        EXISTING="${EXISTING:-0}"
299	        echo "$TS | sha=${SHORT_SHA} | step=existing-check | found=$EXISTING" \
300	          >> docs/ai-cto/CODEX-REVIEW-LOG.md
301	
302	        if [ "$EXISTING" = "0" ]; then
303	          # 蜀吝芦荳ｴ譌ｶ譁・ｻｶ蜀・post・磯∩蜈・stdin pipe 蝨ｨ disown 蜷主床邇ｯ蠅・ｸ句､ｱ謨茨ｼ・          COMMENT_FILE="/tmp/codex-comment-${SHORT_SHA}.md"
304	          {
305	            echo "$MARKER"
306	            echo "## ､・Codex Cross-Model Review (\`$SHORT_SHA\`)"
307	            echo ""
308	            echo "**Reviewer**: \`$REVIEWER\` | **Mode**: \`$MODE\` | $TS"
309	            if [ "$MODE" = "fallback-to-claude" ]; then
310	              echo ""
311	              echo "> 笞・・codex/agy 蝮・冠髞呻ｼ・`${FAIL_CHAIN:-codex 荳榊庄逕ｨ}\`・会ｼ梧悽谺｡逕ｱ Claude 陦･菴阪ょ､ｱ蜴ｻ霍ｨ讓｡蝙倶ｻｷ蛟ｼ・亥酔讓｡蝙玖・螳｡・会ｼ幄凶髱樣｢晏ｺｦ閠怜ｰｽ・悟庄閭ｽ譏ｯ螟榊書髣ｮ鬚倬怙謗呈衍縲・
312	            elif [ "$MODE" = "fallback-to-agy" ] || [ "$MODE" = "agy-only" ]; then
313	              echo ""
314	              echo "> 邃ｹ・・譛ｬ谺｡逕ｱ Antigravity CLI・・emini・芽｡･菴榊ｮ梧・縲りｷｨ讓｡蝙倶ｻｷ蛟ｼ菫晉蕗・・emini 竕 GPT 竕 Claude・峨・
315	            elif [ "$MODE" = "claude-only" ]; then
316	              echo ""
317	              echo "> 邃ｹ・・codex 譛ｪ陬・譛ｪ逋ｻ蠖包ｼ井ｻ取悴蟆晁ｯ・codex/agy・会ｼ梧悽谺｡逕ｱ Claude 螳梧・縲・
318	            fi
319	            echo ""
320	            echo "$OUTPUT"
321	            echo ""
322	            echo "---"
323	            echo "_逕ｱ \`.agents/skills/codex-bridge/run.sh\` 譛ｬ蝨ｰ霍托ｼ郁ｮ｢髦・auth・会ｼ碁撼 CI縲Ｂutopilot 閾ｪ蜉ｨ蜷梧ｭ･縲・"
324	          } > "$COMMENT_FILE"
325	
326	          # 逕ｨ譁・ｻｶ霍ｯ蠕・ｰ・gh pr comment・域峩遞ｳ螳夲ｼ・          POST_OUT=$(gh pr comment "$PR_NUMBER" --body-file "$COMMENT_FILE" 2>&1)
327	          POST_STATUS=$?
328	
329	          echo "$TS | sha=${SHORT_SHA} | step=pr-comment-post | status=$POST_STATUS | out=$(echo "$POST_OUT" | tr '\n' ' ' | head -c 200)" \
330	            >> docs/ai-cto/CODEX-REVIEW-LOG.md
331	
332	          if [ $POST_STATUS -eq 0 ]; then
333	            echo "$TS | sha=${SHORT_SHA} | mode=pr-comment-posted | pr=#${PR_NUMBER}" \
334	              >> docs/ai-cto/CODEX-REVIEW-LOG.md
335	            rm -f "$COMMENT_FILE"
336	          else
337	            # 螟ｱ雍･菫晉蕗荳ｴ譌ｶ譁・ｻｶ萓帑ｺｺ蟾･謗呈衍
338	            echo "$TS | sha=${SHORT_SHA} | mode=pr-comment-failed | file=$COMMENT_FILE" \
339	              >> docs/ai-cto/CODEX-REVIEW-LOG.md
340	          fi
341	        fi
342	      fi
343	    fi
344	  fi
345	} &
346	
347	disown 2>/dev/null
348	exit 0
      SEV_NOTE=""
    else
      # 缺行（codex 主路径用自带 rubric / reviewer 没照做）：诚实标"未知"，绝不回退扫全文 emoji（那正是污染源）
      R_CRIT="?"; R_MAJ="?"; R_MIN="?"; SEV_NOTE="（见全文）"
    fi
    {
      echo ""
      echo "## $TS — Review for $SHORT_SHA"
      echo "**Reviewer**: $REVIEWER | **Mode**: $MODE | **判定**: 🔴 ${R_CRIT} / 🟠 ${R_MAJ} / 🟡 ${R_MIN}${SEV_NOTE}"
      if [ "$MODE" = "fallback-to-claude" ]; then
        echo "> ⚠️ 跨模型补位链未成功（\`${FAIL_CHAIN:-codex 不可用}\`），本次由 Claude 自审补位。**失去跨模型价值**（Claude 自审有相同认知偏差）。若 failchain 非额度耗尽，可能是复发 bug 需排查。"
      elif [ "$MODE" = "fallback-to-agy" ] || [ "$MODE" = "agy-only" ]; then
        echo "> ℹ️ 本次由 Antigravity CLI（Gemini）补位完成。**跨模型价值保留**（Gemini ≠ GPT ≠ Claude）。"
      fi
      echo "全文 → [reviews/${SHORT_SHA}.md](reviews/${SHORT_SHA}.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）"
      echo ""
      echo "---"
    } >> docs/ai-cto/REVIEW-QUEUE.md
    echo "$TS | sha=${SHORT_SHA} | mode=$MODE | reviewer=$REVIEWER | bytes=${#OUTPUT}${FAIL_CHAIN:+ | failchain=$FAIL_CHAIN}" \
      >> docs/ai-cto/CODEX-REVIEW-LOG.md

    # v3.10.1 fix: 计量回写 .evolve-cost-month.json（飞轮发现 cost counter 死）
    # v4.4: 仅 codex 主路径入账 codex_token_cents —— agy/claude 补位不烧 codex 配额，
    #       混入会虚增月度 cost cap（宪法 $20/月）触发过早降级。
    COST_FILE="docs/ai-cto/.evolve-cost-month.json"
    # v4.5: 前缀匹配（codex-*）替代精确模型名 —— 模型升级只改上面的赋值，不再 4 处联动
    if [ "$REVIEWER" != "${REVIEWER#codex-}" ]; then
      # v4.4d FIX3: bootstrap 计量文件 —— 主工作区 .gitignore 排除该文件 → 从不存在 →
      # 旧 `[ -f "$COST_FILE" ]` 守卫使写回从不触发 → cost cap（宪法 $20/月）静默失效 32+ 天。
      # 缺则先建当月零账本（放 codex reviewer 分支内，非 codex 路径不建 —— 它们不烧 codex 配额）。
      [ -f "$COST_FILE" ] || printf '{"month":"%s","codex_token_cents":0,"cap_cents":2000,"reviews_count":0,"exceeded":false,"schema":"v3.10.1"}\n' "$(date +%Y-%m 2>/dev/null || echo unknown)" > "$COST_FILE"
      MONTH=$(date +%Y-%m 2>/dev/null || echo unknown)
      # bytes → cents: 估算 $0.01/KB（gpt-5.6 Sol output $30/M token ≈ $0.0075/KB @4字节/token，取整保守）
      ADD_CENTS=$(( ${#OUTPUT} / 100 ))
      [ "$ADD_CENTS" -lt 1 ] && ADD_CENTS=1  # 至少 1 cent/次

      # 读现状（用 sed，避免 jq 依赖）— 月度 reset 检查
      CUR_MONTH=$(sed -nE 's/.*"month"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' "$COST_FILE" | head -1)
      if [ "$CUR_MONTH" != "$MONTH" ]; then
        # 月份变了 → reset
        printf '{"month":"%s","codex_token_cents":%d,"cap_cents":2000,"reviews_count":1,"exceeded":false,"schema":"v3.10.1"}\n' \
          "$MONTH" "$ADD_CENTS" > "$COST_FILE"
      else
        CUR_CENTS=$(sed -nE 's/.*"codex_token_cents"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' "$COST_FILE" | head -1)
        CUR_COUNT=$(sed -nE 's/.*"reviews_count"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' "$COST_FILE" | head -1)
        CAP=$(sed -nE 's/.*"cap_cents"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' "$COST_FILE" | head -1)
        NEW_CENTS=$((${CUR_CENTS:-0} + ADD_CENTS))
        NEW_COUNT=$((${CUR_COUNT:-0} + 1))
        EXCEEDED=$([ "$NEW_CENTS" -gt "${CAP:-2000}" ] && echo true || echo false)
        printf '{"month":"%s","codex_token_cents":%d,"cap_cents":%d,"reviews_count":%d,"exceeded":%s,"schema":"v3.10.1"}\n' \
          "$MONTH" "$NEW_CENTS" "${CAP:-2000}" "$NEW_COUNT" "$EXCEEDED" > "$COST_FILE"
      fi
    fi
  else
    echo "$TS | sha=${SHORT_SHA} | mode=${MODE:-no-reviewer-available} | reviewer=none" \
      >> docs/ai-cto/CODEX-REVIEW-LOG.md
    exit 0  # 没 review 结果 → 后续 PR 同步无意义
  fi

  # ============================================================
  # 7. 🆕 PR autopilot — 不需要 reviewer 介入也能自动跑
  # ============================================================
  # 触发条件（全部满足）：
  #   - gh CLI 可用 + gh auth 已登录
  #   - 当前 branch 非 main/master
  #   - 至少有 1 个 commit ahead of base
  # 行为：
  #   - 若无 open PR → 自动 push + gh pr create（auto-generated title/body）
  #   - 若有 open PR → 跳过创建
  #   - 用 sha marker 防止重复 comment
  # 关闭：在 settings.local.json 关闭 Stop hook，或设 NO_PR_AUTOPILOT=1
  if [ "$HAS_GH" = "1" ] && [ "${NO_PR_AUTOPILOT:-0}" != "1" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [ -n "$BRANCH" ] && [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ] && [ "$BRANCH" != "HEAD" ]; then

      # 7a. 检测 PR 是否存在
      PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null)

      # 7b. 不存在则自动开 PR（先 push）
      if [ -z "$PR_NUMBER" ]; then
        # 推 branch（首次或更新）
        git push -u origin "$BRANCH" 2>&1 | tail -3 >> docs/ai-cto/CODEX-REVIEW-LOG.md

        # 自动生成 title（从最近 commit message）+ body（从最近 commits）
        AUTO_TITLE=$(git log -1 --format=%s)
        AUTO_BODY=$(printf "## Summary\n\n%s\n\n## Recent commits\n\n%s\n\n---\n\n_由 codex-bridge autopilot 自动开启。codex review 见下方 comment。_" \
          "$(git log -1 --format=%b | head -20)" \
          "$(git log --format='- %h %s' main..HEAD 2>/dev/null | head -10 || git log --format='- %h %s' HEAD~5..HEAD)")

        gh pr create --title "$AUTO_TITLE" --body "$AUTO_BODY" 2>&1 | tail -3 >> docs/ai-cto/CODEX-REVIEW-LOG.md
        PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null)
        if [ -n "$PR_NUMBER" ]; then
          echo "$TS | sha=${SHORT_SHA} | mode=pr-autopilot-created | pr=#${PR_NUMBER}" \
            >> docs/ai-cto/CODEX-REVIEW-LOG.md
        fi
      fi

      # 7c. 同步 review 到 PR comment（按 sha 去重，v3.8 加调试日志）
      if [ -n "$PR_NUMBER" ]; then
        MARKER="<!-- codex-bridge:${SHORT_SHA} -->"
        echo "$TS | sha=${SHORT_SHA} | step=pr-comment-check | pr=#${PR_NUMBER} | marker=$MARKER" \
          >> docs/ai-cto/CODEX-REVIEW-LOG.md

        # 查重：用 gh api 看 comments，找 marker
        # 注意：grep -c 返回非零时 || echo 0 兜底
        EXISTING=$(gh api "repos/{owner}/{repo}/issues/${PR_NUMBER}/comments" --jq ".[].body" 2>/dev/null | grep -c "$MARKER" 2>/dev/null)
        EXISTING="${EXISTING:-0}"
        echo "$TS | sha=${SHORT_SHA} | step=existing-check | found=$EXISTING" \
          >> docs/ai-cto/CODEX-REVIEW-LOG.md

        if [ "$EXISTING" = "0" ]; then
          # 写到临时文件再 post（避免 stdin pipe 在 disown 后台环境下失效）
          COMMENT_FILE="/tmp/codex-comment-${SHORT_SHA}.md"
          {
            echo "$MARKER"
            echo "## 🤖 Codex Cross-Model Review (\`$SHORT_SHA\`)"
            echo ""
            echo "**Reviewer**: \`$REVIEWER\` | **Mode**: \`$MODE\` | $TS"
            if [ "$MODE" = "fallback-to-claude" ]; then
              echo ""
              echo "> ⚠️ codex/agy 均报错（\`${FAIL_CHAIN:-codex 不可用}\`），本次由 Claude 补位。失去跨模型价值（同模型自审）；若非额度耗尽，可能是复发问题需排查。"
            elif [ "$MODE" = "fallback-to-agy" ] || [ "$MODE" = "agy-only" ]; then
              echo ""
              echo "> ℹ️ 本次由 Antigravity CLI（Gemini）补位完成。跨模型价值保留（Gemini ≠ GPT ≠ Claude）。"
            elif [ "$MODE" = "claude-only" ]; then
              echo ""
              echo "> ℹ️ codex 未装/未登录（从未尝试 codex/agy），本次由 Claude 完成。"
            fi
            echo ""
            echo "$OUTPUT"
            echo ""
            echo "---"
            echo "_由 \`.agents/skills/codex-bridge/run.sh\` 本地跑（订阅 auth），非 CI。autopilot 自动同步。_"
          } > "$COMMENT_FILE"

          # 用文件路径调 gh pr comment（更稳定）
          POST_OUT=$(gh pr comment "$PR_NUMBER" --body-file "$COMMENT_FILE" 2>&1)
          POST_STATUS=$?

          echo "$TS | sha=${SHORT_SHA} | step=pr-comment-post | status=$POST_STATUS | out=$(echo "$POST_OUT" | tr '\n' ' ' | head -c 200)" \

codex
The model pinning works on the default paths, but an explicitly supported agy model override can produce a false reviewer identity and incorrect cross-model assurance.

Review comment:

- [P1] Derive the agy reviewer label from the selected model — C:\projects\ai-playbook\.agents\skills\codex-bridge\run.sh:193-193
  When `AGY_REVIEW_MODEL` is overridden to a supported non-Gemini model such as `claude-sonnet-4-6`, the review is still recorded as `agy-gemini` and described as preserving cross-model value. For Claude-authored changes this can incorrectly present a same-family review as independent; derive the label and fallback messaging from `AGY_REVIEW_MODEL`, or restrict overrides to Gemini models.
The model pinning works on the default paths, but an explicitly supported agy model override can produce a false reviewer identity and incorrect cross-model assurance.

Review comment:

- [P1] Derive the agy reviewer label from the selected model — C:\projects\ai-playbook\.agents\skills\codex-bridge\run.sh:193-193
  When `AGY_REVIEW_MODEL` is overridden to a supported non-Gemini model such as `claude-sonnet-4-6`, the review is still recorded as `agy-gemini` and described as preserving cross-model value. For Claude-authored changes this can incorrectly present a same-family review as independent; derive the label and fallback messaging from `AGY_REVIEW_MODEL`, or restrict overrides to Gemini models.
