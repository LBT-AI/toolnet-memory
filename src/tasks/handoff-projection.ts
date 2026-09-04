import type {
  TaskAgentLease,
  TaskAgentOperationPayload,
  TaskHandoffRecord,
  TaskOperation,
  TaskOperationPayload,
  TaskRecord,
} from './types.js';
const MAX_PROJECTED_HANDOFFS = 100;
function required(value: string, code: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(code);
  }
  return normalized;
}
function timestamp(value: string, code: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(code);
  }
  return parsed;
}
function validateRevision(expected: number | undefined, actual: number): void {
  if (expected === undefined) {
    return;
  }
  if (expected !== actual) {
    throw new Error(
      ['TASK_REVISION_CONFLICT', `expected=${expected}`, `actual=${actual}`].join(' ')
    );
  }
}
export function taskLeaseActiveAt(lease: TaskAgentLease | undefined, at: number): boolean {
  if (!lease) {
    return false;
  }
  return timestamp(lease.expiresAt, 'TASK_LEASE_EXPIRY_INVALID') > at;
}
function task(tasks: Record<string, TaskRecord>, taskId: string): TaskRecord {
  const current = tasks[taskId];
  if (!current) {
    throw new Error(`TASK_NOT_FOUND id=${taskId}`);
  }
  return current;
}
function terminal(value: TaskRecord): boolean {
  return value.status === 'completed' || value.status === 'cancelled';
}
function validLeaseExpiry(expiresAt: string, occurredAt: string): void {
  const expiry = timestamp(expiresAt, 'TASK_LEASE_EXPIRY_INVALID');
  const operationTime = timestamp(occurredAt, 'TASK_OPERATION_TIMESTAMP_INVALID');
  if (expiry <= operationTime) {
    throw new Error('TASK_LEASE_EXPIRY_NOT_FUTURE');
  }
}
function handoffHistory(current: TaskRecord, record: TaskHandoffRecord): TaskHandoffRecord[] {
  return [...current.handoffHistory, record].slice(-MAX_PROJECTED_HANDOFFS);
}
function updated(
  current: TaskRecord,
  operation: TaskOperation
): Pick<TaskRecord, 'updatedAt' | 'updatedBy' | 'revision'> {
  return {
    updatedAt: operation.occurredAt,
    updatedBy: {
      kind: operation.actor.kind,
      ...(operation.actor.id
        ? {
            id: operation.actor.id,
          }
        : {}),
    },
    revision: current.revision + 1,
  };
}
function requireLeaseOwner(current: TaskRecord, agentId: string, leaseId: string): TaskAgentLease {
  const lease = current.activeLease;
  if (!lease) {
    throw new Error('TASK_LEASE_NOT_FOUND');
  }
  if (lease.agentId !== agentId || lease.leaseId !== leaseId) {
    throw new Error(['TASK_LEASE_OWNERSHIP_MISMATCH', `holder=${lease.agentId}`].join(' '));
  }
  return lease;
}
export function isTaskAgentOperationPayload(
  payload: TaskOperationPayload
): payload is TaskAgentOperationPayload {
  return (
    payload.type === 'task.agent.claim' ||
    payload.type === 'task.agent.heartbeat' ||
    payload.type === 'task.agent.release' ||
    payload.type === 'task.agent.handoff'
  );
}
export function applyTaskAgentOperation(
  tasks: Record<string, TaskRecord>,
  operation: TaskOperation
): void {
  const payload = operation.payload;
  if (!isTaskAgentOperationPayload(payload)) {
    return;
  }
  const current = task(tasks, payload.taskId);
  validateRevision(payload.expectedRevision, current.revision);
  if (payload.type === 'task.agent.claim') {
    if (terminal(current)) {
      throw new Error(`TASK_CLAIM_TERMINAL status=${current.status}`);
    }
    const agentId = required(payload.agentId, 'TASK_AGENT_ID_REQUIRED');
    const leaseId = required(payload.leaseId, 'TASK_LEASE_ID_REQUIRED');
    validLeaseExpiry(payload.leaseExpiresAt, operation.occurredAt);
    const operationTime = timestamp(operation.occurredAt, 'TASK_OPERATION_TIMESTAMP_INVALID');
    const previous = current.activeLease;
    if (taskLeaseActiveAt(previous, operationTime)) {
      throw new Error(
        ['TASK_ALREADY_CLAIMED', `agent=${previous?.agentId ?? 'unknown'}`].join(' ')
      );
    }
    const next: TaskRecord = {
      ...current,
      activeLease: {
        leaseId,
        agentId,
        acquiredAt: operation.occurredAt,
        heartbeatAt: operation.occurredAt,
        expiresAt: payload.leaseExpiresAt,
      },
      lastAgentId: agentId,
      ...updated(current, operation),
    };
    if (previous && previous.agentId !== agentId) {
      next.handoffHistory = handoffHistory(current, {
        id: operation.operationId,
        fromAgentId: previous.agentId,
        toAgentId: agentId,
        at: operation.occurredAt,
        reason: 'lease-expired-takeover',
      });
    }
    tasks[current.id] = next;
    return;
  }
  if (payload.type === 'task.agent.heartbeat') {
    const agentId = required(payload.agentId, 'TASK_AGENT_ID_REQUIRED');
    const leaseId = required(payload.leaseId, 'TASK_LEASE_ID_REQUIRED');
    const lease = requireLeaseOwner(current, agentId, leaseId);
    const operationTime = timestamp(operation.occurredAt, 'TASK_OPERATION_TIMESTAMP_INVALID');
    if (!taskLeaseActiveAt(lease, operationTime)) {
      throw new Error('TASK_LEASE_EXPIRED');
    }
    validLeaseExpiry(payload.leaseExpiresAt, operation.occurredAt);
    if (
      timestamp(payload.leaseExpiresAt, 'TASK_LEASE_EXPIRY_INVALID') <=
      timestamp(lease.expiresAt, 'TASK_LEASE_EXPIRY_INVALID')
    ) {
      throw new Error('TASK_LEASE_NOT_EXTENDED');
    }
    tasks[current.id] = {
      ...current,
      activeLease: {
        ...lease,
        heartbeatAt: operation.occurredAt,
        expiresAt: payload.leaseExpiresAt,
      },
      lastAgentId: agentId,
      ...updated(current, operation),
    };
    return;
  }
  if (payload.type === 'task.agent.release') {
    const agentId = required(payload.agentId, 'TASK_AGENT_ID_REQUIRED');
    const leaseId = required(payload.leaseId, 'TASK_LEASE_ID_REQUIRED');
    requireLeaseOwner(current, agentId, leaseId);
    const next: TaskRecord = {
      ...current,
      lastAgentId: agentId,
      ...updated(current, operation),
    };
    delete next.activeLease;
    tasks[current.id] = next;
    return;
  }
  if (payload.type === 'task.agent.handoff') {
    if (terminal(current)) {
      throw new Error(`TASK_HANDOFF_TERMINAL status=${current.status}`);
    }
    const fromAgentId = required(payload.fromAgentId, 'TASK_AGENT_ID_REQUIRED');
    const toAgentId = required(payload.toAgentId, 'TASK_HANDOFF_TARGET_REQUIRED');
    if (fromAgentId === toAgentId) {
      throw new Error('TASK_HANDOFF_SAME_AGENT');
    }
    const currentLeaseId = required(payload.currentLeaseId, 'TASK_LEASE_ID_REQUIRED');
    const oldLease = requireLeaseOwner(current, fromAgentId, currentLeaseId);
    const operationTime = timestamp(operation.occurredAt, 'TASK_OPERATION_TIMESTAMP_INVALID');
    if (!taskLeaseActiveAt(oldLease, operationTime)) {
      throw new Error('TASK_LEASE_EXPIRED');
    }
    const newLeaseId = required(payload.newLeaseId, 'TASK_LEASE_ID_REQUIRED');
    validLeaseExpiry(payload.newLeaseExpiresAt, operation.occurredAt);
    tasks[current.id] = {
      ...current,
      activeLease: {
        leaseId: newLeaseId,
        agentId: toAgentId,
        acquiredAt: operation.occurredAt,
        heartbeatAt: operation.occurredAt,
        expiresAt: payload.newLeaseExpiresAt,
      },
      lastAgentId: toAgentId,
      handoffHistory: handoffHistory(current, {
        id: operation.operationId,
        fromAgentId,
        toAgentId,
        at: operation.occurredAt,
        ...(payload.reason
          ? {
              reason: payload.reason,
            }
          : {}),
      }),
      ...updated(current, operation),
    };
  }
}
