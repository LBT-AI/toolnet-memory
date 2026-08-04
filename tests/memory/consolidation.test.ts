import {
  describe,
  expect,
  it,
} from "vitest";

import {
  MemoryEngine,
} from "../../src/core/memory-engine.js";

import {
  MemoryConsolidator,
} from "../../src/memory/consolidator.js";

describe(
  "Memory Consolidation",
  () => {
    it(
      "consolidates activity memories into one summary",
      () => {
        const memory =
          new MemoryEngine();

        const contents = [
          "Modified file: src/auth.ts",
          "Modified file: src/login.ts",
          "Command: npm test",
          "Command: npm run build",
          "Error: temporary login failure",
        ];

        for (
          const content
          of contents
        ) {
          memory.remember({
            projectId:
              "test",

            type:
              "activity",

            content,

            importance:
              "temporary",
          });
        }

        const consolidator =
          new MemoryConsolidator(
            memory,
          );

        const result =
          consolidator.consolidate(
            "test",
            {
              minItems: 4,
            },
          );

        expect(
          result.summaryCreated,
        ).toBe(true);

        expect(
          result.consolidated,
        ).toBe(5);

        /*
         * 5 activity cũ đã superseded,
         * chỉ summary còn active.
         */
        const active =
          memory.list(
            "test",
          );

        expect(
          active.length,
        ).toBe(1);

        expect(
          active[0].type,
        ).toBe(
          "summary",
        );

        expect(
          active[0].content,
        ).toContain(
          "src/auth.ts",
        );

        expect(
          active[0].content,
        ).toContain(
          "npm test",
        );

        /*
         * Raw history vẫn tồn tại
         * để audit/retention.
         */
        expect(
          memory.listAll(
            "test",
          ).length,
        ).toBe(6);
      },
    );

    it(
      "does not consolidate when activity count is too small",
      () => {
        const memory =
          new MemoryEngine();

        memory.remember({
          projectId:
            "test",

          type:
            "activity",

          content:
            "Modified file: src/a.ts",
        });

        const result =
          new MemoryConsolidator(
            memory,
          ).consolidate(
            "test",
          );

        expect(
          result.summaryCreated,
        ).toBe(false);
      },
    );
  },
);
