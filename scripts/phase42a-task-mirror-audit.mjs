import { readFileSync } from 'node:fs';
const files = {
  types: readFileSync('src/tasks/mirror-types.ts', 'utf8'),
  identity: readFileSync('src/tasks/mirror-identity.ts', 'utf8'),
  engine: readFileSync('src/tasks/mirror-engine.ts', 'utf8'),
  index: readFileSync('src/tasks/index.ts', 'utf8'),
  tests: readFileSync('tests/tasks/task-mirror-foundation.test.ts', 'utf8'),
};
const checks = [
  ['canonical snapshot', files.types.includes('interface AgentPlanSnapshot')],
  ['stable source key', files.types.includes('sourceKey: string')],
  ['explicit full/delta', files.types.includes("'full' | 'delta'")],
  ['source binding contract', files.types.includes('interface TaskMirrorSourceBinding')],
  ['shadow plan contract', files.types.includes("mode: 'shadow'")],
  ['deterministic task ID', files.identity.includes('taskMirrorTaskId')],
  ['content digest', files.identity.includes('taskMirrorSnapshotDigest')],
  ['duplicate source key guard', files.identity.includes('TASK_MIRROR_DUPLICATE_SOURCE_KEY')],
  ['project mismatch guard', files.engine.includes('TASK_MIRROR_PROJECT_MISMATCH')],
  ['no inferred deletion', files.engine.includes('never infers cancellation')],
  ['lifecycle conflicts', files.engine.includes('status-regression')],
  ['lease collision visible', files.engine.includes('lease-held-by-other-agent')],
  ['completion stays guarded', files.engine.includes("guarded: to === 'completed'")],
  ['task module export', files.index.includes("export * from './mirror-engine.js'")],
  ['session collision test', files.tests.includes('scoped by native session')],
  ['rename identity test', files.tests.includes('stable across rename and reorder')],
  ['no absent cancellation test', files.tests.includes('full snapshot omitted it')],
];
const forbiddenEngineWrites = [
  '.createTask(',
  '.patchTask(',
  '.applyStateOperation(',
  '.start(',
  '.complete(',
  '.cancel(',
  '.claim(',
  '.release(',
];
for (const value of forbiddenEngineWrites) {
  checks.push([`shadow engine does not write via ${value}`, !files.engine.includes(value)]);
}
const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
}
console.log(`Phase 42A audit: ${checks.length - failed.length}/${checks.length}`);
if (failed.length > 0) {
  process.exitCode = 1;
}
