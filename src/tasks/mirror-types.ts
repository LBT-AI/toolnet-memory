import type { TaskStatus } from './types.js';
export type AgentPlanMode = 'full' | 'delta';
export type AgentPlanItemStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export interface AgentPlanItem {
  /**
   * Stable identity supplied by the provider adapter.
   *
   * It MUST remain unchanged when title/order/status changes.
   */
  sourceKey: string;
  /**
   * Native provider item ID when one exists.
   *
   * Metadata only. Persistent Task identity is based on sourceKey
   * so adding an external ID later cannot silently fork a Task.
   */
  externalItemId?: string;
  title: string;
  status: AgentPlanItemStatus;
  order: number;
  detail?: string;
  blockerReason?: string;
  nextAction?: string;
}
export interface AgentPlanSnapshot {
  version: 1;
  projectId: string;
  /**
   * codex / opencode / claude / kiro / ...
   */
  provider: string;
  /**
   * Stable ToolNet agent identity used by Task leases.
   */
  agentId: string;
  nativeSessionId: string;
  /**
   * Optional native plan identity.
   */
  planId?: string;
  /**
   * full does NOT mean absent items are cancelled.
   *
   * Removal/cancellation must always be explicit.
   */
  mode: AgentPlanMode;
  sourceEventId: string;
  sourceSequence?: string | number;
  observedAt: string;
  items: AgentPlanItem[];
  /**
   * Explicit native current item when provider exposes it.
   *
   * Falls back to status=in_progress only when absent.
   */
  currentSourceKey?: string;
}
export interface TaskMirrorSourceBinding {
  provider: string;
  agentId: string;
  nativeSessionId: string;
  planId?: string;
  sourceKey: string;
  externalItemId?: string;
  sourceEventId: string;
  sourceSequence?: string | number;
  firstSeenAt: string;
  lastSeenAt: string;
}
export interface TaskMirrorCreateAction {
  type: 'create';
  taskId: string;
  sourceKey: string;
  title: string;
  order: number;
  binding: TaskMirrorSourceBinding;
}
export interface TaskMirrorPatchAction {
  type: 'patch';
  taskId: string;
  sourceKey: string;
  patch: {
    title?: string;
    order?: number;
  };
}
export interface TaskMirrorTransitionAction {
  type: 'transition';
  taskId: string;
  sourceKey: string;
  from: TaskStatus;
  to: TaskStatus;
  blockerReason?: string;
  nextAction?: string;
  /**
   * Completion must still pass Task Core completionGuard.
   */
  guarded: boolean;
}
export interface TaskMirrorClaimAction {
  type: 'claim';
  taskId: string;
  sourceKey: string;
  agentId: string;
}
export interface TaskMirrorReleaseAction {
  type: 'release';
  taskId: string;
  sourceKey: string;
  agentId: string;
  reason: string;
}
export interface TaskMirrorConflictAction {
  type: 'conflict';
  taskId: string;
  sourceKey: string;
  reason: string;
}
export type TaskMirrorAction =
  | TaskMirrorCreateAction
  | TaskMirrorPatchAction
  | TaskMirrorTransitionAction
  | TaskMirrorClaimAction
  | TaskMirrorReleaseAction
  | TaskMirrorConflictAction;
export interface TaskMirrorPlan {
  version: 1;
  mode: 'shadow';
  projectId: string;
  provider: string;
  agentId: string;
  nativeSessionId: string;
  planId?: string;
  snapshotDigest: string;
  sourceEventId: string;
  sourceSequence?: string | number;
  observedAt: string;
  itemCount: number;
  matchedTasks: number;
  newTasks: number;
  actions: TaskMirrorAction[];
}
