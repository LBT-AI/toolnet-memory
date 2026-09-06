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
const sessionResume = read('src/tasks/session-resume.ts');
const sessionCore = read('src/session/core.ts');
const codexHook = read('src/session/codex/context-hook.ts');
const contextRuntime = read('src/work-continuity/context-runtime-cli.ts');
const openCodePlugin = read('src/session/opencode/plugin-installer.ts');
const mcp = read('src/mcp/tools/task-tools.ts');
const cli = read('src/tasks/cli.ts');
const hooks = read('src/hooks/runtime.ts');
const tests = read('tests/tasks/task-resume-bootstrap.test.ts');
const docs = read('docs/task-session-resume-bootstrap.md');

console.log('=== Phase 47 Task Resume Bootstrap Audit ===');

console.log('\n=== CANONICAL RESOLVER ===');
has('session execution resolution type', engine, 'SessionExecutionResolution');
has('canonical resolver', engine, 'resolveSessionExecution');
has('structured context API', engine, 'buildSessionExecutionContext');
has('text bootstrap API', engine, 'renderSessionExecutionBootstrap');
has('shared resolver facade', sessionResume, 'resolveTaskSessionExecution');

console.log('\n=== PRIORITY / SAFETY ===');
has('owned priority', engine, "mode: 'owned'");
has('handoff priority', engine, "mode: 'handoff'");
has('expired recovery', engine, "mode: 'recoverable'");
has('recommended fallback', engine, "mode: 'recommended'");
has('foreign lease safety is delegated to dependency scheduler', engine, 'buildTaskDependencySchedule');
absent('independent work is not globally blocked by foreign lease', engine, ['valid-foreign-lease-present']);
has('auto recovery opt in', sessionResume, 'TOOLNET_TASK_AUTO_RECOVER');
has('recommended work requires claim', engine, 'requiresClaim: true');

console.log('\n=== SESSION INTEGRATION ===');
has('SessionCore resolves on start', sessionCore, 'resolveTaskSessionExecution');
has('SessionCore exposes bootstrap', sessionCore, 'taskResumeBootstrap');
has('heartbeat starts for owned execution', sessionCore, 'this.taskHeartbeat?.start');
has('heartbeat stops on session end', sessionCore, 'this.taskHeartbeat?.stop');
has('Codex uses bootstrap', codexHook, 'renderTaskSessionBootstrap');
has('OpenCode uses existing context surface', openCodePlugin, 'context:print');
has('context CLI uses bootstrap', contextRuntime, 'renderTaskSessionBootstrap');

console.log('\n=== SINGLE MCP / CLI PATH ===');
has('MCP delegates to resolver', mcp, 'resolveSessionExecution');
has('MCP returns bootstrap', mcp, 'renderSessionExecutionBootstrap');
has('CLI delegates to resolver', cli, 'renderSessionExecutionBootstrap');
has('heartbeat runtime remains scoped', hooks, 'TaskHeartbeatRuntime');

console.log('\n=== BOUNDS / SECURITY ===');
has('bootstrap character cap', engine, 'Math.min(8_000');
has('durable sanitizer', engine, 'sanitizeDurableText');
check(
  'no raw terminal or hidden reasoning ingestion',
  !/chainOfThought|chain_of_thought|internalReasoning|JSON\.stringify\([^)]*(stdout|stderr)|rawWAL/iu.test(
    engine + sessionResume + codexHook + contextRuntime
  )
);

console.log('\n=== TEST CONTRACT ===');
has('owned resume test', tests, 'existing valid lease');
has('handoff test', tests, 'explicit handoff');
has('expiry test', tests, 'expired recovery');
has('foreign lease test', tests, 'valid foreign lease');
has('deterministic recommendation test', tests, 'deterministic ready work');
has('bounded security test', tests, 'hidden reasoning');
has('integration boundary test', tests, 'Codex and OpenCode');

console.log('\n=== DOCUMENTATION ===');
has('auto recovery documented', docs, 'TOOLNET_TASK_AUTO_RECOVER=1');
has('no automatic recommended claim documented', docs, 'never auto-claims');
has('cross-host handoff documented', docs, 'OpenCode');

console.log('\n=== NO DISTRIBUTED / AI SYSTEM ===');
absent('no distributed coordinator', engine + sessionResume, [
  'Redis',
  'redlock',
  'Redlock',
  'etcd',
  'ioredis',
  'distributed lock',
]);
absent('no AI/vector additions', engine + sessionResume + tests, [
  'OpenAI(',
  'Anthropic(',
  'EmbeddingProvider',
  'VectorDatabase',
  'sqlite-vec',
]);

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE47_TASK_RESUME_BOOTSTRAP_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE47_TASK_RESUME_BOOTSTRAP_AUDIT=FAIL');
  process.exitCode = 1;
}
