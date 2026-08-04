import type {
  CodeSymbol,
} from "../../core/types.js";

import {
  CodeGraphStore,
} from "./graph-store.js";

export interface TraceNode {
  symbol: CodeSymbol;
  depth: number;
}

export class CallGraphTracer {
  constructor(
    private readonly graph:
      CodeGraphStore,
  ) {}

  callees(
    projectId: string,
    symbolId: string,
    maxDepth = 3,
  ): TraceNode[] {
    return this.walk(
      projectId,
      symbolId,
      "out",
      maxDepth,
    );
  }

  callers(
    projectId: string,
    symbolId: string,
    maxDepth = 3,
  ): TraceNode[] {
    return this.walk(
      projectId,
      symbolId,
      "in",
      maxDepth,
    );
  }

  private walk(
    projectId: string,
    startId: string,
    direction:
      | "in"
      | "out",
    maxDepth: number,
  ): TraceNode[] {
    const result:
      TraceNode[] = [];

    const visited =
      new Set<string>([
        startId,
      ]);

    const queue = [
      {
        id:
          startId,

        depth:
          0,
      },
    ];

    const edges =
      this.graph
        .allEdges(
          projectId,
        )
        .filter(
          (edge) =>
            edge.type === "CALLS" ||
            edge.type === "CALL_REFERENCE",
        );

    while (
      queue.length
    ) {
      const current =
        queue.shift()!;

      if (
        current.depth >=
        maxDepth
      ) {
        continue;
      }

      const related =
        direction ===
          "out"
          ? edges.filter(
              (edge) =>
                edge.from ===
                current.id,
            )
          : edges.filter(
              (edge) =>
                edge.to ===
                current.id,
            );

      for (
        const edge
        of related
      ) {
        const nextId =
          direction ===
            "out"
            ? edge.to
            : edge.from;

        if (
          visited.has(
            nextId,
          )
        ) {
          continue;
        }

        visited.add(
          nextId,
        );

        const symbol =
          this.graph.getSymbol(
            nextId,
          );

        if (!symbol) {
          continue;
        }

        const depth =
          current.depth + 1;

        result.push({
          symbol,
          depth,
        });

        queue.push({
          id:
            nextId,
          depth,
        });
      }
    }

    return result;
  }
}
