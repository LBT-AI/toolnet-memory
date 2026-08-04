import type {
  GraphEdge,
} from "../../core/types.js";

import type {
  CodeGraphStore,
} from "../graph/graph-store.js";

import type {
  FileDependency,
} from "./types.js";

const EDGE_TYPES =
  new Set<
    GraphEdge["type"]
  >([
    "CALLS",
    "CALL_REFERENCE",
    "IMPORTS",
    "USES_TYPE",
    "WRITES",
    "INHERITS",
    "IMPLEMENTS",
    "ROUTE",
  ]);

export class DependencyAnalyzer {
  constructor(
    private readonly graph:
      CodeGraphStore,
  ) {}

  analyze(
    projectId: string,
  ): FileDependency[] {
    const symbols =
      this.graph.allSymbols(
        projectId,
      );

    const edges =
      this.graph
        .allEdges(
          projectId,
        )
        .filter(
          (edge) =>
            EDGE_TYPES.has(
              edge.type,
            ),
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

    return files.map(
      (filePath) => {
        const dependencies =
          new Set<string>();

        const dependents =
          new Set<string>();

        let outgoingEdges =
          0;

        let incomingEdges =
          0;

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

          if (
            from.filePath ===
            filePath
          ) {
            dependencies.add(
              to.filePath,
            );

            outgoingEdges++;
          }

          if (
            to.filePath ===
            filePath
          ) {
            dependents.add(
              from.filePath,
            );

            incomingEdges++;
          }
        }

        return {
          filePath,

          dependencies:
            [
              ...dependencies,
            ].sort(),

          dependents:
            [
              ...dependents,
            ].sort(),

          outgoingEdges,
          incomingEdges,
        };
      },
    );
  }
}
