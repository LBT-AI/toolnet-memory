import type { ImportanceLevel, MemoryType } from '../../core/types.js';

import type { SessionAgent } from '../types.js';

export type LearnedMemoryKind =
  'rule' | 'decision' | 'todo' | 'next_action' | 'fix' | 'architecture' | 'context';

export interface LearnedMemoryEvidence {
  userExplicit: boolean;

  sourceVerified: boolean;

  testVerified: boolean;

  crossSessionConfirmations: number;

  assistantDerived: boolean;
}

export interface LearnedMemoryCandidate {
  version: 1;

  fingerprint: string;

  projectId: string;

  agent: SessionAgent;

  nativeSessionId: string;

  sessionKey: string;

  kind: LearnedMemoryKind;

  type: MemoryType;

  content: string;

  confidence: number;

  importance: ImportanceLevel;

  evidence?: LearnedMemoryEvidence;

  tags: string[];

  provenance: {
    agent: SessionAgent;

    nativeSessionId: string;

    sessionKey: string;

    eventIds: string[];

    sourceEventIds: string[];

    sourcePaths: string[];

    firstSequence: number;

    lastSequence: number;
  };

  createdAt: string;
}

export interface LearnedMemoryBatch {
  version: 1;

  projectId: string;

  agent: SessionAgent;

  nativeSessionId: string;

  sessionKey: string;

  createdAt: string;

  firstSequence: number;

  lastSequence: number;

  candidateCount: number;

  candidates: LearnedMemoryCandidate[];
}

export interface SessionLearningResult {
  scannedEvents: number;

  candidates: number;

  journalWritten: boolean;

  nextOffset: number;
}

export interface MemoryReconcileResult {
  batches: number;

  candidates: number;

  added: number;

  duplicates: number;

  memories: number;
}
