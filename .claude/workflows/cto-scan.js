export const meta = {
  name: 'cto-scan',
  description: 'v4.0 全仓多代理扫描：6 子系统读取器 + doctor 实跑，产出结构化健康地图（handbook §39 编排的可执行版）',
  whenToUse: '大版本重构前 / 季度审计 / 新人接手仓库时；替代 prose 版多代理扫描指令',
  phases: [
    { title: 'Scan', detail: '6 subsystem readers + 1 doctor executor（Opus 档）', model: 'opus' },
  ],
}

// 参数：args.repo（默认 cwd 由调用方注入）；args.focus 可选聚焦子系统名数组
const REPO = (args && args.repo) || 'C:/projects/ai-playbook'
const FOCUS = (args && Array.isArray(args.focus)) ? args.focus : null

const MAP_SCHEMA = {
  type: 'object',
  required: ['inventory', 'pain_points', 'dead_weight', 'opportunities'],
  properties: {
    inventory: { type: 'array', items: { type: 'string' } },
    pain_points: {
      type: 'array',
      items: {
        type: 'object',
        required: ['what', 'evidence', 'severity'],
        properties: {
          what: { type: 'string' },
          evidence: { type: 'string' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2'] },
        },
      },
    },
    dead_weight: { type: 'array', items: { type: 'string' } },
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        required: ['idea', 'value', 'risk'],
        properties: { idea: { type: 'string' }, value: { type: 'string' }, risk: { type: 'string' } },
      },
    },
    notes: { type: 'string' },
  },
}

const DOCTOR_SCHEMA = {
  type: 'object',
  required: ['checks', 'summary'],
  properties: {
    checks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'status', 'detail'],
        properties: {
          name: { type: 'string' },
          status: { type: 'string', enum: ['pass', 'fail', 'warn', 'skipped'] },
          detail: { type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const COMMON = `You are a read-focused scanner for the repo at ${REPO}. DO NOT modify any file. Every claim needs file:line evidence. Your final output is raw structured data.`

const SUBSYSTEMS = [
  { key: 'handbook', prompt: `${COMMON} Subsystem: playbook/handbook.md + INDEX.md. Map sections (grep -n '^## '), flag heaviest, stale claims, zero-inbound-reference sections (cross-grep §NN over .claude/** CLAUDE.md README.md).` },
  { key: 'enforcement', prompt: `${COMMON} Subsystem: .claude/settings.json + .claude/hooks/** + .claude/rules/**. Per hook: trigger/enforcement/LOC. Find: claimed-but-unenforced red lines, duplication, bypass holes, Windows fragility.` },
  { key: 'surface', prompt: `${COMMON} Subsystem: .claude/commands/*.md + .claude/skills/** + .agents/skills/** + .claude/agents/*.md + output-styles. Per item: purpose/LOC/overlap/staleness/eval-coverage.` },
  { key: 'quality', prompt: `${COMMON} Subsystem: evals/** + scripts/** + ledger/** + .github/**. Classify EXECUTABLE vs ASPIRATIONAL. Eval coverage gaps vs commands/hooks. CI story.` },
  { key: 'memory', prompt: `${COMMON} Subsystem: docs/ai-cto/** + docs/test-plans/**. Per file: load-bearing (runtime-read by .claude/**) vs archive; staleness; append-forever growth; contradictions vs COUNTS.md.` },
  { key: 'distribution', prompt: `${COMMON} Subsystem: cto-init/cto-link/templates/README. Full deployment story per profile; copy-drift; what target projects are promised vs actually installed.` },
]

phase('Scan')

const picked = FOCUS ? SUBSYSTEMS.filter((s) => FOCUS.includes(s.key)) : SUBSYSTEMS

const [doctor, ...maps] = await parallel([
  () => agent(`${COMMON} EXECUTE (read-only otherwise): bash scripts/check-counts.sh; bash scripts/run-evals.sh; node --test .claude/hooks/engine/guard.test.mjs (if engine exists); node --version. Report each as a check with pass/fail/warn.`,
    { label: 'doctor', phase: 'Scan', model: 'opus', effort: 'medium', schema: DOCTOR_SCHEMA }),
  ...picked.map((s) => () => agent(s.prompt, { label: `map:${s.key}`, phase: 'Scan', model: 'opus', effort: 'medium', schema: MAP_SCHEMA })),
])

const result = { doctor, maps: {} }
picked.forEach((s, i) => { result.maps[s.key] = maps[i] })
return result
