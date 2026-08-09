import type { SessionAgent } from '../session/types.js';

export type SemanticFieldKind =
  | 'mission'
  | 'objective'
  | 'why'
  | 'desired_outcome'
  | 'plan_rationale'
  | 'phase_objective'
  | 'phase_why'
  | 'phase_deliverable'
  | 'acceptance_criterion'
  | 'dependency'
  | 'open_question'
  | 'constraint'
  | 'note';

export interface SemanticEvidence {
  agent: SessionAgent;

  nativeSessionId: string;

  sessionKey: string;

  eventId: string;

  sourceEventId?: string;

  sequence: number;

  occurredAt: string;
}

export interface SemanticObservation {
  version: 1;

  id: string;

  projectId: string;

  kind: SemanticFieldKind;

  value: string;

  scope: 'project' | 'phase' | 'task';

  scopeKey?: string;

  scopeOrder?: number;

  confidence: number;

  evidence: SemanticEvidence;
}

export interface SemanticObservationBatch {
  version: 1;

  projectId: string;

  agent: SessionAgent;

  nativeSessionId: string;

  sessionKey: string;

  firstSequence: number;

  lastSequence: number;

  createdAt: string;

  observations: SemanticObservation[];
}

export interface SemanticValue {
  value: string;

  confidence: number;

  evidence: SemanticEvidence;
}

export interface SemanticPhaseContext {
  key: string;

  order: number;

  title?: string;

  objective?: SemanticValue;

  why?: SemanticValue;

  deliverable?: SemanticValue;

  acceptanceCriteria: SemanticValue[];

  dependencies: SemanticValue[];

  openQuestions: SemanticValue[];

  constraints: SemanticValue[];

  notes: SemanticValue[];
}

export interface SemanticWorkState {
  version: 1;

  projectId: string;

  projectName: string;

  mission?: SemanticValue;

  activeObjective?: SemanticValue;

  why?: SemanticValue;

  desiredOutcome?: SemanticValue;

  planRationale?: SemanticValue;

  phases: SemanticPhaseContext[];

  openQuestions: SemanticValue[];

  constraints: SemanticValue[];

  notes: SemanticValue[];

  updatedAt: string;
}

export interface SemanticLearningResult {
  scannedEvents: number;

  observations: number;

  journalWritten: boolean;

  reconciled: boolean;

  nextOffset: number;
}
