# Learned Rule: 安全 guard 的 static regex 不要做「读/写区分」——fail-safe 广义拦截胜过聪明的 carve-out

**学到的教训**: 想给 bypass-guard 的 `core\.hooksPath` 广义 token 加「只拦写、放行只读」的 carve-out，
修误拦 `git config --get core.hooksPath` 的 FP。3 轮对抗验证（9 agent）逐轮击穿，最终放弃 carve-out、
回到广义 token。**根因：static regex 无法安全区分 shell 命令的读/写语义**——区分依赖「key 后有无值」，
但 shell 引号剥离后，引号包的操作符值（`'>x'` `';h'` `'|h'`）与「读+shell 操作符」字节不可区分，
`${IFS}` 注入/反斜杠续行/变量展开进一步让「有无空白分隔」不可静态判定。堵一个洞冒一个结构等价新洞。

## 触发场景

- 给任何 PreToolUse 命令检测 guard（bypass / destructive / 新 guard）加「区分安全子类 vs 危险子类」的精细化
- 想放行某红线词的「无害用法」（只读 / dry-run / 注释）而保留拦截「有害用法」
- 关键词：carve-out、读写分离、只拦写、放行只读、精细化 guard、reduce false positive

## 应该怎么做

1. **默认 fail-safe 广义拦截**：安全敏感的 guard 宁可过度拦截（拦了无害用法=annoying），
   绝不为减 FP 引入「区分逻辑」——区分逻辑本身就是新攻击面（攻击者把危险用法伪装成安全子类）。
2. **要减 FP，先问「这个 FP 有真实消费方吗」**：本例只读 `git config --get core.hooksPath` 的 FP 是
   理论性的（无脚本真用它；doctor 直接查 `.git/hooks/pre-commit`）→ 不值得为它冒险。
3. **真有合法用法，走旁路而非改 guard**：`git rev-parse --git-path hooks` 读 hooksPath（不触词）/
   `CTO_BYPASS_ALLOWED=1` 单次放行 / Write-Edit 工具写文档（不走 bash guard）。
4. **命令检测 guard 先归一化再匹配**：剥引号/反斜杠字符（bypass 防逃逸，本例）或剥 heredoc/引号内容
   （destructive 防 FP，learned rule 2026-05-20）——方向相反，按「词在命令里是执行还是数据」定。
   剥字符「只删不增」= 匹配面严格超集，不丢原命中。
5. **安全敏感改动必过对抗验证 gate**：≥3 独立 skeptic 各自用 node 对真实 pattern replay，
   找「原拦新放」的净回归；全 SAFE 才合并。本例 gate 拦下 3 个会进 main 的净安全回归。

## 避免什么

- ❌ 为「读也被拦好烦」就给安全 guard 加读/写区分（区分逻辑=攻击面，static regex 建模不了 shell 语义）
- ❌ 单轮验证就认为 carve-out 安全（本例前两轮各自"看起来修好了"，第 3 轮才暴露 metachar 值族/`${IFS}`）
- ❌ 把「值检测」（key 后有非操作符字符=写）当可靠信号（引号包操作符值 + 剥引号 = 字节等价于读）
- ❌ 忘了归一化改动会连带影响别的场景（本例剥引号让 bypass-guard 连含 core.hooksPath 的文档 heredoc 也拦）

## 来源

- v4.4b 3 轮对抗验证 workflow：wf_625a44f7（轮1 前缀击穿）/ wf_e5da5df4（轮2 空引号对）/
  wf_7f9dc01f（轮3 metachar 值族+${IFS}+续行）+ wf_9230005b（轮4 广义+剥引号 SAFE 确认）
- DECISIONS ADR-010（2026-07-15）
- eval 024（29 断言锁 3 轮逃逸族 + fail-safe + 普通放行）
- 关联 learned rule 2026-05-20（guard-scan-strip-noncode，剥非执行内容——反向场景）

## 冷却

- 创建日期: 2026-07-15
- 30 天内不重复提议同类「给安全 guard 加读/写 carve-out」
- 通用化：任何「精细化安全 guard 减 FP」提议，先跑对抗验证证明无净回归再落地
