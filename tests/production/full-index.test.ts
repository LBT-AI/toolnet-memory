import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

describe(
  "Full project index pipeline",
  () => {
    it(
      "contains all intelligence stages in dependency order",
      () => {
        const source =
          readFileSync(
            "src/production/full-index.ts",
            "utf8",
          );

        const stages = [
          "test-index.ts",
          "test-resolution.ts",
          "test-rich-graph.ts",
          "test-semantic.ts",
          "test-architecture.ts",
          "test-analysis.ts",
          "test-visualization.ts",
        ];

        let last =
          -1;

        for (
          const stage
          of stages
        ) {
          const position =
            source.indexOf(
              stage,
            );

          expect(
            position,
          ).toBeGreaterThan(
            last,
          );

          last =
            position;
        }
      },
    );

    it(
      "does not create snapshots automatically",
      () => {
        const source =
          readFileSync(
            "src/production/full-index.ts",
            "utf8",
          );

        expect(
          source,
        ).not.toContain(
          "snapshot:create",
        );

        expect(
          source,
        ).not.toContain(
          "SnapshotManager",
        );
      },
    );

    it(
      "uses a project-local concurrency lock",
      () => {
        const source =
          readFileSync(
            "src/production/full-index.ts",
            "utf8",
          );

        expect(
          source,
        ).toContain(
          "index.lock",
        );

        expect(
          source,
        ).toContain(
          "wx",
        );
      },
    );
  },
);
