import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
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
  RepositoryIndexer,
  SemanticCodeEngine,
} from "../../src/code-intelligence/index.js";

import {
  HashEmbeddingProvider,
} from "../../src/embeddings/local.js";

import {
  LocalStorageProvider,
} from "../../src/storage/local/client.js";

describe(
  "Semantic Code Search",
  () => {
    it(
      "chunks code, indexes vectors and retrieves relevant source",
      async () => {
        const dir =
          await mkdtemp(
            join(
              tmpdir(),
              "toolnet-semantic-",
            ),
          );

        const repo =
          join(
            dir,
            "repo",
          );

        const storageDir =
          join(
            dir,
            "storage",
          );

        await mkdir(
          repo,
          {
            recursive: true,
          },
        );

        try {
          await writeFile(
            join(
              repo,
              "auth.ts",
            ),
            `
export function authenticateUser(password: string) {
  if (!password) {
    throw new Error("login password required");
  }

  return true;
}
`,
          );

          await writeFile(
            join(
              repo,
              "storage.ts",
            ),
            `
export function uploadBackup() {
  return "remote bucket upload";
}
`,
          );

          const indexed =
            await new RepositoryIndexer()
              .index(
                "test",
                repo,
              );

          const storage =
            new LocalStorageProvider(
              storageDir,
            );

          const engine =
            new SemanticCodeEngine({
              projectId:
                "test",

              rootPath:
                repo,

              model:
                "hash-test",

              storage,

              embeddings:
                new HashEmbeddingProvider(),

              graph:
                indexed.graph,
            });

          const first =
            await engine.initialize();

          expect(
            first.chunks,
          ).toBeGreaterThan(
            0,
          );

          expect(
            first.vectorsIndexed,
          ).toBeGreaterThan(
            0,
          );

          const results =
            await engine.search(
              "login password authentication",
              3,
            );

          expect(
            results.length,
          ).toBeGreaterThan(
            0,
          );

          expect(
            results[0]
              .chunk
              .filePath,
          ).toBe(
            "auth.ts",
          );

          /*
           * Lần 2 không embed lại.
           */
          const secondEngine =
            new SemanticCodeEngine({
              projectId:
                "test",

              rootPath:
                repo,

              model:
                "hash-test",

              storage,

              embeddings:
                new HashEmbeddingProvider(),

              graph:
                indexed.graph,
            });

          const second =
            await secondEngine
              .initialize();

          expect(
            second.vectorsLoaded,
          ).toBeGreaterThan(
            0,
          );

          expect(
            second.vectorsIndexed,
          ).toBe(0);
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
