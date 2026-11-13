/**
 * ToolNet v0.7 cloud-backed resume.
 *
 * Turns an acknowledged authority snapshot into a compiled resume packet for the
 * agent that starts next. It reads from the cloud authority only, never from
 * local state, and refuses to present an unacknowledged checkpoint as resumable.
 */

import {
  AuthorityError,
  type AuthoritySnapshot,
  type AuthorityTask,
  type AuthorityTaskStatus,
} from './authority-state.js';
import type { CloudAuthority } from './cloud-authority.js';
import { brainToResumeIdentity, buildProjectBrain, type ProjectBrain } from './project-brain.js';
import {
  compileResumePacket,
  type ResumeActiveTaskStatus,
  type ResumePacketMode,
  type ResumePacketResult,
  type ResumePacketSource,
  type ResumeTaskBoard,
} from '../work-continuity/resume-packet-v07.js';

export type CloudResumeFailureCode =
  | 'NO_ACKNOWLEDGED_CHECKPOINT'
  | 'NO_ACTIVE_TASK'
  | 'AUTHORITY_UNAVAILABLE'
  | 'AUTHORITY_AUTH_FAILED'
  | 'AUTHORITY_PROJECT_UNKNOWN';

export type CloudResumeResult =
  | {
      available: true;
      text: string;
      estimatedTokens: number;
      revision: number;
      mode: ResumePacketMode;
      warnings: string[];
      packet: ResumePacketResult;
      brain: ProjectBrain;
    }
  | {
      available: false;
      code: CloudResumeFailureCode;
      reason: string;
      revision?: number;
    };

export interface ResumeFromCloudOptions {
  authority: CloudAuthority;
  projectId: string;
  mode?: ResumePacketMode;
  budgetTokens?: number;
  currentCodeRevision?: string;
  countTokens?: (text: string) => number;
}

function naturalSort(values: string[]): string[] {
  return [...values].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
  );
}

function tasksWithStatus(snapshot: AuthoritySnapshot, status: AuthorityTaskStatus): string[] {
  return naturalSort(
    Object.values(snapshot.tasks)
      .filter((task) => task.status === status)
      .map((task) => task.id)
  );
}

export function selectResumeTask(snapshot: AuthoritySnapshot): AuthorityTask | undefined {
  const tasks = naturalSort(Object.keys(snapshot.tasks)).map((id) => snapshot.tasks[id]);

  return (
    tasks.find((task) => task.status === 'in_progress') ??
    tasks.find((task) => task.status === 'blocked')
  );
}

export function toResumeSource(
  snapshot: AuthoritySnapshot,
  brain: ProjectBrain
): ResumePacketSource {
  const activeTask = selectResumeTask(snapshot);

  if (!activeTask) {
    throw new AuthorityError('AUTHORITY_TASK_UNKNOWN', 'No in-progress task to resume');
  }

  const taskBoard: ResumeTaskBoard = {
    completed: tasksWithStatus(snapshot, 'completed'),
    pending: tasksWithStatus(snapshot, 'pending'),
    blocked: tasksWithStatus(snapshot, 'blocked'),
  };

  const activeStatus: ResumeActiveTaskStatus =
    activeTask.status === 'blocked' ? 'blocked' : 'in_progress';

  return {
    project: brainToResumeIdentity(brain),
    checkpoint: {
      revision: snapshot.checkpoint?.revision ?? 0,
      cloudAcknowledged: snapshot.checkpoint !== undefined,
      sourceAgent: snapshot.checkpoint?.sourceAgent ?? 'unknown',
      ...(snapshot.checkpoint?.codeRevision === undefined
        ? {}
        : { codeRevision: snapshot.checkpoint.codeRevision }),
    },
    taskBoard,
    activeTask: {
      id: activeTask.id,
      title: activeTask.title,
      status: activeStatus,
      verification: activeTask.verification,
      done: activeTask.done,
      remaining: activeTask.remaining,
      filesTouched: activeTask.filesTouched,
      blockers: activeTask.blockers,
      ...(activeTask.nextAction === undefined ? {} : { nextAction: activeTask.nextAction }),
      evidenceRefs: activeTask.evidence.map((item) => item.ref),
    },
  };
}

function failure(
  code: CloudResumeFailureCode,
  reason: string,
  revision?: number
): CloudResumeResult {
  return {
    available: false,
    code,
    reason,
    ...(revision === undefined ? {} : { revision }),
  };
}

/**
 * Compile the resume context for a fresh agent.
 *
 * Returns `available: false` instead of throwing for expected "nothing to
 * resume" or "cloud unavailable" cases, so hooks can inject honest status
 * without crashing the agent.
 */
export async function resumeFromCloud(options: ResumeFromCloudOptions): Promise<CloudResumeResult> {
  let snapshot: AuthoritySnapshot;

  try {
    snapshot = await options.authority.fetchSnapshot(options.projectId);
  } catch (error) {
    if (error instanceof AuthorityError) {
      if (error.code === 'AUTHORITY_AUTH_FAILED') {
        return failure(
          'AUTHORITY_AUTH_FAILED',
          'Cloud authority rejected credentials; no local fallback is used'
        );
      }

      if (error.code === 'AUTHORITY_PROJECT_UNKNOWN') {
        return failure(
          'AUTHORITY_PROJECT_UNKNOWN',
          `Cloud authority has no project ${options.projectId}`
        );
      }
    }

    return failure(
      'AUTHORITY_UNAVAILABLE',
      'Cloud authority is unavailable; resume context not fabricated'
    );
  }

  if (!snapshot.checkpoint) {
    return failure(
      'NO_ACKNOWLEDGED_CHECKPOINT',
      'No cloud-acknowledged checkpoint exists for this project',
      snapshot.revision
    );
  }

  if (!selectResumeTask(snapshot)) {
    return failure(
      'NO_ACTIVE_TASK',
      'Every task is completed, pending or cancelled; there is no interrupted task to resume',
      snapshot.revision
    );
  }

  const brain = buildProjectBrain({
    snapshot,
    ...(options.currentCodeRevision === undefined
      ? {}
      : { currentCodeRevision: options.currentCodeRevision }),
  });

  const source = toResumeSource(snapshot, brain);

  const packet = compileResumePacket(source, {
    ...(options.mode === undefined ? {} : { mode: options.mode }),
    ...(options.budgetTokens === undefined ? {} : { budgetTokens: options.budgetTokens }),
    ...(options.countTokens === undefined ? {} : { countTokens: options.countTokens }),
  });

  return {
    available: true,
    text: packet.text,
    estimatedTokens: packet.estimatedTokens,
    revision: packet.sourceRevision,
    mode: packet.mode,
    warnings: [...brain.warnings, ...packet.warnings],
    packet,
    brain,
  };
}
