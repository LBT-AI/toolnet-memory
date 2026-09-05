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

const core = read('src/session/core.ts');
const checkpoint = read('src/session/local-checkpoint.ts');
const compatibility = read('src/work-continuity/task-compatibility.ts');
const reducer = read('src/work-continuity/reducer.ts');
const types = read('src/work-continuity/types.ts');
const codex = read('src/session/codex/adapter.ts');
const opencode = read('src/session/opencode/adapter.ts');
const docs = read('docs/workstate-task-consolidation.md');

console.log('=== Phase 44 WorkState / Persistent Tasks Consolidation Audit ===');
console.log('');
console.log('=== AUTHORITATIVE MODEL ===');
has('Persistent Tasks are read by compatibility projector', compatibility, 'taskProjection');
has('Task status maps into WorkState', compatibility, 'workStatus');
has('WorkState remains compatibility type', compatibility, 'legacy\n * WorkState');
has('authority documented', docs, 'authoritative execution model');
has('compatibility documented', docs, 'compatibility/read model');

console.log('');
console.log('=== SINGLE SESSION PROJECTION PATH ===');
has(
  'SessionCore calls checkpointLocalSession',
  core,
  'checkpointLocalSession(this.project, this.identity, events)'
);
has('checkpoint extracts observations', checkpoint, 'extractWorkObservations(identity, events)');
has(
  'checkpoint applies legacy projection',
  checkpoint,
  'applyObservationsToLocalWorkState(project, observations)'
);
has(
  'checkpoint queues Task mirror after local projection',
  core,
  'this.taskMirror.enqueue(events)'
);
absent('Codex direct WorkState mutation', codex, 'applyObservationsToLocalWorkState');
absent('Codex direct current markdown mutation', codex, 'writeStableWorkStateToCurrent');
absent('OpenCode direct WorkState mutation', opencode, 'applyObservationsToLocalWorkState');
absent('OpenCode direct current markdown mutation', opencode, 'writeStableWorkStateToCurrent');

console.log('');
console.log('=== TASK-AWARE COMPATIBILITY ===');
has('binding store reused', compatibility, 'TaskMirrorBindingStore');
has('TaskStore projection reused', compatibility, 'new TaskStore(project).projection()');
has('bound Task lookup uses deterministic mirror identity', compatibility, 'taskMirrorTaskId');
has('blocked Task status wins', compatibility, "task.status === 'blocked'");
has('Task next action projected', compatibility, 'current.task.nextAction');
has('Task files projected', compatibility, 'task.filesTouched');
has('Task tests projected', compatibility, 'task.tests');
has('completed state retained', reducer, 'projectWorkStateWithTasks');

console.log('');
console.log('=== LEGACY / REPLAY ===');
has('WorkObservation retained', types, 'interface WorkObservation');
has('legacy current.json retained', reducer, "join(localDirectory, 'current.json')");
has('legacy no-binding fallback', compatibility, 'return input.previousWorkState');
has(
  'replay projection applies Task authority',
  reducer,
  'new TaskMirrorBindingStore(project).projection()'
);

console.log('');
console.log('=== NO NEW SYSTEM ===');
absent('no new TODO parser', compatibility, 'parseTodo');
absent('no LLM', compatibility, 'OpenAI(');
absent('no embeddings', compatibility, 'EmbeddingProvider');
absent('no vector DB', compatibility, 'VectorDatabase');
absent('no distributed lock', compatibility, 'distributedLock');

console.log('');
console.log(`FAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE44_WORKSTATE_CONSOLIDATION_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE44_WORKSTATE_CONSOLIDATION_AUDIT=FAIL');
  process.exitCode = 1;
}
