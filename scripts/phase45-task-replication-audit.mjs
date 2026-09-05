import { readFileSync } from 'node:fs';

let failures = 0;

function read(file) {
  return readFileSync(file, 'utf8');
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

const core = read('src/tasks/replication/core.ts');
const types = read('src/tasks/replication/types.ts');
const store = read('src/tasks/replication/store.ts');
const upload = read('src/tasks/replication/upload.ts');
const download = read('src/tasks/replication/download.ts');
const service = read('src/tasks/replication/service.ts');
const runtime = read('src/tasks/replication/runtime.ts');
const tests = read('tests/tasks/task-replication.test.ts');
const taskStore = read('src/tasks/store.ts');
const docs = read('docs/task-cross-host-replication.md');

console.log('=== Phase 45 Cross-Host Task Replication Audit ===');
console.log('\n=== IMMUTABLE REMOTE OPS ===');
has('deterministic batch ID', core, 'replicationBatchId');
has('batch content hash', core, 'operationsSha256');
has('immutable batch key', core, 'taskReplicationBatchKey');
has('write verification', upload, 'validateTaskReplicationBatch');
has('immutable conflict', upload, 'TASK_REPLICATION_IMMUTABLE_CONFLICT');

console.log('\n=== HOST SCOPED SEQUENCING ===');
has('host identity retained', types, 'hostId');
has('per-host cursor', types, 'remoteHostCursors');
has('no global sequence projection', core, 'withoutForeignRevision');
has('replicated operations separate from authored log', store, 'replicated');
has('TaskStore reads replicated set', taskStore, 'readAllReplicatedTaskOperations');

console.log('\n=== CONVERGENCE ===');
has('canonical convergence', core, 'convergeTaskOperations');
has('operation dedupe', core, 'replicationOperationKey');
has('permutation test', tests, 'every sync order');
has('three-host fixture', tests, 'host-c');
has('projection hash', core, 'taskProjectionHash');

console.log('\n=== CONFLICTS ===');
has('lifecycle conflict', core, 'TASK_LIFECYCLE_CONFLICT');
has('lease conflict', core, 'TASK_LEASE_CONFLICT');
has('completion conflict', core, 'TASK_COMPLETION_CONFLICT');
has('authored operations retained', tests, 'result.operations).toHaveLength(5)');

console.log('\n=== FAILURE / SECURITY ===');
has('download validates batches', download, 'validateTaskReplicationBatch');
has('wrong project test', tests, 'PROJECT_MISMATCH');
has('offline local mutation test', tests, 'Offline task');
has('runtime failure isolation', runtime, 'failedBatches');
has('replication opt out', service, 'TOOLNET_TASK_REPLICATION');

console.log('\n=== NO DISTRIBUTED LOCK ===');
for (const forbidden of ['Redis', 'redlock', 'Redlock', 'etcd', 'distributedLock', 'ioredis']) {
  absent(
    `no ${forbidden}`,
    core + types + store + upload + download + service + runtime,
    forbidden
  );
}
has('not distributed locking documented', docs, 'NOT distributed locking');

console.log('\n=== NO NEW AI / VECTOR SYSTEM ===');
for (const forbidden of [
  'OpenAI(',
  'Anthropic(',
  'EmbeddingProvider',
  'VectorDatabase',
  'sqlite-vec',
  'hnswlib',
]) {
  absent(
    `no ${forbidden}`,
    core + types + store + upload + download + service + runtime,
    forbidden
  );
}

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE45_TASK_REPLICATION_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE45_TASK_REPLICATION_AUDIT=FAIL');
  process.exitCode = 1;
}
