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
  VectorHybridEngine,
} from "../../src/retrieval/vector-hybrid-engine.js";

describe(
  "Vector Hybrid Retrieval",
  () => {
    it(
      "indexes and retrieves memory",
      async () => {
        const memory =
          new MemoryEngine();

        memory.remember({
          projectId:
            "test",

          type:
            "decision",

          content:
            "Use Hugging Face Bucket for remote memory storage",

          importance:
            "high",
        });

        memory.remember({
          projectId:
            "test",

          type:
            "todo",

          content:
            "Implement authentication login screen",

          importance:
            "normal",
        });

        const engine =
          new VectorHybridEngine(
            memory,
            new HashEmbeddingProvider(),
          );

        const indexed =
          await engine.rebuild(
            "test",
          );

        expect(
          indexed,
        ).toBe(2);

        const results =
          await engine.search(
            "test",
            "remote memory storage",
            1,
          );

        expect(
          results.length,
        ).toBe(1);

        expect(
          results[0]
            .memory
            .content,
        ).toContain(
          "Hugging Face",
        );
      },
    );
  },
);
