---
name: cto-init
description: 一键初始化目标项目的完整 CTO 系统（CLAUDE.md + commands + skills + settings + 检测技术栈）
argument-hint: "<目标项目绝对路径>"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash(*)"]
model: opus
disable-model-invocation: false
---
# 一键初始化目标项目 CTO 系统

你是 AI Playbook 的安装助手。用户要在目标项目中启用完整的 CTO + Tech Lead 指挥系统。

## 参数

`$ARGUMENTS` = 目标项目路径（必须提供）

如果 `$ARGUMENTS` 为空，询问用户提供目标项目的绝对路径。

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

#### 3b. .claude/commands/（斜杠命令 — 全部复制）
- 创建目标项目 `.claude/commands/` 目录
- 复制所有 `.claude/commands/*.md`（除了 `cto-init.md` 和 `cto-relink-all.md` 本身）
- 包括（v3.8 起 21 个）：cto-start, cto-resume, cto-refresh, cto-link, cto-review, cto-spec,
  cto-constitution, cto-vibe-check, cto-harness-audit, cto-eval, cto-design, cto-skills,
  cto-audit, cto-models, cto-release, cto-image, cto-replay, cto-canary, cto-cross-review,
  **cto-doctor**（v3.8 关键自检命令）

#### 3c. .claude/settings.json（v3.8 Claude Code 配置）
- 如果目标项目没有 `.claude/settings.json`，复制 v3.8 版过去
- 如果已有 v3.7 版（含 `$CLAUDE_TOOL_INPUT`）：
  1. 检测：`grep -q CLAUDE_TOOL_INPUT .claude/settings.json` → 是 → 提示"v3.7 silent hooks，需升级"
  2. 备份：`cp .claude/settings.json .claude/settings.json.v3.7.bak`
  3. 替换为 v3.8 版（调外置脚本 + stdin JSON）
- 如果已有 v3.8 版（含 `.claude/hooks/`）→ 跳过

#### 3d. .claude/hooks/（v3.8 enforcement 脚本 — 必须）
- 创建目标项目 `.claude/hooks/lib/`
- 复制 `lib/common.sh`（stdin JSON 公用库）
- 复制 7 个 guard scripts:
  - `forbidden-guard.sh` — exit 2 拦 §32.1 路径
  - `bypass-guard.sh` — 防 #40117 6+ 种绕过
  - `branch-guard.sh` — 铁律 #8 main/master 保护
  - `test-lock-guard.sh` — §20.3 软提醒
  - `vibe-prompt-guard.sh` — UserPromptSubmit 红线
  - `eval-gate.sh` — 铁律 #12 PostToolUse
  - `trajectory-logger.sh` — 真 jsonl 写入（修 §44）
- `chmod +x` 全部 hooks
- 复制 `scripts/safe-grep.sh`（grep exit code 区分）

#### 3e. .agents/skills/（跨平台 Skill — 全部复制）
- 创建目标项目 `.agents/skills/` 目录
- 复制所有 skill 子目录（含 SKILL.md）
- 包括：ux-quality-checklist, i18n-enforcement, design-system-enforcement,
  accessibility-checklist, release-readiness, codex-bridge

#### 3f. .claude/skills/（v3.8 paths-triggered enforcement skills — 必须）
- 创建目标项目 `.claude/skills/`
- 复制 5 个 v3.8 skills（每个一个目录含 SKILL.md）：
  - `forbidden-policy/` — paths: auth/** payment/** 等
  - `test-lock-rules/` — paths: tests/** *.test.* 等
  - `eval-gate-policy/` — paths: .claude/commands/** CLAUDE.md 等
  - `constitution-loader/` — description: spec/architecture/feature trigger
  - `handbook-search/` — description: §NN.M / 手册 trigger

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
  2. 7 个 hooks 文件存在
  3. **端到端 enforcement 测试**（exit 2 真生效）
  4. trajectory log v3.8 schema
  5. settings.json 已升级（不含 `$CLAUDE_TOOL_INPUT`）
  6. 5 个 paths-triggered skills 文件存在
- 输出 health score；< 80% 时报告失败项

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
## ✅ CTO 系统已安装到 [目标项目路径]

### 已复制文件
- [x] CLAUDE.md（手册路径: ...）
- [x] .claude/commands/ （10 个斜杠命令）
- [x] .claude/settings.json
- [x] .agents/skills/ （5 个 Skill）

### 检测到的技术栈
- [自动检测结果]

### 下一步
1. 检查 CLAUDE.md 中的 `项目特定规则` 是否需要补充
2. 在目标项目中打开 Claude Code
3. 运行 `/cto-start` 开始第零轮
```

### 6. 询问是否立即启动

询问用户是否要切换到目标项目并运行 `/cto-start`。

## 注意事项

- 不修改 ai-playbook 仓库本身的任何文件
- 不复制 `cto-init.md` 到目标项目（初始化命令只在 ai-playbook 中使用）
- 如果目标项目不是 git 仓库，建议用户先 `git init`
- 所有路径使用当前操作系统的格式（Windows 用 `\`，Unix 用 `/`）
