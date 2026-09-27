/*
 * Phase 77 — shared work coordination.
 *
 * This is where "many clients, one expensive job" is enforced. No client ever
 * owns shared work exclusively once another session joins it.
 */

import { DAEMON_LIMITS } from './limits.js';

import {
  planEvidence,
  type EvidenceBundle,
  type EvidenceRequest,
} from '../code-intelligence/evidence/index.js';

import { structuralDigest } from '../code-intelligence/runtime-trace/index.js';

import type { RuntimeTraceImportResult } from '../code-intelligence/runtime-trace/types.js';

import type {
  RuntimeChangeInput,
  RuntimeContractInput,
  RuntimeTestRunInput,
  RuntimeTestSelectionInput,
  RuntimeTraceIngestInput,
} from '../code-intelligence/runtime/types.js';

import type { ChangeIntelligenceReport } from '../code-intelligence/change/types.js';

import type { ContractIntelligenceReport } from '../code-intelligence/contract/types.js';

import type {
  TestSelection,
  TestVerificationReport,
} from '../code-intelligence/test-intelligence/types.js';

import type { ProjectRegistry } from './registry.js';

import { SingleFlightRegistry, singleFlightKey, type SingleFlightJob } from './single-flight.js';

import type {
  DaemonDiagnosticCode,
  DaemonHydrateResult,
  DaemonIndexResult,
  DaemonProjectRef,
  DaemonProgressEvent,
  DaemonRuntimeDependencies,
} from './types.js';

/* ------------------------------------------------------------------ *
 * Indexing
 * ------------------------------------------------------------------ */

export interface IndexCoordinatorOptions {
  onEvent?: (job: SingleFlightJob, event: DaemonProgressEvent) => void;
}

export interface EnsureReadyResult {
  generation?: string;
  via: 'local' | 'hydrated' | 'indexed';
  jobId?: string;
}

/**
 * Single-flight index coordinator.
 *
 * The single-flight key includes the project's source identity as far as the
 * daemon knows it, so a new source generation never blindly attaches to an
 * in-flight job for the previous generation.
 */
export class IndexCoordinator {
  private readonly registry: SingleFlightRegistry;

  private lastResult = new Map<string, DaemonIndexResult>();

  constructor(
    private readonly deps: DaemonRuntimeDependencies,
    private readonly projects: ProjectRegistry,
    options: IndexCoordinatorOptions = {}
  ) {
    this.registry = new SingleFlightRegistry({
      onEvent: options.onEvent,
    });
  }

  get activeCount(): number {
    return this.registry.size;
  }

  list(): SingleFlightJob<unknown>[] {
    return this.registry.list();
  }

  get(jobId: string): SingleFlightJob<unknown> | undefined {
    return this.registry.get(jobId);
  }

  lastGeneration(projectId: string): string | undefined {
    return this.lastResult.get(projectId)?.generation;
  }

  start(
    project: DaemonProjectRef,
    sessionId: string,
    options: { sourceEpoch?: number } = {}
  ): { job: SingleFlightJob<DaemonIndexResult>; reused: boolean } {
    const key = singleFlightKey(['index', project.id, String(options.sourceEpoch ?? 0), 'v1']);

    const { job, reused } = this.registry.start<DaemonIndexResult>(
      key,
      async (signal, report) => {
        this.projects.setState(project.id, 'indexing', {}, Date.now());

        try {
          const result = await this.deps.indexProject(project, signal, (event) => {
            report(event);
          });

          /*
           * A cancelled job must never advertise a generation as current. The
           * runner checks the signal before committing; this is the last gate.
           */
          if (signal.aborted) {
            throw new Error('INDEX_CANCELLED');
          }

          this.lastResult.set(project.id, result);

          this.projects.setState(project.id, 'ready', {
            generation: result.generation,
            activeJobId: undefined,
          });

          return result;
        } catch (error) {
          if (signal.aborted) {
            this.projects.setState(project.id, 'failed', { activeJobId: undefined });
            this.projects.addDiagnostic(project.id, 'INDEX_CANCELLED');
          } else {
            this.projects.setState(project.id, 'failed', { activeJobId: undefined });
            this.projects.addDiagnostic(project.id, 'PROJECT_RUNTIME_FAILED');
          }

          throw error;
        }
      },
      { projectId: project.id, kind: 'index', cancelWhenEmpty: true }
    );

    this.registry.addSubscriber(job.id, sessionId);

    const record = this.projects.get(project.id);

    if (record) {
      record.activeJobId = job.id;
    }

    return { job, reused };
  }

  addSubscriber(jobId: string, sessionId: string): SingleFlightJob<unknown> | undefined {
    return this.registry.addSubscriber(jobId, sessionId);
  }

  removeSubscriber(jobId: string, sessionId: string): void {
    this.registry.removeSubscriber(jobId, sessionId, true);
  }

  cancel(jobId: string): boolean {
    return this.registry.cancel(jobId);
  }
}

/* ------------------------------------------------------------------ *
 * Artifact hydration
 * ------------------------------------------------------------------ */

export class ArtifactCoordinator {
  private readonly registry: SingleFlightRegistry;

  private readonly inFlight = new Map<string, SingleFlightJob<DaemonHydrateResult>>();

  constructor(
    private readonly deps: DaemonRuntimeDependencies,
    private readonly projects: ProjectRegistry,
    options: IndexCoordinatorOptions = {}
  ) {
    this.registry = new SingleFlightRegistry({ onEvent: options.onEvent });
  }

  get activeCount(): number {
    return this.registry.size;
  }

  list(): SingleFlightJob<unknown>[] {
    return this.registry.list();
  }

  get(jobId: string): SingleFlightJob<unknown> | undefined {
    return this.registry.get(jobId);
  }

  /**
   * Single-flight hydration keyed by project + runtime generation contract.
   *
   * Ten sessions attaching to an empty local graph with one valid artifact
   * cause exactly one download and one hydration; the parser is never invoked.
   */
  start(
    project: DaemonProjectRef,
    sessionId: string,
    generation = 'current'
  ): { job: SingleFlightJob<DaemonHydrateResult>; reused: boolean } {
    const key = singleFlightKey(['hydrate', project.id, generation]);

    const { job, reused } = this.registry.start<DaemonHydrateResult>(
      key,
      async (signal) => {
        this.projects.setState(project.id, 'hydrating', {}, Date.now());

        try {
          const result = await this.deps.hydrateProject(project, signal);

          if (signal.aborted) {
            throw new Error('ARTIFACT_HYDRATION_FAILED');
          }

          this.projects.setState(project.id, 'ready', { generation: result.generation });

          this.projects.markResident(project.id, true);

          return result;
        } catch (error) {
          this.projects.setState(project.id, 'failed');
          this.projects.addDiagnostic(project.id, 'ARTIFACT_HYDRATION_FAILED');
          throw error;
        }
      },
      { projectId: project.id, kind: 'hydrate', cancelWhenEmpty: true }
    );

    this.registry.addSubscriber(job.id, sessionId);

    this.inFlight.set(project.id, job);

    return { job, reused };
  }

  addSubscriber(jobId: string, sessionId: string): SingleFlightJob<unknown> | undefined {
    return this.registry.addSubscriber(jobId, sessionId);
  }

  removeSubscriber(jobId: string, sessionId: string): void {
    this.registry.removeSubscriber(jobId, sessionId, true);
  }

  cancel(jobId: string): boolean {
    return this.registry.cancel(jobId);
  }

  /** Jobs whose subscriber list became empty and were cancelled. */
  cancelEmpty(jobIds: readonly string[]): string[] {
    const cancelled: string[] = [];

    for (const jobId of jobIds) {
      if (this.registry.cancel(jobId)) {
        cancelled.push(jobId);
      }
    }

    return cancelled;
  }
}

/* ------------------------------------------------------------------ *
 * Fleet
 * ------------------------------------------------------------------ */

/**
 * Fleet relink coalescer.
 *
 * Many projects can update in a burst; the Fleet is relinked once per window,
 * never once per session or once per project.
 */
export class FleetCoordinator {
  private pending = new Set<string>();

  private timer?: NodeJS.Timeout;

  private running?: Promise<void>;

  relinkCount = 0;

  constructor(
    private readonly deps: DaemonRuntimeDependencies,
    private readonly debounceMs = 50
  ) {}

  /** Queue projects whose generation changed. */
  notify(projectIds: readonly string[]): void {
    for (const projectId of projectIds) {
      this.pending.add(projectId);
    }

    if (this.timer) {
      return;
    }

    this.timer = setTimeout(() => {
      delete this.timer;
      void this.flush();
    }, this.debounceMs);

    this.timer.unref?.();
  }

  /** Force a flush; awaits the coalesced relink. */
  async flush(): Promise<void> {
    if (this.running) {
      return this.running;
    }

    const batch = [...this.pending].sort();

    this.pending.clear();

    if (batch.length === 0) {
      return;
    }

    this.running = (async () => {
      this.relinkCount += 1;

      await this.deps.refreshFleet(batch);
    })();

    try {
      await this.running;
    } finally {
      delete this.running;
    }
  }

  close(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      delete this.timer;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Readiness / query runtime
 * ------------------------------------------------------------------ */

export class ProjectRuntimeCoordinator {
  /** Bounded in-daemon evidence cache, keyed by project + generation + plan. */
  private readonly evidenceCache = new Map<string, EvidenceBundle>();

  /** Concurrent identical audits resolve to one computation. */
  private readonly evidenceInFlight = new Map<string, Promise<EvidenceBundle>>();

  /** Concurrent identical trace imports resolve to one computation. */
  private readonly traceInFlight = new Map<string, Promise<RuntimeTraceImportResult>>();

  /** Bounded change report cache, keyed by project + generation + input digest. */
  private readonly changeCache = new Map<string, ChangeIntelligenceReport>();

  /** Concurrent identical change analyses resolve to one computation. */
  private readonly changeInFlight = new Map<string, Promise<ChangeIntelligenceReport>>();

  /** Bounded contract report cache, keyed by project + generation + input digest. */
  private readonly contractCache = new Map<string, ContractIntelligenceReport>();

  /** Concurrent identical contract analyses resolve to one computation. */
  private readonly contractInFlight = new Map<string, Promise<ContractIntelligenceReport>>();

  /** Concurrent identical test selections resolve to one computation. */
  private readonly testSelectionInFlight = new Map<string, Promise<TestSelection>>();

  /**
   * Concurrent identical explicit test runs resolve to one execution.
   * The key is the selection (which already pins the change fingerprint and
   * generation) plus the request digest, so D1 and D2 can never share a run.
   */
  private readonly testRunInFlight = new Map<string, Promise<TestVerificationReport>>();

  constructor(
    private readonly deps: DaemonRuntimeDependencies,
    private readonly projects: ProjectRegistry,
    private readonly index: IndexCoordinator,
    private readonly artifact: ArtifactCoordinator
  ) {}

  /**
   * Ensure a project's shared runtime is ready.
   *
   * Order is deliberate:
   *   1. existing local derived graph  -> use it
   *   2. compatible Phase 76 artifact  -> hydrate once
   *   3. otherwise                     -> index once
   */
  async ensureReady(project: DaemonProjectRef, sessionId: string): Promise<EnsureReadyResult> {
    if (!this.projects.get(project.id)) {
      this.projects.attach(project, sessionId, Date.now());
    }

    const record = this.projects.get(project.id);

    if (record?.state === 'ready' && record.generation) {
      this.projects.markResident(project.id, true);
      return { generation: record.generation, via: 'local' };
    }

    /* Shared work already in flight for this project wins. */
    const active = [...this.index.list(), ...this.artifact.list()].find(
      (job) => job.projectId === project.id && job.state === 'running'
    );

    if (active) {
      this.index.addSubscriber(active.id, sessionId);

      try {
        await active.promise;
      } catch {
        /* Fall through to a fresh attempt below. */
      }

      const settled = this.projects.get(project.id);

      if (settled?.state === 'ready' && settled.generation) {
        return { generation: settled.generation, via: 'local', jobId: active.id };
      }
    }

    const local = await this.deps.probeLocalGraph(project);

    if (local.present && local.generation) {
      this.projects.setState(project.id, 'ready', { generation: local.generation });

      this.projects.markResident(project.id, true);

      return { generation: local.generation, via: 'local' };
    }

    /* Try hydration first; it is the cheaper path and must be a no-op when no
     * compatible artifact exists. */
    try {
      const { job } = this.artifact.start(project, sessionId);

      const hydrated = await job.promise;

      return { generation: hydrated.generation, via: 'hydrated', jobId: job.id };
    } catch {
      /* Hydration unavailable/incompatible: fall back to a shared index. */
    }

    const { job } = this.index.start(project, sessionId);

    const indexed = await job.promise;

    return { generation: indexed.generation, via: 'indexed', jobId: job.id };
  }

  /**
   * Phase 78: run an evidence request against the shared runtime.
   *
   * Identical requests against the same generation are served from a bounded
   * in-daemon cache so ten agents asking the same audit question share one
   * computation. The cache key contains the project generation and the plan
   * fingerprint, so a source change or a different profile can never reuse a
   * stale result.
   */
  async evidence(
    project: DaemonProjectRef,
    sessionId: string,
    request: EvidenceRequest
  ): Promise<EvidenceBundle> {
    const readiness = await this.ensureReady(project, sessionId);

    const fingerprint = planEvidence(request).fingerprint;

    const key = `${project.id}:${readiness.generation ?? 'unknown'}:${fingerprint}`;

    const cached = this.evidenceCache.get(key);

    if (cached) {
      return cached;
    }

    const inFlight = this.evidenceInFlight.get(key);

    if (inFlight) {
      return inFlight;
    }

    const promise = this.deps
      .evidenceProject(project, request)
      .then((bundle) => {
        this.evidenceInFlight.delete(key);

        /* Only cache a result that matches the generation it was promised for. */
        if (bundle.generation.project === readiness.generation) {
          if (this.evidenceCache.size >= DAEMON_LIMITS.maxEvidenceCacheEntries) {
            const oldest = this.evidenceCache.keys().next().value;

            if (oldest !== undefined) {
              this.evidenceCache.delete(oldest);
            }
          }

          this.evidenceCache.set(key, bundle);
        }

        return bundle;
      })
      .catch((error: unknown) => {
        this.evidenceInFlight.delete(key);
        throw error;
      });

    this.evidenceInFlight.set(key, promise);

    return promise;
  }

  /**
   * Phase 79 — import a runtime trace session.
   *
   * Concurrent identical imports collapse into one computation. There is no
   * long-lived trace cache: the persistent trace store is already idempotent by
   * content-derived session id, so a later repeat import is a cheap no-op rather
   * than a second observation.
   */
  async ingestTraces(
    project: DaemonProjectRef,
    sessionId: string,
    input: RuntimeTraceIngestInput
  ): Promise<RuntimeTraceImportResult> {
    const ingest = this.deps.ingestTracesProject;

    if (!ingest) {
      throw new Error(
        'TRACE_INGEST_UNSUPPORTED: the shared runtime does not expose trace ingestion.'
      );
    }

    await this.ensureReady(project, sessionId);

    const fingerprint =
      input.input.sessionId ??
      `payload:${structuralDigest(input.input.trace ?? input.input.json ?? null, {
        maxDepth: 6,
        maxNodes: 50_000,
      })}`;

    const key = `${project.id}:${fingerprint}`;

    const inFlight = this.traceInFlight.get(key);

    if (inFlight) {
      return inFlight;
    }

    const promise = ingest(project, input).finally(() => {
      this.traceInFlight.delete(key);
    });

    this.traceInFlight.set(key, promise);

    return promise;
  }

  /**
   * Phase 80: run a change-intelligence analysis against the shared runtime.
   *
   * Concurrent identical analyses collapse into one computation. Only
   * content-addressed inputs (patch, commit, commit range) are cached; a live
   * working tree or index is never cached, so a mutable snapshot can never be
   * served as if it were current.
   */
  async change(
    project: DaemonProjectRef,
    sessionId: string,
    input: RuntimeChangeInput
  ): Promise<ChangeIntelligenceReport> {
    const run = this.deps.changeProject;

    if (!run) {
      throw new Error(
        'CHANGE_UNSUPPORTED: the shared runtime does not expose change intelligence.'
      );
    }

    const readiness = await this.ensureReady(project, sessionId);

    const digest = structuralDigest(input, { maxDepth: 8, maxNodes: 20_000 });

    const key = `${project.id}:${readiness.generation ?? 'unknown'}:${digest}`;

    const mode = input.request.mode;

    const cacheable = mode !== 'working_tree' && mode !== 'staged';

    if (cacheable) {
      const cached = this.changeCache.get(key);

      if (cached) {
        return cached;
      }
    }

    const inFlight = this.changeInFlight.get(key);

    if (inFlight) {
      return inFlight;
    }

    const promise = run(project, input)
      .then((report) => {
        this.changeInFlight.delete(key);

        /* Only cache a result that matches the generation it was promised for. */
        if (cacheable && report.generations.baseline === readiness.generation) {
          if (this.changeCache.size >= DAEMON_LIMITS.maxChangeCacheEntries) {
            const oldest = this.changeCache.keys().next().value;

            if (oldest !== undefined) {
              this.changeCache.delete(oldest);
            }
          }

          this.changeCache.set(key, report);
        }

        return report;
      })
      .catch((error: unknown) => {
        this.changeInFlight.delete(key);
        throw error;
      });

    this.changeInFlight.set(key, promise);

    return promise;
  }

  /**
   * Phase 81: run a contract-compatibility analysis against the shared runtime.
   *
   * Concurrent identical analyses collapse into one computation. Only
   * content-addressed inputs (patch, commit, commit range) are cached; a live
   * working tree or index is never cached, so a mutable snapshot can never be
   * served as if it were current.
   */
  async contract(
    project: DaemonProjectRef,
    sessionId: string,
    input: RuntimeContractInput
  ): Promise<ContractIntelligenceReport> {
    const run = this.deps.contractProject;

    if (!run) {
      throw new Error(
        'CONTRACT_UNSUPPORTED: the shared runtime does not expose contract intelligence.'
      );
    }

    const readiness = await this.ensureReady(project, sessionId);

    const digest = structuralDigest(input, { maxDepth: 10, maxNodes: 20_000 });

    const key = `${project.id}:${readiness.generation ?? 'unknown'}:${digest}`;

    const mode = input.change.mode;

    const cacheable = mode !== 'working_tree' && mode !== 'staged';

    if (cacheable) {
      const cached = this.contractCache.get(key);

      if (cached) {
        return cached;
      }
    }

    const inFlight = this.contractInFlight.get(key);

    if (inFlight) {
      return inFlight;
    }

    const promise = run(project, input)
      .then((report) => {
        this.contractInFlight.delete(key);

        if (cacheable && report.generations.baseline === readiness.generation) {
          if (this.contractCache.size >= DAEMON_LIMITS.maxChangeCacheEntries) {
            const oldest = this.contractCache.keys().next().value;

            if (oldest !== undefined) {
              this.contractCache.delete(oldest);
            }
          }

          this.contractCache.set(key, report);
        }

        return report;
      })
      .catch((error: unknown) => {
        this.contractInFlight.delete(key);
        throw error;
      });

    this.contractInFlight.set(key, promise);

    return promise;
  }

  /**
   * Phase 82: compute a deterministic change-to-test selection.
   *
   * Selection is read-only. Concurrent identical selections collapse into one
   * computation; a selection is never cached across generations, so a stale
   * selection cannot outlive the change it describes.
   */
  async testSelection(
    project: DaemonProjectRef,
    sessionId: string,
    input: RuntimeTestSelectionInput
  ): Promise<TestSelection> {
    const run = this.deps.selectTestsProject;

    if (!run) {
      throw new Error(
        'TEST_SELECTION_UNSUPPORTED: the shared runtime does not expose test selection.'
      );
    }

    const readiness = await this.ensureReady(project, sessionId);

    const digest = structuralDigest(input, { maxDepth: 8, maxNodes: 20_000 });

    const key = `${project.id}:${readiness.generation ?? 'unknown'}:${digest}`;

    const inFlight = this.testSelectionInFlight.get(key);

    if (inFlight) {
      return inFlight;
    }

    const promise = run(project, input).finally(() => {
      this.testSelectionInFlight.delete(key);
    });

    this.testSelectionInFlight.set(key, promise);

    return promise;
  }

  /**
   * Phase 82: explicitly execute a selection.
   *
   * Ten clients asking for the same selection under the same change run the
   * tests once; a different change fingerprint or selection never joins that
   * execution.
   */
  async runTests(
    project: DaemonProjectRef,
    sessionId: string,
    input: RuntimeTestRunInput
  ): Promise<TestVerificationReport> {
    const run = this.deps.runTestsProject;

    if (!run) {
      throw new Error('TEST_RUN_UNSUPPORTED: the shared runtime does not expose test execution.');
    }

    const readiness = await this.ensureReady(project, sessionId);

    const digest = structuralDigest(input, { maxDepth: 8, maxNodes: 20_000 });

    const key = `${project.id}:${readiness.generation ?? 'unknown'}:${digest}`;

    const inFlight = this.testRunInFlight.get(key);

    if (inFlight) {
      return inFlight;
    }

    const promise = run(project, input).finally(() => {
      this.testRunInFlight.delete(key);
    });

    this.testRunInFlight.set(key, promise);

    return promise;
  }

  /** Phase 82: bounded read-only status of derived test-run evidence. */
  async testStatus(project: DaemonProjectRef, sessionId: string, limit?: number): Promise<unknown> {
    const status = this.deps.testStatusProject;

    if (!status) {
      throw new Error('TEST_STATUS_UNSUPPORTED: the shared runtime does not expose test status.');
    }

    await this.ensureReady(project, sessionId);

    return status(project, limit);
  }

  /** Drop cached evidence for a project (used when its generation changes). */
  invalidateEvidence(projectId: string): void {
    for (const key of [...this.evidenceCache.keys()]) {
      if (key.startsWith(`${projectId}:`)) {
        this.evidenceCache.delete(key);
      }
    }

    for (const key of [...this.evidenceInFlight.keys()]) {
      if (key.startsWith(`${projectId}:`)) {
        this.evidenceInFlight.delete(key);
      }
    }

    for (const key of [...this.contractCache.keys()]) {
      if (key.startsWith(`${projectId}:`)) {
        this.contractCache.delete(key);
      }
    }

    for (const key of [...this.contractInFlight.keys()]) {
      if (key.startsWith(`${projectId}:`)) {
        this.contractInFlight.delete(key);
      }
    }

    /*
     * Test selections and runs are keyed by generation while in flight, but
     * they are cleared here too so a released/evicted project never leaves a
     * resident promise behind.
     */
    for (const key of [...this.testSelectionInFlight.keys()]) {
      if (key.startsWith(`${projectId}:`)) {
        this.testSelectionInFlight.delete(key);
      }
    }

    for (const key of [...this.testRunInFlight.keys()]) {
      if (key.startsWith(`${projectId}:`)) {
        this.testRunInFlight.delete(key);
      }
    }
  }

  /**
   * Query the shared runtime.
   *
   * Query generation and cursor safety remain Phase 74 semantics: a new index
   * changes the generation and therefore invalidates old cursors.
   */
  async query(
    project: DaemonProjectRef,
    sessionId: string,
    input: {
      query: string;
      scope?: 'project' | 'fleet';
      parameters?: Record<string, unknown>;
      limit?: number;
      cursor?: string;
      explain?: boolean;
    }
  ) {
    await this.ensureReady(project, sessionId);

    return this.deps.queryProject(project, {
      query: input.query,
      scope: input.scope ?? 'project',
      ...(input.parameters ? { parameters: input.parameters } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.cursor ? { cursor: input.cursor } : {}),
      ...(input.explain !== undefined ? { explain: input.explain } : {}),
    });
  }
}

export function buildDiagnostics(job: SingleFlightJob<unknown>): DaemonDiagnosticCode[] {
  const codes: DaemonDiagnosticCode[] = [];

  if (job.state === 'cancelled') {
    codes.push('INDEX_CANCELLED');
  }

  if (job.state === 'failed') {
    codes.push('PROJECT_RUNTIME_FAILED');
  }

  return codes;
}

export { DAEMON_LIMITS };
