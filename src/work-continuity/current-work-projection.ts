import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import type { ProjectManifest } from '../core/types.js';
import { currentTaskArtifactLines } from '../tasks/artifact-evidence.js';
import { TaskStore } from '../tasks/store.js';
import type { TaskRecord } from '../tasks/types.js';
import { loadLocalWorkState } from './local-work-state.js';
import type { WorkState } from './types.js';
const BEGIN = '<!-- TOOLNET:CURRENT-WORK-V2:BEGIN -->';
const END = '<!-- TOOLNET:CURRENT-WORK-V2:END -->';
const PRIORITY_RANK: Record<TaskRecord['priority'], number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};
const STATUS_RANK: Record<'active' | 'blocked' | 'pending', number> = {
  active: 0,
  blocked: 1,
  pending: 2,
};
export type CurrentWorkProjectionSource = 'persistent-task' | 'session-fallback' | 'empty';
export interface CurrentWorkTaskSummary {
  id: string;
  title: string;
  status: string;
  priority?: TaskRecord['priority'];
  progressPercent?: number;
  leaseAgentId?: string;
}
export interface CurrentWorkProjectionV2 {
  version: 2;
  projectId: string;
  source: CurrentWorkProjectionSource;
  /**
   * Which durable system owns current-work truth.
   *
   * Optional so previously persisted/manual v2 objects remain readable.
   */
  authority?: 'persistent-tasks' | 'session-fallback' | 'none';
  task?: CurrentWorkTaskSummary;
  completed: string[];
  remaining: string[];
  blockers: string[];
  filesTouched: string[];
  verification: string[];
  artifacts: string[];
  nextAction?: string;
  lastActivityAt?: string;
  confidence: number;
  generatedAt: string;
}
export interface BuildCurrentWorkProjectionOptions {
  fallback?: WorkState | null;
  agentId?: string;
  now?: number;
}
function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
function compact(value: string, max = 300): string {
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max)}…`;
}
function unique(values: Array<string | undefined>, limit: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    if (!raw) {
      continue;
    }
    const value = compact(raw);
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}
function terminal(task: TaskRecord): boolean {
  return task.status === 'completed' || task.status === 'cancelled';
}
function activeLease(task: TaskRecord, now: number): boolean {
  if (!task.activeLease) {
    return false;
  }
  const expires = Date.parse(task.activeLease.expiresAt);
  return Number.isFinite(expires) && expires > now;
}
function affinityRank(task: TaskRecord, agentId: string | undefined, now: number): number {
  const agent = agentId?.trim();
  if (!agent) {
    return 3;
  }
  if (activeLease(task, now) && task.activeLease?.agentId === agent) {
    return 0;
  }
  if (task.assignedAgentId === agent) {
    return 1;
  }
  if (task.lastAgentId === agent) {
    return 2;
  }
  return 3;
}
function currentTaskFresh(task: TaskRecord, now: number): boolean {
  /*
   * Active lease is explicit current ownership and overrides age.
   */
  if (activeLease(task, now)) {
    return true;
  }
  const updated = Date.parse(task.updatedAt);
  if (!Number.isFinite(updated)) {
    return false;
  }
  const age = now - updated;
  /*
   * Keep Task state immutable.
   * Staleness only affects current-work selection.
   *
   * Phase 53 task-class freshness default = 30 days.
   */
  return age >= -86_400_000 && age <= 30 * 86_400_000;
}
function currentTask(
  tasks: TaskRecord[],
  agentId: string | undefined,
  now: number
): TaskRecord | undefined {
  return tasks
    .filter((task) => !terminal(task) && currentTaskFresh(task, now))
    .sort((left, right) => {
      const leftStatus = STATUS_RANK[left.status as keyof typeof STATUS_RANK] ?? 9;
      const rightStatus = STATUS_RANK[right.status as keyof typeof STATUS_RANK] ?? 9;
      return (
        leftStatus - rightStatus ||
        affinityRank(left, agentId, now) - affinityRank(right, agentId, now) ||
        PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority] ||
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.order - right.order ||
        left.id.localeCompare(right.id)
      );
    })[0];
}
function percent(task: TaskRecord): number | undefined {
  if (task.activityProgress) {
    return Math.max(0, Math.min(100, Math.round(task.activityProgress.percent)));
  }
  if (task.progress.total <= 0) {
    return undefined;
  }
  return Math.max(
    0,
    Math.min(100, Math.round((task.progress.completed / task.progress.total) * 100))
  );
}
function latestTimestamp(values: Array<string | undefined>): string | undefined {
  let selected: string | undefined;
  let selectedTime = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value) {
      continue;
    }
    const time = Date.parse(value);
    if (!Number.isFinite(time) || time <= selectedTime) {
      continue;
    }
    selected = value;
    selectedTime = time;
  }
  return selected;
}
function fromPersistentTasks(
  project: ProjectManifest,
  tasks: TaskRecord[],
  task: TaskRecord,
  agentId: string | undefined,
  now: number
): CurrentWorkProjectionV2 {
  const byId = new Map(tasks.map((item) => [item.id, item]));
  const children = tasks
    .filter((item) => item.parentTaskId === task.id)
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id)
    );
  const dependencies = task.dependencies
    .map((id) => byId.get(id))
    .filter((item): item is TaskRecord => Boolean(item));
  const unresolvedDependencies = dependencies.filter(
    (dependency) => dependency.status !== 'completed'
  );
  const completedChildren = children
    .filter((child) => child.status === 'completed')
    .map((child) => child.title);
  const structuredCompletionEvidence = task.evidence
    .filter((item) => item.kind === 'commit' || item.kind === 'review')
    .slice(-4)
    .map((item) => item.summary);
  const remainingChildren = children
    .filter((child) => child.status !== 'completed' && child.status !== 'cancelled')
    .map((child) => child.title);
  const blockers = unique(
    [
      task.blocker?.reason,
      ...(task.status === 'blocked' && !task.blocker ? ['Task is blocked'] : []),
      ...unresolvedDependencies.map((dependency) => `Waiting on dependency: ${dependency.title}`),
    ],
    6
  );
  const filesTouched = unique([...task.filesTouched].reverse(), 10);
  const verification = unique(
    task.tests
      .slice(-8)
      .reverse()
      .map((test) => {
        const detail = test.detail ? ` — ${compact(test.detail, 180)}` : '';
        return `[${test.outcome}] ${test.name}${detail}`;
      }),
    8
  );
  const artifacts = unique(currentTaskArtifactLines(task.evidence, 6), 6);
  const nextAction =
    task.nextAction?.trim() ||
    task.activityProgress?.suggestedNextAction?.trim() ||
    remainingChildren[0];
  const remaining = unique(
    remainingChildren.length > 0
      ? remainingChildren
      : task.status === 'active' || task.status === 'blocked' || task.status === 'pending'
        ? [nextAction]
        : [],
    8
  );
  const lastActivityAt = latestTimestamp([
    task.updatedAt,
    task.activityProgress?.updatedAt,
    ...task.evidence.map((item) => item.createdAt),
    ...task.tests.map((item) => item.recordedAt),
  ]);
  const confidence =
    activeLease(task, now) && task.activeLease?.agentId === agentId?.trim()
      ? 1
      : task.status === 'active' || task.status === 'blocked'
        ? 0.98
        : 0.95;
  return {
    version: 2,
    projectId: project.id,
    source: 'persistent-task',
    authority: 'persistent-tasks',
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      ...(percent(task) !== undefined
        ? {
            progressPercent: percent(task),
          }
        : {}),
      ...(activeLease(task, now) && task.activeLease
        ? {
            leaseAgentId: task.activeLease.agentId,
          }
        : {}),
    },
    completed: unique([...completedChildren, ...structuredCompletionEvidence], 8),
    remaining,
    blockers,
    filesTouched,
    verification,
    artifacts,
    ...(nextAction
      ? {
          nextAction: compact(nextAction),
        }
      : {}),
    ...(lastActivityAt
      ? {
          lastActivityAt,
        }
      : {}),
    confidence,
    generatedAt: new Date(now).toISOString(),
  };
}
function fallbackHasCurrentWork(state: WorkState): boolean {
  return Boolean(
    state.currentTask ||
    state.currentRequest ||
    state.currentActivity ||
    state.goal ||
    state.nextActions.length > 0 ||
    state.blockers.length > 0 ||
    (state.activeFiles?.length ?? 0) > 0
  );
}
function fromFallback(
  project: ProjectManifest,
  state: WorkState,
  now: number
): CurrentWorkProjectionV2 {
  const title =
    state.currentTask?.title ||
    state.currentRequest ||
    state.currentActivity ||
    state.goal ||
    'Session work';
  const nextAction = state.nextActions.at(-1);
  const remaining = unique([state.currentTask?.title, ...state.nextActions.slice(-5).reverse()], 6);
  const filesTouched = unique(
    [...(state.activeFiles ?? []).slice().reverse(), ...state.filesTouched.slice().reverse()],
    8
  );
  const verification = unique(
    (state.checks ?? [])
      .slice(-6)
      .reverse()
      .map((check) => `[${check.status}] ${check.kind}: ${check.command}`),
    6
  );
  return {
    version: 2,
    projectId: project.id,
    source: 'session-fallback',
    authority: 'session-fallback',
    task: {
      id: state.currentTask?.id ?? 'session-fallback',
      title: compact(title),
      status: state.currentTask?.status ?? 'in_progress',
    },
    /*
     * Session fallback is deliberately conservative.
     * Historical "completed" items are NOT injected here because
     * they can be stale. Persistent Tasks are authoritative for done work.
     */
    completed: [],
    remaining,
    blockers: unique(state.blockers.slice().reverse(), 5),
    filesTouched,
    verification,
    artifacts: [],
    ...(nextAction
      ? {
          nextAction: compact(nextAction),
        }
      : {}),
    lastActivityAt: state.updatedAt,
    confidence: clampConfidence(state.currentTask?.confidence ?? 0.65),
    generatedAt: new Date(now).toISOString(),
  };
}
function emptyProjection(
  project: ProjectManifest,
  now: number,
  authority: CurrentWorkProjectionV2['authority'] = 'none'
): CurrentWorkProjectionV2 {
  return {
    version: 2,
    projectId: project.id,
    source: 'empty',
    authority,
    completed: [],
    remaining: [],
    blockers: [],
    filesTouched: [],
    verification: [],
    artifacts: [],
    confidence: 1,
    generatedAt: new Date(now).toISOString(),
  };
}
export function buildCurrentWorkProjection(
  project: ProjectManifest,
  options: BuildCurrentWorkProjectionOptions = {}
): CurrentWorkProjectionV2 {
  const now = Number.isFinite(options.now) ? Math.trunc(options.now!) : Date.now();
  let persistentTasks: TaskRecord[] | null = null;
  try {
    persistentTasks = Object.values(new TaskStore(project).projection().tasks);
  } catch {
    /*
     * Task projection corruption/failure must never break
     * crash-safe session capture. Session WorkState remains fallback.
     */
    persistentTasks = null;
  }
  if (persistentTasks !== null && persistentTasks.length > 0) {
    const selected = currentTask(persistentTasks, options.agentId, now);
    /*
     * Important:
     * If Persistent Tasks exist but every Task is terminal,
     * DO NOT resurrect an old session task from WorkState.
     */
    if (!selected) {
      /*
       * Persistent Task state exists, but every candidate is
       * terminal or stale. Session history must NOT become
       * current again.
       */
      return emptyProjection(project, now, 'persistent-tasks');
    }
    return fromPersistentTasks(project, persistentTasks, selected, options.agentId, now);
  }
  const fallback = options.fallback ?? loadLocalWorkState(project);
  if (fallback && fallbackHasCurrentWork(fallback)) {
    return fromFallback(project, fallback, now);
  }
  return emptyProjection(project, now);
}
function section(title: string, values: string[]): string[] {
  if (values.length === 0) {
    return [];
  }
  return ['', `${title}:`, ...values.map((value) => `- ${compact(value, 320)}`)];
}
export function renderCurrentWorkProjection(projection: CurrentWorkProjectionV2): string {
  const lines: string[] = [
    BEGIN,
    '# ToolNet Current Work',
    '',
    'Schema: current-work/v2',
    `Source: ${projection.source}`,
    `Generated: ${projection.generatedAt}`,
    `Confidence: ${Math.round(projection.confidence * 100)}%`,
  ];
  if (projection.task) {
    lines.push(
      '',
      'Current task:',
      `- ${projection.task.title}`,
      `- ID: ${projection.task.id}`,
      `- Status: ${projection.task.status}`
    );
    if (projection.task.priority) {
      lines.push(`- Priority: ${projection.task.priority}`);
    }
    if (projection.task.progressPercent !== undefined) {
      lines.push(`- Progress: ${projection.task.progressPercent}%`);
    }
    if (projection.task.leaseAgentId) {
      lines.push(`- Lease owner: ${projection.task.leaseAgentId}`);
    }
  } else {
    lines.push('', 'Current task:', '- None');
  }
  lines.push(...section('Completed', projection.completed));
  lines.push(...section('Remaining', projection.remaining));
  lines.push(...section('Open blockers', projection.blockers));
  lines.push(...section('Files touched', projection.filesTouched));
  lines.push(...section('Verification', projection.verification));
  lines.push(...section('Important artifacts', projection.artifacts));
  if (projection.nextAction) {
    lines.push('', 'Next action:', `- ${compact(projection.nextAction, 400)}`);
  }
  if (projection.lastActivityAt) {
    lines.push('', `Last activity: ${projection.lastActivityAt}`);
  }
  lines.push(
    '',
    'Continuation:',
    '- Persistent Tasks are execution authority.',
    '- Do not resurrect completed/cancelled Tasks from session history.',
    '- Session-derived state is fallback only when Persistent Tasks do not exist.',
    '- Query deeper history only when explicitly needed.',
    END
  );
  return lines.join('\n');
}
function removeManagedBlocks(content: string): string {
  return content
    .replace(
      /<!-- TOOLNET:CURRENT-WORK-V2:BEGIN -->[\s\S]*?<!-- TOOLNET:CURRENT-WORK-V2:END -->/gu,
      ''
    )
    .replace(/<!-- TOOLNET:STABLE-WORK:BEGIN -->[\s\S]*?<!-- TOOLNET:STABLE-WORK:END -->/gu, '')
    .replace(/<!-- TOOLNET:AUTO-CURRENT:BEGIN -->[\s\S]*?<!-- TOOLNET:AUTO-CURRENT:END -->/gu, '')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}
function atomicWrite(file: string, content: string): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  const fd = openSync(temporary, 'w', 0o600);
  try {
    writeFileSync(fd, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, file);
}
export function writeCurrentWorkProjectionToCurrent(
  project: ProjectManifest,
  projection: CurrentWorkProjectionV2
): void {
  const file = join(project.rootPath, '.toolnet', 'current.md');
  let existing = '';
  if (existsSync(file)) {
    try {
      existing = readFileSync(file, 'utf8');
    } catch {
      existing = '';
    }
  }
  const manual = removeManagedBlocks(existing);
  const rendered = renderCurrentWorkProjection(projection);
  const next = manual ? `${manual}\n\n${rendered}` : rendered;
  atomicWrite(file, next);
}
export function refreshCurrentWorkProjection(
  project: ProjectManifest,
  options: Omit<BuildCurrentWorkProjectionOptions, 'fallback'> = {}
): CurrentWorkProjectionV2 {
  const projection = buildCurrentWorkProjection(project, {
    ...options,
    fallback: loadLocalWorkState(project),
  });
  writeCurrentWorkProjectionToCurrent(project, projection);
  return projection;
}
