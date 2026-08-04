import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ProjectManager,
  MemoryEngine,
} from "../../src/core/index.js";

import {
  RetrievalEngine,
} from "../../src/retrieval/index.js";

import {
  CodeGraphStore,
  ReferenceResolver,
} from "../../src/code-intelligence/index.js";

import type {
  MCPContext,
} from "../../src/mcp/context.js";

import {
  traceCalls,
  analyzeImpact,
  findDependencies,
  getProjectArchitecture,
} from "../../src/mcp/tools/index.js";

describe(
  "MCP Code Intelligence",
  () => {
    function setup() {
      const project =
        new ProjectManager()
          .detect(
            process.cwd(),
          );

      const memory =
        new MemoryEngine();

      const retrieval =
        new RetrievalEngine(
          memory,
        );

      const graph =
        new CodeGraphStore();

      const fileA = {
        id: "file-a",
        projectId:
          project.id,
        name:
          "src/a.ts",
        qualifiedName:
          "src/a.ts",
        type:
          "file" as const,
        filePath:
          "src/a.ts",
      };

      const fileB = {
        id: "file-b",
        projectId:
          project.id,
        name:
          "src/b.ts",
        qualifiedName:
          "src/b.ts",
        type:
          "file" as const,
        filePath:
          "src/b.ts",
      };

      const fnA = {
        id: "fn-a",
        projectId:
          project.id,
        name:
          "main",
        qualifiedName:
          "main",
        type:
          "function" as const,
        filePath:
          "src/a.ts",
      };

      const fnB = {
        id: "fn-b",
        projectId:
          project.id,
        name:
          "save",
        qualifiedName:
          "save",
        type:
          "function" as const,
        filePath:
          "src/b.ts",
      };

      for (
        const symbol
        of [
          fileA,
          fileB,
          fnA,
          fnB,
        ]
      ) {
        graph.addSymbol(
          symbol,
        );
      }

      graph.addEdge({
        id:
          "import",

        projectId:
          project.id,

        from:
          fileA.id,

        to:
          fileB.id,

        type:
          "IMPORTS",
      });

      graph.addEdge({
        id:
          "call",

        projectId:
          project.id,

        from:
          fnA.id,

        to:
          fnB.id,

        type:
          "CALLS",
      });

      const ctx:
        MCPContext = {
        project,
        memory,
        retrieval,
        graph,

        references:
          new ReferenceResolver(
            graph,
          ),
      };

      return {
        ctx,
        fnB,
      };
    }

    it(
      "traces calls and impact",
      async () => {
        const {
          ctx,
          fnB,
        } = setup();

        const callers =
          await traceCalls(
            ctx,
            {
              symbolId:
                fnB.id,

              direction:
                "callers",
            },
          );

        expect(
          callers.results
            .some(
              (item) =>
                item.name ===
                "main",
            ),
        ).toBe(true);

        const impact =
          await analyzeImpact(
            ctx,
            {
              symbolId:
                fnB.id,
            },
          );

        expect(
          impact.found,
        ).toBe(true);

        expect(
          impact.impacts.length,
        ).toBeGreaterThan(0);
      },
    );

    it(
      "finds file dependencies",
      async () => {
        const {
          ctx,
        } = setup();

        const result =
          await findDependencies(
            ctx,
            {
              filePath:
                "src/a.ts",
            },
          );

        expect(
          result.found,
        ).toBe(true);

        expect(
          result.dependencies
            .some(
              (item) =>
                item.filePath ===
                "src/b.ts",
            ),
        ).toBe(true);
      },
    );

    it(
      "returns architecture",
      async () => {
        const {
          ctx,
        } = setup();

        const result =
          await getProjectArchitecture(
            ctx,
          );

        expect(
          result.architecture.files,
        ).toBe(2);

        expect(
          result.architecture.calls,
        ).toBe(1);

        expect(
          result.architecture.imports,
        ).toBe(1);
      },
    );
  },
);
