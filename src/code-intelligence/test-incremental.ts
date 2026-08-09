import 'dotenv/config';

import { loadConfig, ProjectManager } from '../core/index.js';

import { createStorageProvider, ProjectScopedStorageProvider } from '../storage/index.js';

import { IncrementalRepositoryIndexer } from './incremental/incremental-indexer.js';

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

  const result = await new IncrementalRepositoryIndexer(storage).index(
    project.id,
    project.rootPath
  );

  console.log({
    ok: true,
    storage: storage.name,
    ...result,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
