import { MemoryEngine } from '../../core/memory-engine.js';

import type { ProjectManifest } from '../../core/types.js';

import { ConvergentMemoryStore } from '../../multi-host/memory-projection.js';

import type { StorageProvider } from '../../storage/types.js';

import type { SessionIdentity, NormalizedSessionEvent } from '../types.js';

import { sha256 } from '../utils.js';
import { safeAppendAuditEvent } from '../../audit/log.js';

import type { LearnedMemoryBatch, LearnedMemoryCandidate, MemoryReconcileResult } from './types.js';

function pad(value: number): string {
  return String(value).padStart(12, '0');
}

function journalPrefix(identity: SessionIdentity): string {
  return `projects/${identity.projectId}/memory/learned`;
}

export class SessionMemoryJournal {
  constructor(private readonly storage: StorageProvider) {}

  async write(
    identity: SessionIdentity,

    events: NormalizedSessionEvent[],

    candidates: LearnedMemoryCandidate[]
  ): Promise<string | null> {
    if (candidates.length === 0 || events.length === 0) {
      return null;
    }

    const firstSequence = Math.min(...events.map((item) => item.sequence));

    const lastSequence = Math.max(...events.map((item) => item.sequence));

    const batch: LearnedMemoryBatch = {
      version: 1,

      projectId: identity.projectId,

      agent: identity.agent,

      nativeSessionId: identity.nativeSessionId,

      sessionKey: identity.sessionKey,

      createdAt: new Date().toISOString(),

      firstSequence,
      lastSequence,

      candidateCount: candidates.length,

      candidates,
    };

    const payload = JSON.stringify(batch, null, 2) + '\n';

    const digest = sha256(
      candidates
        .map((item) => item.fingerprint)
        .sort()
        .join('|')
    ).slice(0, 16);

    /*
     * Shared project memory must retain every source batch.
     *
     * sourceDigest is provenance/uniqueness only.
     * It does NOT partition memory by agent.
     */
    const sourceDigest = sha256(identity.sessionKey).slice(0, 12);

    const key = [
      journalPrefix(identity),

      'batches',

      `${pad(firstSequence)}-${pad(lastSequence)}-${sourceDigest}-${digest}.json`,
    ].join('/');

    if (!(await this.storage.exists(key))) {
      await this.storage.put(key, payload, 'application/json');
    }

    return key;
  }
}

function candidateFingerprint(memory: Record<string, any>): string | undefined {
  const value = memory.metadata?.learningFingerprint;

  return typeof value === 'string' ? value : undefined;
}

function evidenceRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}

function confirmingSessions(memory: Record<string, any>): Set<string> {
  const values = memory.metadata?.confirmingSessionKeys;

  const sessions = new Set<string>();

  if (Array.isArray(values)) {
    for (const value of values) {
      if (typeof value !== 'string') {
        continue;
      }

      sessions.add(value);
    }
  }

  const original = memory.metadata?.sessionKey;

  if (typeof original === 'string') {
    sessions.add(original);
  }

  return sessions;
}

function mergeConfirmationEvidence(
  memory: Record<string, any>,
  candidate: LearnedMemoryCandidate
): boolean {
  const sessions = confirmingSessions(memory);

  const beforeCount = sessions.size;

  sessions.add(candidate.sessionKey);

  const oldEvidence = evidenceRecord(memory.metadata?.evidence);

  const newEvidence = evidenceRecord(candidate.evidence);

  const crossSessionConfirmations = sessions.size;

  const userExplicit = oldEvidence.userExplicit === true || newEvidence.userExplicit === true;

  const sourceVerified = oldEvidence.sourceVerified === true || newEvidence.sourceVerified === true;

  const testVerified = oldEvidence.testVerified === true || newEvidence.testVerified === true;

  const assistantDerived =
    oldEvidence.assistantDerived === true && newEvidence.assistantDerived === true;

  const previousConfirmations = Number(oldEvidence.crossSessionConfirmations ?? 0);

  const changed =
    beforeCount !== crossSessionConfirmations ||
    previousConfirmations !== crossSessionConfirmations ||
    oldEvidence.userExplicit !== userExplicit ||
    oldEvidence.sourceVerified !== sourceVerified ||
    oldEvidence.testVerified !== testVerified ||
    oldEvidence.assistantDerived !== assistantDerived;

  if (!changed) {
    return false;
  }

  memory.metadata = {
    ...(memory.metadata ?? {}),

    evidence: {
      userExplicit,

      sourceVerified,

      testVerified,

      crossSessionConfirmations,

      assistantDerived,
    },

    confirmingSessionKeys: [...sessions].sort(),
  };

  return true;
}

async function loadBatches(
  project: ProjectManifest,

  storage: StorageProvider
): Promise<LearnedMemoryBatch[]> {
  const prefix = `projects/${project.id}/memory/learned/`;

  const objects = await storage.list(prefix);

  const batches: LearnedMemoryBatch[] = [];

  for (const object of objects
    .filter((item) => item.key.includes('/batches/') && item.key.endsWith('.json'))
    .sort((left, right) => left.key.localeCompare(right.key))) {
    const text = await storage.getText(object.key);

    if (!text) {
      continue;
    }

    try {
      const parsed = JSON.parse(text) as LearnedMemoryBatch;

      if (parsed.version !== 1 || !Array.isArray(parsed.candidates)) {
        continue;
      }

      batches.push(parsed);
    } catch {
      // Ignore incomplete/corrupt optional learning batch.
    }
  }

  return batches;
}

export async function reconcileSessionMemoryJournal(
  project: ProjectManifest,

  storage: StorageProvider
): Promise<MemoryReconcileResult> {
  const batches = await loadBatches(project, storage);

  const store = new ConvergentMemoryStore(storage);

  const existing = await store.load(project.id);

  const engine = new MemoryEngine();

  engine.importRecords(existing);

  const fingerprints = new Set(
    existing
      .map((memory) => candidateFingerprint(memory))
      .filter((value): value is string => Boolean(value))
  );

  const memoriesByFingerprint = new Map(
    existing.flatMap((memory) => {
      const fingerprint = candidateFingerprint(memory);

      if (!fingerprint) {
        return [];
      }

      return [[fingerprint, memory] as const];
    })
  );

  let candidates = 0;

  let added = 0;

  let duplicates = 0;

  let evidenceUpdated = 0;
  const addedAuditRecords: Array<{
    id: string;
    type: string;
    kind: string;
    agent: string;
  }> = [];

  for (const batch of batches) {
    for (const candidate of batch.candidates) {
      candidates += 1;

      if (fingerprints.has(candidate.fingerprint)) {
        duplicates += 1;

        const memory = memoriesByFingerprint.get(candidate.fingerprint);

        evidenceUpdated += memory && mergeConfirmationEvidence(memory, candidate) ? 1 : 0;

        continue;
      }

      const remembered = engine.remember({
        projectId: project.id,

        type: candidate.type,

        content: candidate.content,

        importance: candidate.importance,

        tags: candidate.tags,

        source: 'session-memory-learner',
        createdAt: candidate.createdAt,
        metadata: {
          learningFingerprint: candidate.fingerprint,

          learningKind: candidate.kind,
          conflictKind: candidate.kind,
          lifecycleState: 'active',
          confidence: candidate.confidence,
          evidence: candidate.evidence,
          provenance: candidate.provenance,
          sourceCreatedAt: candidate.createdAt,
          sessionKey: candidate.sessionKey,

          agent: candidate.agent,

          nativeSessionId: candidate.nativeSessionId,
        },
      });

      fingerprints.add(candidate.fingerprint);

      memoriesByFingerprint.set(candidate.fingerprint, remembered);
      addedAuditRecords.push({
        id: remembered.id,
        type: remembered.type,
        kind: candidate.kind,
        agent: candidate.agent,
      });
      added += 1;
    }
  }

  if (added > 0 || evidenceUpdated > 0) {
    await store.save(project.id, engine.exportProject(project.id));
    for (const item of addedAuditRecords) {
      await safeAppendAuditEvent(project, {
        action: 'memory.save',
        outcome: 'success',
        actor: { kind: 'agent', id: item.agent },
        details: {
          memoryId: item.id,
          type: item.type,
          learningKind: item.kind,
          source: 'session-memory-learner',
        },
      });
    }
  }

  return {
    batches: batches.length,

    candidates,

    added,

    duplicates,

    memories: engine.exportProject(project.id).length,
  };
}
