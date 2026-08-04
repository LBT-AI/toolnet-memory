import {
  CodeGraphStore,
} from "./graph-store.js";

export function getArchitecture(
  graph: CodeGraphStore,
  projectId: string,
) {
  const symbols =
    graph.allSymbols(
      projectId,
    );

  const edges =
    graph.allEdges(
      projectId,
    );

  const symbol =
    (type: string) =>
      symbols.filter(
        (item) =>
          item.type === type,
      ).length;

  const edge =
    (type: string) =>
      edges.filter(
        (item) =>
          item.type === type,
      ).length;

  return {
    files:
      symbol("file"),

    classes:
      symbol("class"),

    interfaces:
      symbol("interface"),

    functions:
      symbol("function"),

    methods:
      symbol("method"),

    properties:
      symbol("property"),

    routes:
      symbol("route"),

    symbols:
      symbols.length,

    edges:
      edges.length,

    calls:
      edge("CALLS"),

    callReferences:
      edge(
        "CALL_REFERENCE",
      ),

    imports:
      edge("IMPORTS"),

    inherits:
      edge("INHERITS"),

    implements:
      edge("IMPLEMENTS"),

    usesType:
      edge("USES_TYPE"),

    tests:
      edge("TESTS"),

    routeEdges:
      edge("ROUTE"),

    writes:
      edge("WRITES"),
  };
}
