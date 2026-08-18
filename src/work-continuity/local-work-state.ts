import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { WorkCheck, WorkItem, WorkObservation, WorkState } from './types.js';

function atomicWriteJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), {
    recursive: true,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  renameSync(temp, file);
}

export function localWorkStateFile(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'work', 'current.json');
}

export function loadLocalWorkState(project: ProjectManifest): WorkState | null {
  const file = localWorkStateFile(project);

  if (!existsSync(file)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as WorkState;

    if (parsed.version !== 1 || parsed.projectId !== project.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function normalizedKey(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function recentUnique(existing: string[], incoming: string[], limit: number): string[] {
  const output: string[] = [];

  const seen = new Set<string>();

  for (const value of [...existing, ...incoming].reverse()) {
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

function recentChecks(existing: WorkCheck[], incoming: WorkCheck[], limit = 20): WorkCheck[] {
  const map = new Map<string, WorkCheck>();

  for (const item of [...existing, ...incoming]) {
    const key = `${item.kind}|${normalizedKey(item.command)}`;

    map.delete(key);
    map.set(key, item);
  }

  return Array.from(map.values()).slice(-limit);
}

function placeholder(observation: WorkObservation): boolean {
  if (observation.kind === 'phase') {
    return /^Phase\s+\d+$/iu.test(observation.text);
  }

  if (observation.kind === 'task') {
    return /^(?:TODO|Task|Việc)\s+\d+$/iu.test(observation.text);
  }

  return false;
}

function mergeItem(previous: WorkItem | undefined, observation: WorkObservation): WorkItem {
  const incoming = observation.status ?? previous?.status ?? 'pending';

  let status = incoming;

  /*
   * Completed work is sticky.
   *
   * Another later plan must never reopen a
   * previously completed TODO/Phase.
   */
  if (previous?.status === 'completed' && incoming !== 'completed') {
    status = 'completed';
  }

  /*
   * A weak pending observation cannot downgrade
   * active or blocked work.
   */
  if (
    previous &&
    incoming === 'pending' &&
    (previous.status === 'in_progress' || previous.status === 'blocked')
  ) {
    status = previous.status;
  }

  /*
   * Status-only observation:
   *
   * TODO 3 đang làm
   *
   * keeps the descriptive title from:
   *
   * TODO 3: Connect fallback wizard
   */
  const title = previous && placeholder(observation) ? previous.title : observation.text;

  return {
    id: previous?.id ?? observation.id,

    title,

    status,

    order: observation.order ?? previous?.order,

    confidence: Math.max(previous?.confidence ?? 0, observation.confidence),

    updatedAt: observation.occurredAt,

    updatedBy: {
      agent: observation.agent,

      nativeSessionId: observation.nativeSessionId,

      eventId: observation.eventId,
    },
  };
}

function itemMap(items: WorkItem[]): Map<string, WorkItem> {
  const result = new Map<string, WorkItem>();

  for (const item of items) {
    /*
     * Existing WorkState doesn't persist source key.
     * Stable numbered TODO/phase ID is recoverable
     * through order.
     */
    const key = item.order !== undefined ? `order:${item.order}` : normalizedKey(item.title);

    result.set(key, item);
  }

  return result;
}

function observationMapKey(observation: WorkObservation): string {
  if (observation.order !== undefined) {
    return `order:${observation.order}`;
  }

  return normalizedKey(observation.key || observation.text);
}

function sortItems(items: Iterable<WorkItem>): WorkItem[] {
  return Array.from(items).sort((left, right) => {
    const lo = left.order ?? Number.MAX_SAFE_INTEGER;

    const ro = right.order ?? Number.MAX_SAFE_INTEGER;

    if (lo !== ro) {
      return lo - ro;
    }

    return left.updatedAt.localeCompare(right.updatedAt);
  });
}

function currentItem(items: WorkItem[]): WorkItem | undefined {
  return (
    items.find((item) => item.status === 'in_progress') ??
    items.find((item) => item.status === 'blocked') ??
    items.find((item) => item.status === 'pending')
  );
}

export function applyObservationsToLocalWorkState(
  project: ProjectManifest,
  observations: WorkObservation[]
): WorkState {
  const previous = loadLocalWorkState(project);

  const phases = itemMap(previous?.phases ?? []);

  const tasks = itemMap(previous?.tasks ?? []);

  let currentRequest = previous?.currentRequest;

  let currentActivity = previous?.currentActivity;

  let goal = previous?.goal;

  let plan = previous?.plan;

  let lastSession = previous?.lastSession;

  const decisions: string[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  const nextActions: string[] = [];

  const files: string[] = [];

  const activeFiles = [...(previous?.activeFiles ?? [])];

  const modifiedFiles: string[] = [];

  const createdFiles: string[] = [];

  const deletedFiles: string[] = [];

  const commands: string[] = [];

  const tests: string[] = [];

  const checks: WorkCheck[] = [];

  const ordered = [...observations].sort((left, right) => {
    const time = left.occurredAt.localeCompare(right.occurredAt);

    if (time !== 0) {
      return time;
    }

    return left.sequence - right.sequence;
  });

  for (const observation of ordered) {
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

      case 'phase': {
        const key = observationMapKey(observation);

        phases.set(key, mergeItem(phases.get(key), observation));

        break;
      }

      case 'task': {
        const key = observationMapKey(observation);

        tasks.set(key, mergeItem(tasks.get(key), observation));

        break;
      }

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
        nextActions.push(observation.text);
        break;

      case 'file': {
        files.push(observation.text);

        const action = observation.fileAction ?? 'active';

        const existingIndex = activeFiles.indexOf(observation.text);

        if (existingIndex >= 0) {
          activeFiles.splice(existingIndex, 1);
        }

        if (action !== 'deleted') {
          activeFiles.push(observation.text);
        }

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

  const phaseList = sortItems(phases.values());

  const taskList = sortItems(tasks.values());

  const currentPhase = currentItem(phaseList);

  const currentTask = currentItem(taskList);

  const mergedNext = recentUnique(
    previous?.nextActions ?? [],
    [
      ...nextActions,

      ...(currentTask ? [currentTask.title] : []),

      ...(!currentTask && currentPhase ? [currentPhase.title] : []),

      ...taskList
        .filter((item) => item.status === 'pending')
        .slice(0, 5)
        .map((item) => item.title),
    ],
    8
  );

  const activeBlockers = recentUnique(
    previous?.blockers ?? [],
    [
      ...blockers,

      ...phaseList.filter((item) => item.status === 'blocked').map((item) => item.title),

      ...taskList.filter((item) => item.status === 'blocked').map((item) => item.title),
    ],
    20
  );

  const updatedAt =
    ordered.length > 0
      ? ordered[ordered.length - 1].occurredAt
      : (previous?.updatedAt ?? new Date().toISOString());

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

    decisions: recentUnique(previous?.decisions ?? [], decisions, 20),

    blockers: activeBlockers,

    warnings: recentUnique(previous?.warnings ?? [], warnings, 20),

    nextActions: mergedNext,

    filesTouched: recentUnique(previous?.filesTouched ?? [], files, 30),

    activeFiles: recentUnique([], activeFiles, 5),

    modifiedFiles: recentUnique(previous?.modifiedFiles ?? [], modifiedFiles, 30),

    createdFiles: recentUnique(previous?.createdFiles ?? [], createdFiles, 30),

    deletedFiles: recentUnique(previous?.deletedFiles ?? [], deletedFiles, 30),

    commands: recentUnique(previous?.commands ?? [], commands, 20),

    tests: recentUnique(previous?.tests ?? [], tests, 20),

    checks: recentChecks(previous?.checks ?? [], checks, 20),

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

    updatedAt,
  };

  atomicWriteJson(localWorkStateFile(project), state);

  return state;
}
