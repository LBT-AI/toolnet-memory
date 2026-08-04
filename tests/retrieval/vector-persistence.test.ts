import {
  mkdtemp,
  rm,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  MemoryEngine,
} from "../../src/core/memory-engine.js";

import {
  HashEmbeddingProvider,
} from "../../src/embeddings/local.js";

import {
  LocalStorageProvider,
} from "../../src/storage/local/client.js";

import {
  PersistentVectorStore,
} from "../../src/storage/vector-store.js";

import {
  VectorPersistenceManager,
} from "../../src/retrieval/vector/persistence.js";

import {
  VectorStore,
} from "../../src/retrieval/vector/vector-store.js";

describe(
  "Vector Persistence",
  () => {
    it(
      "loads existing vectors and only indexes new memories",
      async () => {
        const dir =
          await mkdtemp(
            join(
              tmpdir(),
              "toolnet-vector-",
            ),
          );

        try {
          const memory =
            new MemoryEngine();

          memory.remember({
            projectId:
              "test",

            type:
              "decision",

            content:
              "Use Hugging Face storage",
          });

          const storage =
            new LocalStorageProvider(
              dir,
            );

          const persistent =
            new PersistentVectorStore(
              storage,
            );

          const embeddings =
            new HashEmbeddingProvider();

          const firstStore =
            new VectorStore();

          const first =
            new VectorPersistenceManager(
              "test",
              "hash",
              embeddings,
              firstStore,
              persistent,
            );

          const firstStats =
            await first.initialize(
              memory.list(
                "test",
              ),
            );

          expect(
            firstStats.indexed,
          ).toBe(1);

          const secondStore =
            new VectorStore();

          const second =
            new VectorPersistenceManager(
              "test",
              "hash",
              embeddings,
              secondStore,
              persistent,
            );

          const secondStats =
            await second.initialize(
              memory.list(
                "test",
              ),
            );

          expect(
            secondStats.loaded,
          ).toBe(1);

          expect(
            secondStats.indexed,
          ).toBe(0);

          expect(
            secondStats.total,
          ).toBe(1);
        } finally {
          await rm(
            dir,
            {
              recursive: true,
              force: true,
            },
          );
        }
      },
    );
  },
);
