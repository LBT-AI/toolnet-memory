import { join } from 'node:path';

import { mkdirSync } from 'node:fs';

import type { ProjectManifest } from '../core/types.js';

import type { StorageProvider } from '../storage/types.js';

import { sha256, writeJsonAtomic } from '../session/utils.js';

import type {
  WorkCheck,
  WorkItem,
  WorkObservation,
  WorkObservationBatch,
  WorkState,
} from './types.js';

function normalizedKey(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueRecent(
  values: string[],

  limit = 20
): string[] {
  const output: string[] = [];

  const seen = new Set<string>();

  for (const value of values.slice().reverse()) {
    const key = normalizedKey(value);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);

    output.push(value);

    if (output.length >= limit) {
      break;
    }
  }

  return output.reverse();
}

function recentChecks(values: WorkCheck[], limit = 20): WorkCheck[] {
  const map = new Map<string, WorkCheck>();

  for (const item of values) {
    const key = `${item.kind}|${normalizedKey(item.command)}`;

    map.delete(key);
    map.set(key, item);
  }

  return Array.from(map.values()).slice(-limit);
}

function isPlaceholderTitle(observation: WorkObservation): boolean {
  if (observation.kind === 'phase') {
    return /^Phase\s+\d+$/iu.test(observation.text);
  }

  if (observation.kind === 'task') {
    return /^(?:TODO|Task|Việc)\s+\d+$/iu.test(observation.text);
  }

  return false;
}

function mergeItem(
  previous: WorkItem | undefined,

  observation: WorkObservation
): WorkItem {
  const incomingStatus = observation.status ?? previous?.status ?? 'pending';

  let status = incomingStatus;

  if (previous) {
    /*
     * Completed work is sticky.
     * A stale plan from another agent must not reopen it.
     */
    if (previous.status === 'completed' && incomingStatus !== 'completed') {
      status = 'completed';
    }

    /*
     * A plain plan restatement is pending.
     * It must not downgrade active/blocked work.
     */
    else if (
      incomingStatus === 'pending' &&
      (previous.status === 'in_progress' || previous.status === 'blocked')
    ) {
      status = previous.status;
    }
  }

  /*
   * Status-only update:
   *
   * TODO 2: Viết adapter
   * TODO 2 đang làm
   *
   * keeps descriptive title "Viết adapter".
   */
  const title = previous && isPlaceholderTitle(observation) ? previous.title : observation.text;

  return {
    id: previous?.id ?? sha256(observation.key).slice(0, 24),

    title,

    status,

    order: observation.order ?? previous?.order,

    confidence: Math.max(observation.confidence, previous?.confidence ?? 0),

    updatedAt: observation.occurredAt,

    updatedBy: {
      agent: observation.agent,

      nativeSessionId: observation.nativeSessionId,

      eventId: observation.eventId,
    },
  };
}

async function loadBatches(
  project: ProjectManifest,

  storage: StorageProvider
): Promise<WorkObservationBatch[]> {
  const prefix = `projects/${project.id}/work/observations/`;

  const objects = await storage.list(prefix);

  const batches: WorkObservationBatch[] = [];

  for (const object of objects
    .filter((item) => item.key.endsWith('.json'))
    .sort((left, right) => left.key.localeCompare(right.key))) {
    const text = await storage.getText(object.key);

    if (!text) {
      continue;
    }

    try {
      const batch = JSON.parse(text) as WorkObservationBatch;

      if (batch.version === 1 && Array.isArray(batch.observations)) {
        batches.push(batch);
      }
    } catch {
      // Ignore corrupt/incomplete optional batch.
    }
  }

  return batches;
}

export async function reconcileWorkState(
  project: ProjectManifest,

  storage: StorageProvider
): Promise<WorkState> {
  const batches = await loadBatches(project, storage);

  /*
   * Important:
   * batches come from multiple agents and each session has
   * its own sequence counter.
   *
   * Never assume global sequence ordering.
   * Timestamp is primary; sequence is only a local tie-breaker.
   */
  const observations = batches
    .flatMap((batch) => batch.observations)
    .sort((left, right) => {
      const time = left.occurredAt.localeCompare(right.occurredAt);

      if (time !== 0) {
        return time;
      }

      const sequence = left.sequence - right.sequence;

      if (sequence !== 0) {
        return sequence;
      }

      return left.id.localeCompare(right.id);
    });

  const phases = new Map<string, WorkItem>();

  const tasks = new Map<string, WorkItem>();

  let currentRequest: string | undefined;

  let currentActivity: string | undefined;

  let goal: string | undefined;

  let plan: string | undefined;

  let lastSession: WorkState['lastSession'];

  const decisions: string[] = [];

  const blockers: string[] = [];

  const warnings: string[] = [];

  const explicitNext: string[] = [];

  const files: string[] = [];

  const fileState = new Map<string, string>();

  const modifiedFiles: string[] = [];

  const createdFiles: string[] = [];

  const deletedFiles: string[] = [];

  const commands: string[] = [];

  const tests: string[] = [];

  const checks: WorkCheck[] = [];

  for (const observation of observations) {
    switch (observation.kind) {
      case 'request':
        currentRequest = observation.text;
        break;

      case 'activity':
        currentActivity = observation.text;
        break;

      case 'goal':
        goal = observation.text;
        break;

      case 'plan':
        plan = observation.text;
        break;

      case 'phase':
        phases.set(observation.key, mergeItem(phases.get(observation.key), observation));
        break;

      case 'task':
        tasks.set(observation.key, mergeItem(tasks.get(observation.key), observation));
        break;

      case 'decision':
        decisions.push(observation.text);
        break;

      case 'blocker':
        blockers.push(observation.text);
        break;

      case 'warning':
        warnings.push(observation.text);
        break;

      case 'next_action':
        explicitNext.push(observation.text);
        break;

      case 'file': {
        files.push(observation.text);

        const action = observation.fileAction ?? 'active';

        fileState.delete(observation.text);
        fileState.set(observation.text, action);

        if (action === 'modified') {
          modifiedFiles.push(observation.text);
        } else if (action === 'created') {
          createdFiles.push(observation.text);
        } else if (action === 'deleted') {
          deletedFiles.push(observation.text);
        }

        break;
      }

      case 'command':
        commands.push(observation.text);
        break;

      case 'test':
        tests.push(observation.text);

        if (observation.checkKind) {
          checks.push({
            kind: observation.checkKind,

            command: observation.text,

            status: observation.checkStatus ?? 'unknown',

            updatedAt: observation.occurredAt,

            agent: observation.agent,

            nativeSessionId: observation.nativeSessionId,
          });
        }

        break;

      case 'session':
        lastSession = {
          agent: observation.agent,

          nativeSessionId: observation.nativeSessionId,

          sessionKey: observation.sessionKey,

          updatedAt: observation.occurredAt,
        };
        break;
    }
  }

  const phaseList = Array.from(phases.values()).sort(
    (left, right) =>
      (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
  );

  const taskList = Array.from(tasks.values()).sort(
    (left, right) =>
      (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
  );

  const currentPhase =
    phaseList.find((item) => item.status === 'in_progress') ??
    phaseList.find((item) => item.status === 'blocked') ??
    phaseList.find((item) => item.status === 'pending');

  const currentTask =
    taskList.find((item) => item.status === 'in_progress') ??
    taskList.find((item) => item.status === 'blocked') ??
    taskList.find((item) => item.status === 'pending');

  const nextActions = uniqueRecent(
    [
      ...explicitNext,

      ...(currentTask ? [currentTask.title] : []),

      ...(!currentTask && currentPhase ? [currentPhase.title] : []),

      ...taskList
        .filter((item) => item.status === 'pending')
        .slice(0, 5)
        .map((item) => item.title),
    ],
    8
  );

  const activeBlockers = uniqueRecent(
    [
      ...blockers,

      ...phaseList.filter((item) => item.status === 'blocked').map((item) => item.title),

      ...taskList.filter((item) => item.status === 'blocked').map((item) => item.title),
    ],
    20
  );

  const state: WorkState = {
    version: 1,

    projectId: project.id,

    projectName: project.name,

    currentRequest,

    currentActivity,

    goal,

    plan,

    phases: phaseList,

    tasks: taskList,

    decisions: uniqueRecent(decisions, 20),

    blockers: activeBlockers,

    warnings: uniqueRecent(warnings, 20),

    nextActions,

    filesTouched: uniqueRecent(files, 30),

    activeFiles: Array.from(fileState.entries())
      .filter(([, action]) => action !== 'deleted')
      .map(([file]) => file)
      .slice(-5),

    modifiedFiles: uniqueRecent(modifiedFiles, 30),

    createdFiles: uniqueRecent(createdFiles, 30),

    deletedFiles: uniqueRecent(deletedFiles, 30),

    commands: uniqueRecent(commands, 20),

    tests: uniqueRecent(tests, 20),

    checks: recentChecks(checks, 20),

    currentPhase,

    currentTask,

    progress: {
      phasesTotal: phaseList.length,

      phasesCompleted: phaseList.filter((item) => item.status === 'completed').length,

      tasksTotal: taskList.length,

      tasksCompleted: taskList.filter((item) => item.status === 'completed').length,

      blocked:
        phaseList.filter((item) => item.status === 'blocked').length +
        taskList.filter((item) => item.status === 'blocked').length,
    },

    lastSession,

    updatedAt: observations.length
      ? observations[observations.length - 1].occurredAt
      : new Date().toISOString(),
  };

  const localDirectory = join(project.rootPath, '.toolnet', 'work');

  mkdirSync(localDirectory, {
    recursive: true,
  });

  writeJsonAtomic(join(localDirectory, 'current.json'), state);

  await storage.put(
    `projects/${project.id}/work/current.json`,
    JSON.stringify(state, null, 2) + '\n',
    'application/json'
  );

  return state;
}

export async function loadWorkState(
  project: ProjectManifest,

  storage: StorageProvider
): Promise<WorkState | null> {
  /*
   * work/observations/*.json is authoritative.
   *
   * If at least one valid observation batch exists,
   * never trust work/current.json as source of truth.
   * Rebuild the projection deterministically.
   */
  const batches = await loadBatches(project, storage);

  if (batches.length > 0) {
    return reconcileWorkState(project, storage);
  }

  /*
   * Backwards compatibility for projects created before
   * the observation journal existed.
   *
   * Legacy current.json is accepted only when there are
   * no valid authoritative observation batches.
   */
  const text = await storage.getText(`projects/${project.id}/work/current.json`);

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as WorkState;
  } catch {
    return null;
  }
}
