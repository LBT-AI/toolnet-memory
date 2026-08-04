import type {
  CodeSymbol,
} from "../../core/types.js";

import {
  GraphQueryEngine,
} from "../../code-intelligence/query/graph-query-engine.js";

import type {
  MCPContext,
} from "../context.js";

export function resolveGraphSymbol(
  ctx: MCPContext,
  value: string,
): CodeSymbol | null {
  const direct =
    ctx.graph.getSymbol(
      value,
    );

  if (
    direct &&
    direct.projectId ===
      ctx.project.id
  ) {
    return direct;
  }

  const query =
    new GraphQueryEngine(
      ctx.graph,
    );

  const exact =
    query
      .findSymbols(
        ctx.project.id,
        value,
      )
      .find(
        (symbol) =>
          symbol.name ===
            value ||
          symbol.qualifiedName ===
            value,
      );

  if (exact) {
    return exact;
  }

  return (
    query.findSymbols(
      ctx.project.id,
      value,
    )[0] ??
    null
  );
}

export function compactSymbol(
  symbol: CodeSymbol,
) {
  return {
    id:
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

    endLine:
      symbol.endLine,
  };
}
