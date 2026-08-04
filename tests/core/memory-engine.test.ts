import {
  describe,
  expect,
  it,
} from "vitest";

import {
  MemoryEngine,
} from "../../src/core/memory-engine.js";

describe(
  "MemoryEngine",
  () => {
    it(
      "stores and searches memory",
      () => {
        const engine =
          new MemoryEngine();

        engine.remember({
          projectId: "test",
          type: "decision",
          content:
            "Use PostgreSQL for persistent memory",
          tags: [
            "database",
          ],
        });

        const results =
          engine.search({
            projectId: "test",
            query:
              "PostgreSQL memory",
          });

        expect(
          results.length,
        ).toBe(1);

        expect(
          results[0]
            .memory.type,
        ).toBe(
          "decision",
        );
      },
    );

    it(
      "marks rules as high importance",
      () => {
        const engine =
          new MemoryEngine();

        const memory =
          engine.remember({
            projectId: "test",
            type: "rule",
            content:
              "Never edit production directly",
          });

        expect(
          memory.importanceScore,
        ).toBeGreaterThanOrEqual(
          75,
        );
      },
    );
  },
);
