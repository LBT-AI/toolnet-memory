import {
  readFileSync,
} from 'node:fs';
import {
  spawnSync,
} from 'node:child_process';
let failures = 0;
function read(file) {
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
const detector = read('src/memory/conflict-detector.ts');
const engine = read('src/core/memory-engine.ts');
const decay = read('src/memory/decay.ts');
const learnerTypes = read('src/session/learner/types.ts');
const extractor = read('src/session/learner/extractor.ts');
const promotion = read('src/memory/promotion-policy.ts');
const journal = read('src/session/learner/journal.ts');
console.log('=== Conflict Engine V2 Audit ===');
for (const kind of ["'rule'", "'decision'", "'todo'", "'next_action'", "'fix'", "'context'", "'architecture'"]) {
  contains(`conflict kind ${kind}`, detector, kind);
}
contains('completion relation', detector, 'completed:');
contains('resolution relation', detector, 'resolved:');
contains('entity matching', detector, 'entityOf(');
contains('topic matching', detector, 'topicOf(');
contains('lexical subject matching', detector, 'subjectSimilarity(');
contains('authority scoring', detector, 'memoryAuthorityScore');
contains('verified completion gate', detector, 'completionEvidence');
contains('engine completed transition', engine, "lifecycleState: 'completed'");
contains('engine resolved transition', engine, "lifecycleState: 'resolved'");
contains('engine conflicting transition', engine, "lifecycleState: 'conflicting'");
contains('active retrieval filters completed', decay, 'completed');
contains('next action learner kind', learnerTypes, "'next_action'");
contains('next action extractor', extractor, "kind: 'next_action'");
contains('next action promotion', promotion, "'next_action'");
contains('learner evidence persisted', journal, 'candidate.evidence');
contains('learner conflict kind persisted', journal, 'conflictKind:');
const storageStatus = spawnSync('git', ['status', '--porcelain', '--', 'src/storage'], {
  encoding: 'utf8',
});
if (storageStatus.status === 0 && !storageStatus.stdout.trim()) {
  pass('src/storage unchanged');
} else {
  fail('src/storage unchanged');
}
console.log(`FAILURES=${failures}`);
if (failures === 0) {
  console.log('CONFLICT_V2_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('CONFLICT_V2_AUDIT=FAIL');
  process.exitCode = 1;
}
