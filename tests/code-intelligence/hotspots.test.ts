import {
  describe,
  expect,
  it,
} from "vitest";

import {
  CodeGraphStore,
  HotspotAnalyzer,
} from "../../src/code-intelligence/index.js";

describe(
  "Hotspot Analyzer",
  () => {
    it(
      "ranks highly coupled files above simple files",
      () => {
        const graph =
          new CodeGraphStore();

        const projectId =
          "test";

        graph.addSymbol({
          id: "service",
          projectId,
          name: "Service",
          qualifiedName:
            "Service",
          type: "class",
          filePath:
            "src/service.ts",
          startLine: 1,
          endLine: 20,
        });

        graph.addSymbol({
          id: "caller-a",
          projectId,
          name: "callerA",
          qualifiedName:
            "callerA",
          type: "function",
          filePath:
            "src/a.ts",
          startLine: 1,
          endLine: 5,
        });

        graph.addSymbol({
          id: "caller-b",
          projectId,
          name: "callerB",
          qualifiedName:
            "callerB",
          type: "function",
          filePath:
            "src/b.ts",
          startLine: 1,
          endLine: 5,
        });

        graph.addEdge({
          id: "e1",
          projectId,
          from: "caller-a",
          to: "service",
          type:
            "CALL_REFERENCE",
        });

        graph.addEdge({
          id: "e2",
          projectId,
          from: "caller-b",
          to: "service",
          type:
            "CALL_REFERENCE",
        });

        const result =
          new HotspotAnalyzer(
            graph,
          ).analyze(
            projectId,
          );

        expect(
          result[0]
            ?.filePath,
        ).toBe(
          "src/service.ts",
        );

        expect(
          result[0]
            ?.incoming,
        ).toBe(2);
      },
    );
  },
);
