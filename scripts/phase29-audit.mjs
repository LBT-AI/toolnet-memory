import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let failures = 0;

function read(file) {
  if (!existsSync(file)) {
    failures += 1;
    console.log(`FAIL  required file ${file}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function pass(label) {
  console.log(`PASS  ${label}`);
}

function fail(label) {
  failures += 1;
  console.log(`FAIL  ${label}`);
}

function contains(label, text, needle) {
  if (text.includes(needle)) {
    pass(label);
    return;
  }
  fail(label);
}

function absent(label, text, needle) {
  if (!text.includes(needle)) {
    pass(label);
    return;
  }
  fail(label);
}

const audit = read('src/audit/log.ts');
const scheduler = read('src/retention/scheduler.ts');
const daemon = read('src/service/daemon.ts');
const guard = read('src/guard/cli.ts');
const snapshot = read('src/production/snapshot-cli.ts');
const mcp = read('src/mcp/tools/memory-remember.ts');
const learner = read('src/session/learner/journal.ts');
const gc = read('src/retention/cli.ts');
const retention = read('src/retention/local-planner.ts');

console.log('=== Phase 29 Audit ===');

console.log('');
console.log('=== AUDIT LOG ===');

contains('project audit path', audit, "'audit'");
contains('append-only JSONL', audit, 'appendFileSync');
contains('exclusive ownership lock', audit, "'wx'");
contains('ownership token', audit, 'randomUUID');
contains('durable sanitizer', audit, 'sanitizeDurableValue');
contains('SHA256 hash chain', audit, "createHash('sha256'");
contains('previous hash', audit, 'previousHash');
contains('verification', audit, 'verifyAuditLog');

console.log('');
console.log('=== EVENT COVERAGE ===');

contains('MCP memory save audit', mcp, "'memory.save'");
contains('learner memory save audit', learner, "'memory.save'");
contains('snapshot restore audit', snapshot, "'snapshot.restore'");
contains('snapshot recover audit', snapshot, "'snapshot.recover'");
contains('Guard audit', guard, "'guard.check'");
contains('manual GC audit', gc, "'gc.manual'");
contains('auto GC audit', scheduler, "'gc.auto'");

absent('Guard raw command not stored in audit details', guard, 'command: options.command');

console.log('');
console.log('=== AUTO GC ===');

contains('auto GC opt-in', scheduler, 'TOOLNET_AUTO_GC');
contains('weekly default', scheduler, '168');
contains('remote GC opt-in', scheduler, 'TOOLNET_AUTO_GC_REMOTE');
contains('exclusive GC lock', scheduler, "'wx'");
contains('strict existing project', scheduler, 'requireExisting');
contains('no filesystem project scan', scheduler, 'observeRoot');
contains('daemon scheduler integration', daemon, 'createAutoGcScheduler');
contains('daemon observes project roots', daemon, 'request.project.rootPath');

console.log('');
console.log('=== RETENTION SAFETY ===');

contains('audit log protected from GC', retention, "'protected-audit'");

console.log('');
console.log('=== ROUTE PARITY ===');

const routes = spawnSync(process.execPath, ['scripts/standalone-route-audit.mjs'], {
  encoding: 'utf8',
});

if (routes.status === 0) {
  pass('standalone route parity');
} else {
  fail('standalone route parity');
  process.stdout.write(routes.stdout ?? '');
  process.stderr.write(routes.stderr ?? '');
}

console.log('');
console.log('=== ARCHITECTURE LOCKS ===');

const combined = audit + scheduler;

absent('no LLM', combined, 'OpenAI');
absent('no embedding', combined, 'EmbeddingProvider');
absent('no vector DB', combined, 'VectorDatabase');

console.log('');
console.log('=== PHASE 27 STORAGE SCOPE ===');

const storage = spawnSync(process.execPath, ['scripts/storage-scope-audit.mjs'], {
  encoding: 'utf8',
});

if (storage.status === 0) {
  pass('Phase 27 storage scope preserved');
} else {
  fail('Phase 27 storage scope preserved');
  process.stdout.write(storage.stdout ?? '');
}

console.log('');
console.log(`FAILURES=${failures}`);

if (failures === 0) {
  console.log('PHASE29_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE29_AUDIT=FAIL');
  process.exitCode = 1;
}
