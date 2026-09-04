import {
  existsSync,
  readFileSync,
} from 'node:fs';
let failures =
  0;
const VERSION =
  '0.4.0';
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
  label,
  detail = ''
) {
  failures +=
    1;
  console.log(
    `FAIL  ${label}${detail ? ` ${detail}` : ''}`
  );
}
function exact(
  label,
  actual,
  expected
) {
  if (
    actual ===
      expected
  ) {
    pass(
      label
    );
    return;
  }
  fail(
    label,
    `expected=${String(expected)} actual=${String(actual)}`
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
const pkg =
  JSON.parse(
    read(
      'package.json'
    )
  );
const lock =
  JSON.parse(
    read(
      'package-lock.json'
    )
  );
const manifest =
  JSON.parse(
    read(
      'release-manifest.json'
    )
  );
const releaseTarget =
  read(
    '.release-target'
  ).trim();
const readme =
  read(
    'README.md'
  );
const changelog =
  read(
    'CHANGELOG.md'
  );
const taskTypes =
  read(
    'src/tasks/types.ts'
  );
const taskProjection =
  read(
    'src/tasks/projection.ts'
  );
const taskState =
  read(
    'src/tasks/state-engine.ts'
  );
const handoff =
  read(
    'src/tasks/handoff-engine.ts'
  );
const taskCli =
  read(
    'src/tasks/cli.ts'
  );
const mcp =
  read(
    'src/mcp/tools/task-tools.ts'
  );
const panel =
  read(
    'src/visualization/tasks-panel.ts'
  );
const graphServer =
  read(
    'src/visualization/server.ts'
  );
const autoEvidence =
  read(
    'src/tasks/auto-evidence.ts'
  );
console.log(
  '=== ToolNet Memory v0.4.0 Release Contract ==='
);
console.log('');
console.log(
  '=== VERSION ==='
);
exact(
  'package version',
  pkg.version,
  VERSION
);
exact(
  'lock version',
  lock.version,
  VERSION
);
exact(
  'lock root version',
  lock.packages?.['']?.version,
  VERSION
);
exact(
  'manifest version',
  manifest.version,
  VERSION
);
exact(
  'release series',
  manifest.releaseSeries,
  '0.4.x'
);
exact(
  'release target',
  releaseTarget,
  VERSION
);
contains(
  'README current release',
  readme,
  'Current release: **v0.4.0**'
);
contains(
  'CHANGELOG v0.4.0',
  changelog,
  '## [0.4.0]'
);
console.log('');
console.log(
  '=== TASK CORE ==='
);
contains(
  'Task kinds',
  taskTypes,
  'TaskKind'
);
contains(
  'Task append operations',
  taskTypes,
  'TaskOperation'
);
contains(
  'deterministic projection',
  taskProjection,
  'applyTaskOperation'
);
console.log('');
console.log(
  '=== TASK STATE ==='
);
contains(
  'Task State Engine',
  taskState,
  'TaskStateEngine'
);
contains(
  'lifecycle transition',
  taskTypes,
  "'task.lifecycle.transition'"
);
contains(
  'completion dependency guard',
  taskProjection,
  'TASK_COMPLETE_DEPENDENCIES_PENDING'
);
contains(
  'completion child guard',
  taskProjection,
  'TASK_COMPLETE_CHILDREN_OPEN'
);
contains(
  'completion progress guard',
  taskProjection,
  'TASK_COMPLETE_PROGRESS_INCOMPLETE'
);
console.log('');
console.log(
  '=== MULTI AGENT ==='
);
contains(
  'Task Handoff Engine',
  handoff,
  'TaskHandoffEngine'
);
contains(
  'claimNext',
  handoff,
  'claimNext'
);
contains(
  'continuity',
  handoff,
  'continuity'
);
contains(
  'bounded lease',
  handoff,
  'MAX_TASK_LEASE_MS'
);
console.log('');
console.log(
  '=== CLI + MCP ==='
);
contains(
  'Task CLI',
  taskCli,
  'executeTaskCli'
);
contains(
  'MCP task list',
  mcp,
  'taskList'
);
contains(
  'MCP claim',
  mcp,
  'taskClaim'
);
contains(
  'MCP handoff',
  mcp,
  'taskHandoff'
);
contains(
  'MCP next',
  mcp,
  'taskNext'
);
console.log('');
console.log(
  '=== TASKS PANEL ==='
);
contains(
  'Tasks Panel view',
  panel,
  'buildTaskPanelView'
);
contains(
  'Tasks API',
  graphServer,
  "url.pathname === '/api/tasks'"
);
exact(
  'manifest panel read-only',
  manifest?.hardening?.taskSystem?.panel?.readOnly,
  true
);
exact(
  'manifest browser mutation false',
  manifest?.hardening?.taskSystem?.panel?.browserMutation,
  false
);
console.log('');
console.log(
  '=== AUTO EVIDENCE ==='
);
contains(
  'Auto Evidence Engine',
  autoEvidence,
  'TaskAutoEvidenceEngine'
);
contains(
  'automatic file evidence',
  autoEvidence,
  'recordFileWrite'
);
contains(
  'automatic command evidence',
  autoEvidence,
  'recordCommand'
);
absent(
  'Auto Evidence cannot complete Tasks',
  autoEvidence,
  '.complete('
);
exact(
  'manifest automatic completion false',
  manifest?.hardening?.taskSystem?.autoEvidence?.automaticCompletion,
  false
);
exact(
  'manifest raw output false',
  manifest?.hardening?.taskSystem?.autoEvidence?.rawCommandOutputStored,
  false
);
console.log('');
console.log(
  '=== ARCHITECTURE TRUTH ==='
);
exact(
  'no LLM runtime',
  manifest?.runtime?.requiresLlm,
  false
);
exact(
  'no embedding runtime',
  manifest?.runtime?.requiresEmbeddings,
  false
);
exact(
  'no remote Task distributed lock',
  manifest?.hardening?.taskSystem?.multiAgentHandoff?.remoteDistributedLock,
  false
);
exact(
  'Phase 39 certified',
  manifest?.hardening?.taskReleaseCertification?.phase39FullCertification,
  true
);
exact(
  'Phase 39 43 gates',
  manifest?.hardening?.taskReleaseCertification?.phase39RequiredGateCount,
  43
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
    'V0400_FEATURE_CONTRACT=PASS'
  );
  process.exitCode =
    0;
} else {
  console.log(
    'V0400_FEATURE_CONTRACT=FAIL'
  );
  process.exitCode =
    1;
}
