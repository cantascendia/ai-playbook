# §48 跨模型 Review — b96bbde
**2026-09-08T12:07:44+09:00** · Reviewer: agy-gemini · Mode: agy-only

# 代码审阅报告：Commit `b96bbde`

**Commit 概述**：撤回 `.agents/skills/forbidden-policy/SKILL.md`（共 122 行删除），理由为“保持本机未跟踪镜像组之一与其余 9 个镜像的 COUNTS `.agents=6` 一致”。

---

### 1. 架构 (Architecture)
* ⚠️ `.agents/skills/forbidden-policy/SKILL.md:1-24`  
  **反向对齐的技术债治理（削足适履）**：为满足浅层的静态校验指标（`COUNTS .agents=6`）而物理删除智能体认知层的架构策略文件。若该安全策略为系统核心治理规范，应推动其余 9 个镜像补齐，而非为了“指标对齐”反向抹除规范，破坏了分布式镜像与配置管理的一致性设计原则。

### 2. 代码质量 (Code Quality)
* ✅ `.agents/skills/forbidden-policy/SKILL.md:1-122`  
  **文件清理彻底**：整文件下线处理干净，未残留孤立的子目录、未闭合的 YAML 语法块或悬空局部文件。
* ⚠️ `.agents/skills/forbidden-policy/SKILL.md:1-24`  
  **变更语义与追踪性不足**：Commit message 仅记录了撤回的外部动机（计数对齐），未在架构文档或迁移记录中声明该策略是迁往独立仓库、全局 System Prompt 还是废弃，缺乏必要的架构废弃（Deprecation）说明。

### 3. 性能 (Performance)
* ✅ `.agents/skills/forbidden-policy/SKILL.md:8-23`  
  **上下文占用与匹配负载降低**：移除了覆盖 `**/auth/**`、`**/infra/**` 等多达 14 组广泛通配符的自动加载规则，略微减少了模型会话初始化的 Context Window 占用与技能路由匹配开销。

### 4. 安全 (Security)
* 🔴 `.agents/skills/forbidden-policy/SKILL.md:1-122`  
  **[P0] 核心安全护栏物理剥离，防御纵深被击穿**：该 Skill 是 `auth/payment/billing/secrets/keys/crypto/infra` 等高危路径的 AI 行为准则核心。删除它导致模型在触碰资金、密钥、基础设施等高危代码时失去“spec-driven 优先”、“双模型独立 review”和“MR requires-double-review”的认知约束，直接放大了恶意代码植入、越权修改和 vibe coding 的资金/数据安全风险。

### 5. 测试 (Testing)
* ⚠️ `.agents/skills/forbidden-policy/SKILL.md:93-102`  
  **缺乏移除后的 Eval 测试与行为验证**：文件中明确涉及防绕过策略与铁律 #14（Test-Lock）。该 Commit 缺乏配套的 Agent Eval 测试用例，无法验证删除该 Skill 后，模型在修改敏感路径时是否会出现尝试绕过 pre-commit 或擅改测试的行为。

### 6. DX (Developer Experience)
* 🔴 `.agents/skills/forbidden-policy/SKILL.md:104-118`  
  **[P1] 错误处理引导链路断裂，增加开发者心智负担**：原文件定义了“当底层 Hook 阻止时，引导用户回答 3 个问题并起草 SPEC”的标准自愈与响应流程。删除后，若底层 `.Codex/hooks/forbidden-guard.sh` 触发 `exit 2` 阻断，模型将失去上下文，容易出现无效重试、误导性报错甚至卡死，严重劣化协作体验。

### 7. 功能完整性 (Functional Completeness)
* 🔴 `.agents/skills/forbidden-policy/SKILL.md:119-122`  
  **[P1] 协同治理链条断裂，产生悬空依赖**：文件明确与 `.Codex/hooks/forbidden-guard.sh`（硬阻止层）、`scripts/forbidden-paths.txt`（路径 SSOT）及 GitLab CI 协同工作。单方面移除 Skill 破坏了“Hook 阻断 ↔ Skill 引导 ↔ SPEC 闭环 ↔ CI 门禁”的完整生命周期链路，导致系统处于半脱节状态。

### 8. UX (User Experience)
* ⚠️ `.agents/skills/forbidden-policy/SKILL.md:109-116`  
  **用户交互友好度退化**：原本模型在触碰高危路径被拦截时，会主动向用户展示友好的 🛑 警示文案并提供明确的 3 步引导；删除后，交互退化为底层 Shell Hook 的生硬报错，人机协同亲和力明显下降。

---

SEVERITY_SUMMARY: P0=1 P1=2 P2=3
