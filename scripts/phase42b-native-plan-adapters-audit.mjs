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

function contains(label, text, needle) {
  check(label, text.includes(needle));
}

function absent(label, text, needle) {
  check(label, !text.includes(needle));
}

const common = read('src/session/native-plan/common.ts');
const codex = read('src/session/codex/plan-adapter.ts');
const opencode = read('src/session/opencode/plan-adapter.ts');
const nativeIndex = read('src/session/native-plan/index.ts');
const shadow = read('src/session/native-plan/shadow.ts');
const tests = read('tests/tasks/native-plan-adapters.test.ts');
const docs = read('docs/task-native-plan-adapters.md');

console.log('=== Phase 42B Native Plan Adapter Audit ===');
console.log('\n=== CODEX ===');
contains('Codex exact update_plan tool', codex, "'updateplan'");
contains('Codex structured arguments', codex, 'call.arguments');
contains('Codex plan array', codex, 'args.plan');
contains('Codex step field', codex, 'item?.step');
contains('Codex pending', codex, "'pending'");
contains('Codex in_progress', codex, "'in_progress'");
contains('Codex completed', codex, "'completed'");
absent('Codex does not accept invented blocked state', codex, "'blocked'");

console.log('\n=== OPENCODE ===');
contains('OpenCode exact todowrite tool', opencode, "'todowrite'");
contains('OpenCode state input', opencode, 'state?.input');
contains('OpenCode todos', opencode, 'input?.todos');
contains('OpenCode content', opencode, 'todo?.content');
contains('OpenCode cancelled', opencode, "'cancelled'");

console.log('\n=== IDENTITY ===');
contains('content-derived identity', common, 'contentSourceKeys');
contains('SHA256 source identity', common, 'createHash');
contains('duplicate title occurrence isolation', common, 'occurrences');
absent('array index is not native identity', common, 'slot:');
contains('rename limitation documented', docs, 'native rename currently creates a new source key');

console.log('\n=== FAIL CLOSED ===');
contains('Codex malformed item guard', codex, 'CODEX_PLAN_ITEM_INVALID');
contains('OpenCode malformed item guard', opencode, 'OPENCODE_TODO_ITEM_INVALID');
contains('Codex multiple active diagnostic', codex, 'CODEX_PLAN_MULTIPLE_IN_PROGRESS');
contains('OpenCode multiple active diagnostic', opencode, 'OPENCODE_MULTIPLE_IN_PROGRESS');
contains('exactly one current helper', common, 'active.length ===');

console.log('\n=== SHADOW ONLY ===');
contains('uses TaskMirrorEngine', shadow, 'TaskMirrorEngine');
contains('only calls mirror.plan', shadow, '.plan(');
for (const source of [common, codex, opencode, nativeIndex, shadow]) {
  for (const forbidden of [
    '.createTask(',
    '.patchTask(',
    '.applyStateOperation(',
    '.start(',
    '.complete(',
    '.cancel(',
    '.claim(',
    '.release(',
    '.handoff(',
  ]) {
    absent(`no native adapter mutation via ${forbidden}`, source, forbidden);
  }
}

console.log('\n=== NO TEXT TODO HEURISTIC ===');
absent('Codex no WorkObservation heuristic', codex, 'extractWorkObservations');
absent('OpenCode no WorkObservation heuristic', opencode, 'extractWorkObservations');
absent('Codex no assistant message regex', codex, 'assistant_message');
absent('OpenCode no assistant message regex', opencode, 'assistant_message');

console.log('\n=== TEST COVERAGE CONTRACT ===');
contains('Codex official shape test', tests, 'official Codex update_plan wire shape');
contains('OpenCode official shape test', tests, 'official OpenCode todowrite shape');
contains('reorder identity test', tests, 'stable across reorder and status changes');
contains(
  'cross-session collision test',
  tests,
  'different sessions produces different persistent Task IDs'
);
contains('prose rejection test', tests, 'does not parse assistant prose');
contains('shadow non-mutation test', tests, 'store.listTasks()');

console.log('\n=== ARCHITECTURE ===');
const combined = common + codex + opencode + nativeIndex + shadow;
for (const forbidden of [
  'OpenAI',
  'Anthropic',
  'EmbeddingProvider',
  'VectorDatabase',
  'sqlite-vec',
  'hnswlib',
  'distributedLock',
  'WebSocket',
]) {
  absent(`no prohibited runtime ${forbidden}`, combined, forbidden);
}

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE42B_NATIVE_PLAN_ADAPTERS_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE42B_NATIVE_PLAN_ADAPTERS_AUDIT=FAIL');
  process.exitCode = 1;
}
