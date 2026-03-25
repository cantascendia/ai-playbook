# 🔧 Agent Skill 生态管理模板

> **使用场景**：项目初始化或扩展 Skill 集合时，统一盘点和管理
>
> **使用方式**：CTO 命令 `Skill 生态`

---

## 当前项目 Skill 清单

### 共用 Skills（`.agents/skills/`）
| Skill 名 | 用途 | 来源 | 类型 |
|---|---|---|---|
| [待填充] | | 自建/anthropic/obra/trailofbits/openai/stitch | instruction-only/含脚本 |

### Antigravity Workflows
| Workflow 名 | 用途 | 状态 |
|---|---|---|
| [待填充] | | |

### Codex Automations
| Automation 名 | 用途 | 状态 |
|---|---|---|
| [待填充] | | |

---

## 推荐安装评估

根据项目特征勾选适用类别，CTO 会据此推荐具体 Skill：

- [ ] 有前端 UI → `frontend-design`、Stitch Skills
- [ ] 需要 UI 测试 → `webapp-testing`
- [ ] 涉及安全敏感功能 → Trail of Bits Security Skills
- [ ] 需要生成文档/报告 → `docx`、`pdf`、`pptx`、`xlsx`
- [ ] 需要自建 MCP 服务器 → `mcp-builder`
- [ ] 需要批量创建 Skill → `skill-creator`

---

## Skill 健康检查

- [ ] 所有 `.agents/skills/*/SKILL.md` 的 name 字段与目录名一致
- [ ] 所有 description 字段 ≤ 1024 字符且描述了触发条件
- [ ] 含 scripts/ 的 Skill 已经过安全审查
- [ ] 无同名 Skill 出现在不同路径
- [ ] Antigravity 和 Codex 均能发现项目级 Skill
