import 'dotenv/config';

import { loadConfig } from '../../core/index.js';

import { createStorageProvider, withStorageRetry } from '../index.js';

function destination(key: string): string | null {
  let m: RegExpMatchArray | null;

  m = key.match(/^(projects\/[^/]+\/)memories\/(.+)$/);

  if (m) {
    return `${m[1]}memory/records/${m[2]}`;
  }

  m = key.match(/^(projects\/[^/]+\/)vectors\/(.+)$/);

  if (m) {
    return `${m[1]}memory/vectors/${m[2]}`;
  }

  m = key.match(/^(projects\/[^/]+\/)graph\/(.+)$/);

  if (m) {
    return `${m[1]}code/graph/${m[2]}`;
  }

  m = key.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);

  if (m) {
    return `${m[1]}memory/records/${m[2]}`;
  }

  m = key.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/);

  if (m) {
    return `${m[1]}memory/vectors/${m[2]}`;
  }

  m = key.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/);

  if (m) {
    return `${m[1]}code/graph/${m[2]}`;
  }

  return null;
}

async function main() {
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

  const objects = await storage.list('projects/');

  const oldObjects = objects
    .map((item) => ({
      from: item.key,

      to: destination(item.key),
    }))
    .filter(
      (
        item
      ): item is {
        from: string;
        to: string;
      } => Boolean(item.to)
    );

  let deleted = 0;

  for (const item of oldObjects) {
    const newExists = await storage.exists(item.to);

    if (!newExists) {
      throw new Error(`REFUSE DELETE: destination missing: ${item.to}`);
    }

    console.log(`DELETE OLD ${item.from}`);

    await storage.delete(item.from);

    deleted++;
  }

  console.log({
    ok: true,
    deleted,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
