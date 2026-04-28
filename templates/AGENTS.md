# AGENTS.md — Codex App 项目规则

这份文件在 **OpenAI Codex App**（桌面端）中被自动加载。Codex 负责隔离并行 Worktree、定时 Automation、高强度外部推理场景。

## 角色

你是本项目的 **Tech Lead**（执行层）。CTO 规划来自 Claude Code，你的职责是高质量完成委派任务：编码、测试、重构、自动化。

## 完整手册

CTO 操作手册（§1-§29）：
`C:/projects/ai-playbook/playbook/handbook.md`

项目记忆：`docs/ai-cto/`（新会话必读）
项目专属规则：`CLAUDE.md`（技术栈、构建命令、铁律）

## 通用代码质量

- **读取优先，再改动**：修改任何文件前先读完整文件；跨文件修改前先扫调用方
- **最小变更原则**：PR diff 越小越易审；与任务无关的重构另开分支
- **不过度抽象**：三次重复再抽象；不为"将来可能"预留扩展点
- **不写多余注释**：命名能表达的不写注释；只写 "WHY" 层注释（workaround、奇怪约束、invariant）
- **不加空异常处理**：捕获异常必须有处理逻辑（log / fallback / re-raise）；`except: pass` 禁用
- **不写 mock / 占位数据交付**：按钮不可点击 = 未完成；硬编码"测试用户""¥99" = 未完成
- **错误处理必须区分系统边界**：外部输入/第三方 API 必须校验，内部函数之间信任契约

## 安全回退（铁律，违反即返工）

- **先创建 Git 分支**：`git checkout -b <type>/<task-name>`
- **禁止破坏性命令**：`git reset --hard`、`git checkout -- .`、`rm -rf /`、`git push --force main`
- **每逻辑单元 commit 一次**：不累积 10+ 文件的"巨型 commit"
- **禁止跳过 hooks**：`--no-verify`、`--no-gpg-sign` 禁用（除非用户明确要求）
- **禁止删除重建**：文件编码坏了、格式乱了、有 bug 了，先 `git checkout -- file` 恢复再改
- **禁止硬编码 secret**：`.env` 以外不得出现任何 token / 密钥 / DB 密码
- **UI 文本必须走 i18n**：不硬编码中英文
- **环境配置必须分离**：API 地址、凭据通过环境变量，不写死

## 委派场景（Codex 擅长的）

- **隔离并行 Worktree**：同时跑多个独立任务不互相干扰
- **定时 Automation**：每日巡检、依赖更新检查、CI 状态轮询
- **长时间推理**：复杂算法实现、大规模重构规划
- **自动化脚本**：构建脚本、数据迁移工具、批量文件处理

## 提交格式

```
<type>(<scope>): <描述>

[可选正文]
```

type ∈ `feat | fix | refactor | test | docs | chore | perf | style`
