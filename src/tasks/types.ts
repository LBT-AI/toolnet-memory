export type TaskKind = 'goal' | 'task' | 'subtask';
export type TaskStatus = 'pending' | 'active' | 'blocked' | 'completed' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
export type TaskActorKind = 'user' | 'agent' | 'system';
export interface TaskActor {
  kind: TaskActorKind;
  id?: string;
}
export interface TaskProgress {
  completed: number;
  total: number;
}
export interface TaskBlocker {
  reason: string;
  blockedAt: string;
  actor: TaskActor;
}
export type TaskEvidenceKind = 'note' | 'file' | 'test' | 'commit' | 'artifact' | 'review';
export interface TaskEvidence {
  id: string;
  kind: TaskEvidenceKind;
  summary: string;
  ref?: string;
  createdAt: string;
  actor: TaskActor;
}
export type TaskTestOutcome = 'pass' | 'fail' | 'skip';
export interface TaskTestRecord {
  id: string;
  name: string;
  outcome: TaskTestOutcome;
  detail?: string;
  recordedAt: string;
  actor: TaskActor;
}
export interface TaskAgentLease {
  leaseId: string;
  agentId: string;
  acquiredAt: string;
  heartbeatAt: string;
  expiresAt: string;
}
export interface TaskHandoffRecord {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  at: string;
  reason?: string;
}
export interface TaskRecord {
  id: string;
  projectId: string;
  kind: TaskKind;
  parentTaskId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  order: number;
  assignedAgentId?: string;
  progress: TaskProgress;
  blocker?: TaskBlocker;
  nextAction?: string;
  dependencies: string[];
  evidence: TaskEvidence[];
  filesTouched: string[];
  tests: TaskTestRecord[];
  activeLease?: TaskAgentLease;
  lastAgentId?: string;
  handoffHistory: TaskHandoffRecord[];
  createdAt: string;
  updatedAt: string;
  createdBy: TaskActor;
  updatedBy: TaskActor;
  revision: number;
}
export interface TaskCreateInput {
  id?: string;
  kind: TaskKind;
  parentTaskId?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  labels?: string[];
  order?: number;
  assignedAgentId?: string;
  actor?: TaskActor;
}
export interface TaskPatch {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  labels?: string[];
  order?: number;
  assignedAgentId?: string | null;
}
export interface TaskMutationOptions {
  expectedRevision?: number;
  actor?: TaskActor;
}
export interface TaskCreatedPayload {
  type: 'task.created';
  task: {
    id: string;
    kind: TaskKind;
    parentTaskId?: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    labels: string[];
    order: number;
    assignedAgentId?: string;
  };
}
export interface TaskPatchedPayload {
  type: 'task.patched';
  taskId: string;
  expectedRevision?: number;
  patch: TaskPatch;
}
/*
 * Phase 33 compatibility primitive.
 *
 * New public lifecycle code must use:
 *
 *   task.lifecycle.transition
 *
 * instead.
 */
export interface TaskStatusSetPayload {
  type: 'task.status.set';
  taskId: string;
  expectedRevision?: number;
  status: TaskStatus;
}
export interface TaskLifecycleTransitionPayload {
  type: 'task.lifecycle.transition';
  taskId: string;
  expectedRevision?: number;
  status: TaskStatus;
  blockerReason?: string;
  nextAction?: string;
}
export interface TaskProgressSetPayload {
  type: 'task.progress.set';
  taskId: string;
  expectedRevision?: number;
  completed: number;
  total: number;
}
export interface TaskNextActionSetPayload {
  type: 'task.next-action.set';
  taskId: string;
  expectedRevision?: number;
  nextAction: string | null;
}
export interface TaskDependencyAddPayload {
  type: 'task.dependency.add';
  taskId: string;
  expectedRevision?: number;
  dependencyTaskId: string;
}
export interface TaskDependencyRemovePayload {
  type: 'task.dependency.remove';
  taskId: string;
  expectedRevision?: number;
  dependencyTaskId: string;
}
export interface TaskEvidenceAddPayload {
  type: 'task.evidence.add';
  taskId: string;
  expectedRevision?: number;
  evidence: {
    id: string;
    kind: TaskEvidenceKind;
    summary: string;
    ref?: string;
  };
}
export interface TaskFileTouchedPayload {
  type: 'task.file.touched';
  taskId: string;
  expectedRevision?: number;
  filePath: string;
}
export interface TaskTestRecordedPayload {
  type: 'task.test.recorded';
  taskId: string;
  expectedRevision?: number;
  test: {
    id: string;
    name: string;
    outcome: TaskTestOutcome;
    detail?: string;
  };
}
export interface TaskAgentClaimPayload {
  type: 'task.agent.claim';
  taskId: string;
  expectedRevision?: number;
  agentId: string;
  leaseId: string;
  leaseExpiresAt: string;
}
export interface TaskAgentHeartbeatPayload {
  type: 'task.agent.heartbeat';
  taskId: string;
  expectedRevision?: number;
  agentId: string;
  leaseId: string;
  leaseExpiresAt: string;
}
export interface TaskAgentReleasePayload {
  type: 'task.agent.release';
  taskId: string;
  expectedRevision?: number;
  agentId: string;
  leaseId: string;
  reason?: string;
}
export interface TaskAgentHandoffPayload {
  type: 'task.agent.handoff';
  taskId: string;
  expectedRevision?: number;
  fromAgentId: string;
  toAgentId: string;
  currentLeaseId: string;
  newLeaseId: string;
  newLeaseExpiresAt: string;
  reason?: string;
}
export type TaskAgentOperationPayload =
  | TaskAgentClaimPayload
  | TaskAgentHeartbeatPayload
  | TaskAgentReleasePayload
  | TaskAgentHandoffPayload;
export type TaskOperationPayload =
  | TaskCreatedPayload
  | TaskPatchedPayload
  | TaskStatusSetPayload
  | TaskLifecycleTransitionPayload
  | TaskProgressSetPayload
  | TaskNextActionSetPayload
  | TaskDependencyAddPayload
  | TaskDependencyRemovePayload
  | TaskEvidenceAddPayload
  | TaskFileTouchedPayload
  | TaskTestRecordedPayload
  | TaskAgentOperationPayload;
export interface TaskOperation {
  version: 1;
  operationId: string;
  sequence: number;
  projectId: string;
  hostId: string;
  occurredAt: string;
  actor: TaskActor;
  payloadSha256: string;
  payload: TaskOperationPayload;
}
export interface TaskProjection {
  version: 1;
  projectId: string;
  operationCount: number;
  lastSequence: number;
  lastOperationId?: string;
  generatedAt: string;
  tasks: Record<string, TaskRecord>;
}
export interface TaskListOptions {
  parentTaskId?: string | null;
  status?: TaskStatus;
  kind?: TaskKind;
  assignedAgentId?: string;
}
export interface TaskComputedProgress {
  done: number;
  total: number;
  percent: number;
  source: 'children' | 'explicit';
}
export interface TaskResumeState {
  rootTask: TaskRecord;
  resumeTask: TaskRecord;
  progress: TaskComputedProgress;
  blocker?: TaskBlocker;
  nextAction?: string;
  unresolvedDependencies: TaskRecord[];
  children: TaskRecord[];
}
