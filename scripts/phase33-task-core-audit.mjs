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

const operations =
  read(
    'src/tasks/operation-log.ts'
  );

const projection =
  read(
    'src/tasks/projection.ts'
  );

const store =
  read(
    'src/tasks/store.ts'
  );

const service =
  read(
    'src/tasks/service.ts'
  );

const retentionTypes =
  read(
    'src/retention/types.ts'
  );

const retentionPlanner =
  read(
    'src/retention/local-planner.ts'
  );

console.log(
  '=== Phase 33 Task Core Audit ==='
);

console.log('');
console.log(
  '=== MODEL ==='
);

contains(
  'Goal kind',
  types,
  "'goal'"
);

contains(
  'Task kind',
  types,
  "'task'"
);

contains(
  'Subtask kind',
  types,
  "'subtask'"
);

contains(
  'task revision',
  types,
  'revision:'
);

contains(
  'parent task hierarchy',
  types,
  'parentTaskId'
);

console.log('');
console.log(
  '=== DURABILITY ==='
);

contains(
  'append-only task log',
  store,
  'appendFileSync'
);

contains(
  'fsync durable append',
  store,
  'fsyncSync'
);

contains(
  'atomic projection rename',
  store,
  'renameSync'
);

contains(
  'authoritative events path',
  operations,
  "'events.jsonl'"
);

contains(
  'derived state path',
  store,
  "'state.json'"
);

contains(
  'payload integrity hash',
  operations,
  'payloadSha256'
);

contains(
  'corrupt tail recovery',
  operations,
  'repairCorruptTail'
);

console.log('');
console.log(
  '=== CONCURRENCY ==='
);

contains(
  'O_EXCL lock',
  store,
  "'wx'"
);

contains(
  'ownership token',
  store,
  'randomUUID'
);

contains(
  'live PID guard',
  store,
  'processAlive'
);

contains(
  'stale lock recovery',
  store,
  'lockIsRecoverable'
);

contains(
  'revision conflict guard',
  projection,
  'TASK_REVISION_CONFLICT'
);

contains(
  'validate before append',
  store,
  'applyTaskOperation'
);

console.log('');
console.log(
  '=== PROJECT SHARING ==='
);

contains(
  'strict existing project',
  service,
  'requireExisting'
);

absent(
  'no implicit project detect',
  service,
  '.detect('
);

absent(
  'no agent visibility filter in projection',
  projection,
  'TOOLNET_AGENT_ID'
);

console.log('');
console.log(
  '=== SECURITY ==='
);

contains(
  'durable sanitizer text',
  store +
    operations,
  'sanitizeDurableText'
);

contains(
  'durable sanitizer value',
  store +
    operations,
  'sanitizeDurableValue'
);

console.log('');
console.log(
  '=== GC PROTECTION ==='
);

contains(
  'protected task GC category',
  retentionTypes,
  "'protected-tasks'"
);

contains(
  'tasks directory protected',
  retentionPlanner,
  "join(toolnet, 'tasks')"
);

console.log('');
console.log(
  '=== ARCHITECTURE LOCKS ==='
);

const combined =
  types +
  operations +
  projection +
  store +
  service;

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
    'PHASE33_TASK_CORE_AUDIT=PASS'
  );

  process.exitCode =
    0;

} else {
  console.log(
    'PHASE33_TASK_CORE_AUDIT=FAIL'
  );

  process.exitCode =
    1;
}
