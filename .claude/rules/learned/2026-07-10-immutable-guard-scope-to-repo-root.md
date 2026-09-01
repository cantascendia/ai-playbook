# Learned Rule: immutable-guard 红线 1 必须按**仓库根路径**判定，不能只 basename

**学到的教训**: v3.16 前 immutable-guard 红线 1（CLAUDE.md 14 铁律）条件是
`IS_AI_PLAYBOOK_SELF==1 && BASENAME=="CLAUDE.md"`——`IS_AI_PLAYBOOK_SELF` 由**当前会话 CWD**
（含 playbook/handbook.md）判定，但从不检查**目标文件是否真在该仓库内**。结果：在 ai-playbook 会话里
写 `~/.claude/CLAUDE.md`（用户级全局文件，CWD 之外）被误拦。14 铁律只存在于**仓库根**的 CLAUDE.md，
其他位置同名文件（子目录 / 用户全局 ~/.claude/CLAUDE.md）都不是宪法，不该守。

这是 learned rule 2026-05-12（区分 self vs subproject）的**同源深化**：不仅要区分"是不是 ai-playbook 自身"，
还要区分"目标文件是不是这个仓库根的那一份"。

## 触发场景
- 任何红线 guard 用 `BASENAME==` + `IS_*_SELF`（基于 CWD）判定 immutable
- 目标文件路径在 CWD 之外（用户级 ~/.claude/、绝对路径、其他仓库）
- 建全局共享层 / 写 ~/.claude/CLAUDE.md、~/.claude/settings.json 时

## 应该怎么做
1. 红线判定加**路径归属检查**：`[ "$NORMALIZED_FILE" = "${NORMALIZED_CWD}/CLAUDE.md" ]`
   （只守仓库根那一份），而非任意 basename==CLAUDE.md
2. 守"内容级宪法"的红线（14 铁律 / handbook §32-§35）都要确认目标在 SSOT 仓库内
3. 改红线后**双向验证**：仓库根 CLAUDE.md 仍拦（exit 2）+ CWD 外同名文件放行（exit 0）

## 避免什么
- ❌ 只用 basename 判 immutable（拦 CWD 外合法同名文件 = false positive）
- ❌ 用 `cat >` / `mv` 绕过 guard 写被拦文件（rule #3：见 stderr 必停，不走间接路径）——应修 guard 的判定
- ❌ 改安全 guard 不配 eval（铁律 #12：immutable-guard 是 L1 红线，改动须 golden trajectory 覆盖后才进 main）

## 来源
- 全局共享架构迁移（2026-07-10）：写 ~/.claude/CLAUDE.md 被自己拦
- immutable-guard.sh 红线 1 加 `NORMALIZED_FILE==NORMALIZED_CWD/CLAUDE.md` 条件
- 关联 [[2026-05-12-subproject-vs-ai-playbook-self-distinction]]

## 冷却
- 创建日期: 2026-07-10 / 30 天内不重复提议同类 path-scope pattern
- 待办：为本 guard 改动补 golden trajectory eval 再 commit 到 main（铁律 #12）
