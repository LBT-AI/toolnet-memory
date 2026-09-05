import { readFileSync } from 'node:fs';

let failures = 0;

function read(file) {
  return readFileSync(file, 'utf8');
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

const executor = read('src/tasks/mirror-mutation-executor.ts');
const mutate = read('src/session/native-plan/mutate.ts');
const mirror = read('src/tasks/mirror-engine.ts');
const tests = read('tests/tasks/task-mirror-mutation.test.ts');
const docs = read('docs/task-native-auto-mutation.md');

console.log('=== Phase 42D Native Task Auto Mutation Audit ===');
console.log('\n=== MUTATION AUTHORITY ===');
has('TaskStore used', executor, 'TaskStore');
has('TaskStateEngine used', executor, 'TaskStateEngine');
has('TaskHandoffEngine used', executor, 'TaskHandoffEngine');
has('createTask through store', executor, '.createTask(');
has('patchTask through store', executor, '.patchTask(');
has('start through state engine', executor, 'this.state.start(');
has('complete through state engine', executor, 'this.state.complete(');
has('cancel through state engine', executor, 'this.state.cancel(');
has('claim through handoff engine', executor, 'this.handoff.claim(');
has('heartbeat through handoff engine', executor, 'this.handoff.heartbeat(');
has('release through handoff engine', executor, 'this.handoff.release(');

console.log('\n=== NO BYPASS ===');
absent('does not use setTaskStatus bypass', executor, '.setTaskStatus(');
absent('does not call raw applyStateOperation', executor, '.applyStateOperation(');
has('completion guards remain authoritative', docs, 'does not bypass completion guards');

console.log('\n=== CLAIM SAFETY ===');
has('multi in-progress fail closed', mirror, 'activeItems.length === 1');
has('other agent lease conflict', executor, 'TASK_ALREADY_CLAIMED');
has('same agent heartbeat', executor, 'heartbeated');
has(
  'terminal lease release avoided',
  mirror,
  'completed/cancelled lifecycle transitions clear activeLease'
);

console.log('\n=== CRASH / REPLAY ===');
has('binding first', mutate, 'await bindings.correlate');
has('mirror after correlation', mutate, 'mirror.plan');
has('executor after plan', mutate, 'executor.execute');
has('crash window test', tests, 'binding persistence happened before Task mutation');
has('replay operation-count test', tests, 'exact native event is replayed');

console.log('\n=== NATIVE SEMANTICS ===');
has('completion guard test', tests, 'never bypasses completion guards');
has('lease collision test', tests, 'does not steal an unexpired lease');
has('multi active test', tests, 'multiple in_progress');
has('rename test', tests, 'same Persistent Task through an active native rename');
has('omission test', tests, 'does not cancel an omitted native item');
has('explicit cancel test', tests, 'explicit OpenCode cancelled');

console.log('\n=== SCOPE ===');
has('deterministic Goal', executor, 'taskMirrorGoalId');
has('native task label', executor, 'toolnet:native-task');
absent('raw native session id not used as Task label', executor, 'nativeSessionId}`');

console.log('\n=== ARCHITECTURE ===');
const combined = executor + mutate;
for (const forbidden of [
  'OpenAI(',
  'Anthropic(',
  'EmbeddingProvider',
  'VectorDatabase',
  'sqlite-vec',
  'hnswlib',
  'distributedLock',
]) {
  absent(`no ${forbidden}`, combined, forbidden);
}

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE42D_AUTO_MUTATION_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE42D_AUTO_MUTATION_AUDIT=FAIL');
  process.exitCode = 1;
}
