import 'dotenv/config';

import { createHash } from 'node:crypto';

import { loadConfig } from '../../core/index.js';

import { createStorageProvider, withStorageRetry } from '../index.js';

function sha(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function destination(key: string): string | null {
  let match: RegExpMatchArray | null;

  /*
   * Current state
   */
  match = key.match(/^(projects\/[^/]+\/)memories\/(.+)$/);

  if (match) {
    return `${match[1]}memory/records/${match[2]}`;
  }

  match = key.match(/^(projects\/[^/]+\/)vectors\/(.+)$/);

  if (match) {
    return `${match[1]}memory/vectors/${match[2]}`;
  }

  match = key.match(/^(projects\/[^/]+\/)graph\/(.+)$/);

  if (match) {
    return `${match[1]}code/graph/${match[2]}`;
  }

  /*
   * Historical snapshots
   */
  match = key.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);

  if (match) {
    return `${match[1]}memory/records/${match[2]}`;
  }

  match = key.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/);

  if (match) {
    return `${match[1]}memory/vectors/${match[2]}`;
  }

  match = key.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/);

  if (match) {
    return `${match[1]}code/graph/${match[2]}`;
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

  const migrations = objects
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
      } => Boolean(item.to) && item.from !== item.to
    );

  console.log(`Objects to migrate: ${migrations.length}`);

  let copied = 0;

  let verified = 0;

  for (const item of migrations) {
    const source = await storage.getText(item.from);

    if (source === null || source === undefined) {
      throw new Error(`Cannot read ${item.from}`);
    }

    console.log(`COPY\n  ${item.from}\n  -> ${item.to}`);

    await storage.put(item.to, source, 'application/json');

    copied++;

    const target = await storage.getText(item.to);

    if (target === null || target === undefined) {
      throw new Error(`Cannot verify ${item.to}`);
    }

    if (sha(source) !== sha(target)) {
      throw new Error(`Checksum mismatch:\n${item.from}\n${item.to}`);
    }

    verified++;
  }

  console.log({
    ok: true,
    copied,
    verified,
    deleted: 0,
    message: 'Old objects intentionally preserved until build/tests pass.',
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
