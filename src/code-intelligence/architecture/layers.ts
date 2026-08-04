import type {
  GraphEdge,
} from "../../core/types.js";

import type {
  CodeGraphStore,
} from "../graph/graph-store.js";

import type {
  ArchitectureLayer,
  ArchitectureLayerName,
} from "./types.js";

function normalize(
  value: string,
): string {
  return value
    .replaceAll("\\", "/")
    .toLowerCase();
}

const EDGE_WEIGHT:
  Partial<
    Record<
      GraphEdge["type"],
      number
    >
  > = {
  CALL_REFERENCE: 6,
  CALLS: 4,
  IMPORTS: 4,
  USES_TYPE: 4,
  WRITES: 5,
  INHERITS: 6,
  IMPLEMENTS: 6,
  ROUTE: 3,
  TESTS: 1,
};

export class LayerDetector {
  constructor(
    private readonly graph:
      CodeGraphStore,
  ) {}

  detect(
    projectId: string,
  ): ArchitectureLayer[] {
    const symbols =
      this.graph.allSymbols(
        projectId,
      );

    const edges =
      this.graph.allEdges(
        projectId,
      );

    const symbolById =
      new Map(
        symbols.map(
          (symbol) => [
            symbol.id,
            symbol,
          ],
        ),
      );

    const files =
      [
        ...new Set(
          symbols.map(
            (symbol) =>
              symbol.filePath,
          ),
        ),
      ].sort();

    const result =
      new Map<
        string,
        ArchitectureLayer
      >();

    /*
     * Phase 1:
     * deterministic path classification.
     */
    for (
      const filePath
      of files
    ) {
      result.set(
        filePath,
        this.classifyPath(
          filePath,
        ),
      );
    }

    /*
     * Phase 2:
     * propagate known layers through
     * dependency graph.
     *
     * Multiple passes giúp unknown -> known
     * lan truyền nhưng vẫn deterministic.
     */
    for (
      let pass = 0;
      pass < 3;
      pass++
    ) {
      let changed =
        false;

      for (
        const filePath
        of files
      ) {
        const current =
          result.get(
            filePath,
          );

        if (
          !current ||
          current.layer !==
          "unknown"
        ) {
          continue;
        }

        const votes =
          new Map<
            ArchitectureLayerName,
            number
          >();

        for (
          const edge
          of edges
        ) {
          const from =
            symbolById.get(
              edge.from,
            );

          const to =
            symbolById.get(
              edge.to,
            );

          if (
            !from ||
            !to ||
            from.filePath ===
              to.filePath
          ) {
            continue;
          }

          let neighbor:
            string |
            null = null;

          if (
            from.filePath ===
            filePath
          ) {
            neighbor =
              to.filePath;
          }

          else if (
            to.filePath ===
            filePath
          ) {
            neighbor =
              from.filePath;
          }

          if (!neighbor) {
            continue;
          }

          const neighborLayer =
            result.get(
              neighbor,
            );

          if (
            !neighborLayer ||
            neighborLayer.layer ===
              "unknown" ||
            neighborLayer.layer ===
              "tests"
          ) {
            continue;
          }

          const weight =
            EDGE_WEIGHT[
              edge.type
            ] ?? 1;

          votes.set(
            neighborLayer.layer,
            (
              votes.get(
                neighborLayer.layer,
              ) ?? 0
            ) + weight,
          );
        }

        const best =
          [
            ...votes.entries(),
          ]
            .sort(
              (a, b) =>
                b[1] -
                  a[1] ||
                a[0].localeCompare(
                  b[0],
                ),
            )[0];

        if (
          best &&
          best[1] >= 4
        ) {
          result.set(
            filePath,
            {
              filePath,

              layer:
                best[0],

              confidence:
                0.65,

              reasons: [
                `graph-neighbor vote=${best[1]}`,
              ],
            },
          );

          changed =
            true;
        }
      }

      if (!changed) {
        break;
      }
    }

    return files.map(
      (filePath) =>
        result.get(
          filePath,
        )!,
    );
  }

  private classifyPath(
    filePath: string,
  ): ArchitectureLayer {
    const path =
      normalize(
        filePath,
      );

    if (
      path.startsWith(
        "tests/",
      ) ||
      path.includes(
        "/tests/",
      ) ||
      path.includes(
        "__tests__",
      ) ||
      /\.(test|spec)\.[^.]+$/
        .test(path)
    ) {
      return {
        filePath,
        layer:
          "tests",
        confidence:
          1,
        reasons: [
          "test path",
        ],
      };
    }

    if (
      path.startsWith(
        "bin/",
      ) ||
      path.includes(
        "/mcp/",
      ) ||
      path.includes(
        "/cli/",
      ) ||
      path.includes(
        "/api/",
      ) ||
      path.includes(
        "/routes/",
      ) ||
      path.includes(
        "/hooks/"
      )
    ) {
      return {
        filePath,
        layer:
          "interface",
        confidence:
          0.9,
        reasons: [
          "interface boundary",
        ],
      };
    }

    if (
      path.includes(
        "/runtime/",
      ) ||
      path.includes(
        "/processor/",
      ) ||
      path.includes(
        "/retrieval/",
      ) ||
      path.includes(
        "/snapshot/",
      ) ||
      path.includes(
        "/code-intelligence/",
      )
    ) {
      return {
        filePath,
        layer:
          "application",
        confidence:
          0.85,
        reasons: [
          "application orchestration",
        ],
      };
    }

    if (
      path.includes(
        "/core/",
      ) ||
      path.includes(
        "/memory/",
      ) ||
      /(^|\/)types\.[^.]+$/
        .test(path)
    ) {
      return {
        filePath,
        layer:
          "domain",
        confidence:
          0.9,
        reasons: [
          "domain/core logic",
        ],
      };
    }

    if (
      path.includes(
        "/storage/",
      ) ||
      path.includes(
        "/production/",
      ) ||
      path.includes(
        "/security/",
      ) ||
      path.includes(
        "/config/",
      ) ||
      path.includes(
        "/utils/",
      )
    ) {
      return {
        filePath,
        layer:
          "infrastructure",
        confidence:
          0.85,
        reasons: [
          "infrastructure boundary",
        ],
      };
    }

    return {
      filePath,
      layer:
        "unknown",
      confidence:
        0.35,
      reasons: [],
    };
  }
}
