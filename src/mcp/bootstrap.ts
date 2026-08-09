import 'dotenv/config';

import { loadConfig, MemoryEngine, ProjectManager } from '../core/index.js';

import { RetrievalEngine } from '../retrieval/retrieval-engine.js';

import { createEmbeddingProvider } from '../embeddings/index.js';

import {
  CodeGraphStore,
  ReferenceResolver,
  SemanticCodeEngine,
} from '../code-intelligence/index.js';

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
  MemoryStore,
  PersistentCodeGraphStore,
} from '../storage/index.js';

import { startMCPServer } from './server.js';

import { ProjectLock } from '../production/project-lock.js';

async function main() {
  const config = loadConfig();

  const project = new ProjectManager().detect();

  const rawStorage = createStorageProvider({
    provider: config.storage.provider,

    huggingface: config.storage.huggingface,

    localRoot: config.storage.localRoot,
  });

  const retryStorage = withStorageRetry(rawStorage, {
    attempts: Number(process.env.TOOLNET_STORAGE_RETRIES ?? 3),
  });

  const storage = new ProjectScopedStorageProvider(
    retryStorage,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  const processLock = new ProjectLock(project.id);

  await processLock.acquire();

  const stop = () => {
    void processLock.release().finally(() => process.exit(0));
  };

  process.once('SIGINT', stop);

  process.once('SIGTERM', stop);

  const memory = new MemoryEngine();

  const memoryStore = new MemoryStore(storage);

  memory.importRecords(await memoryStore.load(project.id));

  const retrieval = new RetrievalEngine(memory);

  const graph = new CodeGraphStore();

  const graphSnapshot = await new PersistentCodeGraphStore(storage).load(project.id);

  if (graphSnapshot) {
    graph.import(graphSnapshot.symbols, graphSnapshot.edges);
  }

  const references = new ReferenceResolver(graph);

  const codeSemantic = new SemanticCodeEngine({
    projectId: project.id,

    rootPath: project.rootPath,

    model: process.env.HF_EMBEDDING_MODEL ?? 'sentence-transformers/all-MiniLM-L6-v2',

    storage,

    embeddings: createEmbeddingProvider(),

    graph,
  });

  await codeSemantic.initialize();

  await startMCPServer({
    project,
    memory,
    retrieval,
    graph,
    references,
    codeSemantic,
    memoryStore,
    storage,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
