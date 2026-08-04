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
  RetrievalEngine,
} from "../../src/retrieval/retrieval-engine.js";

import {
  CodeGraphStore,
} from "../../src/code-intelligence/graph/graph-store.js";

import {
  LocalStorageProvider,
} from "../../src/storage/local/client.js";

import {
  MemoryStore,
} from "../../src/storage/memory-store.js";

import {
  HookRuntime,
  AutoContextBuilder,
  AutoRetrieval,
} from "../../src/hooks/index.js";

describe(
  "Auto Retrieval",
  () => {
    it(
      "injects compact project memory into agent prompt",
      async () => {
        const dir =
          await mkdtemp(
            join(
              tmpdir(),
              "toolnet-auto-",
            ),
          );

        try {
          const memory =
            new MemoryEngine();

          memory.remember({
            projectId:
              "test",

            type:
              "rule",

            content:
              "Không được sửa production trực tiếp",

            importance:
              "critical",
          });

          memory.remember({
            projectId:
              "test",

            type:
              "decision",

            content:
              "Dùng Hugging Face làm remote storage",

            importance:
              "high",
          });

          memory.remember({
            projectId:
              "test",

            type:
              "todo",

            content:
              "TODO thêm MCP integration",

            importance:
              "normal",
          });

          const retrieval =
            new RetrievalEngine(
              memory,
            );

          const graph =
            new CodeGraphStore();

          const storage =
            new LocalStorageProvider(
              dir,
            );

          const store =
            new MemoryStore(
              storage,
            );

          const runtime =
            new HookRuntime({
              projectId:
                "test",

              memory,

              memoryStore:
                store,
            });

          const builder =
            new AutoContextBuilder(
              memory,
              retrieval,
              graph,
            );

          const auto =
            new AutoRetrieval(
              runtime,
              builder,
              "test",
            );

          const result =
            await auto.prepare(
              "Tiếp tục phần storage",
            );

          expect(
            result.context,
          ).toContain(
            "Hugging Face",
          );

          expect(
            result.context,
          ).toContain(
            "production",
          );

          expect(
            result.augmentedPrompt,
          ).toContain(
            "<toolnet_memory>",
          );

          expect(
            result.augmentedPrompt,
          ).toContain(
            "Tiếp tục phần storage",
          );
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
