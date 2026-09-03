export type AuditAction =
  | 'memory.save'
  | 'snapshot.create'
  | 'snapshot.restore'
  | 'snapshot.recover'
  | 'guard.check'
  | 'gc.manual'
  | 'gc.auto';

export type AuditOutcome = 'success' | 'blocked' | 'failed' | 'skipped';

export type AuditActorKind = 'user' | 'agent' | 'mcp' | 'service' | 'system';

export interface AuditActor {
  kind: AuditActorKind;
  id?: string;
}

export interface AuditEventInput {
  action: AuditAction;
  outcome: AuditOutcome;
  actor?: AuditActor;
  target?: string;
  details?: Record<string, unknown>;
  at?: string;
}

export interface AuditRecord {
  version: 1;
  sequence: number;
  id: string;
  at: string;
  projectId: string;
  action: AuditAction;
  outcome: AuditOutcome;
  actor: AuditActor;
  target?: string;
  details?: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

export interface AuditVerificationResult {
  valid: boolean;
  records: number;
  lastHash: string;
  firstInvalidLine?: number;
  error?: string;
}
