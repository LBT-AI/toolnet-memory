import 'dotenv/config';

import { loadConfig, ProjectManager } from '../core/index.js';

import { RepositoryIndexer, getArchitecture } from './index.js';

import {
  createStorageProvider,
  PersistentCodeGraphStore,
  ProjectScopedStorageProvider,
} from '../storage/index.js';

async function main() {
  const config = loadConfig();

  const project = new ProjectManager().detect();

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

  const result = await new RepositoryIndexer().index(project.id, project.rootPath);

  const architecture = getArchitecture(result.graph, project.id);

  const persistent = new PersistentCodeGraphStore(storage);

  await persistent.save({
    version: 1,

    projectId: project.id,

    updatedAt: new Date().toISOString(),

    files: result.files,

    symbols: result.graph.allSymbols(project.id),

    edges: result.graph.allEdges(project.id),
  });

  console.log({
    ok: true,
    storage: storage.name,
    ...architecture,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
