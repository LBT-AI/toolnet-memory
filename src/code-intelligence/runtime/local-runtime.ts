/*
 * Phase 77 — in-process CodeIntelligenceRuntime fallback.
 *
 * Used only when no compatible daemon is available. It provides identical
 * semantics (same generation, coverage and query contract); it simply does not
 * share work with other processes.
 */

import type { ProjectManifest } from '../../core/types.js';

import { PersistentCodeGraphStore } from '../../storage/index.js';

import { PersistentCrossServiceStore } from '../../storage/cross-service-store.js';

import { PersistentGraphCoverageStore } from '../../storage/graph-coverage-store.js';

import type { StorageProvider } from '../../storage/types.js';

import { GraphCoverageEvaluator } from '../graph-coverage/coverage-evaluator.js';

import { PersistentFleetStore } from '../fleet/fleet-store.js';

import {
  buildProjectEvidenceFacts,
  executeEvidence,
  planEvidence,
  type EvidenceBundle,
  type EvidenceRequest,
} from '../evidence/index.js';

import { runProductionIndex } from '../../production/index-pipeline.js';

import { readChangeInput, runChangeAnalysis } from '../change/index.js';

import { buildProjectChangeFacts } from '../change/project-facts.js';

import type { ChangeIntelligenceReport } from '../change/types.js';

import { analyzeContracts } from '../contract/index.js';

import { buildProjectContractFacts } from '../contract/project-facts.js';

import type { ContractIntelligenceReport } from '../contract/types.js';

import {
  buildReleaseFacts,
  REQUIRED_RELEASE_PHASES,
  resolveReleaseLimits,
  runReleaseAnalysis,
} from '../release/index.js';

import type { ReleaseAnalysisInput, ReleaseReadinessReport } from '../release/types.js';

import {
  AdrStore,
  ArchitectureDecisionService,
  relevantDecisions,
} from '../../knowledge/adr/index.js';

import { daemonProjectStorage, daemonRootStorage } from './storage.js';

import { CodeGraphStore } from '../graph/graph-store.js';

import { ProjectGraphAdapter } from '../query-v2/project-graph-adapter.js';

import { runQuery } from '../query-v2/engine.js';

import type { QueryParameters, QueryResult } from '../query-v2/types.js';

import {
  PersistentRuntimeTraceStore,
  fleetParticipantsFromSnapshot,
  importTraceSession,
} from '../runtime-trace/index.js';

import type { RuntimeTraceImportResult } from '../runtime-trace/types.js';

import {
  TestIntelligenceError,
  TestIntelligenceStore,
  buildProjectTestFacts,
  buildTestSelection,
  buildTestVerification,
  resolveTestLimits,
  runSelectedTests,
} from '../test-intelligence/index.js';

import type {
  TestFacts,
  TestSelection,
  TestVerificationReport,
} from '../test-intelligence/index.js';

import type {
  CodeIntelligenceRuntime,
  RuntimeChangeInput,
  RuntimeContractInput,
  RuntimeProjectRef,
  RuntimeQueryInput,
  RuntimeReadiness,
  RuntimeTestRunInput,
  RuntimeTestSelectionInput,
  RuntimeTraceIngestInput,
} from './types.js';

function toManifest(project: RuntimeProjectRef): ProjectManifest {
  const now = new Date().toISOString();

  return {
    id: project.id,
    name: project.name,
    rootPath: project.rootPath,
    ...(project.remote ? { remote: project.remote } : {}),
    createdAt: now,
    updatedAt: now,
    graphVersion: 1,
    memoryVersion: 1,
  };
}

export interface LocalRuntimeOptions {
  /** Storage resolver override (tests/fixtures). Defaults to the config provider. */
  storageFor?: (project: RuntimeProjectRef) => StorageProvider;
  /** Root (unscoped) storage resolver override for Fleet state. */
  rootStorage?: () => StorageProvider;
}

export class LocalCodeIntelligenceRuntime implements CodeIntelligenceRuntime {
  readonly kind = 'local' as const;

  private readonly residents = new Map<
    string,
    { adapter: ProjectGraphAdapter; generation: string; manifestHash?: string }
  >();

  constructor(private readonly options: LocalRuntimeOptions = {}) {}

  private storageFor(project: RuntimeProjectRef): StorageProvider {
    return this.options.storageFor
      ? this.options.storageFor(project)
      : daemonProjectStorage(project);
  }

  async probeLocalGraph(
    project: RuntimeProjectRef
  ): Promise<{ present: boolean; generation?: string; manifestHash?: string }> {
    const storage = this.storageFor(project);

    const snapshot = await new PersistentCodeGraphStore(storage).load(project.id);

    if (!snapshot) {
      return { present: false };
    }

    return {
      present: true,
      ...(this.generationOf(snapshot) ? { generation: this.generationOf(snapshot) } : {}),
    };
  }

  private generationOf(snapshot: {
    parserFingerprint?: string;
    semanticFingerprint?: string;
    updatedAt?: string;
  }): string {
    return (
      snapshot.semanticFingerprint ?? snapshot.parserFingerprint ?? snapshot.updatedAt ?? 'unknown'
    );
  }

  async ensureProjectReady(project: RuntimeProjectRef): Promise<RuntimeReadiness> {
    const existing = this.residents.get(project.id);

    if (existing) {
      return { generation: existing.generation, via: 'local' };
    }

    const probe = await this.probeLocalGraph(project);

    if (probe.present && probe.generation) {
      return { generation: probe.generation, via: 'local' };
    }

    const result = await runProductionIndex(toManifest(project));

    const storage = this.storageFor(project);

    const snapshot = await new PersistentCodeGraphStore(storage).load(project.id);

    const generation = snapshot ? this.generationOf(snapshot) : undefined;

    return {
      ...(generation ? { generation } : {}),
      via: 'indexed',
    };
  }

  private async adapter(project: RuntimeProjectRef): Promise<ProjectGraphAdapter> {
    const cached = this.residents.get(project.id);

    if (cached) {
      return cached.adapter;
    }

    const storage = this.storageFor(project);

    const snapshot = await new PersistentCodeGraphStore(storage).load(project.id);

    if (!snapshot) {
      throw new Error('PROJECT_RUNTIME_FAILED: no local derived graph is available.');
    }

    const graph = new CodeGraphStore();

    graph.import(snapshot.symbols, snapshot.edges);

    const generation = this.generationOf(snapshot);

    const adapter = new ProjectGraphAdapter(graph, generation, project.id);

    this.residents.set(project.id, { adapter, generation });

    return adapter;
  }

  async query(project: RuntimeProjectRef, input: RuntimeQueryInput): Promise<QueryResult> {
    await this.ensureProjectReady(project);

    const graph = await this.adapter(project);

    return runQuery({
      source: input.query,
      scope: input.scope ?? 'project',
      graph,
      ...(input.parameters ? { parameters: input.parameters as QueryParameters } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.cursor ? { cursor: input.cursor } : {}),
      ...(input.explain !== undefined ? { explain: input.explain } : {}),
    });
  }

  /**
   * Phase 78: run an evidence profile against the project's derived state.
   *
   * Reuses the persisted Phase 68/72/73 snapshots through the shared facts
   * builder, so a daemon evidence run and a standalone one are equivalent.
   */
  async evidence(project: RuntimeProjectRef, request: EvidenceRequest): Promise<EvidenceBundle> {
    const storage = this.storageFor(project);

    const snapshot = await new PersistentCodeGraphStore(storage).load(project.id);

    if (!snapshot) {
      throw new Error('PROJECT_RUNTIME_FAILED: no local derived graph is available.');
    }

    const graph = new CodeGraphStore();

    graph.import(snapshot.symbols, snapshot.edges);

    const coverageSnapshot = await new PersistentGraphCoverageStore(storage).load(project.id);

    const evaluator = new GraphCoverageEvaluator({
      projectId: project.id,
      rootPath: project.rootPath,
      storage,
      snapshot: coverageSnapshot,
      graphAvailable: true,
    });

    const plan = planEvidence(request);

    const coverageFreshness = plan.needFreshness ? await evaluator.checkFreshness() : null;

    const crossServiceSnapshot = await new PersistentCrossServiceStore(storage).load(project.id);

    let fleetSnapshot = null;

    try {
      fleetSnapshot = await new PersistentFleetStore(this.root()).loadSnapshot();
    } catch {
      fleetSnapshot = null;
    }

    const facts = buildProjectEvidenceFacts({
      projectId: project.id,
      rootPath: project.rootPath,
      generation: this.generationOf(snapshot),
      graph,
      evaluator,
      coverageFreshness,
      freshness: {
        checked: coverageFreshness?.checked ?? false,
        stale: coverageFreshness?.stale ?? false,
      },
      coverageSnapshot,
      crossServiceSnapshot,
      fleetSnapshot,
    });

    return executeEvidence({ request, facts });
  }

  /**
   * Phase 79: import an explicit runtime trace session.
   *
   * Reads the project's derived graph so observations can be validated against
   * real static identity, then writes only to the trace namespace. The static
   * graph is never modified.
   */
  async ingestTraces(
    project: RuntimeProjectRef,
    input: RuntimeTraceIngestInput
  ): Promise<RuntimeTraceImportResult> {
    const storage = this.storageFor(project);

    const snapshot = await new PersistentCodeGraphStore(storage).load(project.id);

    const graph = new CodeGraphStore();

    if (snapshot) {
      graph.import(snapshot.symbols, snapshot.edges);
    }

    const store = new PersistentRuntimeTraceStore(storage);

    /*
     * Fleet participants are read from persisted Fleet state, so a daemon run
     * and a standalone run derive the same cross-repo identity.
     */
    let fleetSnapshot = null;

    try {
      fleetSnapshot = await new PersistentFleetStore(this.root()).loadSnapshot();
    } catch {
      fleetSnapshot = null;
    }

    const fleetParticipants =
      input.fleetParticipants ?? fleetParticipantsFromSnapshot(fleetSnapshot);

    return importTraceSession({
      projectId: input.projectId,
      graph,
      store,
      ...(input.graphGeneration ? { graphGeneration: input.graphGeneration } : {}),
      fleetParticipants,
      input: input.input,
      ...(input.now ? { now: input.now } : {}),
    });
  }

  /**
   * Phase 80: run a deterministic change-intelligence analysis against the
   * project's derived state. Read-only: git is inspected read-only and no
   * source or test is executed.
   */
  async change(
    project: RuntimeProjectRef,
    input: RuntimeChangeInput
  ): Promise<ChangeIntelligenceReport> {
    const storage = this.storageFor(project);

    const snapshot = await new PersistentCodeGraphStore(storage).load(project.id);

    const graph = new CodeGraphStore();

    if (snapshot) {
      graph.import(snapshot.symbols, snapshot.edges);
    }

    const coverageSnapshot = await new PersistentGraphCoverageStore(storage).load(project.id);

    const evaluator = new GraphCoverageEvaluator({
      projectId: project.id,
      rootPath: project.rootPath,
      storage,
      snapshot: coverageSnapshot,
      graphAvailable: Boolean(snapshot),
    });

    const crossServiceSnapshot = await new PersistentCrossServiceStore(storage).load(project.id);

    let fleetSnapshot = null;

    try {
      fleetSnapshot = await new PersistentFleetStore(this.root()).loadSnapshot();
    } catch {
      fleetSnapshot = null;
    }

    let runtimeObservations: Awaited<ReturnType<PersistentRuntimeTraceStore['loadObservations']>> =
      [];

    if (input.request.includeRuntimeEvidence) {
      try {
        runtimeObservations = await new PersistentRuntimeTraceStore(storage).loadObservations(
          project.id
        );
      } catch {
        runtimeObservations = [];
      }
    }

    const manifest = toManifest(project);

    const facts = buildProjectChangeFacts({
      projectId: project.id,
      rootPath: project.rootPath,
      generation: snapshot ? this.generationOf(snapshot) : 'unknown',
      graph,
      coverage: {
        available: Boolean(snapshot),
        evaluate: (capability) => evaluator.evaluate(capability),
      },
      fleetSnapshot,
      crossServiceSnapshot,
      runtimeObservations,
      includeRuntime: input.request.includeRuntimeEvidence === true,
      includeFleet: input.request.includeFleet === true,
      adr: async (adrInput) => {
        try {
          const service = new ArchitectureDecisionService(new AdrStore(storage, manifest));

          await service.initialize();

          const entries = await relevantDecisions(service, {
            filePaths: adrInput.filePaths,
            symbols: adrInput.symbols,
          });

          return entries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            status: entry.status,
          }));
        } catch {
          return [];
        }
      },
    });

    return runChangeAnalysis(input.request, facts, {
      rootPath: project.rootPath,
      ...(input.patch !== undefined ? { patch: input.patch } : {}),
    });
  }

  /**
   * Phase 81: run a deterministic contract-compatibility analysis against the
   * project's derived state. Read-only: the change is read with the Phase 80
   * git reader, baseline content with `git show`, candidate content from the
   * working tree; nothing is written and no remote ref is fetched.
   */
  async contract(
    project: RuntimeProjectRef,
    input: RuntimeContractInput
  ): Promise<ContractIntelligenceReport> {
    const storage = this.storageFor(project);

    const snapshot = await new PersistentCodeGraphStore(storage).load(project.id);

    const graph = new CodeGraphStore();

    if (snapshot) {
      graph.import(snapshot.symbols, snapshot.edges);
    }

    const coverageSnapshot = await new PersistentGraphCoverageStore(storage).load(project.id);

    const evaluator = new GraphCoverageEvaluator({
      projectId: project.id,
      rootPath: project.rootPath,
      storage,
      snapshot: coverageSnapshot,
      graphAvailable: Boolean(snapshot),
    });

    const crossServiceSnapshot = await new PersistentCrossServiceStore(storage).load(project.id);

    let fleetSnapshot = null;

    try {
      fleetSnapshot = await new PersistentFleetStore(this.root()).loadSnapshot();
    } catch {
      fleetSnapshot = null;
    }

    /* Reuse the Phase 80 change input; contract analysis never re-parses git. */
    const changeSnapshot = await readChangeInput({
      mode: input.change.mode,
      rootPath: project.rootPath,
      ...(input.change.base !== undefined ? { base: input.change.base } : {}),
      ...(input.change.head !== undefined ? { head: input.change.head } : {}),
      ...(input.patch !== undefined ? { patch: input.patch } : {}),
      ...(input.change.limits ? { limits: input.change.limits } : {}),
    });

    let runtimeObservations: Awaited<ReturnType<PersistentRuntimeTraceStore['loadObservations']>> =
      [];

    if (input.request.includeRuntimeEvidence) {
      try {
        runtimeObservations = await new PersistentRuntimeTraceStore(storage).loadObservations(
          project.id
        );
      } catch {
        runtimeObservations = [];
      }
    }

    const manifest = toManifest(project);

    const baseRevision = input.baseRevision ?? changeSnapshot.base ?? 'HEAD';

    const facts = buildProjectContractFacts({
      projectId: project.id,
      rootPath: project.rootPath,
      generation: snapshot ? this.generationOf(snapshot) : 'unknown',
      graph,
      coverage: {
        available: Boolean(snapshot),
        evaluate: (capability) => evaluator.evaluate(capability),
      },
      fleetSnapshot,
      crossServiceSnapshot,
      runtimeObservations,
      changedFiles: changeSnapshot.files.map((file) => ({ path: file.path, kind: file.kind })),
      baseRevision,
      includeRuntime: input.request.includeRuntimeEvidence === true,
      includeFleet: input.request.includeFleet === true,
      adr: async (adrInput) => {
        try {
          const service = new ArchitectureDecisionService(new AdrStore(storage, manifest));

          await service.initialize();

          const entries = await relevantDecisions(service, {
            filePaths: adrInput.filePaths,
            symbols: adrInput.symbols,
          });

          return entries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            status: entry.status,
          }));
        } catch {
          return [];
        }
      },
    });

    return analyzeContracts({ request: input.request, facts });
  }

  private readonly testSelections = new Map<
    string,
    { facts: TestFacts; selection: TestSelection }
  >();

  private readonly testStore = new TestIntelligenceStore(resolveTestLimits().maxRetainedRuns);

  /**
   * Phase 82 shared facts.
   *
   * Reuses the Phase 80 change report and the optional Phase 81 contract report
   * so a change is never re-parsed. Read-only: no source is executed and no
   * test runs here.
   */
  private async buildTestFactsFor(
    project: RuntimeProjectRef,
    input: RuntimeTestSelectionInput
  ): Promise<{ facts: TestFacts; change: ChangeIntelligenceReport }> {
    const storage = this.storageFor(project);

    const snapshot = await new PersistentCodeGraphStore(storage).load(project.id);

    const graph = new CodeGraphStore();

    if (snapshot) {
      graph.import(snapshot.symbols, snapshot.edges);
    }

    const coverageSnapshot = await new PersistentGraphCoverageStore(storage).load(project.id);

    const evaluator = new GraphCoverageEvaluator({
      projectId: project.id,
      rootPath: project.rootPath,
      storage,
      snapshot: coverageSnapshot,
      graphAvailable: Boolean(snapshot),
    });

    const crossServiceSnapshot = await new PersistentCrossServiceStore(storage).load(project.id);

    let fleetSnapshot = null;

    try {
      fleetSnapshot = await new PersistentFleetStore(this.root()).loadSnapshot();
    } catch {
      fleetSnapshot = null;
    }

    let runtimeObservations: Awaited<ReturnType<PersistentRuntimeTraceStore['loadObservations']>> =
      [];

    if (input.request.includeRuntimeEvidence) {
      try {
        runtimeObservations = await new PersistentRuntimeTraceStore(storage).loadObservations(
          project.id
        );
      } catch {
        runtimeObservations = [];
      }
    }

    const generation = snapshot ? this.generationOf(snapshot) : 'unknown';

    const changeRequest = input.change;

    const changeFacts = buildProjectChangeFacts({
      projectId: project.id,
      rootPath: project.rootPath,
      generation,
      graph,
      coverage: {
        available: Boolean(snapshot),
        evaluate: (capability) => evaluator.evaluate(capability),
      },
      fleetSnapshot,
      crossServiceSnapshot,
      runtimeObservations,
      includeRuntime: input.request.includeRuntimeEvidence === true,
      includeFleet: input.request.includeFleet === true,
    });

    const runChange = (): Promise<ChangeIntelligenceReport> =>
      runChangeAnalysis(changeRequest, changeFacts, {
        rootPath: project.rootPath,
        ...(input.patch !== undefined ? { patch: input.patch } : {}),
      });

    const change = await runChange();

    let contract: ContractIntelligenceReport | null = null;

    if (input.contract) {
      try {
        contract = await this.contract(project, {
          request: input.contract,
          change: changeRequest,
          ...(input.patch !== undefined ? { patch: input.patch } : {}),
        });
      } catch {
        contract = null;
      }
    }

    const manifest = toManifest(project);

    const facts = buildProjectTestFacts({
      projectId: project.id,
      rootPath: project.rootPath,
      generation,
      graph,
      coverage: {
        available: Boolean(snapshot),
        evaluate: (capability) => evaluator.evaluate(capability),
      },
      fleetSnapshot,
      runtimeObservations,
      change,
      contract,
      includeRuntime: input.request.includeRuntimeEvidence === true,
      includeFleet: input.request.includeFleet === true,
      /* Relevant accepted ADRs are attached as architectural constraints. */
      adrConstraints: change.adrConstraints.map((entry) => ({
        id: entry.id,
        title: entry.title,
        status: entry.status,
      })),
      currentGeneration: () => generation,
      /*
       * Re-check the live change before an execution is allowed to certify it.
       * The value compared is the Phase 80 report fingerprint, so a generation
       * change or a different profile is caught too — never merely the digest
       * of the working-tree text.
       */
      recheckSnapshot: async () => (await runChange()).fingerprint,
      adr: async (adrInput) => {
        try {
          const service = new ArchitectureDecisionService(new AdrStore(storage, manifest));

          await service.initialize();

          const entries = await relevantDecisions(service, {
            filePaths: adrInput.filePaths,
            symbols: adrInput.symbols,
          });

          return entries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            status: entry.status,
          }));
        } catch {
          return [];
        }
      },
    });

    return { facts, change };
  }

  /**
   * Phase 82: deterministic change-to-test selection. Read-only — it never
   * executes a test, and a selection only ever describes the pinned change.
   */
  async testSelection(
    project: RuntimeProjectRef,
    input: RuntimeTestSelectionInput
  ): Promise<TestSelection> {
    const { facts } = await this.buildTestFactsFor(project, input);

    const { selection } = await buildTestSelection({ request: input.request, facts });

    this.testStore.putSelection(selection);

    this.testSelections.set(`${project.id}:${selection.selectionId}`, { facts, selection });

    return selection;
  }

  /**
   * Phase 82: explicitly execute a previously computed selection.
   *
   * Only a selection computed for this project is accepted, and it is re-checked
   * against the live change before running, so a stale selection can never
   * certify a newer working tree.
   */
  async runTests(
    project: RuntimeProjectRef,
    input: RuntimeTestRunInput
  ): Promise<TestVerificationReport> {
    const key = `${project.id}:${input.request.selectionId}`;

    const held = this.testSelections.get(key);

    const selection =
      held?.selection ?? this.testStore.getSelection(project.id, input.request.selectionId);

    if (!selection) {
      throw new TestIntelligenceError(
        'TEST_SELECTION_NOT_FOUND',
        'No selection with that id exists for this project.'
      );
    }

    /* Rebuild the facts for the same pinned change; never re-derive the selection. */
    const facts = held?.facts;

    if (!facts) {
      throw new TestIntelligenceError(
        'TEST_SELECTION_NOT_FOUND',
        'The selection is no longer resident; compute it again before running.'
      );
    }

    const limits = resolveTestLimits();

    const run = await runSelectedTests({
      selection,
      request: input.request,
      facts,
      limits: {
        maxProcesses: limits.maxProcesses,
        maxRunOutputBytes: limits.maxRunOutputBytes,
        runTimeoutMs: limits.runTimeoutMs,
      },
    });

    this.testStore.putRun(run);

    return buildTestVerification({ selection, run, facts });
  }

  /** Phase 82: bounded read-only view of derived test-run evidence. */
  async testStatus(project: RuntimeProjectRef, limit = 10): Promise<unknown> {
    const bounded = Math.max(0, Math.min(limit, resolveTestLimits().maxRetainedRuns));

    const runs = this.testStore.listRuns(project.id, bounded);

    const latest = this.testStore.latestSelection(project.id);

    return {
      projectId: project.id,
      selectionId: latest?.selectionId ?? null,
      changeFingerprint: latest?.changeFingerprint ?? null,
      generation: latest?.generations.baseline ?? null,
      runs: runs.map((run) => ({
        id: run.id,
        status: run.status,
        framework: run.framework,
        selectedTests: run.selectedTests.length,
        stale: run.stale,
        startedAt: run.startedAt,
        endedAt: run.endedAt,
        errors: run.errors,
      })),
    };
  }

  /** Phase 83: deterministic release-readiness analysis (read-only). */
  async release(
    project: RuntimeProjectRef,
    input: ReleaseAnalysisInput
  ): Promise<ReleaseReadinessReport> {
    void project;

    const limits = resolveReleaseLimits(input.request.limits);

    const facts = buildReleaseFacts({
      projectRoot: input.projectRoot,
      profile: input.request.evidenceProfile ?? 'auditor',
      requiredPhases: REQUIRED_RELEASE_PHASES,
      maxCapabilities: limits.maxCapabilities,
      maxBundleReadBytes: limits.maxBundleReadBytes,
      maxPackageJsonBytes: limits.maxPackageJsonBytes,
      maxWorktreeFiles: limits.maxWorktreeFiles,
    });

    return runReleaseAnalysis({ facts, request: input.request, rebuild: input.rebuild });
  }

  /** Root (unscoped) storage for Fleet state; overridable for tests. */
  protected root(): StorageProvider {
    return this.options.rootStorage ? this.options.rootStorage() : daemonRootStorage();
  }

  async status(project?: RuntimeProjectRef): Promise<unknown> {
    if (!project) {
      return { kind: 'local', residentProjects: [...this.residents.keys()] };
    }

    const probe = await this.probeLocalGraph(project);

    return {
      kind: 'local',
      projectId: project.id,
      state: probe.present ? 'ready' : 'idle',
      ...(probe.generation ? { generation: probe.generation } : {}),
      resident: this.residents.has(project.id),
    };
  }

  async releaseProject(projectId: string): Promise<void> {
    this.residents.delete(projectId);
  }

  async close(): Promise<void> {
    this.residents.clear();
  }
}
