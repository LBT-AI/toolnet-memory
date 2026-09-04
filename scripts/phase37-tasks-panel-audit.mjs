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

function check(
  label,
  result
) {
  if (
    result
  ) {
    console.log(
      `PASS  ${label}`
    );

    return;
  }

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
  check(
    label,
    text.includes(
      needle
    )
  );
}

function absent(
  label,
  text,
  needle
) {
  check(
    label,
    !text.includes(
      needle
    )
  );
}

const panel =
  read(
    'src/visualization/tasks-panel.ts'
  );

const server =
  read(
    'src/visualization/server.ts'
  );

const html =
  read(
    'src/visualization/public/index.html'
  );

const security =
  read(
    'src/visualization/security.ts'
  );

console.log(
  '=== Phase 37 Tasks Panel Audit ==='
);

console.log('');
console.log(
  '=== PANEL VIEW ==='
);

contains(
  'Task panel view builder',
  panel,
  'buildTaskPanelView'
);

contains(
  'bounded response',
  panel,
  'TASK_PANEL_MAX_ITEMS'
);

contains(
  'computed progress',
  panel,
  'computedTaskProgress'
);

contains(
  'dependency readiness',
  panel,
  'unresolvedTaskDependencies'
);

contains(
  'lease expiry awareness',
  panel,
  'taskLeaseActiveAt'
);

contains(
  'blocker projection',
  panel,
  'blockerReason'
);

contains(
  'next action projection',
  panel,
  'nextAction'
);

console.log('');
console.log(
  '=== GRAPH API ==='
);

contains(
  'GET /api/tasks',
  server,
  "url.pathname === '/api/tasks'"
);

contains(
  'TaskStore source',
  server,
  'new TaskStore'
);

contains(
  'compact panel builder',
  server,
  'buildTaskPanelView'
);

contains(
  'generic API auth gate remains',
  server,
  "url.pathname.startsWith('/api/')"
);

contains(
  'Bearer auth remains',
  server,
  'graphBearerAuthorized'
);

contains(
  'same-origin remains',
  server,
  'isSameOriginGraphRequest'
);

contains(
  'Host validation remains',
  server,
  'graphHostHeaderAllowed'
);

console.log('');
console.log(
  '=== READ-ONLY CONTRACT ==='
);

absent(
  'no Task API POST route',
  server,
  "req.method === 'POST'"
);

absent(
  'no direct Task event log read in browser',
  html,
  'events.jsonl'
);

absent(
  'no direct Task state file read in browser',
  html,
  '.toolnet/tasks/state.json'
);

absent(
  'no Task write from browser',
  html,
  "method: 'POST'"
);

absent(
  'panel helper does not expose evidence array',
  panel,
  'evidence:'
);

absent(
  'panel helper does not expose tests array',
  panel,
  'tests:'
);

console.log('');
console.log(
  '=== UI ==='
);

contains(
  'Tasks toggle',
  html,
  'id="tasks-toggle"'
);

contains(
  'Tasks panel',
  html,
  'id="tasks-panel"'
);

contains(
  'root selector',
  html,
  'id="tasks-root"'
);

contains(
  '3 second visible polling',
  html,
  '3000'
);

contains(
  'completed marker',
  html,
  "return '✓'"
);

contains(
  'active marker',
  html,
  "return '◉'"
);

contains(
  'pending marker',
  html,
  "return '○'"
);

contains(
  'blocked marker',
  html,
  "return '!'"
);

contains(
  'progress bar',
  html,
  'tasks-progress-fill'
);

contains(
  'responsive mobile panel',
  html,
  '@media (max-width: 700px)'
);

console.log('');
console.log(
  '=== SECURITY ==='
);

contains(
  'security module still present',
  security,
  'graphBearerAuthorized'
);

contains(
  'browser uses authenticated Graph fetch',
  html,
  'graphApiFetch(`\/api/tasks${query}`)'
);

absent(
  'no localStorage token',
  html,
  'localStorage'
);

console.log('');
console.log(
  '=== ARCHITECTURE LOCKS ==='
);

const combined =
  panel +
  server +
  html;

absent(
  'no LLM provider',
  combined,
  'OpenAI'
);

absent(
  'no embeddings',
  combined,
  'EmbeddingProvider'
);

absent(
  'no vector database',
  combined,
  'VectorDatabase'
);

absent(
  'no fake distributed task lock',
  panel,
  'distributedLock'
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
    'PHASE37_TASKS_PANEL_AUDIT=PASS'
  );

  process.exitCode =
    0;
} else {
  console.log(
    'PHASE37_TASKS_PANEL_AUDIT=FAIL'
  );

  process.exitCode =
    1;
}
