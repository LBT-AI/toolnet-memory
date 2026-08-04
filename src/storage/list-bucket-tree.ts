import "dotenv/config";

import {
  loadConfig,
} from "../core/index.js";

import {
  createStorageProvider,
  withStorageRetry,
} from "./index.js";

function tree(keys: string[]) {
  const root: any = {};

  for (const key of keys) {
    let node = root;

    for (const part of key.split("/").filter(Boolean)) {
      node[part] ??= {};
      node = node[part];
    }
  }

  function print(node: any, prefix = "") {
    const entries = Object.keys(node).sort();

    entries.forEach((name, index) => {
      const last = index === entries.length - 1;

      console.log(
        `${prefix}${last ? "└── " : "├── "}${name}`
      );

      print(
        node[name],
        prefix + (last ? "    " : "│   ")
      );
    });
  }

  print(root);
}

async function main() {
  const config = loadConfig();

  const storage = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    { attempts: 3 },
  );

  const objects = await storage.list("");

  console.log(`Bucket: ${process.env.HF_BUCKET}`);
  console.log(`Objects: ${objects.length}\n`);

  tree(objects.map((x) => x.key));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
