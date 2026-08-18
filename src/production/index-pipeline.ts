import type { ProjectManifest } from '../core/types.js';

import { loadConfig } from '../core/index.js';

import { createEmbeddingProvider } from '../embeddings/index.js';

import {
  ArchitectureEngine,
  CodeAnalysisEngine,
  CodeGraphStore,
  RepositoryIndexer,
  RichGraphEnricher,
  SemanticCodeEngine,
  TypeScriptTypeResolver,
  VisualizationBuilder,
} from '../code-intelligence/index.js';

import {
  createStorageProvider,
  PersistentArchitectureStore,
  PersistentCodeAnalysisStore,
  PersistentCodeGraphStore,
  PersistentTypeResolutionStore,
  PersistentVisualizationStore,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

export type IndexStageId =
  | 'source-index'
  | 'type-resolution'
  | 'rich-graph'
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
    exact: number;
    high: number;
    fallback: number;
  };

  semantic: unknown;
  architecture: unknown;
  analysis: unknown;
  visualization: unknown;
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

    await graphStore.save({
      version: 1,

      projectId: project.id,

      updatedAt: new Date().toISOString(),

      files: result.files,

      symbols: result.graph.allSymbols(project.id),

      edges: result.graph.allEdges(project.id),
    });

    return result;
  });

  const graph = indexed.graph;

  /*
   * 2. TYPE RESOLUTION
   */
  const resolution = await stage('type-resolution', 'Type Resolution', async () => {
    const result = await new TypeScriptTypeResolver(graph).resolveProject(
      project.id,
      project.rootPath,
      (progress) => {
        options.onStageProgress?.({
          stage: 'type-resolution',
          current: progress.current,
          total: progress.total,
          phase: progress.phase,
          detail: progress.detail,
        });
      }
    );

    await new PersistentTypeResolutionStore(storage).save(result);

    return result;
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

    await graphStore.save({
      version: 1,

      projectId: project.id,

      updatedAt: new Date().toISOString(),

      files: symbols.filter((item) => item.type === 'file').length,

      symbols,
      edges,
    });

    return stats;
  });

  /*
   * 4. SEMANTIC INDEX
   */
  const semantic = await stage('semantic-index', 'Semantic Code Index', async () => {
    const engine = new SemanticCodeEngine({
      projectId: project.id,

      rootPath: project.rootPath,

      model: process.env.HF_EMBEDDING_MODEL ?? 'sentence-transformers/all-MiniLM-L6-v2',

      storage,

      embeddings: createEmbeddingProvider(),

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
  });

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
      total: resolution.total,

      exact: resolution.exact,

      high: resolution.high,

      fallback: resolution.fallback,
    },

    semantic,

    architecture: architecture.summary,

    analysis: analysis.summary,

    visualization: visualization.summary,
  };
}
