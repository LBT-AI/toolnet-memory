import {
  describe,
  expect,
  it,
} from "vitest";

import {
  CodeGraphStore,
  ChangeMapper,
  BlastRadiusAnalyzer,
} from "../../src/code-intelligence/index.js";

describe(
  "Impact Guard",
  () => {
    it(
      "maps changed symbol and calculates reverse blast radius",
      () => {
        const graph =
          new CodeGraphStore();

        const symbols = [
          {
            id: "storage-file",
            projectId: "test",
            name: "storage.ts",
            qualifiedName:
              "storage.ts",
            type:
              "file" as const,
            filePath:
              "src/storage.ts",
            startLine: 1,
            endLine: 100,
          },
          {
            id: "save",
            projectId: "test",
            name: "save",
            qualifiedName:
              "save",
            type:
              "function" as const,
            filePath:
              "src/storage.ts",
            startLine: 10,
            endLine: 20,
          },
          {
            id: "service",
            projectId: "test",
            name: "service",
            qualifiedName:
              "service",
            type:
              "function" as const,
            filePath:
              "src/service.ts",
            startLine: 1,
            endLine: 20,
          },
          {
            id: "controller",
            projectId: "test",
            name: "controller",
            qualifiedName:
              "controller",
            type:
              "function" as const,
            filePath:
              "src/controller.ts",
            startLine: 1,
            endLine: 20,
          },
        ];

        for (
          const symbol
          of symbols
        ) {
          graph.addSymbol(
            symbol,
          );
        }

        graph.addEdge({
          id: "e1",
          projectId: "test",
          from: "service",
          to: "save",
          type: "CALLS",
        });

        graph.addEdge({
          id: "e2",
          projectId: "test",
          from: "controller",
          to: "service",
          type: "CALLS",
        });

        const changed =
          new ChangeMapper(
            graph,
          ).map(
            "test",
            [
              {
                filePath:
                  "src/storage.ts",

                status:
                  "modified",

                ranges: [
                  {
                    startLine: 12,
                    endLine: 13,
                  },
                ],
              },
            ],
          );

        expect(
          changed.some(
            (item) =>
              item.symbol.id ===
              "save",
          ),
        ).toBe(true);

        const result =
          new BlastRadiusAnalyzer(
            graph,
          ).analyze(
            "test",
            changed,
          );

        expect(
          result.impactedFiles,
        ).toContain(
          "src/service.ts",
        );

        expect(
          result.impactedFiles,
        ).toContain(
          "src/controller.ts",
        );

        expect(
          result.riskScore,
        ).toBeGreaterThan(0);
      },
    );
  },
);
