import type {
  CodeSymbol,
  GraphEdge,
} from "../../core/types.js";

import type {
  CodeGraphStore,
} from "../graph/graph-store.js";

import type {
  ArchitectureEntryPoint,
  EntryPointKind,
} from "./types.js";

function normalize(
  value: string,
): string {
  return value
    .replaceAll("\\", "/")
    .toLowerCase();
}

export class EntryPointDetector {
  constructor(
    private readonly graph:
      CodeGraphStore,
  ) {}

  detect(
    projectId: string,
  ): ArchitectureEntryPoint[] {
    const symbols =
      this.graph.allSymbols(
        projectId,
      );

    const edges =
      this.graph.allEdges(
        projectId,
      );

    const results:
      ArchitectureEntryPoint[] =
      [];

    for (
      const symbol
      of symbols
    ) {
      /*
       * Route là entry semantic.
       * Các loại còn lại chỉ xét FILE node.
       */
      if (
        symbol.type !== "route" &&
        symbol.type !== "file"
      ) {
        continue;
      }

      const result =
        this.classify(
          symbol,
          edges,
        );

      if (result) {
        results.push({
          symbolId:
            symbol.id,

          filePath:
            symbol.filePath,

          name:
            symbol.name,

          kind:
            result.kind,

          score:
            result.score,

          reasons:
            result.reasons,
        });
      }
    }

    /*
     * Một file chỉ giữ entry tốt nhất.
     * Route vẫn giữ riêng theo symbol.
     */
    const bestByKey =
      new Map<
        string,
        ArchitectureEntryPoint
      >();

    for (
      const item
      of results
    ) {
      const key =
        item.kind === "route"
          ? item.symbolId
          : item.filePath;

      const existing =
        bestByKey.get(
          key,
        );

      if (
        !existing ||
        item.score >
          existing.score
      ) {
        bestByKey.set(
          key,
          item,
        );
      }
    }

    return [
      ...bestByKey.values(),
    ]
      .sort(
        (a, b) =>
          b.score -
            a.score ||
          a.filePath.localeCompare(
            b.filePath,
          ),
      );
  }

  private classify(
    symbol: CodeSymbol,
    edges: GraphEdge[],
  ): {
    kind: EntryPointKind;
    score: number;
    reasons: string[];
  } | null {
    const path =
      normalize(
        symbol.filePath,
      );

    const reasons:
      string[] = [];

    if (
      symbol.type ===
      "route"
    ) {
      return {
        kind:
          "route",

        score:
          100,

        reasons: [
          "HTTP route",
        ],
      };
    }

    let kind:
      EntryPointKind |
      null = null;

    let score =
      0;

    if (
      path.startsWith(
        "bin/",
      )
    ) {
      kind =
        "cli";

      score =
        100;

      reasons.push(
        "bin executable",
      );
    }

    else if (
      /(^|\/)(cli)\.[^.]+$/
        .test(path)
    ) {
      kind =
        "cli";

      score =
        90;

      reasons.push(
        "CLI entry file",
      );
    }

    else if (
      /(^|\/)(main|server)\.[^.]+$/
        .test(path)
    ) {
      kind =
        "main";

      score =
        90;

      reasons.push(
        "main/server file",
      );
    }

    else if (
      path.includes(
        "/runtime/",
      ) &&
      /(^|\/)(bootstrap|index)\.[^.]+$/
        .test(path)
    ) {
      kind =
        "runtime";

      score =
        75;

      reasons.push(
        "runtime bootstrap",
      );
    }

    else if (
      /(^|\/)index\.[^.]+$/
        .test(path)
    ) {
      /*
       * Chỉ package/public index có tín hiệu
       * dependency thực sự.
       */
      const incoming =
        edges.filter(
          (edge) =>
            edge.to ===
            symbol.id &&
            edge.type !==
            "DEFINES",
        ).length;

      const outgoing =
        edges.filter(
          (edge) =>
            edge.from ===
            symbol.id &&
            edge.type !==
            "DEFINES",
        ).length;

      if (
        path.startsWith(
          "packages/",
        ) ||
        incoming === 0 ||
        outgoing > 0
      ) {
        kind =
          "package";

        score =
          path.startsWith(
            "packages/",
          )
            ? 70
            : 55;

        reasons.push(
          "package/public index",
        );
      }
    }

    if (!kind) {
      return null;
    }

    const incoming =
      edges.filter(
        (edge) =>
          edge.to ===
          symbol.id &&
          edge.type !==
          "DEFINES",
      ).length;

    if (
      incoming === 0
    ) {
      score +=
        10;

      reasons.push(
        "no incoming dependency",
      );
    }

    return {
      kind,
      score,
      reasons,
    };
  }
}
