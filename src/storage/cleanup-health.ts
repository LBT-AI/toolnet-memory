import 'dotenv/config';

import { loadConfig } from '../core/index.js';

import { createStorageProvider, withStorageRetry } from './index.js';

const config = loadConfig();

const storage = withStorageRetry(
  createStorageProvider({
    provider: config.storage.provider,

    huggingface: config.storage.huggingface,

    localRoot: config.storage.localRoot,
  }),
  {
    attempts: 3,
  }
);

const objects = await storage.list('_health/');

for (const object of objects) {
  await storage.delete(object.key);

  console.log(`deleted ${object.key}`);
}

console.log({
  ok: true,
  deleted: objects.length,
});
