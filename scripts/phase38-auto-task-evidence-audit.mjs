import {
  existsSync,
  readFileSync,
} from 'node:fs';

let failures = 0;

function read(file) {
  if (!existsSync(file)) {
    failures += 1;
    console.log(`FAIL  missing ${file}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function check(label, result) {
  if (result) {
    console.log(`PASS  ${label}`);
    return;
  }
  failures += 1;
  console.log(`FAIL  ${label}`);
}

function contains(label, text, needle) {
  check(label, text.includes(needle));
}

function absent(label, text, needle) {
  check(label, !text.includes(needle));
}

const engine = read('src/tasks/auto-evidence.ts');
const runtime = read('src/hooks/runtime.ts');
const afterEdit = read('src/hooks/after-edit.ts');
const afterCommand = read('src/hooks/after-command.ts');
const index = read('src/hooks/index.ts');

console.log('=== Phase 38 Auto Task Evidence Audit ===');

console.log('');
console.log('=== TARGET ATTRIBUTION ===');
contains('requires agent id', engine, 'TASK_AUTO_EVIDENCE_AGENT_REQUIRED');
contains('active lease ownership', engine, 'taskLeaseActiveAt');
contains('explicit target support', engine, 'targetTaskId');
contains('ambiguous claims fail closed', engine, 'no-unambiguous-claimed-task');

console.log('');
console.log('=== FILE EVIDENCE ===');
contains('file write recorder', engine, 'recordFileWrite');
contains('project relative paths', engine, 'relativeProjectFile');
contains('ToolNet internals ignored', engine, "'.toolnet/'");
contains('Git internals ignored', engine, "'.git/'");
contains('node_modules ignored', engine, "'node_modules/'");
contains('HookRuntime fileWrite integration', runtime, '.recordFileWrite(');
contains('existing afterEdit path remains', afterEdit, 'runtime.fileWrite');

console.log('');
console.log('=== TEST EVIDENCE ===');
contains('test command classifier', engine, "kind: 'test'");
contains('PASS/FAIL based on exit code', engine, 'testOutcome');
contains('Vitest support', engine, 'vitest');
contains('Pytest support', engine, 'pytest');
contains('Go test support', engine, 'go test');
contains('Cargo test support', engine, 'cargo test');

console.log('');
console.log('=== VERIFICATION ===');
contains('verification classifier', engine, "'verification'");
contains('typecheck family', engine, 'typecheck');
contains('audit family', engine, 'audit');
contains('git diff check', engine, 'git diff --check');

console.log('');
console.log('=== COMMIT EVIDENCE ===');
contains('commit classifier', engine, "'git commit'");
contains('HEAD resolution', engine, "'rev-parse'");
contains('commit evidence kind', engine, "kind: 'commit'");
contains('spawn without shell', engine, 'spawnSync');
absent('no shell true', engine, 'shell: true');

console.log('');
console.log('=== HOOK INTEGRATION ===');
contains('automatic evidence env', runtime, 'TOOLNET_AUTO_TASK_EVIDENCE');
contains('agent env', runtime, 'TOOLNET_AGENT_ID');
contains('explicit Task env', runtime, 'TOOLNET_TASK_ID');
contains('strict existing project', runtime, 'requireExisting');
contains('command integration', runtime, '.recordCommand(');
contains('after-command hook', afterCommand, 'runtime.command');
contains('after-command exported', index, "'./after-command.js'");
contains('fail-soft diagnostics', runtime, 'taskEvidenceFailureCount');

console.log('');
console.log('=== SAFETY ===');
absent('Auto engine never calls complete', engine, '.complete(');
absent('Auto engine never stores stdout', engine, 'stdout:');
absent('Auto engine never stores stderr', engine, 'stderr:');
absent('Auto engine never stores env', engine, 'process.env');
absent('No raw tool output handling', engine, 'toolOutput');

console.log('');
console.log('=== ARCHITECTURE LOCKS ===');
const combined = engine + runtime + afterCommand;
absent('no OpenAI', combined, 'OpenAI');
absent('no embedding provider', combined, 'EmbeddingProvider');
absent('no vector DB', combined, 'VectorDatabase');
absent('no filesystem watcher', engine, 'watch(');
absent('no remote distributed lock', engine, 'distributedLock');

console.log('');
console.log(`FAILURES=${failures}`);

if (failures === 0) {
  console.log('PHASE38_AUTO_TASK_EVIDENCE_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE38_AUTO_TASK_EVIDENCE_AUDIT=FAIL');
  process.exitCode = 1;
}