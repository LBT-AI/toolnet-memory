import type { NativeVisibleCompletionResult } from './completion-snapshot.js';
import type { AgentPlanItemStatus, AgentPlanSnapshot } from './mirror-types.js';

export interface TaskMirrorBindingRecord {
  version: 1;
  bindingId: string;
  projectId: string;
  scopeKey: string;
  provider: string;
  agentId: string;
  nativeSessionId: string;
  planId?: string;
  /** Stable identity consumed by TaskMirrorEngine. */
  canonicalSourceKey: string;
  /** Every native content-derived source key ever observed for this item. */
  rawSourceKeys: string[];
  title: string;
  order: number;
  status: AgentPlanItemStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  firstSourceEventId: string;
  lastSourceEventId: string;
  seenCount: number;
  visibleResult?: NativeVisibleCompletionResult;
}

export interface TaskMirrorBindingSnapshotItem {
  rawSourceKey: string;
  canonicalSourceKey: string;
  bindingId: string;
}

export interface TaskMirrorBindingEvent {
  version: 1;
  eventId: string;
  projectId: string;
  scopeKey: string;
  provider: string;
  agentId: string;
  nativeSessionId: string;
  planId?: string;
  sourceEventId: string;
  sourceSequence?: string | number;
  observedAt: string;
  /** Digest of the raw AgentPlanSnapshot before correlation. */
  snapshotDigest: string;
  /** Mapping used for this exact snapshot. */
  snapshotItems: TaskMirrorBindingSnapshotItem[];
  currentCanonicalSourceKey?: string;
  /** Full durable scope state after this observation. */
  bindings: TaskMirrorBindingRecord[];
  /** A visible result may arrive before its native plan binding exists. */
  visibleResult?: NativeVisibleCompletionResult;
  eventKind?: 'plan' | 'visible_result';
}

export interface TaskMirrorBindingScopeProjection {
  scopeKey: string;
  lastEventId: string;
  lastSourceEventId: string;
  lastSourceSequence?: string | number;
  lastObservedAt: string;
  snapshotDigest: string;
  snapshotItems: TaskMirrorBindingSnapshotItem[];
  currentCanonicalSourceKey?: string;
  bindings: TaskMirrorBindingRecord[];
  visibleResult?: NativeVisibleCompletionResult;
  eventKind?: 'plan' | 'visible_result';
}

export interface TaskMirrorBindingProjection {
  version: 1;
  projectId: string;
  eventCount: number;
  generatedAt: string;
  scopes: Record<string, TaskMirrorBindingScopeProjection>;
}

export interface TaskMirrorBindingDiagnostic {
  provider: string;
  sourceEventId: string;
  code: string;
  message: string;
}

export interface TaskMirrorBindingCorrelationResult {
  snapshot?: AgentPlanSnapshot;
  diagnostics: TaskMirrorBindingDiagnostic[];
  replay: boolean;
  persisted: boolean;
  ignored: boolean;
  scopeKey: string;
  bindings?: TaskMirrorBindingRecord[];
}

export interface TaskMirrorVisibleResultCorrelationResult {
  canonicalSourceKey?: string;
  binding?: TaskMirrorBindingRecord;
  result?: NativeVisibleCompletionResult;
  diagnostics: TaskMirrorBindingDiagnostic[];
  persisted: boolean;
  ignored: boolean;
  scopeKey: string;
  bindings?: TaskMirrorBindingRecord[];
}
