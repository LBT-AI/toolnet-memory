import type {
  CodeSymbol,
  GraphEdge,
} from "../../core/types.js";

import {
  EntryPointDetector,
} from "../architecture/entry-points.js";

import type {
  CodeGraphStore,
} from "../graph/graph-store.js";

import type {
  DeadCodeCandidate,
  DeadCodeConfidence,
} from "./types.js";

const USAGE_EDGES =
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
    "TESTS",
  ]);

function normalize(
  value: string,
): string {
  return value
    .replaceAll("\\", "/")
    .toLowerCase();
}

function isTestFile(
  filePath: string,
): boolean {
  const path =
    normalize(
      filePath,
    );

  return (
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
  );
}

function looksPublicApi(
  symbol: CodeSymbol,
): boolean {
  const path =
    normalize(
      symbol.filePath,
    );

  return (
    path.startsWith(
      "bin/",
    ) ||
    /(^|\/)index\.[^.]+$/
      .test(path) ||
    /(^|\/)(main|server|cli)\.[^.]+$/
      .test(path)
  );
}

export class DeadCodeAnalyzer {
  constructor(
    private readonly graph:
      CodeGraphStore,
  ) {}

  analyze(
    projectId: string,
  ): DeadCodeCandidate[] {
    const symbols =
      this.graph.allSymbols(
        projectId,
      );

    const edges =
      this.graph.allEdges(
        projectId,
      );

    const entrySymbols =
      new Set(
        new EntryPointDetector(
          this.graph,
        )
          .detect(
            projectId,
          )
          .map(
            (entry) =>
              entry.symbolId,
          ),
      );

    const candidates:
      DeadCodeCandidate[] =
      [];

    for (
      const symbol
      of symbols
    ) {
      if (
        ![
          "function",
          "method",
          "class",
          "interface",
          "property",
        ].includes(
          symbol.type,
        )
      ) {
        continue;
      }

      if (
        isTestFile(
          symbol.filePath,
        ) ||
        entrySymbols.has(
          symbol.id,
        ) ||
        looksPublicApi(
          symbol,
        )
      ) {
        continue;
      }

      const incoming =
        edges.filter(
          (edge) =>
            edge.to ===
              symbol.id &&
            USAGE_EDGES.has(
              edge.type,
            ),
        );

      if (
        incoming.length >
        0
      ) {
        continue;
      }

      const outgoing =
        edges.filter(
          (edge) =>
            edge.from ===
              symbol.id &&
            USAGE_EDGES.has(
              edge.type,
            ),
        );

      const reasons:
        string[] = [
        "no incoming usage edge",
      ];

      let score =
        50;

      if (
        symbol.type ===
        "function" ||
        symbol.type ===
        "method"
      ) {
        score +=
          20;

        reasons.push(
          "callable symbol",
        );
      }

      if (
        symbol.type ===
        "property"
      ) {
        score -=
          15;
      }

      if (
        outgoing.length ===
        0
      ) {
        score +=
          10;

        reasons.push(
          "no outgoing dependency",
        );
      }

      const path =
        normalize(
          symbol.filePath,
        );

      if (
        path.includes(
          "/internal/",
        )
      ) {
        score +=
          10;

        reasons.push(
          "internal implementation",
        );
      }

      if (
        symbol.name
          .startsWith(
            "_",
          )
      ) {
        score +=
          5;
      }

      const confidence:
        DeadCodeConfidence =
        score >= 75
          ? "high"
          : score >= 55
            ? "medium"
            : "low";

      candidates.push({
        symbolId:
          symbol.id,

        name:
          symbol.name,

        qualifiedName:
          symbol.qualifiedName,

        type:
          symbol.type,

        filePath:
          symbol.filePath,

        startLine:
          symbol.startLine,

        confidence,

        score,

        reasons,
      });
    }

    return candidates.sort(
      (a, b) =>
        b.score -
          a.score ||
        a.filePath.localeCompare(
          b.filePath,
        ) ||
        a.name.localeCompare(
          b.name,
        ),
    );
  }
}
