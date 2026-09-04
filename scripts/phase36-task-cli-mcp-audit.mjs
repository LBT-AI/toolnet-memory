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

const cli =
  read(
    'src/tasks/cli.ts'
  );

const mcp =
  read(
    'src/mcp/tools/task-tools.ts'
  );

const server =
  read(
    'src/mcp/server.ts'
  );

const bin =
  read(
    'bin/toolnet-memory'
  );

const standalone =
  read(
    'src/standalone/cli.ts'
  );

const bundle =
  read(
    'scripts/build-bundle.mjs'
  );

const help =
  read(
    'packages/cli/help.ts'
  );

console.log(
  '=== Phase 36 Task CLI + MCP Audit ==='
);

console.log('');
console.log(
  '=== CLI ==='
);

for (
  const command
  of [
    'task:list',
    'task:show',
    'task:create',
    'task:update',
    'task:start',
    'task:block',
    'task:resume',
    'task:complete',
    'task:progress',
    'task:claim',
    'task:handoff',
    'task:next',
  ]
) {
  contains(
    `npm route ${command}`,
    bin,
    `${command})`
  );

  contains(
    `standalone route ${command}`,
    standalone,
    `case '${command}':`
  );
}

contains(
  'strict project service',
  cli,
  'ProjectTaskService'
);

contains(
  'project flag supported',
  cli,
  "'project'"
);

contains(
  'expected revision supported',
  cli,
  "'expected-revision'"
);

contains(
  'agent env supported',
  cli,
  'TOOLNET_AGENT_ID'
);

console.log('');
console.log(
  '=== MCP ==='
);

for (
  const tool
  of [
    'task_list',
    'task_get',
    'task_create',
    'task_update',
    'task_start',
    'task_block',
    'task_resume',
    'task_complete',
    'task_progress',
    'task_next_action',
    'task_dependency_add',
    'task_dependency_remove',
    'task_evidence_add',
    'task_file_touch',
    'task_test_record',
    'task_claim',
    'task_release',
    'task_handoff',
    'task_next',
  ]
) {
  contains(
    `MCP registered ${tool}`,
    server,
    `'${tool}'`
  );
}

contains(
  'MCP uses TaskStore',
  mcp,
  'new TaskStore'
);

contains(
  'MCP uses State Engine',
  mcp,
  'new TaskStateEngine'
);

contains(
  'MCP uses Handoff Engine',
  mcp,
  'new TaskHandoffEngine'
);

contains(
  'MCP Zod schemas',
  mcp,
  "from 'zod'"
);

console.log('');
console.log(
  '=== MCP CONTINUITY RULES ==='
);

contains(
  'task_next continuity instruction',
  server,
  'task_next'
);

contains(
  'raw task logs forbidden',
  server,
  '.toolnet/tasks/events.jsonl'
);

console.log('');
console.log(
  '=== DISTRIBUTION ==='
);

contains(
  'bundle task-cli entry',
  bundle,
  "'task-cli': 'src/tasks/cli.ts'"
);

contains(
  'help TASKS category',
  help,
  "'tasks'"
);

contains(
  'help task:list',
  help,
  "name: 'task:list'"
);

contains(
  'help task:next',
  help,
  "name: 'task:next'"
);

console.log('');
console.log(
  '=== ARCHITECTURE LOCKS ==='
);

const combined =
  cli +
  mcp +
  server;

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
  'no direct task event append from MCP',
  mcp,
  'appendFileSync'
);

absent(
  'no direct task event append from CLI',
  cli,
  'appendFileSync'
);

absent(
  'no direct Task state.json writes',
  combined,
  'writeFileSync'
);

absent(
  'no fake remote distributed lock',
  combined,
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
    'PHASE36_TASK_CLI_MCP_AUDIT=PASS'
  );

  process.exitCode =
    0;
} else {
  console.log(
    'PHASE36_TASK_CLI_MCP_AUDIT=FAIL'
  );

  process.exitCode =
    1;
}
