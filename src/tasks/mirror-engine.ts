import type { ProjectManifest } from '../core/types.js';
import { taskLeaseActiveAt } from './handoff-projection.js';
import {
  normalizeTaskMirrorSnapshot,
  taskMirrorSnapshotDigest,
  taskMirrorSourceBinding,
  taskMirrorTaskId,
} from './mirror-identity.js';
import type {
  AgentPlanItem,
  AgentPlanSnapshot,
  TaskMirrorAction,
  TaskMirrorConflictAction,
  TaskMirrorPlan,
  TaskMirrorTransitionAction,
} from './mirror-types.js';
import { TaskStore } from './store.js';
import type { TaskRecord, TaskStatus } from './types.js';
function desiredStatus(item: AgentPlanItem): TaskStatus {
  if (item.status === 'in_progress') {
    return 'active';
  }
  return item.status;
}
function conflict(taskId: string, sourceKey: string, reason: string): TaskMirrorConflictAction {
  return {
    type: 'conflict',
    taskId,
    sourceKey,
    reason,
  };
}
function transition(
  taskId: string,
  item: AgentPlanItem,
  from: TaskStatus,
  to: TaskStatus
): TaskMirrorTransitionAction {
  return {
    type: 'transition',
    taskId,
    sourceKey: item.sourceKey,
    from,
    to,
    ...(to === 'blocked'
      ? {
          blockerReason: item.blockerReason ?? 'Native agent reported blocked work',
          ...(item.nextAction
            ? {
                nextAction: item.nextAction,
              }
            : {}),
        }
      : {}),
    guarded: to === 'completed',
  };
}
function lifecycleActions(
  taskId: string,
  item: AgentPlanItem,
  from: TaskStatus
): TaskMirrorAction[] {
  const to = desiredStatus(item);
  if (from === to) {
    return [];
  }
  if (from === 'completed' || from === 'cancelled') {
    return [
      conflict(taskId, item.sourceKey, `terminal-task-status-conflict from=${from} native=${to}`),
    ];
  }
  if (to === 'pending') {
    return [conflict(taskId, item.sourceKey, `status-regression from=${from} native=pending`)];
  }
  if (from === 'pending') {
    if (to === 'active') {
      return [transition(taskId, item, 'pending', 'active')];
    }
    if (to === 'blocked') {
      return [
        transition(taskId, item, 'pending', 'active'),
        transition(taskId, item, 'active', 'blocked'),
      ];
    }
    if (to === 'completed') {
      return [
        transition(taskId, item, 'pending', 'active'),
        transition(taskId, item, 'active', 'completed'),
      ];
    }
    if (to === 'cancelled') {
      return [transition(taskId, item, 'pending', 'cancelled')];
    }
  }
  if (from === 'active') {
    if (to === 'blocked' || to === 'completed' || to === 'cancelled') {
      return [transition(taskId, item, 'active', to)];
    }
  }
  if (from === 'blocked') {
    if (to === 'active') {
      return [transition(taskId, item, 'blocked', 'active')];
    }
    if (to === 'completed') {
      return [
        transition(taskId, item, 'blocked', 'active'),
        transition(taskId, item, 'active', 'completed'),
      ];
    }
    if (to === 'cancelled') {
      return [transition(taskId, item, 'blocked', 'cancelled')];
    }
  }
  return [conflict(taskId, item.sourceKey, `unsupported-lifecycle from=${from} native=${to}`)];
}
function shouldOwn(snapshot: AgentPlanSnapshot, item: AgentPlanItem): boolean {
  const desired = desiredStatus(item);
  if (desired === 'completed' || desired === 'cancelled') {
    return false;
  }
  if (snapshot.currentSourceKey) {
    return snapshot.currentSourceKey === item.sourceKey;
  }
  /*
   * Fail closed.
   *
   * Adapters omit currentSourceKey when a provider reports multiple
   * in_progress items. Never interpret that ambiguity as "claim every
   * active item".
   */
  const activeItems = snapshot.items.filter((candidate) => candidate.status === 'in_progress');
  return activeItems.length === 1 && activeItems[0]?.sourceKey === item.sourceKey;
}
function leaseActions(
  snapshot: AgentPlanSnapshot,
  item: AgentPlanItem,
  taskId: string,
  current: TaskRecord | undefined
): TaskMirrorAction[] {
  const desired = desiredStatus(item);
  /*
   * completed/cancelled lifecycle transitions clear activeLease
   * themselves. Do not emit a redundant release afterwards.
   */
  if (desired === 'completed' || desired === 'cancelled') {
    return [];
  }
  const own = shouldOwn(snapshot, item);
  if (!current) {
    return own
      ? [
          {
            type: 'claim',
            taskId,
            sourceKey: item.sourceKey,
            agentId: snapshot.agentId,
          },
        ]
      : [];
  }
  const now = Date.parse(snapshot.observedAt);
  const lease = current.activeLease;
  const activeLease = taskLeaseActiveAt(lease, now);
  if (own) {
    if (!lease || !activeLease) {
      return [
        {
          type: 'claim',
          taskId,
          sourceKey: item.sourceKey,
          agentId: snapshot.agentId,
        },
      ];
    }
    if (lease.agentId === snapshot.agentId) {
      return [];
    }
    return [
      conflict(
        taskId,
        item.sourceKey,
        `lease-held-by-other-agent agent=${lease.agentId} expires=${lease.expiresAt}`
      ),
    ];
  }
  if (lease && activeLease && lease.agentId === snapshot.agentId) {
    return [
      {
        type: 'release',
        taskId,
        sourceKey: item.sourceKey,
        agentId: snapshot.agentId,
        reason: 'native-current-task-changed',
      },
    ];
  }
  return [];
}
/**
 * Phase 42A shadow planner.
 *
 * Important:
 * - reads Task projection only
 * - creates no Task operations
 * - mutates no Task state
 * - never infers cancellation from an absent native item
 */
export class TaskMirrorEngine {
  constructor(
    private readonly project: Pick<ProjectManifest, 'id'>,
    private readonly store: TaskStore
  ) {}
  plan(input: AgentPlanSnapshot): TaskMirrorPlan {
    const snapshot = normalizeTaskMirrorSnapshot(input);
    if (snapshot.projectId !== this.project.id) {
      throw new Error(
        `TASK_MIRROR_PROJECT_MISMATCH expected=${this.project.id} actual=${snapshot.projectId}`
      );
    }
    const projection = this.store.projection();
    const actions: TaskMirrorAction[] = [];
    let matchedTasks = 0;
    let newTasks = 0;
    const items = [...snapshot.items].sort(
      (left, right) => left.order - right.order || left.sourceKey.localeCompare(right.sourceKey)
    );
    for (const item of items) {
      const taskId = taskMirrorTaskId(snapshot, item);
      const current = projection.tasks[taskId];
      if (!current) {
        newTasks += 1;
        actions.push({
          type: 'create',
          taskId,
          sourceKey: item.sourceKey,
          title: item.title,
          order: item.order,
          binding: taskMirrorSourceBinding(snapshot, item),
        });
        actions.push(...lifecycleActions(taskId, item, 'pending'));
        actions.push(...leaseActions(snapshot, item, taskId, undefined));
        continue;
      }
      matchedTasks += 1;
      const patch: {
        title?: string;
        order?: number;
      } = {};
      if (current.title !== item.title) {
        patch.title = item.title;
      }
      if (current.order !== item.order) {
        patch.order = item.order;
      }
      if (Object.keys(patch).length > 0) {
        actions.push({
          type: 'patch',
          taskId,
          sourceKey: item.sourceKey,
          patch,
        });
      }
      actions.push(...lifecycleActions(taskId, item, current.status));
      actions.push(...leaseActions(snapshot, item, taskId, current));
    }
    return {
      version: 1,
      mode: 'shadow',
      projectId: snapshot.projectId,
      provider: snapshot.provider,
      agentId: snapshot.agentId,
      nativeSessionId: snapshot.nativeSessionId,
      ...(snapshot.planId
        ? {
            planId: snapshot.planId,
          }
        : {}),
      snapshotDigest: taskMirrorSnapshotDigest(snapshot),
      sourceEventId: snapshot.sourceEventId,
      ...(snapshot.sourceSequence !== undefined
        ? {
            sourceSequence: snapshot.sourceSequence,
          }
        : {}),
      observedAt: snapshot.observedAt,
      itemCount: snapshot.items.length,
      matchedTasks,
      newTasks,
      actions,
    };
  }
}
