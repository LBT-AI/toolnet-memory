import "dotenv/config";

import {
  createEmbeddingProvider,
} from "./embedder.js";

async function main() {
  const provider =
    createEmbeddingProvider();

  const vector =
    await provider.embed(
      "ToolNet Memory semantic search",
    );

  console.log({
    ok: vector.length > 0,
    provider:
      provider.name,

    dimensions:
      vector.length,

    sample:
      vector.slice(
        0,
        5,
      ),
  });
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
