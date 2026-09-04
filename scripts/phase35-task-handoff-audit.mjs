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

const reducer =
  read(
    'src/tasks/handoff-projection.ts'
  );

const engine =
  read(
    'src/tasks/handoff-engine.ts'
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

console.log(
  '=== Phase 35 Multi-Agent Task Handoff Audit ==='
);

console.log('');
console.log(
  '=== LEASE MODEL ==='
);

contains(
  'TaskAgentLease',
  types,
  'TaskAgentLease'
);

contains(
  'claim operation',
  types,
  "'task.agent.claim'"
);

contains(
  'heartbeat operation',
  types,
  "'task.agent.heartbeat'"
);

contains(
  'release operation',
  types,
  "'task.agent.release'"
);

contains(
  'handoff operation',
  types,
  "'task.agent.handoff'"
);

console.log('');
console.log(
  '=== CONCURRENCY ==='
);

contains(
  'expected revision on claims',
  types,
  'expectedRevision'
);

contains(
  'revision guard in reducer',
  reducer,
  'TASK_REVISION_CONFLICT'
);

contains(
  'active claim conflict',
  reducer,
  'TASK_ALREADY_CLAIMED'
);

contains(
  'lease ownership validation',
  reducer,
  'TASK_LEASE_OWNERSHIP_MISMATCH'
);

contains(
  'TaskStore durable mutation path',
  engine,
  '.applyStateOperation'
);

console.log('');
console.log(
  '=== CONTINUITY ==='
);

contains(
  'claimNext',
  engine,
  'claimNext'
);

contains(
  'continuity API',
  engine,
  'continuity'
);

contains(
  'next action continuity',
  engine,
  'nextAction'
);

contains(
  'handoff history',
  types,
  'handoffHistory'
);

contains(
  'expired takeover history',
  reducer,
  'lease-expired-takeover'
);

console.log('');
console.log(
  '=== LEASE SAFETY ==='
);

contains(
  'bounded minimum lease',
  engine,
  'MIN_TASK_LEASE_MS'
);

contains(
  'bounded maximum lease',
  engine,
  'MAX_TASK_LEASE_MS'
);

contains(
  'heartbeat must extend',
  reducer,
  'TASK_LEASE_NOT_EXTENDED'
);

contains(
  'expired holder rejected on handoff',
  reducer,
  'TASK_LEASE_EXPIRED'
);

contains(
  'terminal claim guard',
  reducer,
  'TASK_CLAIM_TERMINAL'
);

contains(
  'terminal lease cleanup',
  projection,
  'delete next.activeLease'
);

console.log('');
console.log(
  '=== PROJECT SHARING ==='
);

contains(
  'service exposes handoff engine',
  service,
  'TaskHandoffEngine'
);

absent(
  'no agent-private task filtering',
  engine,
  'filterByAgent'
);

absent(
  'no session-private namespace',
  engine,
  '.toolnet/sessions'
);

console.log('');
console.log(
  '=== NO FAKE DISTRIBUTED LOCK ==='
);

absent(
  'no S3 lease',
  engine +
  reducer,
  'S3'
);

absent(
  'no R2 lease',
  engine +
  reducer,
  'R2'
);

absent(
  'no WebSocket coordinator',
  engine +
  reducer,
  'WebSocket'
);

console.log('');
console.log(
  '=== ARCHITECTURE LOCKS ==='
);

const combined =
  types +
  reducer +
  engine +
  projection +
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
  'no vector DB',
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
    'PHASE35_TASK_HANDOFF_AUDIT=PASS'
  );

  process.exitCode =
    0;
} else {
  console.log(
    'PHASE35_TASK_HANDOFF_AUDIT=FAIL'
  );

  process.exitCode =
    1;
}
