import { readFileSync } from 'node:fs';

let failures = 0;

function read(path) {
  return readFileSync(path, 'utf8');
}

function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) {
    failures += 1;
  }
}

function has(label, source, needle) {
  check(label, source.includes(needle));
}

function absent(label, source, needle) {
  check(label, !source.includes(needle));
}

const scheduler = read('src/tasks/dependency-scheduler.ts');
const orchestration = read('src/tasks/orchestration-engine.ts');
const tests = read('tests/tasks/task-dependency-scheduler.test.ts');
const docs = read('docs/task-dependency-scheduler.md');

console.log('=== Phase 49 Dependency Scheduler Audit ===');
console.log('\n=== PURE SCHEDULER ===');
has('canonical scheduler exists', scheduler, 'buildTaskDependencySchedule');
has('scheduler uses dependency projection', scheduler, 'unresolvedTaskDependencies');
has('scheduler is lease aware', scheduler, 'taskLeaseActiveAt');
has('scheduler is conflict aware', scheduler, 'resolvedConflicts');
has('parallel ready set exists', scheduler, 'parallelReadyTaskIds');

console.log('\n=== READ ONLY ===');
for (const forbidden of [
  'createTask(',
  'patchTask(',
  'applyStateOperation(',
  '.claim(',
  '.complete(',
  '.start(',
  'setProgress(',
  'setNextAction(',
]) {
  absent(`scheduler does not mutate via ${forbidden}`, scheduler, forbidden);
}

console.log('\n=== ORCHESTRATION ===');
has('orchestration exposes scheduleTasks', orchestration, 'scheduleTasks(');
has('task next uses scheduler', orchestration, 'buildTaskDependencySchedule(');
absent(
  'global foreign lease no longer stops independent recommendation',
  orchestration,
  'valid-foreign-lease-present'
);

console.log('\n=== DEPENDENCY UNLOCK ===');
has('dependency waiting test exists', tests, 'keeps dependent work waiting');
has('chain unlock test exists', tests, 'unlocks dependency chains');
has('parallel readiness test exists', tests, 'every independent ready Task');
has('foreign lease sibling test exists', tests, 'foreign lease block independent work');
has('nested leaf scheduling test exists', tests, 'schedules nested leaves');
has('read-only test exists', tests, 'creates no Task operations');

console.log('\n=== DOCS ===');
has('automatic unlock documented', docs, 'Automatic dependency unlocking');
has('parallel safety documented', docs, 'Parallel safety');

console.log('\n=== NO NEW INFRA ===');
for (const forbidden of [
  'OpenAI',
  'Anthropic',
  'EmbeddingProvider',
  'VectorDatabase',
  'sqlite-vec',
  'Redis',
  'Redlock',
  'etcd',
  'distributedLock',
]) {
  absent(`no ${forbidden}`, scheduler, forbidden);
}

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE49_TASK_DEPENDENCY_SCHEDULER_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE49_TASK_DEPENDENCY_SCHEDULER_AUDIT=FAIL');
  process.exitCode = 1;
}
