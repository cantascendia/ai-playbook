---
name: handbook-search
description: >
  ai-playbook handbook（数千行）智能查询入口。当用户/任务提到 §NN.M 章节号、
  "手册"、"playbook"、"铁律 #N"、"反模式"、"竞品" 等关键词时自动触发。
  读 INDEX.md 得章节号 → grep 运行时定位行 → 精读对应段，避免塞全文进上下文。
user-invocable: false
when_to_use: >
  用户提到 §<数字>.<数字> 章节引用、"手册第 N 节"、"playbook 说"、"铁律 #N"、
  "反模式 #N"、"按手册"、handbook.md 的具体章节查询时。
---

# Handbook Search (§4 Context Engineering 实践)

handbook.md 数千行 / §1-§50。全塞进上下文反 §4.1（attention budget 浪费）。
本 skill = "INDEX 得章节号 → grep 定位行 → 精读" 三段式。**v3.14：用 grep 运行时定位，不依赖硬编码行号**（行号随编辑漂移，grep 永远准）。

## 工作流

### Step 1: 读 INDEX.md 得章节号（不是行号）

```bash
test -f playbook/INDEX.md && cat playbook/INDEX.md
```

INDEX.md 维护"场景/铁律/反模式 → §号"语义映射（**不再有行号**）。例：forbidden 路径 → §32.1；EDD → §35。

### Step 2: grep 运行时定位章节起始行

```bash
grep -nE '^## 32\.' playbook/handbook.md      # 顶层章节 §32
grep -nE '^### 32\.1' playbook/handbook.md     # 子节 §32.1
grep -nE '^## 铁律' CLAUDE.md                  # 铁律全文（在 CLAUDE.md）
```

| 用户问题模式 | 应查 § | grep 模式 |
|---|---|---|
| "§32.1 怎么说的" | §32.1 | `^### 32\.1` |
| "铁律 #13 是什么" | CLAUDE.md 铁律段 | `^## 铁律` 然后看第 13 条 |
| "vibe coding 反模式" | §32.5 / §33 | `^### 32\.5` / `^## 33\.` |
| "什么是 spec-driven" | §18 | `^## 18\.` |
| "Constitution 怎么写" | §37 + docs/ai-cto/CONSTITUTION.md | `^## 37\.` |
| "怎么跨模型 review" | §48 | `^## 48\.` |
| "怎么写 eval" | §35 + evals/ | `^## 35\.` |
| "分发档位/装子项目" | §49 | `^## 49\.` |

### Step 3: 读特定章节段

grep 得起始行 L 后：
```
Read(file_path="playbook/handbook.md", offset=L, limit=120)
```
不够再以 offset+limit 续读到下一个 `^## ` 为止。

### Step 4: 引用回应

用 §N.M 格式精准引用（基于实际读到的内容，铁律 #2）：
> "按手册 §32.1，forbidden 路径定义为 ..."（不写行号——行号会漂）

## 反模式

| 反模式 | 应当 |
|---|---|
| 直接 `Read playbook/handbook.md`（全文）| 先 INDEX 得 §号 → grep 定位 |
| 凭记忆引用 §N.M | 必须 grep + Read 实际确认（铁律 #2）|
| 引用硬编码行号 | 用 grep 运行时定位（行号会漂移）|
| 不引用直接说"手册说" | 用 §N.M 格式让用户能查证 |

## 当 INDEX.md 不存在

```
"⚠️ playbook/INDEX.md 不存在。
fallback: grep -nE '^## [0-9]' playbook/handbook.md 列全部章节标题再定位。"
```

## 引用

- handbook §4.1 Context Engineering（为什么不塞全文）
- `playbook/INDEX.md`（章节语义映射 SSOT，无行号）
- 定位方式：`grep -nE '^## N\.' playbook/handbook.md`
