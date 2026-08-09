import 'dotenv/config';

import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
  PersistentCodeGraphStore,
  PersistentTypeResolutionStore,
} from '../storage/index.js';

import { CodeGraphStore, RichGraphEnricher, getArchitecture } from './index.js';

async function main() {
  const config = loadConfig();

  const project = new ProjectManager().detect();

  const raw = withStorageRetry(
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
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  const store = new PersistentCodeGraphStore(storage);

  const snapshot = await store.load(project.id);

  if (!snapshot) {
    throw new Error('Code graph missing');
  }

  const graph = new CodeGraphStore();

  graph.import(snapshot.symbols, snapshot.edges);

  const resolution = await new PersistentTypeResolutionStore(storage).load(project.id);

  const stats = new RichGraphEnricher(graph).enrich(project.id, project.rootPath, resolution);

  const symbols = graph.allSymbols(project.id);

  const edges = graph.allEdges(project.id);

  await store.save({
    version: 1,

    projectId: project.id,

    updatedAt: new Date().toISOString(),

    files: symbols.filter((item) => item.type === 'file').length,

    symbols,
    edges,
  });

  console.log({
    ok: true,

    project: project.name,

    added: stats,

    architecture: getArchitecture(graph, project.id),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
