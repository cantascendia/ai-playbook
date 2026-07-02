---
name: cto-init
description: 一键初始化目标项目的完整 CTO 系统（CLAUDE.md + commands + skills + settings + 检测技术栈）
argument-hint: "<目标项目绝对路径> [--profile=minimal|full]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash(*)"]
model: opus
disable-model-invocation: false
---
# 一键初始化目标项目 CTO 系统

你是 AI Playbook 的安装助手。用户要在目标项目中启用完整的 CTO + Tech Lead 指挥系统。

## 参数

`$ARGUMENTS` = 目标项目路径（必须提供）+ 可选 `--profile=minimal|full`

如果 `$ARGUMENTS` 为空，询问用户提供目标项目的绝对路径。

### 分发档位（v3.13 分层 — core 强制 / advanced 可选）

> 战略决策（2026-05-30 SOTA team 审计）：本系统作为"装进任意子项目的标准件"过重。
> 真正的过度工程是"不区分 self vs subproject 就全量分发"。故按档位分发，**安全红线全档强制**。

| 档位 | 给谁 | 装什么 |
|---|---|---|
| **minimal** | 刚起步 / 小项目 / 只想要安全护栏 | **全部 hooks**（红线层，强制）+ CLAUDE.md + settings.json + 核心 8 命令（start/resume/spec/review/release/audit/doctor/constitution）+ 5 个 enforcement skills + scripts SSOT |
| **full**（默认，向后兼容） | 深度使用 / 需要飞轮·设计·发布全套 | minimal 的一切 + 全部 advanced 命令（canary/replay/image/design/models/evolve/skills/link）|

**铁律（任何档位都不可省）**：`.claude/hooks/` **整目录复制**——10 个红线 guard 一个都不能漏（见下 §3d）。
缺省 `--profile`：默认 `full`（不破坏现有安装流）。新/小项目**推荐显式 `--profile=minimal`**。

### 平台范围（v3.13 Q3 — 默认只 Claude Code，AG/Codex opt-in）

> 战略决策（2026-05-30）：绝大多数装机项目**只用 Claude Code**。三平台对称分发会让 Antigravity/Codex
> 配置成为死重。故**默认只分发 Claude Code 配置**（含 §48 codex-bridge 也不默认装），AG/Codex 显式 opt-in：

| 平台 flag | 额外装 |
|---|---|
| （默认，无 flag） | 仅 Claude Code：`.claude/*` + CLAUDE.md + scripts。**不**装 `.agents/skills`（跨平台 skill 与 `.claude/skills` 重复） |
| `--with-codex` | + `.agents/skills/codex-bridge`（§48 跨模型 review，需 codex CLI）+ `templates/AGENTS.md` → 目标 `AGENTS.md` |
| `--with-antigravity` | + `templates/GEMINI.md` → 目标 `GEMINI.md`（+ `.agents/rules/` 若存在） |

> 注：5 个跨平台 skill（accessibility/i18n/design-system/release-readiness/ux-quality）的 `.claude/skills`
> 版本已随 minimal/full 装；`.agents/skills` 是其镜像（§42 / sync-skills.sh），Claude-only 项目无需。

## 执行步骤

### 1. 验证环境

- 确认 ai-playbook 仓库路径（当前仓库根目录）
- 确认目标项目路径存在且是有效目录
- 检查目标项目是否已有 CLAUDE.md（如有，提示是否覆盖）

### 2. 检测 ai-playbook 路径

自动检测当前 ai-playbook 仓库的绝对路径，用于写入 CLAUDE.md 的手册引用。

### 3. 复制并配置文件

按以下顺序执行：

#### 3a. CLAUDE.md（核心 — 必须）
- 复制 `templates/CLAUDE.md` → 目标项目根目录 `CLAUDE.md`
- **不再硬编码绝对路径**：模板已含 fallback 多路径逻辑（手册 §29.8）
- 但**写入 LINK 区块**：把当前 ai-playbook 路径作为本机缓存写入 `<!-- AI-PLAYBOOK-LINK:START -->` 区块
- 这样：当前机器立即可用 + 跨机器迁移时 fallback 列表兜底 + `/cto-link` 可重新发现

#### 3b. .claude/commands/（斜杠命令 — 按档位，v3.14 命令 23→18 合并后分核心/高级）
- 创建目标项目 `.claude/commands/` 目录
- **永不复制** `cto-init.md`（安装器只在主仓用；cto-relink-all 已合并入 cto-link --all）
- **不硬编码数字**——真实数量以 `docs/ai-cto/COUNTS.md` 为准。安装后 `ls .claude/commands/cto-*.md | wc -l` 报实际数。
- v3.14 合并：cross-review→`cto-review --cross`、relink-all→`cto-link --all`、refresh→`cto-resume --refresh`、vibe-check+harness-audit→`cto-audit --vibe|--harness`。

**`--profile=minimal`**：核心 8（安全 + 工作流最小集）：
```bash
mkdir -p "$TARGET/.claude/commands"
for b in cto-start cto-resume cto-spec cto-review cto-release cto-audit cto-doctor cto-constitution; do
  cp ".claude/commands/$b.md" "$TARGET/.claude/commands/$b.md"
done
```

**`--profile=full`（默认）**：核心 11（minimal 8 + cto-link / cto-eval / cto-evolve）：
```bash
mkdir -p "$TARGET/.claude/commands"
for b in cto-start cto-resume cto-spec cto-review cto-release cto-audit cto-doctor cto-constitution cto-link cto-eval cto-evolve; do
  cp ".claude/commands/$b.md" "$TARGET/.claude/commands/$b.md"
done
```

**`--with-advanced`**（opt-in，低频"仪式"命令）：额外加 6 个：
```bash
[ "$WITH_ADVANCED" = "1" ] && for b in cto-canary cto-replay cto-image cto-design cto-skills cto-models; do
  cp ".claude/commands/$b.md" "$TARGET/.claude/commands/$b.md"
done
```
> 默认不装 advanced（多数项目用不到 canary/replay/image/design/skills/models）。需要时 `--with-advanced` 或单独 cp。

#### 3c. .claude/settings.json（v3.8 Claude Code 配置）

> 🔴 **fresh-install P0 修复**：旧版只说"复制 v3.8 版过去"但**没有 cp 命令**，且当时 `templates/settings.json`
> 不存在 → 新项目装出**无 settings.json** 的空壳（hooks / statusLine / outputStyle 全失效）。
> 修复：`templates/settings.json` 已落地（含修好的 SessionStart gates），fresh install **显式 cp**。

**fresh install（目标无 `.claude/settings.json`）**：直接从模板复制
```bash
mkdir -p "$TARGET/.claude"
cp "$PLAYBOOK/templates/settings.json" "$TARGET/.claude/settings.json"
```
> `$PLAYBOOK` = 当前 ai-playbook 仓库根（§2 检测到的路径）。模板已含正确的 SessionStart / PreToolUse
> （`mcp__.*` matcher）/ PostToolUse eval-gate，无需再手动拼。

**upgrade（目标已有旧版）**：保留既有备份逻辑
- 如果已有 v3.7 版（含 `$CLAUDE_TOOL_INPUT`）：
  1. 检测：`grep -q CLAUDE_TOOL_INPUT "$TARGET/.claude/settings.json"` → 是 → 提示"v3.7 silent hooks，需升级"
  2. 备份：`cp "$TARGET/.claude/settings.json" "$TARGET/.claude/settings.json.v3.7.bak"`
  3. 替换为模板版：`cp "$PLAYBOOK/templates/settings.json" "$TARGET/.claude/settings.json"`（调外置脚本 + stdin JSON）
- 如果已有 v3.8 版（含 `.claude/hooks/`）→ 跳过

#### 3c-2. .claude/statusline.sh + .claude/output-styles/cto.md（settings.json 依赖 — 全档强制）

> 🔴 **fresh-install P0 修复**：`settings.json` 引用 `.claude/statusline.sh`（statusLine.command）+
> `outputStyle: "cto"`（→ `.claude/output-styles/cto.md`），但旧版 cto-init **两者都没 cp** →
> 装完 statusLine 报"脚本不存在"、outputStyle "cto" 找不到 → 静默降级。两文件所有档位都要复制。

```bash
# statusLine 脚本（settings.json statusLine.command 引用）
cp "$PLAYBOOK/.claude/statusline.sh" "$TARGET/.claude/statusline.sh"
chmod +x "$TARGET/.claude/statusline.sh" 2>/dev/null || true
# outputStyle "cto"（settings.json outputStyle 引用）
mkdir -p "$TARGET/.claude/output-styles"
cp "$PLAYBOOK/.claude/output-styles/cto.md" "$TARGET/.claude/output-styles/cto.md"
```

#### 3d. .claude/hooks/（红线层 — 全档强制，**整目录复制**）

> 🔴 **v3.13 P0 修复（SOTA team 审计发现的安装链断裂）**：旧版手工列 7 个 guard，
> 漏了 immutable-guard / destructive-action-guard / mcp-guard 三个红线 → 新项目装出
> "红线层有名无实"的残缺系统，而 CONSTITUTION 还宣称保护已生效 = 对新项目撒谎。
> **根因是手工维护清单**。修复：**整目录 `cp -r`，让漏装结构上不可能**。绝不再手工列。

```bash
# 整目录复制 — 含 lib/common.sh + 全部 *.sh guard（10 个）
mkdir -p "$TARGET/.claude"
cp -r .claude/hooks "$TARGET/.claude/hooks"
chmod +x "$TARGET"/.claude/hooks/*.sh 2>/dev/null || true
```

复制后**必须验证数量**（防 cp 部分失败）：
```bash
SRC_N=$(ls .claude/hooks/*.sh | wc -l)            # 源（当前 10，见 COUNTS.md）
DST_N=$(ls "$TARGET"/.claude/hooks/*.sh | wc -l)  # 目标
[ "$SRC_N" = "$DST_N" ] || echo "🛑 hook 复制不完整：源 $SRC_N ≠ 目标 $DST_N — 安装失败，勿继续"
```

应装齐的 10 个 guard（清单仅供核对，**复制靠 cp -r 不靠这张表**）：
immutable / forbidden / bypass / branch / test-lock / destructive-action / **mcp-guard** / vibe-prompt / eval-gate / trajectory-logger（+ `lib/common.sh`）。
其中 **immutable / forbidden / branch / destructive-action / mcp-guard** 是安全红线，任何档位都必须在。

#### 3f. .claude/skills/（paths-triggered enforcement skills — 全档强制，整目录复制）

> 这 5 个是红线配套（被 hook 阻止后告诉 AI 怎么办），所有档位都装。整目录复制防漏：
```bash
cp -r .claude/skills "$TARGET/.claude/skills"
```
应含（核对用，复制靠 cp -r）：`forbidden-policy/` `test-lock-rules/` `eval-gate-policy/`
`constitution-loader/` `handbook-search/`（+ 其他 .claude/skills/ 下的 SKILL.md）。

#### 3f-2. .claude/agents/ + .claude/rules/（飞轮 & learned-rules 支撑 — 按档位）

> 🔴 **fresh-install P1 修复**：`templates/CLAUDE.md` 宣传飞轮（pattern-detector agent、
> `.claude/rules/learned/` Bugbot learned rules），但旧版 cto-init **既不 cp `.claude/agents/`
> 也不 cp `.claude/rules/`** → 承诺与交付不一致：新项目 CLAUDE.md 写着飞轮可用，实则 agent /
> learned-rules 目录都不在。两侧一起修：
>
> - **minimal**：只装 `.claude/rules/*.md`（3 个核心 rule — eval-gate/forbidden-paths/test-lock，
>   是红线 skill 的规则正文），**不**装 agents / learned（minimal 不含飞轮）。
> - **full**：额外装 `.claude/agents/`（5 个 sub-agent）+ `.claude/rules/learned/README.md`（飞轮教训归档骨架）。

```bash
# 全档：3 个核心 rule 正文（红线 skill 的规则文档）
mkdir -p "$TARGET/.claude/rules"
for r in eval-gate forbidden-paths test-lock; do
  cp "$PLAYBOOK/.claude/rules/$r.md" "$TARGET/.claude/rules/$r.md"
done

# full 档：飞轮 sub-agent（整目录）+ learned-rules 骨架
if [ "$PROFILE" = "full" ]; then
  cp -r "$PLAYBOOK/.claude/agents" "$TARGET/.claude/agents"
  mkdir -p "$TARGET/.claude/rules/learned"
  cp "$PLAYBOOK/.claude/rules/learned/README.md" "$TARGET/.claude/rules/learned/README.md"
fi
```
> minimal 档的 `templates/CLAUDE.md` 飞轮承诺由该模板顶部的诚实声明澄清（见 §3a 备注）——
> minimal 只装红线，飞轮/agents 需 `--profile=full` 或事后补装。

#### 3e. .agents/skills/ + 跨平台配置（**opt-in，默认不装** — v3.13 Q3）

> 默认只 Claude Code，**不**装 `.agents/skills`（跨平台 skill 与 `.claude/skills` 重复，Claude-only 无需）。
> 仅在显式 flag 时装对应平台：
```bash
# --with-codex：§48 跨模型 review + Codex 配置
if [ "$WITH_CODEX" = "1" ]; then
  mkdir -p "$TARGET/.agents/skills"
  cp -r .agents/skills/codex-bridge "$TARGET/.agents/skills/codex-bridge"
  cp templates/AGENTS.md "$TARGET/AGENTS.md"
fi
# --with-antigravity：Antigravity 配置
if [ "$WITH_ANTIGRAVITY" = "1" ]; then
  cp templates/GEMINI.md "$TARGET/GEMINI.md"
  [ -d .agents/rules ] && cp -r .agents/rules "$TARGET/.agents/rules"
fi
# 若装了任一跨平台 → 把 5 个跨平台 skill 镜像也带上（sync-skills 维持一致）
if [ "$WITH_CODEX" = "1" ] || [ "$WITH_ANTIGRAVITY" = "1" ]; then
  for s in accessibility-checklist design-system-enforcement i18n-enforcement release-readiness ux-quality-checklist; do
    mkdir -p "$TARGET/.agents/skills/$s"; cp ".agents/skills/$s/SKILL.md" "$TARGET/.agents/skills/$s/SKILL.md"
  done
fi
```

#### 3g. scripts/（SSOT + 工具）
- 创建目标项目 `scripts/`
- 复制 `forbidden-paths.txt`（SSOT，**项目可自定义补充路径**）
- 复制 `business-paths.txt`（codex-bridge 业务路径触发，**每项目应 customize**）
- 复制 `safe-grep.sh`

#### 3h. playbook/INDEX.md（handbook 索引）
- 复制到目标项目 `playbook/INDEX.md`（如果用户希望本地索引）
- 或留空，让 handbook-search skill 走 ai-playbook 主仓的 INDEX

#### 3i. 自检：跑 `/cto-doctor`
- 装完后立即跑 `cto-doctor`
- 验证：
  1. jq / gh / codex / claude 依赖
  2. **全部 hooks 文件存在**（数量 = 源 `.claude/hooks/*.sh`，当前 10；见 COUNTS.md）。
     **必查 5 个安全红线**：immutable-guard / forbidden-guard / branch-guard / destructive-action-guard / mcp-guard 都在——任何一个缺 = 安装失败。
  3. **端到端 enforcement 测试**（exit 2 真生效）：至少测 immutable-guard 拦 CONSTITUTION + destructive-action-guard 拦 `rm -rf /` + mcp-guard 拦 delete_project
  4. trajectory log v3.8 schema
  5. settings.json 已升级（不含 `$CLAUDE_TOOL_INPUT`）+ PreToolUse 含 `mcp__.*` matcher
  6. paths-triggered skills 文件存在
  7. **settings.json 依赖齐**（fresh-install P0 回归守护）：`.claude/statusline.sh` +
     `.claude/output-styles/cto.md` 都存在（settings.json 引用它们，缺 = statusLine/outputStyle 静默失效）。
  8. **rules 正文齐**（count-verify，同 hooks 模式）：全档 `.claude/rules/*.md` 数量 = 源 3
     （eval-gate/forbidden-paths/test-lock）：
     ```bash
     RSRC=$(ls "$PLAYBOOK"/.claude/rules/*.md | wc -l)        # 源核心 rule（当前 3）
     RDST=$(ls "$TARGET"/.claude/rules/*.md 2>/dev/null | wc -l)
     [ "$RDST" -ge 3 ] || echo "🛑 rules 复制不完整：目标 $RDST < 3（eval-gate/forbidden-paths/test-lock）"
     ```
  9. **full 档飞轮齐**（承诺=交付一致性守护）：`--profile=full` 时 `.claude/agents/*.md` 数量 = 源 5
     （pattern-detector/eval-runner/vibe-checker/harness-auditor/reliability-auditor）+
     `.claude/rules/learned/README.md` 存在。minimal 档跳过本项（飞轮不装是预期）：
     ```bash
     if [ "$PROFILE" = "full" ]; then
       ASRC=$(ls "$PLAYBOOK"/.claude/agents/*.md | wc -l)     # 源 sub-agent（当前 5）
       ADST=$(ls "$TARGET"/.claude/agents/*.md 2>/dev/null | wc -l)
       [ "$ASRC" = "$ADST" ] || echo "🛑 agents 复制不完整：源 $ASRC ≠ 目标 $ADST"
       [ -f "$TARGET/.claude/rules/learned/README.md" ] || echo "🛑 飞轮 learned-rules 骨架缺失（templates/CLAUDE.md 承诺飞轮却未装）"
     fi
     ```
- 输出 health score；< 80% 时报告失败项。**5 个安全红线缺任一 → health 直接判 fail，不计分**。

### 4. 检测项目技术栈

扫描目标项目根目录，自动检测：
- `package.json` → Node.js/前端项目
- `composer.json` → PHP 项目
- `pubspec.yaml` → Flutter/Dart 项目
- `requirements.txt` / `pyproject.toml` → Python 项目
- `go.mod` → Go 项目
- `Cargo.toml` → Rust 项目
- `pom.xml` / `build.gradle` → Java 项目

根据检测结果，预填 CLAUDE.md 的 `技术栈` 和 `构建和测试` 区域。

### 4.5 MCP token 税审计（v3.13 A6）

> 研究：5–10 个 MCP server 环境，第一次输入前就消耗 **50k–143k tokens**（单工具 schema 500–820 tokens）。
> §4.3 已有 ToolSearch 延迟加载策略，但 cto-init 此前未量化 MCP 税。规模化（27+ 项目）影响显著。

扫目标项目 `.mcp.json` + `.claude/settings.json` 的 `enabledMcpjsonServers`：

```bash
# 列已启用的 MCP server（这些会预加载所有工具 schema 进 context）
ENABLED=$(grep -oE '"enabledMcpjsonServers"[^]]*\]' "$TARGET/.claude/settings.json" 2>/dev/null)
MCP_COUNT=$(grep -oE '"[a-zA-Z0-9_-]+"' "$TARGET/.mcp.json" 2>/dev/null | wc -l)
```

- 若 `enabledMcpjsonServers` 非空且 server ≥ 3 → 提示："预计 MCP schema 预加载约 [N×600] tokens。
  建议：低频 MCP 从 `enabledMcpjsonServers` 移除，改用 `ToolSearch` 按需加载（§4.3，官方 ~85% 节省）。"
- 默认建议：`enabledMcpjsonServers: []`（全部走 ToolSearch），仅高频 server 显式启用。
- 写入安装报告的"MCP token 税"一节。

### 5. 输出安装报告

```
## ✅ CTO 系统已安装到 [目标项目路径]（profile=[minimal|full]）

### 已复制文件（数字用实际 ls 统计，不要硬编码）
- [x] CLAUDE.md（手册路径: ...）
- [x] .claude/hooks/ （[N] 个 .sh，含 5 安全红线 ✓）← 必须等于源数量
- [x] .claude/commands/ （[N] 个 cto-* 命令）
- [x] .claude/skills/ （[N] 个 enforcement skill）
- [x] .claude/settings.json（从 templates/settings.json，含 mcp__.* matcher ✓）
- [x] .claude/statusline.sh + .claude/output-styles/cto.md（settings.json 依赖 ✓）
- [x] .claude/rules/ （[N] 个核心 rule 正文）
- [full 档] .claude/agents/ （[N] 个飞轮 sub-agent）+ .claude/rules/learned/README.md
- [full 档] .agents/skills/ （[N] 个跨平台 Skill，仅 --with-codex/--with-antigravity）
- [x] scripts/ （forbidden-paths.txt / business-paths.txt / safe-grep.sh）

### 检测到的技术栈
- [自动检测结果]

### cto-doctor 自检
- health score: [N]/100（5 安全红线全在 = 通过门槛）

### 下一步
1. 检查 CLAUDE.md 中的 `项目特定规则` 是否需要补充
2. 在目标项目中打开 Claude Code
3. 运行 `/cto-start` 开始第零轮
4. [minimal 档] 需要飞轮/设计/发布全套时：`/cto-init <路径> --profile=full` 补装
```

### 6. 询问是否立即启动

询问用户是否要切换到目标项目并运行 `/cto-start`。

## 注意事项

- 不修改 ai-playbook 仓库本身的任何文件
- 不复制 `cto-init.md` 到目标项目（初始化命令只在 ai-playbook 中使用）
- 如果目标项目不是 git 仓库，建议用户先 `git init`
- 所有路径使用当前操作系统的格式（Windows 用 `\`，Unix 用 `/`）
