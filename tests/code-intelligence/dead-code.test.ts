import {
  describe,
  expect,
  it,
} from "vitest";

import {
  CodeGraphStore,
  DeadCodeAnalyzer,
} from "../../src/code-intelligence/index.js";

describe(
  "Dead Code Analyzer",
  () => {
    it(
      "finds unused implementation but excludes used symbols",
      () => {
        const graph =
          new CodeGraphStore();

        const projectId =
          "test";

        graph.addSymbol({
          id:
            "used",

          projectId,

          name:
            "used",

          qualifiedName:
            "used",

          type:
            "function",

          filePath:
            "src/service.ts",

          startLine:
            1,

          endLine:
            5,
        });

        graph.addSymbol({
          id:
            "unused",

          projectId,

          name:
            "unused",

          qualifiedName:
            "unused",

          type:
            "function",

          filePath:
            "src/service.ts",

          startLine:
            10,

          endLine:
            15,
        });

        graph.addSymbol({
          id:
            "caller",

          projectId,

          name:
            "caller",

          qualifiedName:
            "caller",

          type:
            "function",

          filePath:
            "src/caller.ts",

          startLine:
            1,

          endLine:
            5,
        });

        graph.addEdge({
          id:
            "call-used",

          projectId,

          from:
            "caller",

          to:
            "used",

          type:
            "CALL_REFERENCE",
        });

        const result =
          new DeadCodeAnalyzer(
            graph,
          ).analyze(
            projectId,
          );

        expect(
          result.some(
            (item) =>
              item.symbolId ===
              "unused",
          ),
        ).toBe(
          true,
        );

        expect(
          result.some(
            (item) =>
              item.symbolId ===
              "used",
          ),
        ).toBe(
          false,
        );
      },
    );
  },
);
