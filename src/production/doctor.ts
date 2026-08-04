import "dotenv/config";

import {
  loadConfig,
  ProjectManager,
} from "../core/index.js";

import {
  createStorageProvider,
  withStorageRetry,
  MemoryStore,
  PersistentCodeGraphStore,
  PersistentVectorStore,
  PersistentCodeChunkStore,
  PersistentCodeVectorStore,
} from "../storage/index.js";

import {
  createEmbeddingProvider,
} from "../embeddings/index.js";

import {
  SnapshotManager,
} from "../snapshot/index.js";

import {
  checkProductionConfig,
} from "./config-check.js";

import {
  ProductionHealth,
} from "./health.js";

async function main() {
  const configCheck =
    checkProductionConfig();

  if (
    !configCheck.ok
  ) {
    console.log({
      ok: false,
      config:
        configCheck,
    });

    process.exit(1);
  }

  const config =
    loadConfig();

  const project =
    new ProjectManager()
      .detect();

  const storage =
    withStorageRetry(
      createStorageProvider({
        provider:
          config.storage.provider,

        huggingface:
          config.storage.huggingface,

        localRoot:
          config.storage.localRoot,
      }),
      {
        attempts: 3,
      },
    );

  const embeddings =
    createEmbeddingProvider();

  const health =
    await new ProductionHealth(
      storage,
      embeddings,
    ).run();

  const memories =
    await new MemoryStore(
      storage,
    ).load(
      project.id,
    );

  const graph =
    await new PersistentCodeGraphStore(
      storage,
    ).load(
      project.id,
    );

  const vectors =
    await new PersistentVectorStore(
      storage,
    ).load(
      project.id,
    );

  const chunks =
    await new PersistentCodeChunkStore(
      storage,
    ).load(
      project.id,
    );

  const codeVectors =
    await new PersistentCodeVectorStore(
      storage,
    ).load(
      project.id,
    );

  const snapshots =
    await new SnapshotManager(
      storage,
    ).list(
      project.id,
    );

  console.log({
    ok:
      health.ok,

    project:
      project.name,

    storage:
      health.storage,

    embedding:
      health.embedding,

    memory:
      memories.length,

    graphSymbols:
      graph?.symbols.length ?? 0,

    graphEdges:
      graph?.edges.length ?? 0,

    memoryVectors:
      vectors?.records.length ?? 0,

    codeChunks:
      chunks?.chunks.length ?? 0,

    codeVectors:
      codeVectors?.records.length ?? 0,

    snapshots:
      snapshots.length,

    warnings:
      configCheck.warnings,
  });

  if (
    !health.ok
  ) {
    process.exit(1);
  }
}

main().catch(
  (error) => {
    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exit(1);
  },
);
