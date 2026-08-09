import 'dotenv/config';

import { loadConfig } from '../core/index.js';

import { createStorageProvider, withStorageRetry } from './index.js';

function tree(keys: string[]) {
  const root: Record<string, any> = {};

  for (const key of keys) {
    let node = root;

    for (const part of key.split('/').filter(Boolean)) {
      node[part] ??= {};
      node = node[part];
    }
  }

  function print(node: Record<string, any>, prefix = '') {
    const entries = Object.keys(node).sort();

    entries.forEach((name, index) => {
      const last = index === entries.length - 1;

      console.log(`${prefix}${last ? '└── ' : '├── '}${name}`);

      print(node[name], prefix + (last ? '    ' : '│   '));
    });
  }

  print(root);
}

async function main() {
  const config = loadConfig();

  const storage = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      r2: config.storage.r2,
      s3: config.storage.s3,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    { attempts: 3 }
  );

  const objects = await storage.list('');

  const bucket =
    config.storage.provider === 'r2'
      ? config.storage.r2.bucket
      : config.storage.provider === 's3'
        ? config.storage.s3.bucket
        : config.storage.provider === 'huggingface'
          ? config.storage.huggingface.bucket
          : 'local';

  console.log(`Provider: ${storage.name}`);
  console.log(`Bucket: ${bucket ?? 'unknown'}`);
  console.log(`Objects: ${objects.length}\n`);

  tree(objects.map((x) => x.key));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
