import 'dotenv/config';

import { loadConfig } from '../core/config.js';

import { createStorageProvider } from './provider.js';

async function main() {
  const config = loadConfig();

  const storage = createStorageProvider({
    provider: config.storage.provider,
    r2: config.storage.r2,
    s3: config.storage.s3,
    huggingface: config.storage.huggingface,
    localRoot: config.storage.localRoot,
  });

  const key = `_health/${Date.now()}.txt`;
  const value = `toolnet-memory:${new Date().toISOString()}`;

  await storage.put(key, value, 'text/plain');

  const result = await storage.getText(key);

  if (result !== value) {
    throw new Error('Storage read/write mismatch');
  }

  await storage.delete(key);

  console.log({
    ok: true,
    provider: storage.name,
    write: 'PASS',
    read: 'PASS',
    delete: 'PASS',
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
