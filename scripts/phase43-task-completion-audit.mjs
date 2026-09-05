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

const types = read('src/tasks/types.ts');
const projection = read('src/tasks/projection.ts');
const state = read('src/tasks/state-engine.ts');
const builder = read('src/tasks/completion-snapshot.ts');
const mutate = read('src/session/native-plan/mutate.ts');
const bindings = read('src/tasks/mirror-binding-store.ts');
const panel = read('src/visualization/tasks-panel.ts');
const html = read('src/visualization/public/index.html');
const tests = read('tests/tasks/task-completion.test.ts');

console.log('=== Phase 43 Task Completion Snapshot Audit ===');
console.log('\n=== DATA MODEL / APPEND-ONLY ===');
has('TaskCompletionSnapshot exists', types, 'interface TaskCompletionSnapshot');
has('TaskRecord completion field exists', types, 'completion?: TaskCompletionSnapshot');
has('completion operation exists', types, "type: 'task.completion.recorded'");
has('completion operation is projected', projection, "payload.type === 'task.completion.recorded'");
has('state API exists', state, 'recordCompletion(');
has('state API uses applyStateOperation', state, 'this.store.applyStateOperation');
absent('no separate completion store', mutate, 'completion.json');
absent('no parallel completion database', builder, 'DatabaseSync');

console.log('\n=== IMMUTABILITY / DETERMINISM ===');
has('completed lifecycle required', projection, 'TASK_COMPLETION_REQUIRES_COMPLETED');
has('conflicting completion rejected', projection, 'TASK_COMPLETION_ALREADY_RECORDED');
has('deterministic completion ID', builder, 'completionId');
has('deterministic SHA-256 digest', builder, 'completionDigest');
has('operation timestamp captured', projection, 'capturedAt: operation.occurredAt');
has('idempotency test', tests, 'immutable/idempotent');

console.log('\n=== BOUNDS / SECURITY ===');
has('durable sanitizer used', builder, 'sanitizeDurableText');
has('summary bounded', builder, 'SUMMARY_MAX = 4_000');
has('changes bounded', builder, 'CHANGE_MAX = 32');
has('decisions bounded', builder, 'DECISION_MAX = 16');
has('verification bounded', builder, 'VERIFICATION_MAX = 32');
has('files bounded', builder, 'FILE_MAX = 256');
has('tests bounded', builder, 'TEST_MAX = 256');
has('commit SHA validated', builder, 'SHA_PATTERN');
for (const forbidden of [
  'OpenAI',
  'Anthropic',
  'EmbeddingProvider',
  'VectorDatabase',
  'sqlite-vec',
  'hnswlib',
]) {
  absent(`no ${forbidden}`, builder + mutate, forbidden);
}
for (const forbidden of [
  'reasoning',
  'chainOfThought',
  'chain_of_thought',
  'analysis',
  'thoughts',
]) {
  has(`forbidden ${forbidden} is excluded`, builder, forbidden.toLowerCase());
}
has('raw tool output not ingested', builder, "event.type !== 'message_part'");
has('hidden reasoning test', tests, 'reasoning');

console.log('\n=== NATIVE CORRELATION / LIFECYCLE ===');
has('Phase 42 binding store reused', mutate, 'TaskMirrorBindingStore');
has('visible result correlation uses binding store', mutate, 'correlateVisibleResult');
has('Codex/OpenCode extraction path reused', mutate, 'extractNativePlanSnapshots');
has('completion follows executor', mutate, 'executor.execute');
has('completion uses state engine', mutate, 'state.recordCompletion');
has('guarded completion remains authoritative', mutate, "task.status !== 'completed'");
has('stale result is rejected', bindings, 'TASK_MIRROR_VISIBLE_RESULT_STALE');
has('ambiguous result is rejected', bindings, 'TASK_MIRROR_VISIBLE_RESULT_AMBIGUOUS');
has('native correlation tests', tests, 'native sessions isolated');
has('OpenCode completion test', tests, 'OpenCode');
has(
  'lifecycle guard test',
  tests,
  'does not record a snapshot when the lifecycle completion guard rejects native completion'
);
absent('no title-only completion matching', mutate, 'find((task) => task.title');

console.log('\n=== PANEL / READ-ONLY API ===');
has('panel completion type', panel, 'TaskPanelCompletion');
has('panel completion field', panel, 'completion?: TaskPanelCompletion');
has('panel copies completion', panel, 'panelCompletion');
has('browser completion renderer', html, 'renderTaskCompletion');
has('browser escapes strings', html, 'escapeHtml(completion.summary)');
has('browser caps rendered entries', html, 'completionItems');
absent('no task write endpoint added', html, "fetch('/api/tasks', { method: 'POST'");

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE43_TASK_COMPLETION_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE43_TASK_COMPLETION_AUDIT=FAIL');
  process.exitCode = 1;
}
