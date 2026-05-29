#!/usr/bin/env bash
# v3.10.1 红线层：destructive action gate
# OWASP Agentic Top 10 2026 — ASI01 (Agent Goal Hijacking) 头号风险
# 教训：PocketOS 2026-04-25 — Cursor+Claude Opus 4.6 agent 9 秒删生产库 + 全部备份
#       (https://www.theregister.com/2026/04/27/cursoropus_agent_snuffs_out_pocketos/)
# 根因：overprivileged token + 共享 backup volume + 缺 destructive-action gate
#
# 拦截：任何不可逆 destructive 命令（删库 / drop / rm -rf 重要目录 / 撤销服务 etc）
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

read_hook_input
maybe_run_override "destructive-action-guard"

# 仅对 Bash 工具生效
[ "$HOOK_TOOL_NAME" != "Bash" ] && exit 0
[ -z "$HOOK_BASH_CMD" ] && exit 0

# Destructive 模式列表（保守 — 宁误拦也不漏）
# 分 3 类：
#   A. 文件系统级灾难：rm -rf / / rm -rf ~ / find -delete
#   B. 数据库级灾难：DROP TABLE / DROP DATABASE / TRUNCATE / DELETE FROM (无 WHERE)
#   C. 云服务/平台级：terraform destroy / vercel rm / railway destroy / supabase project delete / aws s3 rb / gh repo delete

# A. 文件系统（注意：$HOME 用 [$]HOME 避免 shell 解析）
FS_PATTERNS='rm\s+-rf\s+/($|\s)|rm\s+-rf\s+~($|\s)|rm\s+-rf\s+[$]HOME|rm\s+-rf\s+\.\s|rm\s+-rf\s+\*($|\s)|find\s+/?\s.*-delete|>\s*/dev/sda|mkfs|dd\s+if=.*of=/dev/'

# B. 数据库
DB_PATTERNS='\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX)\b|\bTRUNCATE\s+(TABLE\s+)?[a-z_]|DELETE\s+FROM\s+[a-z_]+\s*;|psql.*-c.*DROP|mongo.*dropDatabase|redis-cli.*FLUSHALL'

# C. 云服务 destructive（vercel rm 用 .* 通配 app 名，aws/gcloud/azure 同理）
CLOUD_PATTERNS='terraform\s+destroy|vercel\s+rm\s.*--yes|railway\s+(down|destroy)|supabase\s+project\s+delete|aws\s+s3\s+rb\s+s3://.*--force|aws\s+rds\s+delete-db-instance|aws\s+ec2\s+terminate-instances.*--force|gh\s+repo\s+delete|gh\s+secret\s+remove|firebase\s+(use\s+.*&&.*deploy|projects:delete)|heroku\s+apps:destroy|fly\s+apps\s+destroy|kubectl\s+delete\s+(ns|namespace|cluster|all)|docker\s+system\s+prune\s+--all\s+--volumes'

# 复合 destructive（不可逆 + 大规模）
COMBINED_DESTRUCTIVE="${FS_PATTERNS}|${DB_PATTERNS}|${CLOUD_PATTERNS}"

if echo "$HOOK_BASH_CMD" | grep -qiE -- "$COMBINED_DESTRUCTIVE"; then
  # Opt-out: 极端情况（如真要清理测试环境）需 explicit 解锁
  if [ "${CTO_DESTRUCTIVE_CONFIRMED:-0}" = "1" ]; then
    audit_log "destructive-action-allowed" "cmd=$(echo "$HOOK_BASH_CMD" | head -c 200) env=1"
    exit 0
  fi

  audit_log "destructive-action-blocked" "cmd=$(echo "$HOOK_BASH_CMD" | head -c 200)"

  block_with_reason "🛑 v3.10.1 DESTRUCTIVE ACTION BLOCKED

命令：\`$(echo "$HOOK_BASH_CMD" | head -c 300)\`

命中不可逆 destructive 模式（rm -rf / DROP TABLE / terraform destroy / etc）。

参考：
- OWASP Agentic Top 10 (2026) ASI01: Agent Goal Hijacking — 头号风险
- PocketOS 9 秒灾难（2026-04-25）: Cursor+Claude 删生产库 + 备份
  https://www.theregister.com/2026/04/27/cursoropus_agent_snuffs_out_pocketos/

正确做法：
  1. 先用 \`echo\` 或 \`--dry-run\` 模拟一遍看影响范围
  2. 如生产环境 → 让人审 + 走 spec-driven
  3. 如测试 / 临时环境 → 用更精确的命令（避免 -rf / / -rf \$HOME 等灾难性广度）
  4. 数据库操作必须含 WHERE / LIMIT

紧急确认（仅 in-test-env 且已备份）：
  export CTO_DESTRUCTIVE_CONFIRMED=1   # 单次会话 + audit 永久记录
  # 然后重跑该命令"
fi

exit 0
