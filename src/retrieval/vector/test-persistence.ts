import 'dotenv/config';

import { MemoryEngine, ProjectManager, loadConfig } from '../../core/index.js';

import { createEmbeddingProvider } from '../../embeddings/index.js';

import {
  createStorageProvider,
  MemoryStore,
  PersistentVectorStore,
  ProjectScopedStorageProvider,
} from '../../storage/index.js';

import { VectorPersistenceManager, VectorStore } from './index.js';

async function main() {
  const config = loadConfig();

  const project = new ProjectManager().detect();

  const memory = new MemoryEngine();

  const rawStorage = createStorageProvider({
    provider: config.storage.provider,

    huggingface: config.storage.huggingface,

    localRoot: config.storage.localRoot,
  });

  const storage = new ProjectScopedStorageProvider(
    rawStorage,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  const memoryStore = new MemoryStore(storage);

  memory.importRecords(await memoryStore.load(project.id));

  const embeddings = createEmbeddingProvider();

  const vectors = new VectorStore();

  const persistence = new PersistentVectorStore(storage);

  const model = process.env.HF_EMBEDDING_MODEL ?? 'sentence-transformers/all-MiniLM-L6-v2';

  const manager = new VectorPersistenceManager(project.id, model, embeddings, vectors, persistence);

  const stats = await manager.initialize(memory.list(project.id));

  console.log({
    ok: true,
    memories: memory.list(project.id).length,

    ...stats,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
