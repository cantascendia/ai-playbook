# 状态

最后更新：2026-09-24

## 现在

**v5 减法重构已合并**（ADR-013，PR #72，2026-09-24）。harness 从「守自己的文字」改成「只守外部破坏」，
分发改为原生 plugin，常驻上下文从 ~170KB 降到约 8KB。本机已通过 `scripts/install.mjs` 部署（plugin `cto@ai-playbook` 5.0.6）。
经五轮 `codex review` 跨模型审：共 7 个 P1 + 11 个 P2，全部已修（集中在安装/迁移脚本的失败路径；另有 `rm -rf ~/` 这个 v4 起就存在的漏拦）。第五轮已无 P1。
v4 全部内容在 tag `v4-final`。

## 下一步

- [ ] 在其余机器上运行 `node scripts/install.mjs`（它会清掉 v4 的全局 hook）
- [x] 下游清理 MR 已合并：InterviewLens !1、vokadrop !1。两个项目本地仍在各自的 feature 分支上，那些分支合入 main 前，项目级 v4 hook 仍会与 plugin 一起跑
- [ ] `D:\projects\ai-playbook` 是 v4 的旧克隆（15 个未提交改动），确认无用后删除
- [ ] 在 GitHub 仓库启用 Codex / Gemini 的 PR review 集成（需要在 chatgpt.com/codex 和 Gemini Code Assist 里用账号授权，agent 做不了）
- [x] GitLab 镜像已同步（MR !6）。注意：镜像 main 受保护（No one push）+ 本地 branch-guard 拦直推 main，同步方式是推 `sync/<日期>` 分支 → 开 MR → pipeline 绿后合并
- [ ] 实测 Codex hook payload 的工具名（本机 codex 沙箱创建进程被拒，未能验证 matcher）

## 已知问题

- `~/.claude/settings.json` 的 `autoMode.environment` 是从 `D:\projects\jianli` 生成的，写着「trusted repo = jianli」，
  却作用于所有项目；里面还描述了个人求职资料的位置。建议在 Settings 里重新生成或清空（涉及个人数据，未代改）。
