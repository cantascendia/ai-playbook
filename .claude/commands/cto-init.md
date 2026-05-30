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
| **minimal** | 刚起步 / 小项目 / 只想要安全护栏 | **全部 hooks**（红线层，强制）+ CLAUDE.md + settings.json + 核心 8 命令（start/resume/spec/review/release/vibe-check/doctor/constitution）+ 5 个 enforcement skills + scripts SSOT |
| **full**（默认，向后兼容） | 深度使用 / 多平台 / 需要飞轮·设计·发布全套 | minimal 的一切 + 全部 advanced 命令（canary/replay/image/design/models/cross-review/evolve/skills/harness-audit/audit/link）+ 全部 .agents/skills |

**铁律（任何档位都不可省）**：`.claude/hooks/` **整目录复制**——10 个红线 guard 一个都不能漏（见下 §3d）。
缺省 `--profile`：默认 `full`（不破坏现有安装流）。新/小项目**推荐显式 `--profile=minimal`**。

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

#### 3b. .claude/commands/（斜杠命令 — 按档位）
- 创建目标项目 `.claude/commands/` 目录
- **永不复制** `cto-init.md` 和 `cto-relink-all.md`（这俩只在 ai-playbook 主仓用）
- **不要硬编码命令清单数字**——真实数量以 `docs/ai-cto/COUNTS.md` 为准（当前 23 个 cto-*，去掉 init/relink-all 后 21 个可分发）。安装后用 `ls .claude/commands/cto-*.md | wc -l` 报实际数。

**`--profile=full`（默认）**：复制全部可分发命令：
```bash
mkdir -p "$TARGET/.claude/commands"
for f in .claude/commands/cto-*.md; do
  b=$(basename "$f")
  case "$b" in cto-init.md|cto-relink-all.md) continue ;; esac
  cp "$f" "$TARGET/.claude/commands/$b"
done
```

**`--profile=minimal`**：只复制核心 8 命令（其余 advanced 命令用户日后可 `/cto-init --profile=full` 或手动补）：
```bash
mkdir -p "$TARGET/.claude/commands"
for b in cto-start cto-resume cto-spec cto-review cto-release cto-vibe-check cto-doctor cto-constitution; do
  cp ".claude/commands/$b.md" "$TARGET/.claude/commands/$b.md"
done
```

#### 3c. .claude/settings.json（v3.8 Claude Code 配置）
- 如果目标项目没有 `.claude/settings.json`，复制 v3.8 版过去
- 如果已有 v3.7 版（含 `$CLAUDE_TOOL_INPUT`）：
  1. 检测：`grep -q CLAUDE_TOOL_INPUT .claude/settings.json` → 是 → 提示"v3.7 silent hooks，需升级"
  2. 备份：`cp .claude/settings.json .claude/settings.json.v3.7.bak`
  3. 替换为 v3.8 版（调外置脚本 + stdin JSON）
- 如果已有 v3.8 版（含 `.claude/hooks/`）→ 跳过

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

#### 3e. .agents/skills/（跨平台 Skill — **仅 full 档**）

> minimal 档跳过（Antigravity/Codex 跨平台是 advanced）。full 档整目录复制：
```bash
[ "$PROFILE" = "full" ] && cp -r .agents/skills "$TARGET/.agents/skills"
```
full 档含：ux-quality-checklist, i18n-enforcement, design-system-enforcement,
accessibility-checklist, release-readiness, codex-bridge。
**例外**：`codex-bridge`（§48 跨模型 review）若用户只用 Claude Code 也可不装——属 opt-in。

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

### 5. 输出安装报告

```
## ✅ CTO 系统已安装到 [目标项目路径]（profile=[minimal|full]）

### 已复制文件（数字用实际 ls 统计，不要硬编码）
- [x] CLAUDE.md（手册路径: ...）
- [x] .claude/hooks/ （[N] 个 .sh，含 5 安全红线 ✓）← 必须等于源数量
- [x] .claude/commands/ （[N] 个 cto-* 命令）
- [x] .claude/skills/ （[N] 个 enforcement skill）
- [x] .claude/settings.json（含 mcp__.* matcher ✓）
- [full 档] .agents/skills/ （[N] 个跨平台 Skill）
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
