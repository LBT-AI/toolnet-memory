import type {
  ProjectManifest,
} from "../core/types.js";

import {
  MemoryEngine,
} from "../core/memory-engine.js";

import {
  MemoryMaintenance,
} from "../memory/maintenance.js";

import {
  MemoryConsolidator,
} from "../memory/consolidator.js";

import {
  RetrievalEngine,
} from "../retrieval/retrieval-engine.js";

import {
  createEmbeddingProvider,
} from "../embeddings/index.js";

import {
  CodeGraphStore,
  ReferenceResolver,
} from "../code-intelligence/index.js";

import {
  IncrementalRepositoryIndexer,
} from "../code-intelligence/incremental/incremental-indexer.js";

import {
  ImpactGuard,
} from "../code-intelligence/impact/impact-guard.js";

import {
  VectorStore,
  VectorPersistenceManager,
} from "../retrieval/vector/index.js";

import {
  HookRuntime,
  AutoContextBuilder,
  AutoRetrieval,
  AutoImpactGuard,
} from "../hooks/index.js";

import {
  MemoryStore,
  PersistentCodeGraphStore,
  PersistentVectorStore,
} from "../storage/index.js";

import type {
  StorageProvider,
} from "../storage/types.js";

import {
  SnapshotManager,
} from "../snapshot/index.js";

import {
  ProjectLock,
} from "../production/project-lock.js";

export interface ToolNetMemoryRuntimeOptions {
  project: ProjectManifest;
  storage: StorageProvider;
  embeddingModel: string;
}

export class ToolNetMemoryRuntime {
  readonly memory =
    new MemoryEngine();

  readonly graph =
    new CodeGraphStore();

  readonly vectors =
    new VectorStore();

  readonly retrieval:
    RetrievalEngine;

  readonly references:
    ReferenceResolver;

  readonly hooks:
    HookRuntime;

  readonly autoRetrieval:
    AutoRetrieval;

  readonly impactGuard:
    ImpactGuard;

  readonly autoImpactGuard:
    AutoImpactGuard;

  private readonly memoryStore:
    MemoryStore;

  private readonly graphStore:
    PersistentCodeGraphStore;

  private readonly vectorStore:
    PersistentVectorStore;

  private readonly processLock:
    ProjectLock;

  constructor(
    readonly options:
      ToolNetMemoryRuntimeOptions,
  ) {
    this.memoryStore =
      new MemoryStore(
        options.storage,
      );

    this.graphStore =
      new PersistentCodeGraphStore(
        options.storage,
      );

    this.vectorStore =
      new PersistentVectorStore(
        options.storage,
      );

    this.processLock =
      new ProjectLock(
        options.project.id,
      );

    this.retrieval =
      new RetrievalEngine(
        this.memory,
      );

    this.references =
      new ReferenceResolver(
        this.graph,
      );

    this.hooks =
      new HookRuntime({
        projectId:
          options.project.id,

        memory:
          this.memory,

        memoryStore:
          this.memoryStore,

        maxEventsBeforeFlush:
          100,
      });

    const contextBuilder =
      new AutoContextBuilder(
        this.memory,
        this.retrieval,
        this.graph,
      );

    this.autoRetrieval =
      new AutoRetrieval(
        this.hooks,
        contextBuilder,
        options.project.id,
      );

    this.impactGuard =
      new ImpactGuard(
        this.graph,
      );

    this.autoImpactGuard =
      new AutoImpactGuard(
        this.impactGuard,
        options.project.id,
      );
  }

  async start() {
    const {
      project,
    } = this.options;

    await this.processLock
      .acquire();

    // Load persistent memory.
    const memories =
      await this.memoryStore.load(
        project.id,
      );

    this.memory.importRecords(
      memories,
    );

    const maintenance =
      new MemoryMaintenance(
        this.memory,
      );

    const maintenanceStats =
      maintenance.run(
        project.id,
      );

    if (
      maintenanceStats.expiredRemoved > 0 ||
      maintenanceStats.supersededRemoved > 0
    ) {
      await this.memoryStore.save(
        project.id,
        this.memory.exportProject(
          project.id,
        ),
      );
    }

    // Load code graph.
    const graphSnapshot =
      await this.graphStore.load(
        project.id,
      );

    if (
      graphSnapshot
    ) {
      this.graph.import(
        graphSnapshot.symbols,
        graphSnapshot.edges,
      );
    }

    // Load / update vectors.
    const embeddings =
      createEmbeddingProvider();

    const vectorManager =
      new VectorPersistenceManager(
        project.id,
        this.options.embeddingModel,
        embeddings,
        this.vectors,
        this.vectorStore,
      );

    const vectorStats =
      await vectorManager.initialize(
        this.memory.list(
          project.id,
        ),
      );

    await this.hooks
      .sessionStart();

    return {
      memories:
        memories.length,

      graphSymbols:
        this.graph
          .allSymbols(
            project.id,
          )
          .length,

      graphEdges:
        this.graph
          .allEdges(
            project.id,
          )
          .length,

      vectors:
        vectorStats.total,

      vectorsIndexed:
        vectorStats.indexed,
    };
  }

  async preparePrompt(
    prompt: string,
  ) {
    return this.autoRetrieval
      .prepare(prompt);
  }

  /*
   * PHẢI gọi trước khi tool thật sự chạy.
   * Edit/write/patch sẽ tự chạy Blast Radius.
   */
  async beforeTool(
    tool: string,
    input?: unknown,
  ) {
    const impact =
      await this.autoImpactGuard
        .beforeTool(
          tool,
          input,
        );

    await this.hooks
      .beforeTool(
        tool,
        input,
      );

    return impact;
  }

  async afterTool(
    tool: string,
    output?: unknown,
  ) {
    return this.hooks
      .afterTool(
        tool,
        output,
      );
  }

  async stop() {
    const {
      project,
      storage,
      embeddingModel,
    } = this.options;

    // Snapshot persistent state before changing it.
    const snapshotManager =
      new SnapshotManager(
        storage,
      );

    const snapshot =
      await snapshotManager.create(
        project.id,
        "session-end-auto",
      );

    await snapshotManager.prune(
      project.id,
      10,
    );

    // Flush pending memory events.
    await this.hooks
      .sessionEnd();

    // Consolidate small activity memories.
    const consolidation =
      new MemoryConsolidator(
        this.memory,
      ).consolidate(
        project.id,
      );

    if (
      consolidation.summaryCreated
    ) {
      await this.memoryStore.save(
        project.id,
        this.memory.exportProject(
          project.id,
        ),
      );
    }

    // Incrementally update code graph.
    const codeStats =
      await new IncrementalRepositoryIndexer(
        storage,
      ).index(
        project.id,
        project.rootPath,
      );

    // Reload latest graph snapshot.
    const graphSnapshot =
      await this.graphStore.load(
        project.id,
      );

    if (
      graphSnapshot
    ) {
      this.graph.clearProject(
        project.id,
      );

      this.graph.import(
        graphSnapshot.symbols,
        graphSnapshot.edges,
      );
    }

    // Persist only missing/new memory vectors.
    const embeddings =
      createEmbeddingProvider();

    const vectorManager =
      new VectorPersistenceManager(
        project.id,
        embeddingModel,
        embeddings,
        this.vectors,
        this.vectorStore,
      );

    const vectorStats =
      await vectorManager.initialize(
        this.memory.list(
          project.id,
        ),
      );

    const result = {
      code:
        codeStats,

      vectors:
        vectorStats,

      consolidation,

      snapshot:
        snapshot?.id,

      memories:
        this.memory.list(
          project.id,
        ).length,
    };

    await this.processLock
      .release();

    return result;
  }
}
