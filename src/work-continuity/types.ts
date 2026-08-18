import type { SessionAgent } from '../session/types.js';

export type WorkItemStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

export type FileWorkAction = 'active' | 'modified' | 'created' | 'deleted';

export type WorkCheckKind = 'test' | 'build' | 'lint' | 'typecheck';

export type WorkCheckStatus = 'running' | 'passed' | 'failed' | 'unknown';

export type WorkObservationKind =
  | 'session'
  | 'request'
  | 'activity'
  | 'goal'
  | 'plan'
  | 'phase'
  | 'task'
  | 'decision'
  | 'blocker'
  | 'warning'
  | 'next_action'
  | 'file'
  | 'command'
  | 'test';

export interface WorkObservation {
  version: 1;

  id: string;

  projectId: string;

  kind: WorkObservationKind;

  key: string;

  text: string;

  status?: WorkItemStatus;

  fileAction?: FileWorkAction;

  checkKind?: WorkCheckKind;

  checkStatus?: WorkCheckStatus;

  order?: number;

  confidence: number;

  occurredAt: string;

  sequence: number;

  agent: SessionAgent;

  nativeSessionId: string;

  sessionKey: string;

  eventId: string;

  sourceEventId?: string;
}

export interface WorkObservationBatch {
  version: 1;

  projectId: string;

  agent: SessionAgent;

  nativeSessionId: string;

  sessionKey: string;

  createdAt: string;

  firstSequence: number;

  lastSequence: number;

  observations: WorkObservation[];
}

export interface WorkItem {
  id: string;

  title: string;

  status: WorkItemStatus;

  order?: number;

  confidence: number;

  updatedAt: string;

  updatedBy: {
    agent: SessionAgent;

    nativeSessionId: string;

    eventId: string;
  };
}

export interface WorkCheck {
  kind: WorkCheckKind;

  command: string;

  status: WorkCheckStatus;

  updatedAt: string;

  agent: SessionAgent;

  nativeSessionId: string;
}

export interface WorkState {
  version: 1;

  projectId: string;
  projectName: string;

  currentRequest?: string;

  currentActivity?: string;

  goal?: string;

  plan?: string;

  phases: WorkItem[];

  tasks: WorkItem[];

  decisions: string[];

  blockers: string[];

  warnings: string[];

  nextActions: string[];

  filesTouched: string[];

  /**
   * Most recently edited/created files which are still
   * relevant to current work.
   */
  activeFiles?: string[];

  modifiedFiles?: string[];

  createdFiles?: string[];

  deletedFiles?: string[];

  commands?: string[];

  tests: string[];

  checks?: WorkCheck[];

  currentPhase?: WorkItem;

  currentTask?: WorkItem;

  progress: {
    phasesTotal: number;

    phasesCompleted: number;

    tasksTotal: number;

    tasksCompleted: number;

    blocked: number;
  };

  lastSession?: {
    agent: SessionAgent;

    nativeSessionId: string;

    sessionKey: string;

    updatedAt: string;
  };

  updatedAt: string;
}

export interface WorkContinuityResult {
  scannedEvents: number;

  observations: number;

  journalWritten: boolean;

  reconciled: boolean;

  nextOffset: number;
}
