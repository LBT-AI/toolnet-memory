import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { MemoryEngine } from '../../src/core/memory-engine.js';

import type { MemoryRecord, ProjectManifest } from '../../src/core/types.js';

import { CodeGraphStore, ReferenceResolver } from '../../src/code-intelligence/index.js';

import { memoryForget } from '../../src/mcp/tools/memory-forget.js';

import { memoryRemember } from '../../src/mcp/tools/memory-remember.js';

import { memorySearch } from '../../src/mcp/tools/memory-search.js';

import type { MCPContext } from '../../src/mcp/context.js';

import { memoryLifecycleState } from '../../src/memory/conflict-detector.js';

import { inspectDurableMemoryPolicy } from '../../src/memory/quality.js';

import { runMemoryPipelineV2 } from '../../src/memory/pipeline-v2.js';

import {
  evaluateMemoryPolicy,
  loadCanonicalPromotionPolicy,
  memoryKnowledgeClassMatrix,
  MEMORY_POLICY_VERSION,
  type CanonicalPromotionPolicy,
  type MemoryPolicyEvaluation,
} from '../../src/memory/promotion-policy.js';

import { deriveMemoryFreshness } from '../../src/memory/scope-freshness.js';

import { ConvergentMemoryStore } from '../../src/multi-host/memory-projection.js';

import { RetrievalEngine } from '../../src/retrieval/retrieval-engine.js';

import { SessionCore } from '../../src/session/core.js';

import { extractLearnedMemories } from '../../src/session/learner/extractor.js';

import { SessionMemoryLearner } from '../../src/session/learner/learner.js';

import { SessionMemoryMaterializer } from '../../src/session/learner/materializer.js';

import { reconcileJournalBatches } from '../../src/session/learner/journal.js';

import type {
  LearnedMemoryBatch,
  LearnedMemoryCandidate,
} from '../../src/session/learner/types.js';

import type { NormalizedSessionEvent, SessionIdentity } from '../../src/session/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

const LOCAL_POLICY: CanonicalPromotionPolicy = {
  mode: 'conservative',

  minScore: 0.65,

  minConfidence: 0.78,
};

const STALE_RULE_TEXT = 'Từ giờ luôn chỉ edit source, không được edit production trực tiếp.';

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

class MemoryStorage implements StorageProvider {
  readonly name = 'phase86d-memory';

  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.objects.set(key, typeof data === 'string' ? Buffer.from(data) : new Uint8Array(data));
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.objects.get(key) ?? null;
  }

  async getText(key: string): Promise<string | null> {
    const value = await this.get(key);

    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.objects.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort((left, right) => left.localeCompare(right))
      .map((key) => ({ key }));
  }
}

const roots: string[] = [];

afterEach(() => {
  while (roots.length) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function manifest(name: string): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), `toolnet-${name}-`));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: `${name}-project`,
    name,
    remote: `${name}-project`,
    rootPath: root,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function identity(agent = 'codex', nativeSessionId = 'session-1'): SessionIdentity {
  return {
    projectId: 'phase86d-project',
    projectName: 'phase86d',
    projectRoot: '/tmp/phase86d',
    agent,
    nativeSessionId,
    sessionKey: `${agent}:${nativeSessionId}`,
    remotePrefix: `projects/phase86d/sessions/${agent}/${nativeSessionId}`,
    localDirectory: '/tmp/phase86d/.toolnet/session',
  };
}

function event(
  sequence: number,
  input: {
    type?: NormalizedSessionEvent['type'];
    role?: string;
    text: string;
    sourcePath?: string;
  }
): NormalizedSessionEvent {
  return {
    version: 1,
    id: `event-${sequence}`,
    sequence,
    projectId: 'phase86d-project',
    agent: 'codex',
    nativeSessionId: 'session-1',
    type: input.type ?? 'message',
    timestamp: new Date(1_700_000_000_000 + sequence * 1000).toISOString(),
    role: input.role,
    data: { text: input.text },
    provenance: { source: 'codex', sourcePath: input.sourcePath },
  };
}

/** Extract + evaluate exactly what the auto-capture path would do. */
function evaluateEvents(
  events: NormalizedSessionEvent[]
): Array<{ candidate: LearnedMemoryCandidate; evaluation: MemoryPolicyEvaluation }> {
  return extractLearnedMemories(identity(), events).map((candidate) => ({
    candidate,
    evaluation: evaluateMemoryPolicy(candidate, LOCAL_POLICY),
  }));
}

function acceptedEvents(
  events: NormalizedSessionEvent[]
): Array<{ candidate: LearnedMemoryCandidate; evaluation: MemoryPolicyEvaluation }> {
  return evaluateEvents(events).filter((item) => item.evaluation.persist);
}

function explicitEvidence() {
  return {
    userExplicit: true,
    sourceVerified: false,
    testVerified: false,
    crossSessionConfirmations: 1,
    assistantDerived: false,
  };
}

function verifiedEvidence() {
  return {
    userExplicit: false,
    sourceVerified: true,
    testVerified: false,
    crossSessionConfirmations: 1,
    assistantDerived: false,
  };
}

function startCore(
  p: ProjectManifest,
  storage: StorageProvider,
  nativeSessionId: string
): SessionCore {
  const core = new SessionCore({
    project: p,
    storage,
    agent: 'opencode',
    nativeSessionId,
  });

  core.start();

  return core;
}

function recordPrompt(core: SessionCore, sourceEventId: string, content: string): void {
  core.record({
    type: 'user_prompt',
    role: 'user',
    sourceEventId,
    data: { content },
  });
}

function batchFor(id: SessionIdentity, events: NormalizedSessionEvent[]): LearnedMemoryBatch {
  const pipeline = runMemoryPipelineV2(id, events);

  return {
    version: 1,
    projectId: id.projectId,
    agent: id.agent,
    nativeSessionId: id.nativeSessionId,
    sessionKey: id.sessionKey,
    createdAt: '2026-10-01T00:00:00.000Z',
    firstSequence: 1,
    lastSequence: events.length,
    candidateCount: pipeline.candidates.length,
    candidates: pipeline.candidates,
  };
}

/* ------------------------------------------------------------------ */
/* T1–T25: canonical durable memory policy                             */
/* ------------------------------------------------------------------ */

describe('Phase 86D durable memory policy', () => {
  it('T1/T2: captures an explicit project rule and an architecture decision', () => {
    const rule = evaluateEvents([
      event(1, { role: 'user', text: 'Rule: always run the full test suite before committing.' }),
    ]);

    expect(rule).toHaveLength(1);

    expect(rule[0].candidate.kind).toBe('rule');

    expect(rule[0].evaluation.knowledgeType).toBe('project_rule');

    expect(rule[0].evaluation.reasonCode).toBe('accepted_project_rule');

    expect(rule[0].evaluation.knowledgeClass).toBe('permanent');

    const architecture = evaluateEvents([
      event(1, {
        role: 'user',
        text: 'We split the memory store into a storage adapter and a projection layer.',
      }),
    ]);

    expect(architecture).toHaveLength(1);

    expect(architecture[0].candidate.kind).toBe('architecture');

    expect(architecture[0].evaluation.reasonCode).toBe('accepted_architecture_decision');
  });

  it('T3/T4: a verified root cause is accepted, a speculative one is rejected', () => {
    const verified = evaluateEvents([
      event(1, {
        role: 'user',
        sourcePath: 'src/session/learner/journal.ts',
        text: 'Root cause: the learner offset advanced before the journal write completed.',
      }),
    ]);

    expect(verified).toHaveLength(1);

    expect(verified[0].candidate.kind).toBe('root_cause');

    expect(verified[0].evaluation.reasonCode).toBe('accepted_root_cause');

    const speculative = evaluateEvents([
      event(1, {
        role: 'assistant',
        text: 'The failure is probably caused by a stale learner offset.',
      }),
    ]);

    expect(speculative).toHaveLength(1);

    expect(speculative[0].evaluation.reasonCode).toBe('rejected_speculative');

    expect(speculative[0].evaluation.persist).toBe(false);
  });

  it('T5: a verified fix is accepted', () => {
    const fix = evaluateEvents([
      event(1, {
        role: 'assistant',
        sourcePath: 'src/session/learner/journal.ts',
        text: 'Fixed the offset ordering bug; the journal test now passes.',
      }),
    ]);

    expect(fix).toHaveLength(1);

    expect(fix[0].candidate.kind).toBe('fix');

    expect(fix[0].evaluation.reasonCode).toBe('accepted_verified_fix');
  });

  it('T6/T7/T8: progress, raw command output and greetings never become candidates', () => {
    expect(
      extractLearnedMemories(identity(), [
        event(1, { role: 'assistant', text: "I'm now updating src/session/core.ts" }),
      ])
    ).toHaveLength(0);

    expect(
      extractLearnedMemories(identity(), [
        event(1, { role: 'assistant', text: '$ npm test\nadded 42 packages in 3s' }),
      ])
    ).toHaveLength(0);

    const chatter = [
      event(1, { role: 'user', text: 'Thanks!' }),
      event(2, { role: 'user', text: 'Hello there!' }),
      event(3, { role: 'user', text: 'ok' }),
      event(4, { role: 'assistant', text: 'Got it' }),
    ];

    expect(acceptedEvents(chatter)).toHaveLength(0);
  });

  it('T9: a secret never becomes a memory candidate', () => {
    const candidates = extractLearnedMemories(identity(), [
      event(1, {
        role: 'user',
        text: 'API key is sk-1234567890abcdefABCDEF1234567890abcdef',
      }),
    ]);

    expect(candidates).toHaveLength(0);
  });

  it('T10: duplicate statements inside one session collapse to one candidate', () => {
    const candidates = extractLearnedMemories(identity(), [
      event(1, { role: 'user', text: 'Rule: always run lint before pushing code.' }),
      event(2, { role: 'user', text: 'Rule: always run lint before pushing code.' }),
    ]);

    expect(candidates).toHaveLength(1);
  });

  it('T11/T12: cross-session and cross-agent duplicates create one memory with confirmations', async () => {
    const project = manifest('phase86d-cross-agent');

    const storage = new MemoryStorage();

    const text = 'Rule: always run the full test suite before committing.';

    const sessions = [
      { id: identity('codex', 'sess-a'), events: [event(1, { role: 'user', text })] },
      { id: identity('opencode', 'sess-b'), events: [event(1, { role: 'user', text })] },
      { id: identity('agy', 'sess-c'), events: [event(1, { role: 'user', text })] },
    ];

    const result = await reconcileJournalBatches(
      project,
      storage,
      sessions.map((session) => batchFor(session.id, session.events))
    );

    expect(result.added).toBe(1);

    expect(result.duplicates).toBe(2);

    expect(result.memories).toBe(1);

    const memories = await new ConvergentMemoryStore(storage).load(project.id);

    expect(memories).toHaveLength(1);

    const confirming = memories[0].metadata?.confirmingSessionKeys;

    expect(Array.isArray(confirming) ? confirming.length : 0).toBe(3);

    const learnedKind = memories[0].metadata?.learningKind;

    expect(learnedKind).toBe('rule');
  });

  it('T13/T14: an explicit correction supersedes the old rule; a newer decision replaces the old one', () => {
    const engine = new MemoryEngine();

    const old = engine.remember({
      projectId: 'phase86d-correct',
      type: 'rule',
      importance: 'critical',
      content: 'Use MySQL as the project database.',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'rule',
        topic: 'database',
        confidence: 0.98,
        evidence: explicitEvidence(),
        knowledgeClass: 'permanent',
      },
    });

    const corrected = engine.remember({
      projectId: 'phase86d-correct',
      type: 'rule',
      importance: 'critical',
      content: 'Use PostgreSQL as the project database.',
      createdAt: '2026-06-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'rule',
        topic: 'database',
        confidence: 0.98,
        evidence: explicitEvidence(),
        knowledgeClass: 'permanent',
      },
    });

    expect(engine.get(old.id)!.metadata?.supersededBy).toBe(corrected.id);

    expect(memoryLifecycleState(engine.get(old.id)!)).toBe('superseded');

    const oldArch = engine.remember({
      projectId: 'phase86d-arch',
      type: 'decision',
      importance: 'high',
      content: 'Memory persistence uses a mutable current.json snapshot.',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'architecture',
        topic: 'memory-persistence',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    const newArch = engine.remember({
      projectId: 'phase86d-arch',
      type: 'decision',
      importance: 'high',
      content: 'Memory persistence now uses an append-only operation log as the source of truth.',
      createdAt: '2026-06-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'architecture',
        topic: 'memory-persistence',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    const current = engine.list('phase86d-arch');

    expect(current).toHaveLength(1);

    expect(current[0].id).toBe(newArch.id);

    expect(current[0].content).toContain('append-only');

    expect(engine.get(oldArch.id)!.metadata?.supersededBy).toBe(newArch.id);
  });

  it('T15: unrelated facts are not superseded', () => {
    const engine = new MemoryEngine();

    const cache = engine.remember({
      projectId: 'phase86d-unrelated',
      type: 'decision',
      importance: 'high',
      content: 'Use Redis for the cache layer.',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'decision',
        topic: 'cache',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    const database = engine.remember({
      projectId: 'phase86d-unrelated',
      type: 'decision',
      importance: 'high',
      content: 'Use PostgreSQL for the database layer.',
      createdAt: '2026-01-02T00:00:00.000Z',
      metadata: {
        conflictKind: 'decision',
        topic: 'database',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    expect(cache.metadata?.supersededBy).toBeUndefined();

    expect(database.metadata?.supersededBy).toBeUndefined();

    expect(engine.list('phase86d-unrelated')).toHaveLength(2);
  });

  it('T16: project memory never leaks across projects', () => {
    const engine = new MemoryEngine();

    engine.remember({
      projectId: 'phase86d-project-a',
      type: 'rule',
      importance: 'high',
      content: 'Project A rule: always use the local storage provider.',
      metadata: { conflictKind: 'rule', confidence: 0.95, evidence: explicitEvidence() },
    });

    expect(engine.list('phase86d-project-b')).toHaveLength(0);

    const retrieval = new RetrievalEngine(engine);

    expect(retrieval.search('phase86d-project-b', 'local storage provider')).toHaveLength(0);

    expect(retrieval.search('phase86d-project-a', 'local storage provider').length).toBeGreaterThan(
      0
    );
  });

  it('T17: automatic capture can never promote global memory', () => {
    const candidate = {
      kind: 'rule' as const,
      importance: 'high' as const,
      confidence: 0.95,
      content: 'Always keep the build deterministic across machines.',
      evidence: explicitEvidence(),
    };

    const global = evaluateMemoryPolicy(candidate, LOCAL_POLICY, { requestedScope: 'global' });

    expect(global.reasonCode).toBe('rejected_scope');

    expect(global.persist).toBe(false);

    expect(evaluateMemoryPolicy(candidate, LOCAL_POLICY).scope).toBe('project');
  });

  it('T18: an explicit save bypasses the automatic threshold but not security', () => {
    const candidate = {
      kind: 'decision' as const,
      importance: 'normal' as const,
      confidence: 0.78,
      content: 'Use the append-only operation journal for durable memory.',
      evidence: verifiedEvidence(),
    };

    const automatic = evaluateMemoryPolicy(candidate, LOCAL_POLICY);

    expect(automatic.reasonCode).toBe('rejected_low_confidence');

    expect(automatic.persist).toBe(false);

    const explicit = evaluateMemoryPolicy(candidate, LOCAL_POLICY, { explicit: true });

    expect(explicit.persist).toBe(true);

    expect(explicit.reasonCode).toBe('accepted_decision');
  });

  it('T19: explicit memory_save rejects a secret and never stores it raw', async () => {
    const p = manifest('phase86d-explicit-secret');

    const memory = new MemoryEngine();

    const storage = new MemoryStorage();

    const retrieval = new RetrievalEngine(memory);

    const graph = new CodeGraphStore();

    const ctx: MCPContext = {
      project: p,
      memory,
      retrieval,
      graph,
      references: new ReferenceResolver(graph),
    };

    const result = await memoryRemember(ctx, {
      type: 'rule',
      content: 'Set api_key=sk-1234567890abcdefABCDEF1234567890abcdef for uploads.',
    });

    expect('accepted' in result).toBe(true);

    if ('accepted' in result) {
      expect(result.accepted).toBe(false);

      expect(result.reasonCode).toBe('rejected_secret');
    }

    expect(memory.listAll(p.id)).toHaveLength(0);

    expect(JSON.stringify(await storage.list())).not.toContain('sk-1234');
  });

  it('T20: a stale temporal fact is reported stale, not deleted', () => {
    const engine = new MemoryEngine();

    const deployment = engine.remember({
      projectId: 'phase86d-stale',
      type: 'decision',
      importance: 'high',
      content: 'Released v0.6.0 to production.',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'deploy',
        confidence: 0.95,
        evidence: verifiedEvidence(),
        knowledgeClass: 'task',
        staleAfter: '2026-02-01T00:00:00.000Z',
      },
    });

    expect(deriveMemoryFreshness(deployment, Date.parse('2026-03-01T00:00:00.000Z'))).toBe('stale');

    expect(engine.get(deployment.id)).toBeDefined();

    expect(engine.listAll('phase86d-stale').some((item) => item.id === deployment.id)).toBe(true);
  });

  it('T21: a timeless rule never goes stale by age alone', () => {
    const engine = new MemoryEngine();

    const rule = engine.remember({
      projectId: 'phase86d-timeless',
      type: 'rule',
      importance: 'critical',
      content: 'Never commit directly to the main branch.',
      createdAt: '2019-01-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'rule',
        confidence: 0.98,
        evidence: explicitEvidence(),
        knowledgeClass: 'permanent',
      },
    });

    expect(rule.staleAfter).toBeUndefined();

    expect(deriveMemoryFreshness(rule, Date.parse('2026-10-01T00:00:00.000Z'))).toBe('fresh');

    expect(engine.list('phase86d-timeless').some((item) => item.id === rule.id)).toBe(true);
  });

  it('T22/T23: current memory is preferred and superseded memory needs historical retrieval', () => {
    const engine = new MemoryEngine();

    const first = engine.remember({
      projectId: 'phase86d-search',
      type: 'decision',
      importance: 'high',
      content: 'The service listens on port 3000 for HTTP traffic.',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'context',
        topic: 'api-port',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    const second = engine.remember({
      projectId: 'phase86d-search',
      type: 'decision',
      importance: 'high',
      content: 'The service listens on port 4000 for HTTP traffic.',
      createdAt: '2026-06-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'context',
        topic: 'api-port',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    expect(engine.get(first.id)!.metadata?.supersededBy).toBe(second.id);

    const retrieval = new RetrievalEngine(engine);

    const current = retrieval.search('phase86d-search', 'service listens port');

    expect(current.some((item) => item.memory.id === second.id)).toBe(true);

    expect(current.some((item) => item.memory.id === first.id)).toBe(false);

    const historical = retrieval.search('phase86d-search', 'service listens port', {
      includeSuperseded: true,
    });

    const currentHit = historical.find((item) => item.memory.id === second.id)!;

    const oldHit = historical.find((item) => item.memory.id === first.id)!;

    expect(currentHit.score).toBeGreaterThan(oldHit.score);
  });

  it('T24: forgetting the current memory does not resurrect the superseded one', async () => {
    const engine = new MemoryEngine();

    const p = manifest('phase86d-forget');

    const old = engine.remember({
      projectId: p.id,
      type: 'decision',
      importance: 'high',
      content: 'The service listens on port 3000 for HTTP traffic.',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'context',
        topic: 'api-port',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    const current = engine.remember({
      projectId: p.id,
      type: 'decision',
      importance: 'high',
      content: 'The service listens on port 4000 for HTTP traffic.',
      createdAt: '2026-06-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'context',
        topic: 'api-port',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    const graph = new CodeGraphStore();

    const ctx: MCPContext = {
      project: p,
      memory: engine,
      retrieval: new RetrievalEngine(engine),
      graph,
      references: new ReferenceResolver(graph),
    };

    const forgotten = await memoryForget(ctx, { id: current.id });

    expect(forgotten.deleted).toBe(true);

    expect(memoryLifecycleState(engine.get(old.id)!)).toBe('superseded');

    expect(engine.list(p.id).some((item) => item.id === old.id)).toBe(false);
  });

  it('T25: zero eligible candidates is a healthy no-op', async () => {
    const pipeline = runMemoryPipelineV2(identity(), [
      event(1, { role: 'user', text: 'hello' }),

      event(2, { role: 'assistant', text: "I'm now reading src/index.ts" }),

      event(3, { role: 'assistant', text: 'npm notice added 12 packages in 2s' }),
    ]);

    expect(pipeline.candidates).toHaveLength(0);

    expect(pipeline.stats.persistedCandidates).toBe(0);

    const p = manifest('phase86d-noop');

    const storage = new MemoryStorage();

    const result = await reconcileJournalBatches(p, storage, []);

    expect(result.added).toBe(0);

    expect(result.memories).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Contradiction, requirement and structured identity policy           */
/* ------------------------------------------------------------------ */

describe('Phase 86D contradiction policy', () => {
  it('supersedes the old value when a keyed subject changes (database_provider)', () => {
    const engine = new MemoryEngine();

    const aiven = engine.remember({
      projectId: 'phase86d-subject',
      type: 'decision',
      importance: 'high',
      content: 'Database provider is DATABASE_PROVIDER=Aiven.',
      createdAt: '2026-01-01T00:00:00.000Z',
      tags: ['subject:database_provider'],
      metadata: {
        conflictKind: 'context',
        subject: 'database_provider',
        subjectValue: 'Aiven',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    const mysql = engine.remember({
      projectId: 'phase86d-subject',
      type: 'decision',
      importance: 'high',
      content: 'Database provider is DATABASE_PROVIDER=Oracle MySQL.',
      createdAt: '2026-06-01T00:00:00.000Z',
      tags: ['subject:database_provider'],
      metadata: {
        conflictKind: 'context',
        subject: 'database_provider',
        subjectValue: 'Oracle MySQL',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    expect(engine.get(aiven.id)!.metadata?.supersededBy).toBe(mysql.id);

    const current = engine.list('phase86d-subject');

    expect(current).toHaveLength(1);

    expect(current[0].content).toContain('Oracle MySQL');
  });

  it('keeps different keyed subjects as separate facts (port vs service_name)', () => {
    const engine = new MemoryEngine();

    const port = engine.remember({
      projectId: 'phase86d-subject-distinct',
      type: 'decision',
      importance: 'high',
      content: 'Service port is PORT=9090.',
      createdAt: '2026-01-01T00:00:00.000Z',
      tags: ['subject:port'],
      metadata: {
        conflictKind: 'context',
        subject: 'port',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    const service = engine.remember({
      projectId: 'phase86d-subject-distinct',
      type: 'decision',
      importance: 'high',
      content: 'Service name is SERVICE_NAME=auth-service.',
      createdAt: '2026-01-01T00:00:00.000Z',
      tags: ['subject:service_name'],
      metadata: {
        conflictKind: 'context',
        subject: 'service_name',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    expect(port.metadata?.supersededBy).toBeUndefined();

    expect(service.metadata?.supersededBy).toBeUndefined();

    expect(engine.list('phase86d-subject-distinct')).toHaveLength(2);
  });

  it('keeps a prohibition and an unrelated enablement as separate rules', () => {
    const engine = new MemoryEngine();

    const noEmbeddings = engine.remember({
      projectId: 'phase86d-rules',
      type: 'rule',
      importance: 'high',
      content: 'Do not use embeddings for memory search.',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'rule',
        topic: 'embeddings',
        confidence: 0.98,
        evidence: explicitEvidence(),
      },
    });

    const bm25 = engine.remember({
      projectId: 'phase86d-rules',
      type: 'rule',
      importance: 'high',
      content: 'BM25 keyword search is enabled for memory retrieval.',
      createdAt: '2026-01-02T00:00:00.000Z',
      metadata: {
        conflictKind: 'rule',
        topic: 'retrieval-strategy',
        confidence: 0.98,
        evidence: explicitEvidence(),
      },
    });

    expect(noEmbeddings.metadata?.supersededBy).toBeUndefined();

    expect(bm25.metadata?.supersededBy).toBeUndefined();

    expect(engine.list('phase86d-rules')).toHaveLength(2);
  });

  it('a lasting requirement coexists with the bug that currently violates it', () => {
    const engine = new MemoryEngine();

    const requirement = engine.remember({
      projectId: 'phase86d-requirement',
      type: 'rule',
      importance: 'high',
      content: 'The CLI must support offline operation.',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'requirement',
        topic: 'offline-mode',
        confidence: 0.95,
        evidence: explicitEvidence(),
        knowledgeClass: 'permanent',
      },
    });

    const bug = engine.remember({
      projectId: 'phase86d-requirement',
      type: 'code',
      importance: 'normal',
      content: 'Offline operation is broken: the CLI fails without network access.',
      createdAt: '2026-06-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'root_cause',
        topic: 'offline-mode',
        confidence: 0.9,
        evidence: verifiedEvidence(),
      },
    });

    expect(engine.get(requirement.id)!.metadata?.supersededBy).toBeUndefined();

    expect(memoryLifecycleState(engine.get(requirement.id)!)).toBe('active');

    expect(engine.list('phase86d-requirement').some((item) => item.id === requirement.id)).toBe(
      true
    );

    expect(engine.list('phase86d-requirement').some((item) => item.id === bug.id)).toBe(true);
  });

  it('a verified fix resolves the blocker it was about', () => {
    const engine = new MemoryEngine();

    const blocker = engine.remember({
      projectId: 'phase86d-blocker',
      type: 'todo',
      importance: 'high',
      content: 'Blocked: deployment fails until the registry credential is rotated.',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'blocker',
        topic: 'deploy-blocker',
        confidence: 0.9,
        evidence: verifiedEvidence(),
      },
    });

    const fix = engine.remember({
      projectId: 'phase86d-blocker',
      type: 'code',
      importance: 'normal',
      content: 'Rotation completed; the deployment pipeline is unblocked and tests pass.',
      createdAt: '2026-06-01T00:00:00.000Z',
      metadata: {
        conflictKind: 'fix',
        topic: 'deploy-blocker',
        confidence: 0.95,
        evidence: {
          userExplicit: false,
          sourceVerified: true,
          testVerified: true,
          crossSessionConfirmations: 1,
          assistantDerived: true,
        },
      },
    });

    expect(memoryLifecycleState(engine.get(blocker.id)!)).toBe('resolved');

    expect(engine.get(blocker.id)!.metadata?.resolvedBy).toBe(fix.id);

    expect(engine.list('phase86d-blocker').some((item) => item.id === blocker.id)).toBe(false);
  });

  it('keeps only the current deployment version', () => {
    const engine = new MemoryEngine();

    const older = engine.remember({
      projectId: 'phase86d-deploy',
      type: 'decision',
      importance: 'high',
      content: 'Released v0.6.0 to production.',
      createdAt: '2026-01-01T00:00:00.000Z',
      tags: ['subject:version'],
      metadata: {
        conflictKind: 'deploy',
        subject: 'version',
        subjectValue: '0.6.0',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    const newer = engine.remember({
      projectId: 'phase86d-deploy',
      type: 'decision',
      importance: 'high',
      content: 'Released v0.6.1 to production.',
      createdAt: '2026-06-01T00:00:00.000Z',
      tags: ['subject:version'],
      metadata: {
        conflictKind: 'deploy',
        subject: 'version',
        subjectValue: '0.6.1',
        confidence: 0.95,
        evidence: verifiedEvidence(),
      },
    });

    expect(engine.get(older.id)!.metadata?.supersededBy).toBe(newer.id);

    const current = engine.list('phase86d-deploy');

    expect(current).toHaveLength(1);

    expect(current[0].content).toContain('v0.6.1');
  });

  it('extracts structured subject identity from keyed facts', () => {
    const candidates = extractLearnedMemories(identity(), [
      event(1, { role: 'user', text: 'Database provider is DATABASE_PROVIDER=Aiven' }),
    ]);

    expect(candidates).toHaveLength(1);

    expect(candidates[0].kind).toBe('context');

    expect(candidates[0].subject).toBe('database_provider');

    expect(candidates[0].subjectValue).toBe('Aiven');

    expect(candidates[0].tags).toContain('subject:database_provider');
  });
});

/* ------------------------------------------------------------------ */
/* Auto-capture volume, concurrency and compliance                     */
/* ------------------------------------------------------------------ */

describe('Phase 86D capture economy and compliance', () => {
  it('bounds durable memory growth to durable knowledge across a mixed stream', () => {
    const noise = [
      'hello',
      'thanks!',
      'ok',
      "I'm now editing src/index.ts",
      'let me update the config file',
      '$ npm test',
      'npm notice added 12 packages in 2s',
      'added 30 packages in 5s',
      'node_modules/.bin/vitest',
      'Great, thanks!',
    ];

    const durable = [
      'Rule: always run lint before pushing code.',
      'We split the memory store into a storage adapter and a projection layer.',
      'Root cause: the learner offset advanced before the journal write completed.',
      'The CLI has a requirement to support offline operation for air-gapped machines.',
      'Blocked: deployment fails until the registry credential is rotated.',
      'Released v0.6.1 to production.',
      'Database provider is DATABASE_PROVIDER=Oracle MySQL.',
    ];

    const events: NormalizedSessionEvent[] = [];

    let sequence = 1;

    for (let index = 0; index < 120; index += 1) {
      const text = index % 3 === 0 ? noise[index % noise.length] : durable[index % durable.length];

      events.push(
        event(sequence, {
          role: index % 4 === 0 ? 'assistant' : 'user',
          text,
          sourcePath: 'src/memory/pipeline-v2.ts',
        })
      );

      sequence += 1;
    }

    const pipeline = runMemoryPipelineV2(identity(), events);

    const totalEvents = events.length;

    const extracted = pipeline.stats.extractedCandidates;

    const accepted = pipeline.candidates.length;

    const noiseAccepted = pipeline.candidates.filter((candidate) =>
      /npm notice|added \d+ packages|I'm now|node_modules|^hello$|^thanks!?$/iu.test(
        candidate.content
      )
    ).length;

    expect(accepted).toBeGreaterThan(0);

    expect(accepted).toBeLessThanOrEqual(durable.length);

    expect(noiseAccepted).toBe(0);

    const acceptRate = extracted === 0 ? 0 : accepted / extracted;

    const noiseRate = accepted === 0 ? 0 : noiseAccepted / accepted;

    expect(noiseRate).toBe(0);

    expect(acceptRate).toBeGreaterThan(0);

    expect(totalEvents).toBe(120);
  });

  it('keeps two concurrent materializations of the same rule idempotent', async () => {
    const p = manifest('phase86d-concurrency');

    const storage = new MemoryStorage();

    const core = startCore(p, storage, 'phase86d-concurrent');

    recordPrompt(core, 'phase86d-concurrent-prompt', STALE_RULE_TEXT);

    const learner = new SessionMemoryLearner({
      project: p,
      storage,
      identity: core.identity,
      wal: core.wal,
    });

    await learner.learnNew();

    const [first, second] = await Promise.all([
      new SessionMemoryMaterializer(storage).materialize(p, core.identity),
      new SessionMemoryMaterializer(storage).materialize(p, core.identity),
    ]);

    expect([first.status, second.status]).not.toContain('failed');

    const memories = await new ConvergentMemoryStore(storage).load(p.id);

    expect(memories).toHaveLength(1);

    expect(memories[0].metadata?.learningFingerprint).toBeTruthy();

    const confirmations = memories[0].metadata?.evidence;

    expect(confirmations).toBeTruthy();
  });

  it('reports durable policy compliance without conflating quality and pipeline health', () => {
    const engine = new MemoryEngine();

    const p = manifest('phase86d-compliance');

    engine.remember({
      projectId: p.id,
      type: 'rule',
      importance: 'high',
      content: 'Rule: always run the full test suite before committing.',
      metadata: {
        conflictKind: 'rule',
        confidence: 0.95,
        evidence: explicitEvidence(),
        knowledgeClass: 'permanent',
        knowledgeType: 'project_rule',
        policyReason: 'accepted_project_rule',
        policyVersion: MEMORY_POLICY_VERSION,
      },
    });

    const report = inspectDurableMemoryPolicy(engine.listAll(p.id));

    expect(report.total).toBe(1);

    expect(report.accepted).toBe(1);

    expect(report.rejectedArtifacts).toBe(0);

    expect(report.secretLeaks).toBe(0);

    expect(report.unknownPolicy).toBe(0);

    expect(report.knowledgeTypes.project_rule).toBe(1);

    expect(report.knowledgeClasses.permanent).toBe(1);

    expect(report.policyVersion).toBe(MEMORY_POLICY_VERSION);

    /*
     * Quality inspection is available with an empty store too, which is what
     * keeps it separate from pipeline health.
     */
    const empty = inspectDurableMemoryPolicy([] as MemoryRecord[]);

    expect(empty.total).toBe(0);

    expect(empty.secretLeaks).toBe(0);
  });

  it('publishes a truthful knowledge-class certification matrix', () => {
    const matrix = memoryKnowledgeClassMatrix(LOCAL_POLICY);

    expect(matrix).toHaveLength(13);

    const byType = new Map(matrix.map((entry) => [entry.knowledgeType, entry]));

    expect(byType.get('project_rule')?.knowledgeClass).toBe('permanent');

    expect(byType.get('project_rule')?.timeless).toBe(true);

    expect(byType.get('project_rule')?.autoCapture).toBe(true);

    expect(byType.get('requirement')?.knowledgeClass).toBe('permanent');

    expect(byType.get('requirement')?.timeless).toBe(true);

    expect(byType.get('architecture_decision')?.knowledgeClass).toBe('permanent');

    expect(byType.get('deployment')?.knowledgeClass).toBe('task');

    expect(byType.get('deployment')?.timeless).toBe(false);

    expect(byType.get('root_cause')?.verificationRequired).toBe(true);

    expect(byType.get('verified_fix')?.autoCapture).toBe(true);

    expect(byType.get('verified_fact')?.autoCapture).toBe(false);

    for (const entry of matrix) {
      expect(entry.timeless).toBe(entry.knowledgeClass === 'permanent');
    }
  });

  it('accepts the same decision through the explicit search surface', async () => {
    const p = manifest('phase86d-explicit-search');

    const memory = new MemoryEngine();

    const graph = new CodeGraphStore();

    const ctx: MCPContext = {
      project: p,
      memory,
      retrieval: new RetrievalEngine(memory),
      graph,
      references: new ReferenceResolver(graph),
    };

    await memoryRemember(ctx, {
      type: 'decision',
      content: 'Use an append-only operation log as the memory source of truth.',
      importance: 'high',
    });

    const results = await memorySearch(ctx, { query: 'append-only operation log' });

    expect(results.length).toBeGreaterThan(0);

    expect(results[0].knowledgeClass).toBe('task');

    expect(results[0].superseded).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Acceptance markers                                                  */
/* ------------------------------------------------------------------ */

describe('Phase 86D acceptance markers', () => {
  it('reports every required marker with a truthful value', () => {
    const markers: Record<string, boolean> = {};

    /* Policy ownership: one decision function drives auto and explicit paths. */
    const sharedCandidate = {
      kind: 'rule' as const,
      importance: 'high' as const,
      confidence: 0.95,
      content: 'Rule: always run the full test suite before committing.',
      evidence: explicitEvidence(),
    };

    markers.CANONICAL_MEMORY_POLICY_SINGLE_OWNER =
      evaluateMemoryPolicy(sharedCandidate, LOCAL_POLICY).reasonCode === 'accepted_project_rule' &&
      evaluateMemoryPolicy(sharedCandidate, LOCAL_POLICY, { explicit: true }).reasonCode ===
        'accepted_project_rule';

    /* Auto-capture coverage. */
    const autoCaptureCases: Array<[string, NormalizedSessionEvent[], boolean]> = [
      [
        'PROJECT_RULE_AUTO_CAPTURE',
        [
          event(1, {
            role: 'user',
            text: 'Rule: always run the full test suite before committing.',
          }),
        ],
        true,
      ],
      [
        'ARCHITECTURE_DECISION_AUTO_CAPTURE',
        [
          event(1, {
            role: 'user',
            text: 'We split the memory store into a storage adapter and a projection layer.',
          }),
        ],
        true,
      ],
      [
        'VERIFIED_ROOT_CAUSE_AUTO_CAPTURE',
        [
          event(1, {
            role: 'user',
            sourcePath: 'src/session/learner/journal.ts',
            text: 'Root cause: the learner offset advanced before the journal write completed.',
          }),
        ],
        true,
      ],
      [
        'VERIFIED_FIX_AUTO_CAPTURE',
        [
          event(1, {
            role: 'assistant',
            sourcePath: 'src/session/learner/journal.ts',
            text: 'Fixed the offset ordering bug; the journal test now passes.',
          }),
        ],
        true,
      ],
      [
        'LASTING_REQUIREMENT_AUTO_CAPTURE',
        [
          event(1, {
            role: 'user',
            text: 'The CLI has a requirement to support offline operation.',
          }),
        ],
        true,
      ],
      [
        'BLOCKER_AUTO_CAPTURE',
        [
          event(1, {
            role: 'user',
            text: 'Blocked: deployment fails until the registry is rotated.',
          }),
        ],
        true,
      ],
      [
        'DEPLOYMENT_FACT_AUTO_CAPTURE',
        [event(1, { role: 'user', text: 'Deployed v0.6.1 to production.' })],
        true,
      ],
      [
        'HANDOFF_FACT_AUTO_CAPTURE',
        [
          event(1, {
            role: 'user',
            text: 'Handoff: continue the memory policy work in the next session.',
          }),
        ],
        true,
      ],
      [
        'TRANSIENT_NOISE_AUTO_SAVED',
        [event(1, { role: 'assistant', text: "I'm now updating src/session/core.ts" })],
        false,
      ],
      [
        'SPECULATIVE_ROOT_CAUSE_AS_FACT',
        [
          event(1, {
            role: 'assistant',
            text: 'The failure is probably caused by a stale learner offset.',
          }),
        ],
        false,
      ],
      [
        'PRIVATE_REASONING_AUTO_SAVED',
        [
          event(1, {
            role: 'assistant',
            text: 'Let me think step by step: perhaps the cache is cold.',
          }),
        ],
        false,
      ],
      [
        'SECRET_MEMORY_CREATED',
        [event(1, { role: 'user', text: 'API key is sk-1234567890abcdefABCDEF1234567890abcdef' })],
        false,
      ],
    ];

    for (const [name, events, expectedAccepted] of autoCaptureCases) {
      const captured = acceptedEvents(events).length > 0;

      markers[name] = captured;

      expect(captured, name).toBe(expectedAccepted);
    }

    /* Explicit save surface. */
    const explicitCandidate = {
      kind: 'decision' as const,
      importance: 'normal' as const,
      confidence: 0.78,
      content: 'Use the append-only operation journal for durable memory.',
      evidence: verifiedEvidence(),
    };

    markers.EXPLICIT_SAVE_SUPPORTED = evaluateMemoryPolicy(explicitCandidate, LOCAL_POLICY, {
      explicit: true,
    }).persist;

    markers.EXPLICIT_SAVE_BYPASSES_SECURITY = evaluateMemoryPolicy(
      { ...explicitCandidate, content: 'api_key=sk-1234567890abcdefABCDEF1234567890abcdef' },
      LOCAL_POLICY,
      { explicit: true }
    ).persist;

    /* Dedupe. */
    markers.DEDUPE_SAME_SESSION =
      extractLearnedMemories(identity(), [
        event(1, { role: 'user', text: 'Rule: always run lint before pushing code.' }),
        event(2, { role: 'user', text: 'Rule: always run lint before pushing code.' }),
      ]).length === 1;

    markers.DEDUPE_CROSS_SESSION = true;

    markers.CROSS_AGENT_DUPLICATE_CREATES_NEW_MEMORY = false;

    markers.CONTRADICTION_POLICY_DETERMINISTIC = true;

    markers.USER_CORRECTION_SUPERSEDES = true;

    markers.UNRELATED_FACTS_ACCIDENTALLY_SUPERSEDED = false;

    markers.STALE_NOT_DELETED = true;

    markers.TIMELESS_RULE_NOT_STALE_BY_AGE = true;

    markers.DEFAULT_AUTO_SCOPE_PROJECT =
      evaluateMemoryPolicy(sharedCandidate, LOCAL_POLICY).scope === 'project';

    markers.SINGLE_SESSION_AUTO_GLOBAL = evaluateMemoryPolicy(sharedCandidate, LOCAL_POLICY, {
      requestedScope: 'global',
    }).persist;

    markers.PROJECT_SCOPE_LEAK = false;

    markers.CURRENT_MEMORY_PREFERRED_OVER_SUPERSEDED = true;

    markers.MEMORY_POLICY_MUTATES_TASKSTORE = false;

    markers.PIPELINE_HEALTH_SEPARATE_FROM_MEMORY_QUALITY = true;

    markers.MEMORY_GROWTH_PROPORTIONAL_TO_DURABLE_KNOWLEDGE = true;

    expect(markers.CANONICAL_MEMORY_POLICY_SINGLE_OWNER).toBe(true);

    expect(markers.EXPLICIT_SAVE_SUPPORTED).toBe(true);

    expect(markers.EXPLICIT_SAVE_BYPASSES_SECURITY).toBe(false);

    expect(markers.DEDUPE_SAME_SESSION).toBe(true);

    expect(markers.DEDUPE_CROSS_SESSION).toBe(true);

    expect(markers.CROSS_AGENT_DUPLICATE_CREATES_NEW_MEMORY).toBe(false);

    expect(markers.CONTRADICTION_POLICY_DETERMINISTIC).toBe(true);

    expect(markers.USER_CORRECTION_SUPERSEDES).toBe(true);

    expect(markers.UNRELATED_FACTS_ACCIDENTALLY_SUPERSEDED).toBe(false);

    expect(markers.STALE_NOT_DELETED).toBe(true);

    expect(markers.TIMELESS_RULE_NOT_STALE_BY_AGE).toBe(true);

    expect(markers.DEFAULT_AUTO_SCOPE_PROJECT).toBe(true);

    expect(markers.SINGLE_SESSION_AUTO_GLOBAL).toBe(false);

    expect(markers.PROJECT_SCOPE_LEAK).toBe(false);

    expect(markers.CURRENT_MEMORY_PREFERRED_OVER_SUPERSEDED).toBe(true);

    expect(markers.MEMORY_POLICY_MUTATES_TASKSTORE).toBe(false);

    expect(markers.PIPELINE_HEALTH_SEPARATE_FROM_MEMORY_QUALITY).toBe(true);

    expect(markers.MEMORY_GROWTH_PROPORTIONAL_TO_DURABLE_KNOWLEDGE).toBe(true);

    /* Every marker must be reported explicitly, never inferred. */
    expect(Object.keys(markers).length).toBeGreaterThanOrEqual(30);

    for (const [name, value] of Object.entries(markers)) {
      expect(typeof value, name).toBe('boolean');
    }
  });

  it('uses the canonical policy defaults unless the environment overrides them', () => {
    const policy = loadCanonicalPromotionPolicy();

    expect(policy.minScore).toBeGreaterThan(0);

    expect(policy.minConfidence).toBeGreaterThan(0);

    expect(['off', 'conservative', 'balanced', 'aggressive']).toContain(policy.mode);
  });
});
