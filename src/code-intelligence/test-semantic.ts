import "dotenv/config";

import {
  loadConfig,
  ProjectManager,
} from "../core/index.js";

import {
  createStorageProvider,
  PersistentCodeGraphStore,
  ProjectScopedStorageProvider,
} from "../storage/index.js";

import {
  CodeGraphStore,
  SemanticCodeEngine,
} from "./index.js";

import {
  createEmbeddingProvider,
} from "../embeddings/index.js";

async function main() {
  const config =
    loadConfig();

  const project =
    new ProjectManager()
      .detect();

  const rawStorage =
    createStorageProvider({
      provider:
        config.storage.provider,

      huggingface:
        config.storage.huggingface,

      localRoot:
        config.storage.localRoot,
    });

  const storage =
    new ProjectScopedStorageProvider(
      rawStorage,
      project.id,
      project.name,
      project.remote ?? project.name,
    );


  const graph =
    new CodeGraphStore();

  const snapshot =
    await new PersistentCodeGraphStore(
      storage,
    ).load(
      project.id,
    );

  if (!snapshot) {
    throw new Error(
      "Code graph missing. Run npm run code:index:test first.",
    );
  }

  graph.import(
    snapshot.symbols,
    snapshot.edges,
  );

  const engine =
    new SemanticCodeEngine({
      projectId:
        project.id,

      rootPath:
        project.rootPath,

      model:
        process.env
          .HF_EMBEDDING_MODEL ??
        "sentence-transformers/all-MiniLM-L6-v2",

      storage,

      embeddings:
        createEmbeddingProvider(),

      graph,
    });

  const stats =
    await engine.initialize();

  const query =
    process.argv
      .slice(2)
      .join(" ") ||
    "memory storage hugging face";

  const results =
    await engine.search(
      query,
      5,
    );

  console.log({
    ok: true,
    query,
    ...stats,

    results:
      results.map(
        (item) => ({
          score:
            Number(
              item.score
                .toFixed(4),
            ),

          file:
            item.chunk.filePath,

          symbol:
            item.chunk.symbolName,

          lines:
            `${item.chunk.startLine}-${item.chunk.endLine}`,

          preview:
            item.chunk.content
              .replace(/\s+/g, " ")
              .slice(0, 140),
        }),
      ),
  });
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
