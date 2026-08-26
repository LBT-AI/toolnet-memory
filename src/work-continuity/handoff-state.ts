import type { ProjectManifest } from '../core/types.js';

import type { SessionIdentity } from '../session/types.js';

import { sha256 } from '../session/utils.js';

import type { WorkItem, WorkState } from './types.js';

export type HandoffTestStatus = 'passing' | 'failing' | 'unknown';

export interface HandoffWorkItem {
  id: string;

  title: string;

  status: WorkItem['status'];
}

export interface HandoffStateV2 {
  schema: 'toolnet.handoff.v2';

  version: 2;

  project: {
    id: string;

    name: string;
  };

  source: {
    agent: SessionIdentity['agent'];

    nativeSessionId: string;

    sessionKey: string;

    sequence: number;

    reason: string;
  };

  capturedAt: string;

  goal?: string;

  request?: string;

  activity?: string;

  current: {
    phase?: HandoffWorkItem;

    task?: HandoffWorkItem;

    file?: string;
  };

  completed: {
    phases: string[];

    tasks: string[];
  };

  remaining: {
    phases: string[];

    tasks: string[];

    todos: string[];
  };

  nextAction?: string;

  blockers: string[];

  decisions: string[];

  files: {
    current?: string;

    recent: string[];

    active?: string[];

    modified?: string[];

    created?: string[];

    deleted?: string[];
  };

  tests: {
    status: HandoffTestStatus;

    recent: string[];

    checks?: Array<{
      kind: string;

      status: string;

      command: string;
    }>;
  };

  /**
   * Deterministic evidence captured from actual work state.
   *
   * No generated/inferred values belong here.
   */
  evidence?: {
    commands: string[];

    references: string[];
  };

  attention: string[];

  progress: WorkState['progress'];

  stateDigest: string;
}

function compact(values: string[], limit: number): string[] {
  const seen = new Set<string>();

  const output: string[] = [];

  for (const raw of values) {
    const value = raw.replace(/\s+/g, ' ').trim();

    if (!value) {
      continue;
    }

    const key = value.normalize('NFKC').toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    output.push(value);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

function workItem(item: WorkItem | undefined): HandoffWorkItem | undefined {
  if (!item) {
    return undefined;
  }

  return {
    id: item.id,

    title: item.title,

    status: item.status,
  };
}

function inferTestStatus(tests: string[], checks: WorkState['checks'] = []): HandoffTestStatus {
  const recentChecks = checks.slice(-10);

  if (recentChecks.some((item) => item.status === 'failed')) {
    return 'failing';
  }

  if (recentChecks.some((item) => item.status === 'passed')) {
    return 'passing';
  }

  const recent = tests.slice(-10).join('\n').toLowerCase();

  if (/(?:failed|failing|failure|error|✗|❌)/u.test(recent)) {
    return 'failing';
  }

  if (/(?:passed|passing|green|success|✓|✅)/u.test(recent)) {
    return 'passing';
  }

  return 'unknown';
}

function digestPayload(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function extractReferences(values: Array<string | undefined>): string[] {
  const references: string[] = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    const matches = value.match(/https?:\/\/[^\s<>"'`)\]}]+/giu) ?? [];

    for (const raw of matches) {
      const reference = raw.replace(/[.,;:!?]+$/gu, '').trim();

      if (reference) {
        references.push(reference);
      }
    }
  }

  return compact(references, 30);
}

export function buildHandoffStateV2(options: {
  project: ProjectManifest;

  identity: SessionIdentity;

  state: WorkState;

  reason: string;

  sequence: number;

  attention?: string[];

  capturedAt?: string;
}): HandoffStateV2 {
  const { project, identity, state } = options;

  const currentFile = state.activeFiles?.at(-1) ?? state.filesTouched.at(-1);

  const completedPhases = state.phases
    .filter((item) => item.status === 'completed')
    .map((item) => item.title);

  const completedTasks = state.tasks
    .filter((item) => item.status === 'completed')
    .map((item) => item.title);

  const remainingPhases = state.phases
    .filter((item) => item.status !== 'completed' && item.status !== 'cancelled')
    .map((item) => item.title);

  const remainingTasks = state.tasks
    .filter((item) => item.status !== 'completed' && item.status !== 'cancelled')
    .map((item) => item.title);

  const completedTaskKeys = new Set(
    state.tasks
      .filter((item) => item.status === 'completed')
      .map((item) => item.title.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim())
  );

  const nextActions = compact(
    state.nextActions.filter(
      (value) =>
        !completedTaskKeys.has(value.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim())
    ),
    10
  );

  const todos = compact([...remainingTasks, ...nextActions], 15);

  const recentTests = compact(state.tests.slice().reverse(), 10);

  const recentFiles = compact(
    [...(state.activeFiles ?? []).slice().reverse(), ...state.filesTouched.slice().reverse()],
    20
  );

  const withoutDigest: Omit<HandoffStateV2, 'stateDigest'> = {
    schema: 'toolnet.handoff.v2',

    version: 2,

    project: {
      id: project.id,

      name: project.name,
    },

    source: {
      agent: identity.agent,

      nativeSessionId: identity.nativeSessionId,

      sessionKey: identity.sessionKey,

      sequence: options.sequence,

      reason: options.reason,
    },

    capturedAt: options.capturedAt ?? new Date().toISOString(),

    goal: state.goal,

    request: state.currentRequest,

    activity: state.currentActivity,

    current: {
      phase: workItem(state.currentPhase),

      task: workItem(state.currentTask),

      file: currentFile,
    },

    completed: {
      phases: compact(completedPhases, 20),

      tasks: compact(completedTasks, 30),
    },

    remaining: {
      phases: compact(remainingPhases, 20),

      tasks: compact(remainingTasks, 30),

      todos,
    },

    nextAction: nextActions[0],

    blockers: compact(state.blockers.slice().reverse(), 10),

    decisions: compact(state.decisions.slice().reverse(), 10),

    files: {
      current: currentFile,

      recent: recentFiles,

      active: compact(state.activeFiles ?? [], 10),

      modified: compact(state.modifiedFiles ?? [], 20),

      created: compact(state.createdFiles ?? [], 20),

      deleted: compact(state.deletedFiles ?? [], 20),
    },

    tests: {
      status: inferTestStatus(state.tests, state.checks),

      recent: recentTests,

      checks: (state.checks ?? []).slice(-10).map((item) => ({
        kind: item.kind,

        status: item.status,

        command: item.command,
      })),
    },

    evidence: {
      commands: compact((state.commands ?? []).slice().reverse(), 20),

      references: extractReferences([
        state.currentRequest,
        state.currentActivity,
        state.goal,
        state.plan,

        ...state.decisions,
        ...state.blockers,
        ...state.warnings,
        ...state.nextActions,
        ...state.filesTouched,
        ...(state.commands ?? []),
        ...state.tests,
        ...(state.checks ?? []).map((item) => item.command),
      ]),
    },

    attention: compact(options.attention ?? [], 20),

    progress: state.progress,
  };

  const { capturedAt: _capturedAt, source: _source, ...stable } = withoutDigest;

  return {
    ...withoutDigest,

    stateDigest: digestPayload(stable),
  };
}
