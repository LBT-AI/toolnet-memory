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

const types = read('src/tasks/types.ts');
const activity = read('src/tasks/activity-progress.ts');
const projection = read('src/tasks/projection.ts');
const orchestration = read('src/tasks/orchestration-engine.ts');
const panel = read('src/visualization/public/index.html');
const tests = read('tests/tasks/task-activity-progress.test.ts');

console.log('=== Phase 48 Task Activity Progress Audit ===');
console.log('\n=== DATA MODEL ===');
has('TaskActivityProgress exists', types, 'export interface TaskActivityProgress');
has('TaskRecord exposes activityProgress', types, 'activityProgress?: TaskActivityProgress');
has('computed progress supports activity source', types, "'children' | 'explicit' | 'activity'");

console.log('\n=== COMPLETION GUARD SAFETY ===');
absent('activity tracker does not call setProgress', activity, 'setProgress(');
absent('activity tracker does not mutate Task.progress', activity, 'task.progress =');
has('explicit completion guard remains', projection, 'TASK_COMPLETE_PROGRESS_INCOMPLETE');
has(
  'safety regression test exists',
  tests,
  'does not make activity heuristics part of completion guards'
);

console.log('\n=== DETERMINISTIC DERIVATION ===');
has('derivation function exists', activity, 'deriveTaskActivityProgress');
has('projection re-derives activity', projection, 'activityProgress: deriveTaskActivityProgress');
has('replay regression exists', tests, 'immutable operation log');

console.log('\n=== SIGNALS ===');
has('file signal', activity, 'filesTouched');
has('test pass signal', activity, 'testsPassed');
has('test fail signal', activity, 'testsFailed');
has('verification signal', activity, 'verificationsPassed');
has('commit signal', activity, 'commits');

console.log('\n=== RESUME / UI ===');
has('resume context exposes activity progress', orchestration, 'activityProgress');
has('resume context exposes suggested next action', orchestration, 'suggestedNextAction');
has('Task panel renders activity percentage', panel, "progress.source === 'activity'");

console.log('\n=== NO NEW HEURISTIC STATE MACHINE ===');
absent('no new Task DB', activity, 'sqlite');
absent('no LLM', activity, 'OpenAI');
absent('no embeddings', activity, 'Embedding');
absent('no vector DB', activity, 'VectorDatabase');

console.log(`\nFAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE48_TASK_ACTIVITY_PROGRESS_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE48_TASK_ACTIVITY_PROGRESS_AUDIT=FAIL');
  process.exitCode = 1;
}
