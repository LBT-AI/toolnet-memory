import type { ProjectManifest } from '../core/types.js';

import { loadConfig } from '../core/index.js';

import {
  ArchitectureEngine,
  CodeAnalysisEngine,
  CodeGraphStore,
  CrossServiceEngine,
  FleetProjectRegistry,
  GraphCoverageBuilder,
  RepositoryIndexer,
  RichGraphEnricher,
  ResolutionEngine,
  SemanticCodeEngine,
  TypeScriptTypeResolver,
  VisualizationBuilder,
  buildManifestFromPaths,
  parserFingerprintDigest,
  semanticFingerprint,
  searchableParserExtensions,
  summarizeResolution,
  assertValidGraph,
  type CrossServiceCoverageInput,
} from '../code-intelligence/index.js';

import {
  createStorageProvider,
  PersistentArchitectureStore,
  PersistentCodeAnalysisStore,
  PersistentCodeGraphStore,
  PersistentCodeManifestStore,
  PersistentCrossServiceStore,
  PersistentFleetExportStore,
  PersistentGraphCoverageStore,
  PersistentTypeResolutionStore,
  PersistentVisualizationStore,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

export type IndexStageId =
  | 'source-index'
  | 'type-resolution'
  | 'rich-graph'
  | 'cross-service'
  | 'graph-coverage'
  | 'semantic-index'
  | 'architecture'
  | 'analysis'
  | 'visualization';

export interface IndexStageEvent {
  id: IndexStageId;
  title: string;

  state: 'start' | 'complete';

  durationMs?: number;
}

export interface SourceIndexProgressEvent {
  phase: 'scan' | 'parse';

  current: number;

  total: number;

  file?: string;
}

export interface StageProgressEvent {
  stage: IndexStageId;
  current: number;
  total: number;
  phase?: string;
  detail?: string;
}

export interface ProductionIndexOptions {
  onStage?: (event: IndexStageEvent) => void | Promise<void>;

  onSourceProgress?: (event: SourceIndexProgressEvent) => void;

  onStageProgress?: (event: StageProgressEvent) => void;
}

export interface ProductionIndexResult {
  files: number;

  project: {
    id: string;
    name: string;
    remote: string;
  };

  storage: string;

  durationMs: number;

  graph: {
    symbols: number;
    edges: number;
  };

  resolution: {
    total: number;
    resolved: number;
    ambiguous: number;
    unresolved: number;
    external: number;
  };

  semantic: unknown;
  architecture: unknown;
  analysis: unknown;
  visualization: unknown;

  /* Phase 72 additive cross-service summary. */
  crossService?: {
    services: number;
    routes: number;
    links: number;
    crossServiceLinks: number;
    unresolved: number;
  };
}

export async function runProductionIndex(
  project: ProjectManifest,
  options: ProductionIndexOptions = {}
): Promise<ProductionIndexResult> {
  const started = Date.now();

  async function stage<T>(id: IndexStageId, title: string, run: () => Promise<T> | T): Promise<T> {
    await options.onStage?.({
      id,
      title,
      state: 'start',
    });

    const stageStarted = Date.now();

    const result = await run();

    await options.onStage?.({
      id,
      title,
      state: 'complete',
      durationMs: Date.now() - stageStarted,
    });

    return result;
  }

  const config = loadConfig();

  const rawStorage = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,

      huggingface: config.storage.huggingface,

      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 3,
    }
  );

  const storage = new ProjectScopedStorageProvider(
    rawStorage,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  const graphStore = new PersistentCodeGraphStore(storage);

  /*
   * 1. SOURCE INDEX
   */
  const indexed = await stage('source-index', 'Source Index', async () => {
    const result = await new RepositoryIndexer().index(project.id, project.rootPath, {
      onProgress: (event) => {
        options.onSourceProgress?.(event);
      },
    });

    /*
     * Never persist a corrupt semantic graph generation.
     */
    assertValidGraph(result.graph, project.id);

    await graphStore.save({
      version: 1,

      projectId: project.id,

      updatedAt: new Date().toISOString(),

      files: result.files,

      symbols: result.graph.allSymbols(project.id),

      edges: result.graph.allEdges(project.id),

      parserFingerprint: parserFingerprintDigest(),

      semanticFingerprint: semanticFingerprint(),
    });

    /*
     * Phase 68/70: the freshness baseline manifest is persisted here and
     * reuses the already-scanned accepted file list, so no second repository
     * scan is performed.
     *
     * The graph coverage snapshot is persisted AFTER deterministic resolution
     * so it can carry real resolution evidence instead of a blanket
     * "cross-file resolution pending" marker.
     */
    const manifest = await buildManifestFromPaths(
      project.id,
      project.rootPath,
      result.acceptedFiles,
      {
        scan: {
          extensions: searchableParserExtensions(),
        },
      }
    );

    await new PersistentCodeManifestStore(storage).save(manifest);

    return result;
  });

  const graph = indexed.graph;

  let crossServiceCoverage: CrossServiceCoverageInput | undefined;

  let crossServiceSummary:
    | {
        services: number;
        routes: number;
        links: number;
        crossServiceLinks: number;
        unresolved: number;
      }
    | undefined;

  /*
   * 2. TYPE RESOLUTION
   */
  const resolution = await stage('type-resolution', 'Type Resolution', async () => {
    const result = await new ResolutionEngine({
      projectId: project.id,
      rootPath: project.rootPath,
      graph,
      parsedFiles: indexed.parsedFiles ?? [],
      onProgress: (progress) => {
        options.onStageProgress?.({
          stage: 'type-resolution',
          current: progress.current,
          total: progress.total,
          phase: progress.phase,
          detail: progress.detail,
        });
      },
    }).resolve();

    await new PersistentTypeResolutionStore(storage).save(result.snapshot);

    return result.snapshot;
  });

  /*
   * 3. RICH GRAPH
   */
  await stage('rich-graph', 'Rich Graph', async () => {
    const stats = new RichGraphEnricher(graph).enrich(
      project.id,
      project.rootPath,
      resolution,
      (progress) => {
        options.onStageProgress?.({
          stage: 'rich-graph',
          current: progress.current,
          total: progress.total,
          phase: progress.phase,
          detail: progress.detail,
        });
      }
    );

    const symbols = graph.allSymbols(project.id);

    const edges = graph.allEdges(project.id);

    /*
     * The enriched graph is the authoritative generation. It must validate
     * before it replaces the structural generation.
     */
    assertValidGraph(graph, project.id);

    await graphStore.save({
      version: 1,

      projectId: project.id,

      updatedAt: new Date().toISOString(),

      files: symbols.filter((item) => item.type === 'file').length,

      symbols,
      edges,

      parserFingerprint: parserFingerprintDigest(),

      semanticFingerprint: semanticFingerprint(),
    });

    return stats;
  });

  /*
   * 3a. CROSS-SERVICE (Phase 72)
   *
   * Deterministic static linkage of HTTP routes/clients and event channels
   * across service boundaries inside this project. The enriched graph is the
   * authoritative generation, so it is re-validated and re-persisted here.
   */
  await stage('cross-service', 'Cross-Service Intelligence', async () => {
    const graphGeneration = `${parserFingerprintDigest()}:${semanticFingerprint()}`;

    const result = await new CrossServiceEngine({ graph }).analyze({
      projectId: project.id,
      rootPath: project.rootPath,
      files: indexed.acceptedFiles,
      projectName: project.name,
      ...(project.remote ? { projectRemote: project.remote } : {}),
      graphGeneration,
      graphFingerprint: semanticFingerprint(),
    });

    crossServiceCoverage = result.coverage;

    crossServiceSummary = {
      services: result.snapshot.stats.services,
      routes: result.snapshot.stats.routes,
      links: result.snapshot.stats.links,
      crossServiceLinks: result.snapshot.stats.crossServiceLinks,
      unresolved: result.snapshot.stats.unresolved,
    };

    assertValidGraph(graph, project.id);

    const symbols = graph.allSymbols(project.id);
    const edges = graph.allEdges(project.id);

    await graphStore.save({
      version: 1,

      projectId: project.id,

      updatedAt: new Date().toISOString(),

      files: symbols.filter((item) => item.type === 'file').length,

      symbols,
      edges,

      parserFingerprint: parserFingerprintDigest(),

      semanticFingerprint: semanticFingerprint(),
    });

    await new PersistentCrossServiceStore(storage).save(result.snapshot);

    /*
     * Phase 73: persist the minimal, sanitized Fleet export for this project
     * and register it so the Fleet Graph can discover it. The registry is a
     * Fleet-namespace record, never project storage.
     */
    await new PersistentFleetExportStore(storage).save(result.export);

    try {
      await new FleetProjectRegistry(rawStorage).register({
        projectId: project.id,
        name: project.name,
        ...(project.remote ? { remote: project.remote } : {}),
        rootPath: project.rootPath,
        pinnedGeneration: result.export.generation,
      });
    } catch {
      /*
       * Fleet registration is derived-state bookkeeping. A storage failure
       * must never fail a project index.
       */
    }

    return result.snapshot.stats;
  });

  /*
   * 3b. GRAPH COVERAGE (Phase 68 contract, Phase 70 evidence)
   *
   * Persisted after structural parsing and deterministic resolution so the
   * trust contract reflects what was actually proven, not what was assumed.
   */
  await stage('graph-coverage', 'Graph Coverage', async () => {
    const coverage = new GraphCoverageBuilder().build({
      projectId: project.id,
      scan: indexed.scan,
      acceptedFiles: indexed.acceptedFiles,
      languages: indexed.languages,
      indexedFiles: indexed.files,
      structuralFiles: indexed.structuralFiles,
      lexicalOnlyFiles: indexed.lexicalOnlyFiles,
      parseFailures: indexed.parseFailures,
      crossFileResolutionLanguages: indexed.crossFileResolutionLanguages,
      structuralParserUnavailable: indexed.structuralFallbacks,
      structuralParseFailed: indexed.structuralDiagnostics,
      resolution: summarizeResolution(resolution),
      ...(crossServiceCoverage ? { crossService: crossServiceCoverage } : {}),
    });

    await new PersistentGraphCoverageStore(storage).save(coverage);

    return coverage;
  });

  /*
   * 4. SEMANTIC INDEX
   */
  const semantic = await stage(
    'semantic-index',
    'Local Code Search — SQLite FTS5/BM25',
    async () => {
      const engine = new SemanticCodeEngine({
        projectId: project.id,

        rootPath: project.rootPath,

        storage,

        graph,
      });

      return engine.initialize((progress) => {
        options.onStageProgress?.({
          stage: 'semantic-index',
          current: progress.current,
          total: progress.total,
          phase: progress.phase,
          detail: progress.detail,
        });
      });
    }
  );

  /*
   * 5. ARCHITECTURE
   */
  const architecture = await stage('architecture', 'Architecture Intelligence', async () => {
    const result = new ArchitectureEngine(graph).analyze(project.id);

    await new PersistentArchitectureStore(storage).save(result);

    return result;
  });

  /*
   * 6. ANALYSIS
   */
  const analysis = await stage('analysis', 'Graph Analysis', async () => {
    const result = new CodeAnalysisEngine(graph).analyze(project.id);

    await new PersistentCodeAnalysisStore(storage).save(result);

    return result;
  });

  /*
   * 7. VISUALIZATION
   */
  const visualization = await stage('visualization', '3D Visualization Dataset', async () => {
    const result = new VisualizationBuilder(graph).build(
      project.id,
      architecture,
      analysis,
      (progress) => {
        options.onStageProgress?.({
          stage: 'visualization',
          current: progress.current,
          total: progress.total,
          phase: progress.phase,
          detail: progress.detail,
        });
      }
    );

    await new PersistentVisualizationStore(storage).save(result);

    return result;
  });

  return {
    files: indexed.files,

    project: {
      id: project.id,

      name: project.name,

      remote: project.remote ?? project.name,
    },

    storage: storage.name,

    durationMs: Date.now() - started,

    graph: {
      symbols: graph.allSymbols(project.id).length,

      edges: graph.allEdges(project.id).length,
    },

    resolution: {
      total: resolution.stats.total,
      resolved: resolution.stats.resolved,
      ambiguous: resolution.stats.ambiguous,
      unresolved: resolution.stats.unresolved,
      external: resolution.stats.external,
    },

    semantic,

    architecture: architecture.summary,
    analysis: analysis.summary,
    visualization: visualization.summary,

    ...(crossServiceSummary ? { crossService: crossServiceSummary } : {}),
  };
}
