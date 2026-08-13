import 'dotenv/config';

import { loadConfig, MemoryEngine, ProjectManager } from '../core/index.js';

import { RetrievalEngine } from '../retrieval/retrieval-engine.js';

import {
  createStorageProvider,
  MemoryStore,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

import { MemoryHubService, MemoryHubStore } from '../hub/index.js';

import { WikiService, WikiStore } from '../wiki/index.js';

import { createApiServer } from './server.js';

const HOST = process.env.TOOLNET_API_HOST ?? '127.0.0.1';

const PORT = Number(process.env.TOOLNET_API_PORT ?? 9750);

async function main(): Promise<void> {
  const config = loadConfig();

  const project = new ProjectManager().detect();

  const rawStorage = createStorageProvider({
    provider: config.storage.provider,
    r2: config.storage.r2,
    s3: config.storage.s3,
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

  const hubStore = new MemoryHubStore(
    storage,
    project,
    process.env.TOOLNET_HUB_OWNER?.trim() || 'owner'
  );

  const hub = new MemoryHubService(hubStore, Number(process.env.TOOLNET_HUB_MAX_EVENTS ?? 100));

  await hub.initialize();

  const wikiStore = new WikiStore(storage, project);

  const wiki = new WikiService(wikiStore);

  await wiki.initialize();

  const memory = new MemoryEngine();

  const memoryStore = new MemoryStore(storage);

  memory.importRecords(await memoryStore.load(project.id));

  const retrieval = new RetrievalEngine(memory);

  const server = createApiServer({
    project,
    retrieval,
    token: process.env.TOOLNET_API_TOKEN?.trim() || undefined,
    hub,
    wiki,
  });

  server.listen(PORT, HOST, () => {
    console.log('ToolNet Memory API');
    console.log(`Project: ${project.name}`);
    console.log(`Listening: http://${HOST}:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
