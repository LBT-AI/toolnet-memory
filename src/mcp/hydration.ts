import type { MCPContext } from './context.js';

export interface MCPHydrationResult {
  memory: 'ready' | 'failed';
  graph: 'ready' | 'failed';
  semantic: 'ready' | 'failed';
  errors: string[];
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Hydrate remote/project-backed MCP state after stdio has already connected.
 *
 * Important:
 * - MCP startup must never wait for S3/R2/Hugging Face.
 * - MCP startup must never wait for embedding initialization.
 * - Individual hydration failures degrade capabilities without killing MCP.
 */
export async function hydrateMCPContext(ctx: MCPContext): Promise<MCPHydrationResult> {
  const result: MCPHydrationResult = {
    memory: 'failed',
    graph: 'failed',
    semantic: 'failed',
    errors: [],
  };

  try {
    /*
     * Keep heavy storage/AWS modules outside the MCP handshake path.
     */
    const [{ loadConfig }, storageModule] = await Promise.all([
      import('../core/config.js'),
      import('../storage/index.js'),
    ]);

    const config = loadConfig();

    const rawStorage = storageModule.createStorageProvider({
      provider: config.storage.provider,
      r2: config.storage.r2,
      s3: config.storage.s3,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    });

    const retryStorage = storageModule.withStorageRetry(rawStorage, {
      attempts: Number(process.env.TOOLNET_STORAGE_RETRIES ?? 3),
    });

    const storage = new storageModule.ProjectScopedStorageProvider(
      retryStorage,
      ctx.project.id,
      ctx.project.name,
      ctx.project.remote ?? ctx.project.name
    );

    const memoryStore = new storageModule.MemoryStore(storage);

    ctx.storage = storage;
    ctx.memoryStore = memoryStore;

    /*
     * Memory and graph are independent remote reads.
     * One failing must not prevent the other from becoming available.
     */
    const [memoryResult, graphResult] = await Promise.allSettled([
      memoryStore.load(ctx.project.id),
      new storageModule.PersistentCodeGraphStore(storage).load(ctx.project.id),
    ]);

    if (memoryResult.status === 'fulfilled') {
      ctx.memory.importRecords(memoryResult.value);
      result.memory = 'ready';
    } else {
      result.errors.push(`memory: ${message(memoryResult.reason)}`);
    }

    if (graphResult.status === 'fulfilled') {
      if (graphResult.value) {
        ctx.graph.import(graphResult.value.symbols, graphResult.value.edges);
      }

      result.graph = 'ready';
    } else {
      result.errors.push(`graph: ${message(graphResult.reason)}`);
    }

    /*
     * Semantic initialization is deliberately last.
     * It can involve vector storage and embedding providers and must never
     * delay MCP initialize/tools-list.
     */
    try {
      const [{ SemanticCodeEngine }, { createEmbeddingProvider }] = await Promise.all([
        import('../code-intelligence/semantic/semantic-code-engine.js'),
        import('../embeddings/index.js'),
      ]);

      const semantic = new SemanticCodeEngine({
        projectId: ctx.project.id,
        rootPath: ctx.project.rootPath,
        model: process.env.HF_EMBEDDING_MODEL ?? 'sentence-transformers/all-MiniLM-L6-v2',
        storage,
        embeddings: createEmbeddingProvider(),
        graph: ctx.graph,
      });

      await semantic.initialize();

      /*
       * Expose semantic search only after initialization is complete.
       */
      ctx.codeSemantic = semantic;
      result.semantic = 'ready';
    } catch (error) {
      result.errors.push(`semantic: ${message(error)}`);
    }
  } catch (error) {
    result.errors.push(`storage: ${message(error)}`);
  }

  return result;
}
