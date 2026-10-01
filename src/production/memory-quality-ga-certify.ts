import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MemoryRecord, ProjectManifest } from '../core/types.js';
import { MemoryEngine } from '../core/memory-engine.js';
import { runMemoryPipelineV2 } from '../memory/pipeline-v2.js';
import {
  evaluateMemoryPolicy,
  MEMORY_POLICY_VERSION,
  memoryKnowledgeClassMatrix,
} from '../memory/promotion-policy.js';
import { inspectDurableMemoryPolicy } from '../memory/quality.js';
import { deriveMemoryFreshness } from '../memory/scope-freshness.js';
import { ConvergentMemoryStore } from '../multi-host/memory-projection.js';
import {
  reconcileJournalBatches,
  reconcileSessionMemoryJournal,
} from '../session/learner/journal.js';
import type { LearnedMemoryBatch, LearnedMemoryEvidence } from '../session/learner/types.js';
import type { NormalizedSessionEvent, SessionIdentity } from '../session/types.js';
import { MemoryStore } from '../storage/memory-store.js';
import type { StorageObject, StorageProvider } from '../storage/types.js';
import { currentTaskArtifactLines } from '../tasks/artifact-evidence.js';
import { taskOperationLogPath } from '../tasks/operation-log.js';
import { TaskReplicationService } from '../tasks/replication/service.js';
import { TaskStateEngine } from '../tasks/state-engine.js';
import { TaskStore, taskProjectionPath } from '../tasks/store.js';
import {
  buildCurrentWorkProjection,
  refreshCurrentWorkProjection,
} from '../work-continuity/current-work-projection.js';
import type { WorkState } from '../work-continuity/types.js';

const DAY_MS = 86_400_000;

export interface MemoryQualityGACheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface MemoryQualityGACertification {
  passed: boolean;
  total: number;
  passedCount: number;
  checks: MemoryQualityGACheck[];
}

class MemoryStorage implements StorageProvider {
  readonly name = 'phase58-memory';
  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array, _contentType?: string): Promise<void> {
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
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => ({ key, size: value.byteLength }));
  }

  snapshot(): string {
    return JSON.stringify(
      [...this.objects.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, Buffer.from(value).toString('base64')])
    );
  }
}

function project(rootPath: string, id: string): ProjectManifest {
  mkdirSync(join(rootPath, '.toolnet'), { recursive: true, mode: 0o700 });
  return {
    id,
    name: id,
    rootPath,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

function fallbackState(manifest: ProjectManifest, text = 'STALE SESSION WORK'): WorkState {
  return {
    version: 1,
    projectId: manifest.id,
    projectName: manifest.name,
    currentRequest: text,
    phases: [],
    tasks: [],
    decisions: [],
    blockers: [`${text} BLOCKER`],
    warnings: [],
    nextActions: [`${text} NEXT`],
    filesTouched: ['old-session-file.ts'],
    tests: [],
    progress: {
      phasesTotal: 0,
      phasesCompleted: 0,
      tasksTotal: 0,
      tasksCompleted: 0,
      blocked: 0,
    },
    updatedAt: '2026-09-07T00:00:00.000Z',
  };
}

function legacyMemory(projectId: string): MemoryRecord {
  /*
   * Deliberately pre-Phase-53:
   * no top-level scope / observedAt / verifiedAt / confidence / staleAfter.
   */
  return {
    id: 'legacy-rule',
    projectId,
    type: 'rule',
    content: 'Production deploys require verification.',
    importance: 'high',
    importanceScore: 95,
    tags: ['production'],
    source: 'legacy-memory',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    metadata: {
      learningKind: 'rule',
      confidence: 0.97,
      sourceCreatedAt: '2026-08-01T00:00:00.000Z',
      evidence: {
        userExplicit: true,
      },
      knowledgeClass: 'permanent',
    },
  };
}

function newerMemory(projectId: string, content: string, updatedAt: string): MemoryRecord {
  return {
    id: 'cross-host-memory',
    projectId,
    type: 'decision',
    content,
    scope: 'decision',
    observedAt: updatedAt,
    verifiedAt: updatedAt,
    confidence: 0.98,
    importance: 'high',
    importanceScore: 95,
    tags: ['cross-host'],
    source: 'phase58',
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt,
    metadata: {
      memoryScope: 'decision',
      knowledgeClass: 'task',
      confidence: 0.98,
      observedAt: updatedAt,
      verifiedAt: updatedAt,
    },
  };
}

async function check(
  id: string,
  label: string,
  operation: () => boolean | Promise<boolean>
): Promise<MemoryQualityGACheck> {
  try {
    const passed = await operation();
    return {
      id,
      label,
      passed,
      ...(passed ? {} : { detail: 'Certification condition returned false.' }),
    };
  } catch (error) {
    return {
      id,
      label,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function certifyLegacyMigration(): Promise<boolean> {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase58-migration-'));
  try {
    const manifest = project(root, 'phase58-memory-migration');
    const storage = new MemoryStorage();
    const legacy = legacyMemory(manifest.id);
    await new MemoryStore(storage).save(manifest.id, [legacy]);
    const originalContent = legacy.content;
    await reconcileSessionMemoryJournal(manifest, storage);
    const convergent = new ConvergentMemoryStore(storage, {
      hostId: 'phase58-migration-host',
    });
    const after = await convergent.load(manifest.id);
    const migrated = after.find((memory) => memory.id === legacy.id);
    if (!migrated) {
      return false;
    }
    /*
     * Migration is additive only.
     * User Memory content must survive byte-for-byte.
     */
    if (migrated.content !== originalContent) {
      return false;
    }
    if (
      migrated.scope !== 'rule' ||
      migrated.confidence !== 0.97 ||
      !migrated.observedAt ||
      !migrated.verifiedAt
    ) {
      return false;
    }
    if (deriveMemoryFreshness(migrated, Date.parse('2026-09-08T00:00:00.000Z')) !== 'fresh') {
      return false;
    }
    /*
     * First reconcile may append immutable migration
     * operations. Capture storage AFTER migration.
     */
    const first = storage.snapshot();
    /*
     * Re-run migration/reconcile.
     *
     * No additional writes are allowed when canonical
     * Memory already has the new schema.
     */
    await reconcileSessionMemoryJournal(manifest, storage);
    const second = storage.snapshot();
    return first === second;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function certifyTaskProjectionRecovery(): Promise<boolean> {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase58-task-rebuild-'));
  try {
    const manifest = project(root, 'phase58-task-rebuild');
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'rebuild-task',
      kind: 'task',
      title: 'Recover Task projection',
      priority: 'high',
    });
    await state.start(task.id);
    await state.setNextAction(task.id, 'Continue after restart');
    /*
     * Simulate two crash windows:
     *
     * 1. derived state.json is corrupt
     * 2. immutable operation log contains an
     *    unterminated partial tail
     */
    writeFileSync(taskProjectionPath(manifest), '{ corrupt derived projection', 'utf8');
    appendFileSync(taskOperationLogPath(manifest), '{"partial-crash-tail":', 'utf8');
    const rebuilt = new TaskStore(manifest).rebuildProjection();
    const recovered = rebuilt.tasks[task.id];
    if (
      !recovered ||
      recovered.status !== 'active' ||
      recovered.nextAction !== 'Continue after restart'
    ) {
      return false;
    }
    const log = readFileSync(taskOperationLogPath(manifest), 'utf8');
    return log.endsWith('\n') && !log.includes('partial-crash-tail');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function certifyCurrentWorkRestart(): Promise<boolean> {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase58-current-work-'));
  try {
    const manifest = project(root, 'phase58-current-work');
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'current-task',
      kind: 'task',
      title: 'Canonical current work after restart',
      priority: 'high',
    });
    await state.start(task.id);
    await state.setNextAction(task.id, 'Run final verification');
    await state.touchFile(task.id, 'src/production/final.ts');
    const currentFile = join(root, '.toolnet', 'current.md');
    /*
     * Simulate an old managed projection left behind
     * by a previous version/session.
     */
    writeFileSync(
      currentFile,
      [
        '# Manual note',
        '',
        '<!-- TOOLNET:STABLE-WORK:BEGIN -->',
        'STALE SESSION TASK',
        'STALE SESSION BLOCKER',
        '<!-- TOOLNET:STABLE-WORK:END -->',
        '',
      ].join('\n'),
      'utf8'
    );
    const now = Date.now();
    const firstProjection = refreshCurrentWorkProjection(manifest, {
      agentId: 'phase58',
      now,
    });
    const firstContent = readFileSync(currentFile, 'utf8');
    /*
     * Simulate process restart:
     * rebuild from durable Tasks again.
     */
    const secondProjection = refreshCurrentWorkProjection(manifest, {
      agentId: 'phase58',
      now,
    });
    const secondContent = readFileSync(currentFile, 'utf8');
    return (
      firstProjection.source === 'persistent-task' &&
      secondProjection.source === 'persistent-task' &&
      firstProjection.task?.id === task.id &&
      secondProjection.task?.id === task.id &&
      JSON.stringify(firstProjection) === JSON.stringify(secondProjection) &&
      firstContent === secondContent &&
      firstContent.includes('Canonical current work after restart') &&
      firstContent.includes('Run final verification') &&
      firstContent.includes('src/production/final.ts') &&
      !firstContent.includes('STALE SESSION TASK') &&
      !firstContent.includes('STALE SESSION BLOCKER')
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function certifyStaleHistorySuppression(): Promise<boolean> {
  const completedRoot = mkdtempSync(join(tmpdir(), 'toolnet-phase58-completed-'));
  const staleRoot = mkdtempSync(join(tmpdir(), 'toolnet-phase58-stale-'));
  try {
    const completedProject = project(completedRoot, 'phase58-completed');
    const completedStore = new TaskStore(completedProject);
    const completedState = new TaskStateEngine(completedStore);
    const completed = await completedStore.createTask({
      id: 'finished',
      kind: 'task',
      title: 'Completed canonical Task',
      priority: 'normal',
    });
    /*
     * Complete through the canonical lifecycle engine: the Task must be
     * started before it can pass the completion guard.
     */
    await completedState.start(completed.id);
    await completedState.complete(completed.id);
    const completedProjection = buildCurrentWorkProjection(completedProject, {
      fallback: fallbackState(completedProject),
      now: Date.now(),
    });
    if (
      completedProjection.source !== 'empty' ||
      completedProjection.authority !== 'persistent-tasks' ||
      completedProjection.task
    ) {
      return false;
    }
    const staleProject = project(staleRoot, 'phase58-stale');
    const staleStore = new TaskStore(staleProject);
    await staleStore.createTask({
      id: 'old-pending',
      kind: 'task',
      title: 'Old pending Task',
      priority: 'critical',
    });
    /*
     * Advance projection clock beyond the
     * Phase-56 30-day current-work window.
     */
    const future = Date.now() + 31 * DAY_MS;
    const staleProjection = buildCurrentWorkProjection(staleProject, {
      fallback: fallbackState(staleProject, 'STALE FALLBACK'),
      now: future,
    });
    return (
      staleProjection.source === 'empty' &&
      staleProjection.authority === 'persistent-tasks' &&
      !staleProjection.task &&
      staleProjection.remaining.length === 0 &&
      staleProjection.blockers.length === 0
    );
  } finally {
    rmSync(completedRoot, { recursive: true, force: true });
    rmSync(staleRoot, { recursive: true, force: true });
  }
}

async function certifyArtifactLifecycle(): Promise<boolean> {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase58-artifacts-'));
  try {
    const manifest = project(root, 'phase58-artifacts');
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'artifact-lifecycle',
      kind: 'task',
      title: 'Production deploy lifecycle',
      priority: 'high',
    });
    await state.start(task.id);
    const executed = await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production deploy',
      artifact: {
        key: 'production-deploy',
        type: 'deploy',
        state: 'executed',
        command: 'npm run deploy',
        exitCode: 0,
      },
    });
    const executedLines = currentTaskArtifactLines(executed.evidence, 8);
    if (
      executedLines.length !== 1 ||
      !executedLines[0]?.includes('[executed] deploy') ||
      executedLines[0]?.includes('[verified]')
    ) {
      return false;
    }
    const verified = await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production deploy',
      ref: 'https://example.test/health',
      artifact: {
        key: 'production-deploy',
        type: 'deploy',
        state: 'verified',
        command: 'curl -fsS https://example.test/health',
        exitCode: 0,
      },
    });
    const verifiedLines = currentTaskArtifactLines(verified.evidence, 8);
    const artifactRecords = verified.evidence.filter(
      (item) => item.kind === 'artifact' && item.artifact?.key === 'production-deploy'
    );
    return (
      verifiedLines.length === 1 &&
      Boolean(verifiedLines[0]?.includes('[verified] deploy')) &&
      artifactRecords.length === 2 &&
      artifactRecords[0]?.artifact?.state === 'executed' &&
      artifactRecords[1]?.artifact?.state === 'verified'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function certifyTaskConvergence(): Promise<boolean> {
  const rootA = mkdtempSync(join(tmpdir(), 'toolnet-phase58-host-a-'));
  const rootB = mkdtempSync(join(tmpdir(), 'toolnet-phase58-host-b-'));
  const previousHost = process.env.TOOLNET_HOST_ID;
  try {
    const id = 'phase58-cross-host-task';
    const projectA = project(rootA, id);
    const projectB = project(rootB, id);
    const storage = new MemoryStorage();
    process.env.TOOLNET_HOST_ID = 'phase58-host-a';
    const storeA = new TaskStore(projectA);
    const task = await storeA.createTask({
      id: 'shared-task',
      kind: 'task',
      title: 'Cross-host shared Task',
      priority: 'high',
    });
    const replicationA = new TaskReplicationService(projectA, storage, {
      hostId: 'phase58-host-a',
    });
    const pushA = await replicationA.push();
    if (pushA.pushedOperations < 1) {
      return false;
    }
    process.env.TOOLNET_HOST_ID = 'phase58-host-b';
    const replicationB = new TaskReplicationService(projectB, storage, {
      hostId: 'phase58-host-b',
    });
    const pullB = await replicationB.pull();
    if (pullB.pulledOperations < 1) {
      return false;
    }
    if (replicationA.projectionHash() !== replicationB.projectionHash()) {
      return false;
    }
    /*
     * Host B continues the Task it received
     * from Host A.
     */
    const storeB = new TaskStore(projectB);
    const stateB = new TaskStateEngine(storeB);
    await stateB.start(task.id);
    await stateB.setNextAction(task.id, 'Continue on host B');
    const pushB = await replicationB.push();
    if (pushB.pushedOperations < 1) {
      return false;
    }
    process.env.TOOLNET_HOST_ID = 'phase58-host-a';
    const pullA = await replicationA.pull();
    if (pullA.pulledOperations < 1) {
      return false;
    }
    const taskA = new TaskStore(projectA).getTask(task.id);
    const taskB = new TaskStore(projectB).getTask(task.id);
    return (
      replicationA.projectionHash() === replicationB.projectionHash() &&
      replicationA.converged().conflicts.length === 0 &&
      replicationB.converged().conflicts.length === 0 &&
      taskA?.status === 'active' &&
      taskB?.status === 'active' &&
      taskA?.nextAction === 'Continue on host B' &&
      taskB?.nextAction === 'Continue on host B'
    );
  } finally {
    if (previousHost === undefined) {
      delete process.env.TOOLNET_HOST_ID;
    } else {
      process.env.TOOLNET_HOST_ID = previousHost;
    }
    rmSync(rootA, { recursive: true, force: true });
    rmSync(rootB, { recursive: true, force: true });
  }
}

async function certifyMemoryConvergence(): Promise<boolean> {
  const storage = new MemoryStorage();
  const projectId = 'phase58-cross-host-memory';
  const hostA = new ConvergentMemoryStore(storage, {
    hostId: 'phase58-memory-a',
  });
  const hostB = new ConvergentMemoryStore(storage, {
    hostId: 'phase58-memory-b',
  });
  await hostA.save(projectId, [
    newerMemory(projectId, 'Decision from host A', '2026-09-08T00:00:00.000Z'),
  ]);
  await hostB.save(projectId, [
    newerMemory(projectId, 'Newer decision from host B', '2026-09-08T00:10:00.000Z'),
  ]);
  const projectionA = await hostA.load(projectId);
  const projectionB = await hostB.load(projectId);
  const memoryA = projectionA.find((item) => item.id === 'cross-host-memory');
  const memoryB = projectionB.find((item) => item.id === 'cross-host-memory');
  return (
    memoryA?.content === 'Newer decision from host B' &&
    memoryB?.content === 'Newer decision from host B' &&
    JSON.stringify(projectionA) === JSON.stringify(projectionB)
  );
}

function candidateBatch(input: {
  agent: string;
  sessionId: string;
  projectId: string;
  text: string;
}): LearnedMemoryBatch {
  const identity: SessionIdentity = {
    projectId: input.projectId,
    projectName: 'phase86d-policy',
    projectRoot: '/tmp/phase86d-policy',
    agent: input.agent,
    nativeSessionId: input.sessionId,
    sessionKey: `${input.agent}:${input.sessionId}`,
    remotePrefix: `projects/phase86d-policy/sessions/${input.agent}/${input.sessionId}`,
    localDirectory: '/tmp/phase86d-policy/.session',
  };
  const events: NormalizedSessionEvent[] = [
    {
      version: 1,
      id: `event-${input.sessionId}`,
      sequence: 1,
      projectId: input.projectId,
      agent: input.agent,
      nativeSessionId: input.sessionId,
      type: 'message',
      timestamp: '2026-10-01T00:00:00.000Z',
      role: 'user',
      data: { text: input.text },
      provenance: { source: input.agent },
    },
  ];
  const pipeline = runMemoryPipelineV2(identity, events);
  return {
    version: 1,
    projectId: input.projectId,
    agent: input.agent,
    nativeSessionId: input.sessionId,
    sessionKey: identity.sessionKey,
    createdAt: '2026-10-01T00:00:00.000Z',
    firstSequence: 1,
    lastSequence: 1,
    candidateCount: pipeline.candidates.length,
    candidates: pipeline.candidates,
  };
}

function verifiedEvidence(): LearnedMemoryEvidence {
  return {
    userExplicit: false,
    sourceVerified: true,
    testVerified: false,
    crossSessionConfirmations: 1,
    assistantDerived: false,
  };
}

/**
 * Phase 86D: durable memory quality policy certification.
 *
 * Proves that exactly one policy decides what ToolNet remembers, that noise and
 * secrets never become durable memory, and that contradiction, staleness and
 * cross-agent dedupe behave deterministically.
 */
async function certifyDurableMemoryPolicy(): Promise<boolean> {
  const sharedCandidate = {
    kind: 'rule' as const,
    importance: 'high' as const,
    confidence: 0.95,
    content: 'Rule: always run the full test suite before committing.',
    evidence: { ...verifiedEvidence(), userExplicit: true },
  };
  /*
   * One canonical owner: auto and explicit paths reach the same verdict, and a
   * single session can never promote global memory.
   */
  const automatic = evaluateMemoryPolicy(sharedCandidate);
  const explicit = evaluateMemoryPolicy(sharedCandidate, undefined, { explicit: true });
  if (automatic.reasonCode !== 'accepted_project_rule' || !automatic.persist) {
    return false;
  }
  if (explicit.reasonCode !== automatic.reasonCode) {
    return false;
  }
  if (evaluateMemoryPolicy(sharedCandidate, undefined, { requestedScope: 'global' }).persist) {
    return false;
  }
  /*
   * Explicit save bypasses the auto threshold but never secret safety.
   */
  const secret = evaluateMemoryPolicy(
    { ...sharedCandidate, content: 'api_key=sk-1234567890abcdefABCDEF1234567890abcdef' },
    undefined,
    { explicit: true }
  );
  if (secret.persist || secret.reasonCode !== 'rejected_secret') {
    return false;
  }
  /*
   * Knowledge-class matrix is derived, never hand-held.
   */
  const matrix = memoryKnowledgeClassMatrix();
  if (matrix.length !== 13) {
    return false;
  }
  if (!matrix.every((entry) => entry.timeless === (entry.knowledgeClass === 'permanent'))) {
    return false;
  }
  const projectRule = matrix.find((entry) => entry.knowledgeType === 'project_rule');
  const deployment = matrix.find((entry) => entry.knowledgeType === 'deployment');
  const requirement = matrix.find((entry) => entry.knowledgeType === 'requirement');
  if (projectRule?.knowledgeClass !== 'permanent' || deployment?.knowledgeClass !== 'task') {
    return false;
  }
  if (requirement?.knowledgeClass !== 'permanent' || !requirement.timeless) {
    return false;
  }
  if (deployment.timeless) {
    return false;
  }
  /*
   * Structured contradiction: the latest value wins, unrelated subjects stay.
   */
  const engine = new MemoryEngine();
  const projectId = 'phase86d-certify-policy';
  const evidence = verifiedEvidence();
  const older = engine.remember({
    projectId,
    type: 'decision',
    importance: 'high',
    content: 'Database provider is DATABASE_PROVIDER=Aiven.',
    createdAt: '2026-01-01T00:00:00.000Z',
    tags: ['subject:database_provider'],
    metadata: { conflictKind: 'context', subject: 'database_provider', confidence: 0.95, evidence },
  });
  const newer = engine.remember({
    projectId,
    type: 'decision',
    importance: 'high',
    content: 'Database provider is DATABASE_PROVIDER=Oracle MySQL.',
    createdAt: '2026-06-01T00:00:00.000Z',
    tags: ['subject:database_provider'],
    metadata: { conflictKind: 'context', subject: 'database_provider', confidence: 0.95, evidence },
  });
  if (engine.get(older.id)?.metadata?.supersededBy !== newer.id) {
    return false;
  }
  if (engine.list(projectId).length !== 1) {
    return false;
  }
  const port = engine.remember({
    projectId,
    type: 'decision',
    importance: 'high',
    content: 'Service port is PORT=9090.',
    createdAt: '2026-01-01T00:00:00.000Z',
    tags: ['subject:port'],
    metadata: { conflictKind: 'context', subject: 'port', confidence: 0.95, evidence },
  });
  const service = engine.remember({
    projectId,
    type: 'decision',
    importance: 'high',
    content: 'Service name is SERVICE_NAME=auth-service.',
    createdAt: '2026-01-01T00:00:00.000Z',
    tags: ['subject:service_name'],
    metadata: { conflictKind: 'context', subject: 'service_name', confidence: 0.95, evidence },
  });
  if (port.metadata?.supersededBy || service.metadata?.supersededBy) {
    return false;
  }
  if (engine.list(projectId).length !== 3) {
    return false;
  }
  /*
   * A lasting requirement coexists with the bug that currently violates it.
   */
  const lasting = engine.remember({
    projectId,
    type: 'rule',
    importance: 'high',
    content: 'The CLI has a requirement to support offline operation.',
    createdAt: '2026-01-01T00:00:00.000Z',
    metadata: {
      conflictKind: 'requirement',
      topic: 'offline-mode',
      confidence: 0.95,
      evidence: { ...evidence, userExplicit: true },
      knowledgeClass: 'permanent',
    },
  });
  engine.remember({
    projectId,
    type: 'code',
    importance: 'normal',
    content: 'Offline operation is broken: the CLI fails without network access.',
    createdAt: '2026-06-01T00:00:00.000Z',
    metadata: { conflictKind: 'root_cause', topic: 'offline-mode', confidence: 0.9, evidence },
  });
  if (engine.get(lasting.id)?.metadata?.supersededBy) {
    return false;
  }
  /*
   * Timeless rules never go stale; temporal deployment facts do but survive.
   */
  const timeless = engine.remember({
    projectId,
    type: 'rule',
    importance: 'critical',
    content: 'Never commit directly to the main branch.',
    createdAt: '2019-01-01T00:00:00.000Z',
    metadata: {
      conflictKind: 'rule',
      confidence: 0.98,
      evidence: { ...evidence, userExplicit: true },
      knowledgeClass: 'permanent',
    },
  });
  if (timeless.staleAfter !== undefined) {
    return false;
  }
  if (deriveMemoryFreshness(timeless, Date.parse('2026-10-01T00:00:00.000Z')) !== 'fresh') {
    return false;
  }
  const deploymentFact = engine.remember({
    projectId,
    type: 'decision',
    importance: 'high',
    content: 'Released v0.6.0 to production.',
    createdAt: '2026-01-01T00:00:00.000Z',
    metadata: {
      conflictKind: 'deploy',
      confidence: 0.95,
      evidence,
      knowledgeClass: 'task',
      staleAfter: '2026-02-01T00:00:00.000Z',
    },
  });
  if (deriveMemoryFreshness(deploymentFact, Date.parse('2026-03-01T00:00:00.000Z')) !== 'stale') {
    return false;
  }
  if (!engine.get(deploymentFact.id)) {
    return false;
  }
  /*
   * Cross-agent duplicate produces one memory with three confirmations, and the
   * stored projection contains no secret and no rejected candidate.
   */
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase86d-policy-'));
  try {
    const manifest = project(root, 'phase86d-certify-dedupe');
    const storage = new MemoryStorage();
    const text = 'Rule: always run the full test suite before committing.';
    const sessions: Array<[string, string]> = [
      ['codex', 'sess-a'],
      ['opencode', 'sess-b'],
      ['agy', 'sess-c'],
    ];
    const batches = sessions.map(([agent, sessionId]) =>
      candidateBatch({ agent, sessionId, projectId: manifest.id, text })
    );
    const result = await reconcileJournalBatches(manifest, storage, batches);
    if (result.added !== 1 || result.duplicates !== 2 || result.memories !== 1) {
      return false;
    }
    const memories = await new ConvergentMemoryStore(storage).load(manifest.id);
    if (memories.length !== 1) {
      return false;
    }
    const confirming = memories[0].metadata?.confirmingSessionKeys;
    if (!Array.isArray(confirming) || confirming.length !== 3) {
      return false;
    }
    const compliance = inspectDurableMemoryPolicy(memories);
    if (compliance.secretLeaks !== 0 || compliance.rejectedArtifacts !== 0) {
      return false;
    }
    if (compliance.policyVersion !== MEMORY_POLICY_VERSION) {
      return false;
    }
    if (compliance.accepted !== 1) {
      return false;
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  return true;
}

export async function certifyMemoryQualityGA(): Promise<MemoryQualityGACertification> {
  const checks: MemoryQualityGACheck[] = [];
  checks.push(
    await check(
      'legacy-memory-migration',
      'legacy Memory migration is nondestructive and idempotent',
      certifyLegacyMigration
    )
  );
  checks.push(
    await check(
      'task-projection-self-healing',
      'Task projection recovers from corrupt cache and partial operation tail',
      certifyTaskProjectionRecovery
    )
  );
  checks.push(
    await check(
      'current-work-restart',
      'Current Work projection rebuilds deterministically after restart',
      certifyCurrentWorkRestart
    )
  );
  checks.push(
    await check(
      'stale-history-suppression',
      'completed and stale Tasks cannot resurrect session history',
      certifyStaleHistorySuppression
    )
  );
  checks.push(
    await check(
      'artifact-lifecycle',
      'artifact executed and verified states remain distinct',
      certifyArtifactLifecycle
    )
  );
  checks.push(
    await check(
      'task-cross-host-convergence',
      'Persistent Tasks converge across hosts',
      certifyTaskConvergence
    )
  );
  checks.push(
    await check(
      'memory-cross-host-convergence',
      'canonical Memory converges across hosts',
      certifyMemoryConvergence
    )
  );
  checks.push(
    await check(
      'durable-memory-policy',
      'one durable memory policy governs capture, contradiction, staleness and dedupe',
      certifyDurableMemoryPolicy
    )
  );
  const passedCount = checks.filter((item) => item.passed).length;
  return {
    passed: passedCount === checks.length,
    total: checks.length,
    passedCount,
    checks,
  };
}
