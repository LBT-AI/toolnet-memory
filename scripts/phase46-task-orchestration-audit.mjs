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
function absent(label, source, needles) {
  check(
    label,
    needles.every((needle) => !source.includes(needle))
  );
}

const engine = read('src/tasks/orchestration-engine.ts');
const handoff = read('src/tasks/handoff-engine.ts');
const projection = read('src/tasks/handoff-projection.ts');
const evidence = read('src/tasks/auto-evidence.ts');
const cli = read('src/tasks/cli.ts');
const mcp = read('src/mcp/tools/task-tools.ts');
const server = read('src/mcp/server.ts');
const tests = read('tests/tasks/task-orchestration.test.ts');
const docs = read('docs/task-multi-agent-orchestration.md');

console.log('=== Phase 46 Multi-Agent Task Orchestration Audit ===');
console.log('\n=== CENTRAL ENGINE ===');
has('central orchestration engine', engine, 'class TaskOrchestrationEngine');
has('deterministic next task', engine, 'compareReady');
has('resume context', engine, 'TaskExecutionContext');
has('scoped heartbeat runtime', engine, 'class TaskHeartbeatRuntime');

console.log('\n=== LEASE SAFETY ===');
has('lease expiry recovery', projection, 'lease-expired-takeover');
has('ownership validation', projection, 'TASK_LEASE_OWNERSHIP_MISMATCH');
has('expired lease validation', projection, 'TASK_LEASE_EXPIRED');
has('conflict blocks orchestration', engine, 'TASK_REPLICATION_CONFLICT');

console.log('\n=== HANDOFF / CONFLICT RESOLUTION ===');
has('append-only handoff payload', projection, 'task.agent.handoff');
has('explicit conflict resolution operation', engine, 'task.replication.conflict.resolved');
has('conflict resolution API', engine, 'resolveConflict');
has('CLI conflict resolution', cli, 'conflict-resolve');

console.log('\n=== EVIDENCE / COMPLETION OWNERSHIP ===');
has('evidence checks replication conflicts', evidence, 'replicationConflicts');
has('completion owner guard', engine, 'TASK_COMPLETION_OWNER_MISMATCH');
has('stale owner test', tests, 'stale completion');

console.log('\n=== CLI / MCP ===');
has('CLI next uses orchestration', cli, 'service.orchestration.resolveNextTask');
has('MCP heartbeat', mcp, 'taskHeartbeat');
has('MCP resume context', mcp, 'taskResumeContext');
has('MCP heartbeat registration', server, "'task_heartbeat'");
has('MCP resume registration', server, "'task_resume_context'");

console.log('\n=== TEST CONTRACT ===');
has('priority deterministic test', tests, 'priority and order');
has('expiry recovery test', tests, 'lease expiry');
has('handoff context test', tests, 'Codex to OpenCode');
has('conflict safety test', tests, 'replication conflict');
has('stale owner test', tests, 'former owner');

console.log('\n=== NO DISTRIBUTED COORDINATOR ===');
absent('no distributed lock/coordinator', engine, [
  'Redis',
  'redlock',
  'Redlock',
  'etcd',
  'ioredis',
]);

console.log('\n=== NO AI / VECTOR SYSTEM ===');
absent('no AI/vector additions', engine + tests, [
  'OpenAI(',
  'Anthropic(',
  'EmbeddingProvider',
  'VectorDatabase',
  'sqlite-vec',
]);

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE46_TASK_ORCHESTRATION_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE46_TASK_ORCHESTRATION_AUDIT=FAIL');
  process.exitCode = 1;
}
