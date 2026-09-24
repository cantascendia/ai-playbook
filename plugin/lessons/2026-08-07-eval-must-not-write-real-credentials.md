# Learned Rule: 会写"系统级用户数据"的 eval 必须先隔离命名空间，否则它会毁掉真实数据

**学到的教训**: eval 013（首次运行向导）里有一条很合理的断言 ——
"保存 API key 之后输入框必须立刻清空"（key 留在控件里而屏幕可能正被共享）。
为了测它，eval 真的调了 `credentials.save("openai", "sk-test-must-be-cleared")`。
那个调用**写进了 Windows 凭据管理器的 `InterviewLens/openai`**，
把用户真正的 OpenAI key 覆盖掉了。

- eval 全绿（断言本身是对的：输入框确实清空了）。
- 症状**几天后**才暴露：真机通跑报 `auth`，`smoke_openai.py` 打印出
  `sk-test-***********ared` 才发现。
- 到那时已经**说不清原来那把 key 是什么**，只能让用户重新去申请/粘贴。

比"覆盖"更糟的是**沉默**：`INTERVIEWLENS_DATA_DIR` 这类隔离只挡住了文件系统，
凭据管理器是另一个命名空间，没人想到它也需要隔离。

## 触发场景

- eval / 单测 里出现 `credentials.save`、`keyring`、`CredWrite`、注册表写、
  `%APPDATA%` 之外的系统级存储写入
- 任何"要测保存流程"的界面断言（保存后清空、保存后禁用、保存失败提示…）
- 关键词：凭据、credential、keyring、API key、token、secret、注册表

## 应该怎么做

1. **写系统级存储的模块必须提供命名空间开关**，而不是靠调用方自觉：
   ```python
   def _namespace() -> str:
       ns = os.environ.get("INTERVIEWLENS_CREDENTIAL_NS", "").strip()
       return f"{APP}-{ns}" if ns else APP
   ```
   `target_name()` 走它。没有这个开关时，任何测试都只能在真实数据上跑。
2. **环境变量必须在第一个业务 import 之前设**。晚一行都可能没用 ——
   凭据层会在别的模块 import 时被间接拉起来。
3. **加一条盯着它的断言**（本项目在 eval 016）：
   - 命名空间可切换、切换后 ≠ 用户真正的条目、不设时仍是用户那一条；
   - 会写凭据的那个 eval 文件里确实有这一行，且位置在第一个业务 import 之前。
   靠"记得设"是不够的，因为忘了不会报错，只会毁数据。
4. **清理时先看再删**：`load()` 回来的值以 `sk-test-` 开头才删 ——
   万一那是用户真的 key，删掉就是第二次事故。

## 避免什么

- ❌ 认为"隔离了 `INTERVIEWLENS_DATA_DIR` 就等于隔离了用户数据"——
  凭据管理器 / 注册表 / 系统钥匙串都在文件系统之外
- ❌ 在 eval 里对真实存储做"写了再删"（删之前崩溃就留下垃圾；
  而且它本来就已经覆盖了原值，删掉也回不来）
- ❌ 用 `sk-test-…` 这种"看起来一眼假"的值就以为安全 ——
  假值同样会覆盖真值，而且它假得让人一眼看不出是**什么时候**被覆盖的
- ❌ 只在 CI 上隔离。开发机上跑 eval 才是最常发生的场景，
  而开发机上放的正是真 key

## 来源

- 本项目 2026-08-07 第 9 轮：`tools/smoke_openai.py` 报
  `Incorrect API key provided: sk-test-***********ared`，
  溯源到 commit c9d956e 给 `check_wizard.py` 加的凭据断言
- 修复：`credentials._namespace()` + `INTERVIEWLENS_CREDENTIAL_NS`，
  eval 013/016 各自设隔离，eval 016 新增 5 条断言盯住它

## 冷却

- 创建日期: 2026-08-07
- 30 天内不重复提议同类"测试污染真实存储"的 pattern
- 通用化：任何新增的**系统级写入**（凭据/注册表/计划任务/防火墙规则），
  第一件事是给它一个命名空间开关，第二件事是加断言盯住隔离
