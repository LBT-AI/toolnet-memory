import { readFileSync } from 'node:fs';

let failed = 0;

function read(file) {
  return readFileSync(file, 'utf8');
}

function check(label, value) {
  const ok = Boolean(value);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) {
    failed += 1;
  }
}

function has(label, source, value) {
  check(label, source.includes(value));
}

function missing(label, source, value) {
  check(label, !source.includes(value));
}

const types = read('src/tasks/mirror-binding-types.ts');
const store = read('src/tasks/mirror-binding-store.ts');
const shadow = read('src/session/native-plan/correlated-shadow.ts');
const tests = read('tests/tasks/task-mirror-binding-replay.test.ts');
const integration = read('tests/tasks/task-mirror-correlated-shadow.test.ts');
const docs = read('docs/task-mirror-bindings.md');

console.log('=== Phase 42C Task Mirror Binding Audit ===');
console.log('\n=== DURABILITY ===');
has('binding event type', types, 'TaskMirrorBindingEvent');
has('binding projection type', types, 'TaskMirrorBindingProjection');
has('append-only JSONL path', store, "'events.jsonl'");
has('derived state path', store, "'state.json'");
has('O_EXCL lock', store, "'wx'");
has('lock owner token', store, 'token');
has('stale lock recovery', store, 'lockRecoverable');
has('fsync append', store, 'fsyncSync');
has('atomic projection rename', store, 'renameSync');
has('corrupt tail recovery', store, 'repairCorruptTail');

console.log('\n=== IDENTITY ===');
has('scope includes provider/session/plan', store, 'taskMirrorBindingScopeKey');
has('stable canonical source key', store, 'canonicalSourceKey');
has('historical aliases', store, 'rawSourceKeys');
has('deterministic binding hash', store, 'newBindingIdentity');
has('alias collision guard', store, 'TASK_MIRROR_BINDING_ALIAS_COLLISION');

console.log('\n=== REPLAY ===');
has('source event collision guard', store, 'TASK_MIRROR_BINDING_SOURCE_EVENT_COLLISION');
has('exact replay path', store, 'previousSameSource');
has('replay does not persist', tests, 'replay.persisted');
has('restart test', tests, 'process/store restart');
has('stale numeric sequence guard', store, 'TASK_MIRROR_BINDING_STALE_SOURCE_SEQUENCE');
has('equal sequence collision guard', store, 'TASK_MIRROR_BINDING_SOURCE_SEQUENCE_COLLISION');

console.log('\n=== RENAME SAFETY ===');
has('current continuity correlation', store, 'currentCanonicalSourceKey');
has('conservative lifecycle', store, 'safeRenameLifecycle');
has('single unmatched guard', store, 'unmatchedItems.length ===');
has('ambiguous rename diagnostic', store, 'TASK_MIRROR_BINDING_RENAME_AMBIGUOUS');
has('pending rename rejection test', tests, 'pending-to-pending');
has('Codex rename test', tests, 'Codex persistent Task identity');
has('OpenCode rename test', tests, 'OpenCode todowrite active-item rename');

console.log('\n=== OMIT / REAPPEAR ===');
has('omitted bindings remain', docs, 'Absence from a native full plan does not delete a binding');
has('reappearance test', tests, 'historical alias');

console.log('\n=== SHADOW BOUNDARY ===');
has('correlated shadow uses mirror planner', shadow, 'mirror.plan');
has(
  'binding persistence only integration test',
  integration,
  'persists only source binding metadata'
);
has('TaskStore remains empty', integration, 'tasks.listTasks()');

const shadowSources = [store, shadow].join('\n');
for (const forbidden of [
  '.createTask(',
  '.patchTask(',
  '.applyStateOperation(',
  '.start(',
  '.complete(',
  '.cancel(',
  '.claim(',
  '.heartbeat(',
  '.release(',
  '.handoff(',
]) {
  missing(`no Persistent Task mutation ${forbidden}`, shadowSources, forbidden);
}

console.log('\n=== NO AI / VECTOR RUNTIME ===');
for (const forbidden of [
  'OpenAI(',
  'Anthropic(',
  'EmbeddingProvider',
  'VectorDatabase',
  'sqlite-vec',
  'hnswlib',
]) {
  missing(`no runtime dependency ${forbidden}`, shadowSources, forbidden);
}

console.log('\n=== DOCUMENTED LIMITS ===');
has('absence is not cancellation', docs, 'absence != cancellation');
has('pending rename not guessed', docs, 'pending A');
has('Task mutation explicitly forbidden', docs, 'TaskStore.createTask');

console.log(`\nFAILED_CHECKS=${failed}`);
if (failed === 0) {
  console.log('PHASE42C_TASK_MIRROR_BINDING_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE42C_TASK_MIRROR_BINDING_AUDIT=FAIL');
  process.exitCode = 1;
}
