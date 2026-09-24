# 状态

最后更新：2026-09-24

## 现在

**v5 减法重构**（ADR-013，分支 `v5/demolition`）。harness 从「守自己的文字」改成「只守外部破坏」，
分发改为原生 plugin，常驻上下文从 ~170KB 降到约 8KB。本机已通过 `scripts/install.mjs` 部署（plugin `cto@ai-playbook` 5.0.0）。
v4 全部内容在 tag `v4-final`。

## 下一步

- [ ] 在其余机器上运行 `node scripts/install.mjs`（它会清掉 v4 的全局 hook）
- [ ] 合并下游清理 MR：InterviewLens !1、vokadrop !1（`scripts/migrate-v4-project.mjs` 生成；InterviewLens 独有的 2 条教训已收进 plugin/lessons）
- [ ] `D:\projects\ai-playbook` 是 v4 的旧克隆（15 个未提交改动），确认无用后删除
- [ ] 在 GitHub 仓库启用 Codex / Gemini 的 PR review 集成（需要在 chatgpt.com/codex 和 Gemini Code Assist 里用账号授权，agent 做不了）
- [ ] GitLab 镜像：`git push gitlab main` 保持同步
- [ ] 实测 Codex hook payload 的工具名（本机 codex 沙箱创建进程被拒，未能验证 matcher）

## 已知问题

- `~/.claude/settings.json` 的 `autoMode.environment` 是从 `D:\projects\jianli` 生成的，写着「trusted repo = jianli」，
  却作用于所有项目；里面还描述了个人求职资料的位置。建议在 Settings 里重新生成或清空（涉及个人数据，未代改）。
