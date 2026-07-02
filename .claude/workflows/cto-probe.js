export const meta = {
  name: 'cto-probe',
  description: 'saved-workflow 执行面探针：零代理，返回常量即证明 .claude/workflows/ 按名解析可用',
  phases: [],
}
log('cto-probe: saved workflow surface OK')
return { surface: 'ok', from: '.claude/workflows/cto-probe.js' }
