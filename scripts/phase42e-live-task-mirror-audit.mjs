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

const runtime = read('src/session/native-plan/runtime.ts');
const core = read('src/session/core.ts');
const mutate = read('src/session/native-plan/mutate.ts');
const tests = read('tests/tasks/task-mirror-live-runtime.test.ts');
const coreTests = read('tests/tasks/task-mirror-session-core-wiring.test.ts');
const docs = read('docs/task-native-live-runtime.md');

console.log('=== Phase 42E Live Native Task Mirror Audit ===');
console.log('\n=== CENTRAL WIRING ===');
has('SessionCore imports runtime', core, 'NativeTaskMirrorRuntime');
has('SessionCore owns one runtime', core, 'private readonly taskMirror');
has('runtime initialized once', core, 'this.taskMirror = new NativeTaskMirrorRuntime');
has('checkpoint enqueues events', core, 'this.taskMirror.enqueue(events)');
has('flush drains mirror work', core, 'await this.taskMirror.drain()');
has('runtime status is observable', core, 'taskMirrorStatus()');

console.log('\n=== WAL FIRST ===');
const appendIndex = core.indexOf('const recorded = this.wal.append');
const checkpointIndex = core.indexOf('this.checkpointLocal(recorded)');
check('record WAL append precedes checkpoint', appendIndex >= 0 && checkpointIndex > appendIndex);
has('WAL-first documented', docs, 'WAL first');
has('enqueue is after WAL', core, 'after SessionWal.append() succeeds');

console.log('\n=== FAIL SOFT ===');
has('serialized promise tail', runtime, 'private tail');
has('mutation failure is caught', runtime, 'failedBatches');
has('last error is observable', runtime, 'lastError');
has('drain waits for tail', runtime, 'await this.tail');
has('failure isolation documented', docs, 'does not undo or reject');

console.log('\n=== DEFAULT / OPT OUT ===');
has('environment opt out', runtime, 'TOOLNET_TASK_MIRROR');
has('disabled only on literal zero', runtime, "!== '0'");
has('disable test', tests, "TOOLNET_TASK_MIRROR = '0'");

console.log('\n=== AUTOMATIC TASK SYNC ===');
has('runtime invokes native sync', runtime, 'syncNativeTaskMirrors');
has('native sync uses binding correlation', mutate, 'bindings.correlate');
has('live create test', tests, 'automatically creates Persistent Tasks');
has('serialized update test', tests, 'serializes consecutive native plan updates');
has('ordinary prose ignored', tests, 'normal non-plan session events');

console.log('\n=== ONE CANONICAL PATH ===');
absent('SessionCore does not parse Codex directly', core, 'extractCodexPlanSnapshots(');
absent('SessionCore does not parse OpenCode directly', core, 'extractOpenCodePlanSnapshots(');
absent(
  'SessionCore does not construct mutation executor directly',
  core,
  'TaskMirrorMutationExecutor('
);
has('source wiring test exists', coreTests, 'one canonical NativeTaskMirrorRuntime');

console.log('\n=== NO AI / VECTOR ===');
const combined = runtime + core;
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
  console.log('PHASE42E_LIVE_TASK_MIRROR_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE42E_LIVE_TASK_MIRROR_AUDIT=FAIL');
  process.exitCode = 1;
}
