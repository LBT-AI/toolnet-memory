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

const setup = read('src/production/setup.ts');
const doctor = read('src/production/doctor.ts');
const health = read('src/production/task-health.ts');
const migration = read('src/production/task-migrate.ts');
const bin = read('bin/toolnet-memory');
const standalone = read('src/standalone/cli.ts');
const bundle = read('scripts/build-bundle.mjs');
const docs = read('docs/task-production-ga.md');

console.log('=== Phase 52 Persistent Tasks Production GA Audit ===');
console.log('\n=== SETUP ===');
has('guided setup implementation exists', setup, 'ToolNet Memory Setup');
has('storage setup exists', setup, "'storage'");
has('integration setup exists', setup, "'integrations'");
has('health setup exists', setup, "'health'");
has('npm CLI setup route restored', bin, 'setup)');
has('standalone setup route restored', standalone, "case 'setup':");
has('setup bundle entry exists', bundle, "setup: 'src/production/setup.ts'");

console.log('\n=== DOCTOR ===');
has('doctor includes Persistent Task health', doctor, 'inspectProductionTaskHealth');
has('Task health uses canonical TaskStore', health, 'new TaskStore');
has('replication conflicts visible', health, 'replicationConflicts');

console.log('\n=== MIGRATION ===');
has('migration rebuilds projection', migration, 'rebuildProjection()');
absent('migration does not delete Task operation history', migration, 'unlinkSync');
absent('migration does not truncate Task history itself', migration, 'truncateSync');
has('npm task:migrate route exists', bin, 'task:migrate)');
has('standalone task:migrate route exists', standalone, "case 'task:migrate':");
has('task migration bundle exists', bundle, "'task-migrate'");

console.log('\n=== GA ARCHITECTURE ===');
has('WAL authority documented', docs, 'Session WAL');
has('append-only Task history documented', docs, 'append-only');
has('parallel Tasks documented', docs, 'parallel independent Tasks');
has('no distributed lock claim documented', docs, 'No distributed lock');

console.log('\n=== NO AI REINTRODUCTION ===');
for (const forbidden of [
  'OpenAI(',
  'Anthropic(',
  'EmbeddingProvider',
  'VectorDatabase',
  'sqlite-vec',
  'hnswlib',
  'Redlock',
  'distributedLock',
  'etcd',
]) {
  absent(`no ${forbidden}`, [setup, health, migration].join('\n'), forbidden);
}

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE52_PRODUCTION_GA_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE52_PRODUCTION_GA_AUDIT=FAIL');
  process.exitCode = 1;
}
