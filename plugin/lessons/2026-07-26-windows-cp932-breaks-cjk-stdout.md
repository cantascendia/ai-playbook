# Learned Rule: 本机 ANSI 代码页是 cp932，任何输出中日文的脚本必须显式强制 UTF-8

**学到的教训**: eval runner 首次跑 4 条 case **全红**，看起来像断言失败，实际是
`UnicodeEncodeError: 'cp932' codec can't encode character '帧'` —— 同样的脚本
直接用 PowerShell 跑全部通过，走 bash 就崩。根因是这台机器的 Windows ANSI 代码页是
**cp932（日文）**，Python 从 bash/cmd 启动时 stdout 编码回落到它，中文字符直接编不出来。

对 InterviewLens 尤其致命：产品输出本身就是**中/德/日混排**，任何依赖
"调用方碰巧设对了编码"的写法都会在别的机器、别的启动方式下炸掉。

## 触发场景

- 写任何会 print 中文/日文/德文变音符的 Python 脚本（bench / tools / evals / 未来的 CLI）
- 脚本可能从多种宿主启动：PowerShell / Git Bash / cmd / CI / hook / subprocess
- 症状：同一脚本在一种终端里正常、另一种里 `UnicodeEncodeError` 或输出乱码
- 也适用于**读**文件：`open()` 不带 `encoding=` 时同样回落到 cp932

## 应该怎么做

1. **脚本首行强制 UTF-8**（`evals/checks/_utf8.py` 是现成的实现）：
   ```python
   for _s in (sys.stdout, sys.stderr):
       try:
           _s.reconfigure(encoding="utf-8", errors="replace")
       except (AttributeError, ValueError):
           pass
   ```
   放在 `from __future__` 之后、其他 import 之前 —— 否则被 import 的模块先打印就已经崩了。
2. **所有文件 IO 显式写 `encoding="utf-8"`**：`read_text(encoding="utf-8")` /
   `open(..., encoding="utf-8")`。项目里已经这么做了，保持。
3. **PowerShell 写文件给其他工具读时显式 `-Encoding utf8`** —— `Set-Content`/`Add-Content`
   默认走 ANSI（即 cp932）。
4. **CI / hook 里另加一道保险**：`PYTHONIOENCODING=utf-8`（不能替代第 1 条，因为它依赖调用方）。
   **本项目已在 `.claude/settings.json` 的 `env` 里全局设了 `PYTHONIOENCODING=utf-8` +
   `PYTHONUTF8=1`** —— 因为光靠"记得加"失败了三次（第三次是内联 heredoc 里的
   `print`，崩在 `write_text` 之前，导致补丁根本没落盘，而 eval 照样报绿）。
   铁律 #4：Agent 犯同一个错三次 → 改配置，不是改习惯。
5. **测试要跨宿主**：新脚本至少在 PowerShell 和 Git Bash 各跑一次。只在一种终端里验证过
   = 没验证过。

## 避免什么

- ❌ 假设"Windows 现在都是 UTF-8 了" —— 本机不是，ANSI 代码页是 cp932
- ❌ 只在 PowerShell 里测就认为脚本没问题（PowerShell 恰好把编码设对了，掩盖了问题）
- ❌ 看到 eval / 测试全红就先怀疑断言逻辑 —— 先看 traceback 是不是编码错误
- ❌ 内联 heredoc 脚本里在写文件**之后**才 print 中文：print 崩掉会让你以为
  整个脚本失败，而实际上文件已改；反过来 print 在写之前崩，则文件根本没改
  而你以为改了 —— 后者更危险，**必须回头 grep 验证补丁真的落盘了**
- ❌ 用 `errors="ignore"` 吞掉编码错误（会静默丢字符，比崩掉更糟）
- ❌ 只修 stdout 不修 stderr（异常栈里有中文照样崩）

## 来源

- InterviewLens eval runner 首跑 2026-07-26：4 条 case 全 FAIL，`EVAL_VERBOSE=1` 才看到
  真实 traceback 是 cp932 编码错误，与断言无关
- 修复：`evals/checks/_utf8.py` + 四个 check 脚本首行 import；修复后 4/4 PASS
- 关联：`docs/ai-cto/BENCHMARKS.md`「踩过的坑」

## 冷却

- 创建日期: 2026-07-26
- 30 天内不重复提议同类编码 pattern
- 适用范围：本项目所有会输出非 ASCII 的脚本；本机上的其他项目同理
