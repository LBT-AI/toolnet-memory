import {
  existsSync,
  readFileSync,
} from 'node:fs';

let failures =
  0;

function read(
  file
) {
  if (
    !existsSync(
      file
    )
  ) {
    failures +=
      1;

    console.log(
      `FAIL  missing ${file}`
    );
    return '';
  }

  return readFileSync(
    file,
    'utf8'
  );
}

function pass(
  label
) {
  console.log(
    `PASS  ${label}`
  );
}

function fail(
  label
) {
  failures +=
    1;

  console.log(
    `FAIL  ${label}`
  );
}

function contains(
  label,
  text,
  needle
) {
  if (
    text.includes(
      needle
    )
  ) {
    pass(
      label
    );

    return;
  }

  fail(
    label
  );
}

function absent(
  label,
  text,
  needle
) {
  if (
    !text.includes(
      needle
    )
  ) {
    pass(
      label
    );

    return;
  }

  fail(
    label
  );
}

const types =
  read(
    'src/tasks/types.ts'
  );

const projection =
  read(
    'src/tasks/projection.ts'
  );

const engine =
  read(
    'src/tasks/state-engine.ts'
  );

const store =
  read(
    'src/tasks/store.ts'
  );

console.log(
  '=== Phase 34 Task State Engine Audit ==='
);

console.log('');
console.log(
  '=== LIFECYCLE ==='
);

contains(
  'lifecycle operation',
  types,
  "'task.lifecycle.transition'"
);

contains(
  'lifecycle transition matrix',
  projection,
  'lifecycleAllowed'
);

contains(
  'blocked requires reason',
  projection,
  'TASK_BLOCKER_REASON_REQUIRED'
);

contains(
  'terminal states fail closed',
  projection,
  "current === 'completed'"
);

console.log('');
console.log(
  '=== PROGRESS ==='
);

contains(
  'explicit progress',
  types,
  'TaskProgress'
);

contains(
  'progress validation',
  projection,
  'TASK_PROGRESS_INVALID'
);

contains(
  'derived child progress',
  projection,
  'computedTaskProgress'
);

console.log('');
console.log(
  '=== COMPLETION GUARDS ==='
);

contains(
  'blocker guard',
  projection,
  'TASK_COMPLETE_BLOCKED'
);

contains(
  'dependency guard',
  projection,
  'TASK_COMPLETE_DEPENDENCIES_PENDING'
);

contains(
  'child guard',
  projection,
  'TASK_COMPLETE_CHILDREN_OPEN'
);

contains(
  'progress guard',
  projection,
  'TASK_COMPLETE_PROGRESS_INCOMPLETE'
);

console.log('');
console.log(
  '=== DEPENDENCIES ==='
);

contains(
  'dependency add',
  types,
  "'task.dependency.add'"
);

contains(
  'dependency cycle detection',
  projection,
  'TASK_DEPENDENCY_CYCLE'
);

contains(
  'self dependency protection',
  projection,
  'TASK_DEPENDENCY_SELF'
);

console.log('');
console.log(
  '=== CONTINUITY STATE ==='
);

contains(
  'next action',
  types,
  'nextAction'
);

contains(
  'resume state',
  engine,
  'resumeState'
);

contains(
  'active child preferred',
  engine,
  "task.status === 'active'"
);

contains(
  'pending dependency-ready child',
  engine,
  'unresolvedTaskDependencies'
);

console.log('');
console.log(
  '=== EVIDENCE ==='
);

contains(
  'evidence operation',
  types,
  "'task.evidence.add'"
);

contains(
  'file touched operation',
  types,
  "'task.file.touched'"
);

contains(
  'test recorded operation',
  types,
  "'task.test.recorded'"
);

contains(
  'test pass fail skip',
  types,
  "'pass'"
);

console.log('');
console.log(
  '=== DURABLE EVENT MODEL ==='
);

contains(
  'generic operation goes through TaskStore',
  store,
  'applyStateOperation'
);

contains(
  'state engine uses durable store',
  engine,
  '.applyStateOperation'
);

absent(
  'no direct state.json writes from engine',
  engine,
  'writeFileSync'
);

console.log('');
console.log(
  '=== BACKWARD COMPATIBILITY ==='
);

contains(
  'Phase 33 status event remains',
  types,
  "'task.status.set'"
);

contains(
  'legacy event replay preserved',
  projection,
  'Legacy Phase 33 compatibility'
);

console.log('');
console.log(
  '=== ARCHITECTURE LOCKS ==='
);

const combined =
  types +
  projection +
  engine +
  store;

absent(
  'no LLM provider',
  combined,
  'OpenAI'
);

absent(
  'no embedding provider',
  combined,
  'EmbeddingProvider'
);

absent(
  'no vector database',
  combined,
  'VectorDatabase'
);

absent(
  'no mandatory encryption key',
  combined,
  'TOOLNET_REMOTE_ENCRYPTION_KEY'
);

console.log('');

console.log(
  `FAILURES=${failures}`
);

if (
  failures ===
    0
) {
  console.log(
    'PHASE34_TASK_STATE_AUDIT=PASS'
  );

  process.exitCode =
    0;
} else {
  console.log(
    'PHASE34_TASK_STATE_AUDIT=FAIL'
  );

  process.exitCode =
    1;
}
