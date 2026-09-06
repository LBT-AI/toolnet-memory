import { readFileSync } from 'node:fs';

let failures = 0;

function read(path) {
  return readFileSync(path, 'utf8');
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

const parallel = read('src/tasks/parallel-execution.ts');
const resume = read('src/tasks/session-resume.ts');
const orchestration = read('src/tasks/orchestration-engine.ts');
const tests = read('tests/tasks/task-parallel-execution.test.ts');
const docs = read('docs/task-parallel-execution.md');

console.log('=== Phase 50 Multi-Agent Parallel Execution Audit ===');
console.log('\n=== CENTRAL COORDINATOR ===');
has('parallel coordinator exists', parallel, 'TaskParallelExecutionCoordinator');
has('parallel coordinator reuses orchestration', parallel, 'TaskOrchestrationEngine');
has('parallel planning API exists', parallel, 'plan(');
has('parallel claiming API exists', parallel, 'claimReady(');

console.log('\n=== ONE TASK PER AGENT ===');
has('owned Tasks preserved', parallel, 'ownedTasks');
has('agent ordering normalized', parallel, 'normalizedAgents');
has('ambiguous ownership is surfaced', parallel, 'ambiguousAgentIds');
has('one Task ownership test exists', tests, 'never gives an agent a second Task');

console.log('\n=== PARALLEL SAFETY ===');
has('real assignments use orchestration claim', parallel, 'this.orchestration.claim(');
has('claim race retry exists', parallel, 'retryableClaimRace');
has('distinct Task test exists', tests, 'claims one different ready Task per agent');
has('dependency safety test exists', tests, 'does not assign dependency-waiting work');
has('replication conflict test exists', tests, 'replication-conflicted work');

console.log('\n=== STARTUP AUTO ASSIGN ===');
has('auto assign env exists', resume, 'TOOLNET_TASK_AUTO_ASSIGN');
has('SessionExecutionOptions exposes autoAssign', orchestration, 'autoAssign?: boolean');
has('default read-only startup test exists', tests, 'startup recommendation read-only by default');
has('auto assignment startup test exists', tests, 'auto assigns a recommended Task');
has(
  'two agent startup test exists',
  tests,
  'two startup agents auto assign different independent Tasks'
);

console.log('\n=== NO BYPASS ===');
for (const forbidden of [
  'applyStateOperation(',
  "'task.agent.claim'",
  'addDependency(',
  '.complete(',
]) {
  absent(`coordinator does not use ${forbidden}`, parallel, forbidden);
}

console.log('\n=== NO DISTRIBUTED COORDINATOR ===');
for (const forbidden of [
  'Redis',
  'Redlock',
  'etcd',
  'distributedLock',
  'OpenAI',
  'Anthropic',
  'EmbeddingProvider',
  'VectorDatabase',
]) {
  absent(`no ${forbidden}`, parallel, forbidden);
}

console.log('\n=== DOCUMENTATION ===');
has('parallel startup documented', docs, 'Opt-in startup assignment');
has('cross-host limitation documented', docs, 'Cross-host behavior');
has('no provider spawning documented', docs, 'does not launch Codex');

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE50_MULTI_AGENT_PARALLEL_EXECUTION_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE50_MULTI_AGENT_PARALLEL_EXECUTION_AUDIT=FAIL');
  process.exitCode = 1;
}
