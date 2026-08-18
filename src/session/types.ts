import type { ProjectManifest } from '../core/types.js';

export type SessionAgent = 'opencode' | 'agy' | 'codex' | 'claude' | string;

export type SessionStatus = 'active' | 'idle' | 'error';

export type SessionEventType =
  | 'session_start'
  | 'session_resume'
  | 'session_idle'
  | 'session_end'
  | 'session_compact'
  | 'user_prompt'
  | 'assistant_message'
  | 'message'
  | 'message_part'
  | 'tool_call'
  | 'tool_result'
  | 'file_read'
  | 'file_write'
  | 'file_edit'
  | 'command'
  | 'test'
  | 'todo'
  | 'decision'
  | 'commit'
  | 'deploy'
  | 'error'
  | 'artifact'
  | 'summary'
  | 'checkpoint'
  | 'custom';

export interface SessionIdentity {
  projectId: string;
  projectName: string;
  projectRoot: string;

  agent: SessionAgent;
  nativeSessionId: string;

  /**
   * Stable logical identity:
   * agent:nativeSessionId
   */
  sessionKey: string;

  /**
   * Logical remote path.
   * ProjectScopedStorageProvider converts projectId
   * into the human-readable remote project folder.
   */
  remotePrefix: string;

  /**
   * Local durable WAL path.
   */
  localDirectory: string;
}

export interface SessionProvenance {
  source?: string;

  sourcePath?: string;
  sourceTable?: string;
  sourceRowId?: string;
  sourceOffset?: string | number;

  commitSha?: string;

  files?: string[];
  symbols?: string[];

  /**
   * Hash of original source data when available.
   */
  rawDigest?: string;

  metadata?: Record<string, unknown>;
}

export interface SessionEventContext {
  /**
   * Normalized agent source:
   * opencode / codex / agy / claude.
   */
  source?: string;

  /**
   * Native agent turn when the source exposes one.
   */
  turnId?: string;

  /**
   * Working directory associated with this event.
   */
  cwd?: string;
}

export interface SessionEventInput {
  type: SessionEventType;

  timestamp?: string;

  role?: string;

  source?: string;

  turnId?: string;

  cwd?: string;

  /**
   * Stable event ID from the source agent.
   * OpenCode message/part ID, Agy step index,
   * Codex rollout event ID, etc.
   */
  sourceEventId?: string;

  /**
   * Optional sequence supplied by the native source.
   */
  sourceSequence?: string | number;

  data?: Record<string, unknown>;

  provenance?: SessionProvenance;
}

export interface NormalizedSessionEvent {
  version: 1;

  id: string;
  sequence: number;

  projectId: string;

  agent: SessionAgent;
  nativeSessionId: string;

  /**
   * Unified alias. New events always write this field.
   * nativeSessionId remains for backwards compatibility.
   */
  sessionId?: string;

  type: SessionEventType;

  timestamp: string;

  role?: string;

  source?: string;

  turnId?: string;

  cwd?: string;

  sourceEventId?: string;

  sourceSequence?: string | number;

  data: Record<string, unknown>;

  provenance: SessionProvenance;
}

export interface SessionCursor {
  version: 1;

  projectId: string;

  agent: SessionAgent;
  nativeSessionId: string;

  lastLocalSequence: number;
  lastRemoteSequence: number;

  /**
   * Agent-specific cursors:
   *
   * opencode.message = message timestamp/row ID
   * opencode.part    = part timestamp/row ID
   * agy.step         = step index
   * codex.jsonl      = byte offset / event index
   */
  sourceCursors: Record<string, string>;

  updatedAt: string;
}

export interface SessionManifest {
  version: 1;

  projectId: string;
  projectName: string;

  agent: SessionAgent;
  nativeSessionId: string;

  sessionKey: string;

  status: SessionStatus;

  title?: string;

  createdAt: string;
  updatedAt: string;

  firstEventAt?: string;
  lastEventAt?: string;

  eventCount: number;
  chunkCount: number;

  metadata: Record<string, unknown>;
}

export interface LocalSessionState {
  version: 1;

  projectId: string;

  agent: SessionAgent;
  nativeSessionId: string;

  status: SessionStatus;

  createdAt: string;
  updatedAt: string;

  lastSequence: number;

  lastRemoteSequence: number;

  /**
   * Byte offset inside events.jsonl which is already remote.
   */
  remoteByteOffset: number;

  sourceCursors: Record<string, string>;

  /**
   * Bounded local dedup cache.
   */
  recentEventIds: string[];
}

export interface PendingSessionEvents {
  events: NormalizedSessionEvent[];

  startOffset: number;
  endOffset: number;
}

export interface SessionFlushResult {
  uploadedEvents: number;

  lastRemoteSequence: number;

  eventCount: number;
  chunkCount: number;

  status: SessionStatus;
}

export interface SessionCoreOptions {
  project: ProjectManifest;

  storage: import('../storage/types.js').StorageProvider;

  agent: SessionAgent;

  nativeSessionId: string;

  title?: string;

  metadata?: Record<string, unknown>;

  /**
   * Defaults applied by the unified event boundary.
   */
  eventContext?: SessionEventContext;

  maxEventsPerChunk?: number;

  maxChunkBytes?: number;
}
