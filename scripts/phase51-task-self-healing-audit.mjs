import { readFileSync } from 'node:fs';

let failures = 0;

function read(path) {
  return readFileSync(path, 'utf8');
}

function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures += 1;
}

function has(label, source, needle) {
  check(label, source.includes(needle));
}

function absent(label, source, needle) {
  check(label, !source.includes(needle));
}

const wal = read('src/session/wal.ts');
const recovery = read('src/session/task-self-healing.ts');
const core = read('src/session/core.ts');
const operationLog = read('src/tasks/operation-log.ts');
const tests = read('tests/tasks/task-self-healing.test.ts');
const docs = read('docs/task-crash-replay-self-healing.md');

console.log('=== Phase 51 Crash / Replay / Self-Healing Audit ===');
console.log('\n=== SESSION WAL ===');
has('Session WAL exposes durable replay', wal, 'readAllEvents()');
has('Session WAL repairs partial tail', wal, 'repairPartialWalTail');
has('Session WAL fsync remains present', wal, 'fsyncSync');

console.log('\n=== TASK LOG ===');
has('Task log supports corrupt tail repair', operationLog, 'repairCorruptTail');
has('Task log truncates trailing partial fragment', operationLog, 'truncateSync');
has('complete invalid Task lines fail closed', operationLog, 'TASK_OPERATION_LOG_CORRUPT');

console.log('\n=== STARTUP RECOVERY ===');
has('canonical recovery service exists', recovery, 'recoverSessionTaskState');
has('Task projection is rebuilt', recovery, '.rebuildProjection()');
has('Session WAL is replayed', recovery, 'wal.readAllEvents()');
has('mirror replay drains', recovery, 'await mirror.drain()');
has('SessionCore invokes recovery', core, 'recoverSessionTaskState(');
has('recovery diagnostics exposed', core, 'taskSelfHealingStatus()');

console.log('\n=== CERTIFICATION CASES ===');
has('WAL-before-mirror crash test', tests, 'before mirror enqueue');
has('duplicate replay test', tests, 'does not duplicate logical Tasks');
has('Task partial tail test', tests, 'interrupted Task operation log tail');
has('complete corruption fail-closed test', tests, 'fails closed on corruption');
has('Session WAL tail test', tests, 'interrupted Session WAL tail');
has('missing projection recovery test', tests, 'missing Task projection state');
has('lease restart test', tests, 'preserves active lease ownership');
has('fail-soft session capture test', tests, 'keeps Session WAL available');

console.log('\n=== ARCHITECTURE ===');
for (const forbidden of ['sqlite', 'distributedLock', 'Redis', 'OpenAI', 'EmbeddingProvider']) {
  absent(`no ${forbidden}`, recovery, forbidden);
}
has('WAL authority documented', docs, 'Session WAL');
has('Task operation log authority documented', docs, 'Persistent Task operation log');

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE51_TASK_SELF_HEALING_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE51_TASK_SELF_HEALING_AUDIT=FAIL');
  process.exitCode = 1;
}
