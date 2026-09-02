import { createHash } from 'node:crypto';

import type { CodeSymbol, GraphEdge } from '../../core/types.js';

export interface GraphRepairOptions {
  projectId: string;
  previousSymbols: readonly CodeSymbol[];
  previousEdges: readonly GraphEdge[];
  currentSymbols: readonly CodeSymbol[];
  rebuiltSourceFiles: ReadonlySet<string>;
  removedFiles: ReadonlySet<string>;
}

function cleanPath(value: string): string {
  return value.replaceAll('\\', '/');
}

function edgeId(projectId: string, from: string, type: string, to: string): string {
  return createHash('sha256')
    .update(`${projectId}:${from}:${type}:${to}`)
    .digest('hex')
    .slice(0, 24);
}

function stableSymbolIdentity(symbol: CodeSymbol): string {
  return [cleanPath(symbol.filePath), symbol.type, symbol.qualifiedName ?? symbol.name].join('\0');
}

function uniqueSymbolsByIdentity(symbols: readonly CodeSymbol[]): Map<string, CodeSymbol> {
  const grouped = new Map<string, CodeSymbol[]>();

  for (const symbol of symbols) {
    const identity = stableSymbolIdentity(symbol);

    const list = grouped.get(identity) ?? [];

    list.push(symbol);

    grouped.set(identity, list);
  }

  const output = new Map<string, CodeSymbol>();

  for (const [identity, list] of grouped) {
    if (list.length !== 1) {
      continue;
    }

    output.set(identity, list[0]!);
  }

  return output;
}

export function buildStableSymbolRemap(
  previousSymbols: readonly CodeSymbol[],
  currentSymbols: readonly CodeSymbol[]
): Map<string, string> {
  const previous = uniqueSymbolsByIdentity(previousSymbols);

  const current = uniqueSymbolsByIdentity(currentSymbols);

  const output = new Map<string, string>();

  for (const [identity, oldSymbol] of previous) {
    const newSymbol = current.get(identity);

    if (!newSymbol) {
      continue;
    }

    output.set(oldSymbol.id, newSymbol.id);
  }

  return output;
}

export function repairPreservedEdges(options: GraphRepairOptions): GraphEdge[] {
  const previousSymbol = new Map(options.previousSymbols.map((symbol) => [symbol.id, symbol]));

  const currentIds = new Set(options.currentSymbols.map((symbol) => symbol.id));

  const remap = buildStableSymbolRemap(options.previousSymbols, options.currentSymbols);

  const output: GraphEdge[] = [];

  for (const edge of options.previousEdges) {
    const oldFrom = previousSymbol.get(edge.from);

    const oldTo = previousSymbol.get(edge.to);

    if (!oldFrom || !oldTo) {
      continue;
    }

    const sourceFile = cleanPath(oldFrom.filePath);

    const targetFile = cleanPath(oldTo.filePath);

    /*
     * All outgoing relationships from reparsed files
     * are rebuilt by GraphBuilder.
     */
    if (options.rebuiltSourceFiles.has(sourceFile)) {
      continue;
    }

    if (options.removedFiles.has(sourceFile) || options.removedFiles.has(targetFile)) {
      continue;
    }

    const from = currentIds.has(edge.from) ? edge.from : remap.get(edge.from);

    const to = currentIds.has(edge.to) ? edge.to : remap.get(edge.to);

    /*
     * No proof of current endpoint identity:
     * drop instead of retaining a dangling/stale edge.
     */
    if (!from || !to || !currentIds.has(from) || !currentIds.has(to)) {
      continue;
    }

    output.push({
      ...edge,
      id: edgeId(options.projectId, from, edge.type, to),
      from,
      to,
    });
  }

  return output;
}
