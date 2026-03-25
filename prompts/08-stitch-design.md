# Stitch UI 设计启动模板

> **使用场景**：需要为某个功能/页面生成高保真 UI 设计时发给 CTO
> **使用方式**：对 CTO 说 `UI 设计 [功能描述]`
> **前置条件**：
> - Antigravity 已安装 Stitch MCP Server 并配置 API Key
> - 将 [功能描述] 替换为具体需求

---

我需要为以下功能生成高保真 UI 设计。

## 功能概述
[功能描述]

## 请执行
1. 阅读现有产品愿景和 DESIGN.md（如存在），确认设计方向
2. 通过 Stitch MCP 生成 UI 设计，prompt 中包含：
   - 产品定位和目标用户
   - 页面目标（用户在此页要完成什么）
   - 布局层级（主要/次要/辅助信息区）
   - 组件需求（表单、卡片、列表、图表等）
   - 视觉方向（风格、配色倾向、氛围）
   - 设备类型（Mobile / Desktop / Tablet）
3. 生成 2-3 个变体供选择
4. 确认设计后，让 Antigravity Agent 将 Stitch 的 HTML/CSS 实现到项目中
5. 如果项目尚无 DESIGN.md，同时生成并存入 `.stitch/DESIGN.md`

## 设计约束
- 遵循 WCAG 2.1 可访问性标准
- 响应式布局优先
- 与现有项目的技术栈兼容（如 React + Tailwind）

如果设计过程中发现产品愿景对 UI 的描述不充分，请直接提出需要补充的信息。
