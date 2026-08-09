import type { SessionAgent } from '../session/types.js';

export type WorkItemStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

export type WorkObservationKind =
  | 'session'
  | 'goal'
  | 'plan'
  | 'phase'
  | 'task'
  | 'decision'
  | 'blocker'
  | 'warning'
  | 'next_action'
  | 'file'
  | 'test';

export interface WorkObservation {
  version: 1;

  id: string;

  projectId: string;

  kind: WorkObservationKind;

  key: string;

  text: string;

  status?: WorkItemStatus;

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

export interface WorkState {
  version: 1;

  projectId: string;
  projectName: string;

  goal?: string;

  plan?: string;

  phases: WorkItem[];

  tasks: WorkItem[];

  decisions: string[];

  blockers: string[];

  warnings: string[];

  nextActions: string[];

  filesTouched: string[];

  tests: string[];

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
