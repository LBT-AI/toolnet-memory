import {
  describe,
  expect,
  it,
} from "vitest";

import {
  CodeGraphStore,
  ImpactGuard,
} from "../../src/code-intelligence/index.js";

import {
  AutoImpactGuard,
} from "../../src/hooks/auto-impact-guard.js";

describe(
  "Automatic Impact Guard",
  () => {
    function setup() {
      const graph =
        new CodeGraphStore();

      const symbols = [
        {
          id: "storage-file",
          projectId: "test",
          name: "src/storage.ts",
          qualifiedName:
            "src/storage.ts",
          type: "file" as const,
          filePath:
            "src/storage.ts",
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
        id: "defines",
        projectId: "test",
        from: "storage-file",
        to: "save",
        type: "DEFINES",
      });

      graph.addEdge({
        id: "call1",
        projectId: "test",
        from: "service",
        to: "save",
        type: "CALLS",
      });

      graph.addEdge({
        id: "call2",
        projectId: "test",
        from: "controller",
        to: "service",
        type: "CALLS",
      });

      return new AutoImpactGuard(
        new ImpactGuard(
          graph,
        ),
        "test",
      );
    }

    it(
      "automatically guards write tools",
      async () => {
        const guard =
          setup();

        const result =
          await guard.beforeTool(
            "write_file",
            {
              filePath:
                "src/storage.ts",
            },
          );

        expect(
          result.triggered,
        ).toBe(true);

        expect(
          result.impactedFiles,
        ).toContain(
          "src/service.ts",
        );

        expect(
          result.context,
        ).toContain(
          "TOOLNET IMPACT GUARD",
        );
      },
    );

    it(
      "extracts files from apply_patch",
      async () => {
        const guard =
          setup();

        const result =
          await guard.beforeTool(
            "apply_patch",
            {
              patch: `
*** Begin Patch
*** Update File: src/storage.ts
@@
-old
+new
*** End Patch
`,
            },
          );

        expect(
          result.triggered,
        ).toBe(true);

        expect(
          result.files[0]
            .filePath,
        ).toBe(
          "src/storage.ts",
        );
      },
    );

    it(
      "does nothing for read tools",
      async () => {
        const guard =
          setup();

        const result =
          await guard.beforeTool(
            "read_file",
            {
              filePath:
                "src/storage.ts",
            },
          );

        expect(
          result.triggered,
        ).toBe(false);
      },
    );
  },
);
