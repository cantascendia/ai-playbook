# Learned Rule: 命令检测类 guard 必须剥离 heredoc/引号内容再匹配

**学到的教训**: v3.10.1 destructive-action-guard 拦了 ai-playbook 自己 — 写 PR body 的
`cat > f <<EOF ... DROP TABLE ... EOF` 含 destructive 词被误判为执行命令。飞轮第 6 轮自食其果。

## 触发场景

- 任何检测 bash 命令字符串的 guard（destructive-action / bypass / 未来新 guard）
- 命令含 heredoc（<<EOF）/ echo / 引号字符串 / gh pr --body 文本
- 文本内容提到 destructive 词但不是执行

## 应该怎么做

1. **剥离非执行内容再匹配**：
   ```bash
   SCAN_CMD=$(printf '%s' "$CMD" \
     | sed -E "s/<<-?'?[A-Za-z_]+'?.*//" \   # heredoc body
     | sed -E "s/'[^']*'//g" \                # 单引号字符串
     | sed -E 's/"[^"]*"//g')                 # 双引号字符串
   ```
2. **匹配 SCAN_CMD（剥离版），报错展示原 CMD**
3. **保留复合命令检测**：`echo x && rm -rf /` 的 `rm -rf /` 在引号外，仍被拦

## 避免什么

- ❌ 直接 grep 整个命令字符串（含文档/字符串内容）
- ❌ 剥离过度导致漏掉真命令（如剥引号后还要保留 `&&` 后的命令）
- ❌ 只测真灾难不测 false positive（必须双向测试）

## 来源

- v3.10.1 destructive-action-guard 拦自己（2026-05-20，写 PR body）
- v3.10.2 hotfix（SCAN_CMD 剥离层）

## 冷却

- 创建日期: 2026-05-20
- 30 天内不重复提议同类 guard scan pattern
