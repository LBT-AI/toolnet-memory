/*
 * Phase 79 — deterministic runtime→static identity matching.
 *
 * Order of evidence, strongest first:
 *
 *   1. exact ToolNet symbol id
 *   2. qualified name (unique match only)
 *   3. file/module path + simple name (unique match only)
 *
 * A bare simple name is NEVER matched repository-wide, and there is no fuzzy,
 * prefix or embedding similarity anywhere. An ambiguous mapping is reported as
 * ambiguous instead of silently taking the first candidate.
 */

import type { CodeSymbol } from '../../core/types.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { RuntimeSymbolRef } from './types.js';

export type MatchBasis = 'symbol_id' | 'qualified_name' | 'path_name' | 'graph_name';

export type SymbolMatch =
  | { status: 'matched'; symbol: CodeSymbol; basis: MatchBasis }
  | { status: 'ambiguous'; candidates: number; basis: MatchBasis }
  | { status: 'unresolved' };

export interface SymbolMatchIndex {
  projectId: string;
  byId: Map<string, CodeSymbol>;
  byQualifiedName: Map<string, CodeSymbol[]>;
  byPathName: Map<string, CodeSymbol[]>;
  byName: Map<string, CodeSymbol[]>;
  services: CodeSymbol[];
}

const PATH_LIKE = /[/\\.]|\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|rb|cs|kt|php|swift)$/iu;

function pathNameKey(path: string, name: string): string {
  return `${path.replaceAll('\\', '/')}#${name}`;
}

export function buildSymbolMatchIndex(graph: CodeGraphStore, projectId: string): SymbolMatchIndex {
  const byId = new Map<string, CodeSymbol>();
  const byQualifiedName = new Map<string, CodeSymbol[]>();
  const byPathName = new Map<string, CodeSymbol[]>();
  const byName = new Map<string, CodeSymbol[]>();

  const services: CodeSymbol[] = [];

  const symbols = [...graph.allSymbols(projectId)].sort((left, right) =>
    left.id.localeCompare(right.id)
  );

  for (const symbol of symbols) {
    byId.set(symbol.id, symbol);

    if (symbol.qualifiedName) {
      const list = byQualifiedName.get(symbol.qualifiedName) ?? [];
      list.push(symbol);
      byQualifiedName.set(symbol.qualifiedName, list);
    }

    if (symbol.filePath && symbol.name) {
      const key = pathNameKey(symbol.filePath, symbol.name);

      const list = byPathName.get(key) ?? [];
      list.push(symbol);
      byPathName.set(key, list);
    }

    const nameList = byName.get(symbol.name) ?? [];
    nameList.push(symbol);
    byName.set(symbol.name, nameList);

    if (symbol.type === 'service' || symbol.type === 'route' || symbol.type === 'event') {
      services.push(symbol);
    }
  }

  return { projectId, byId, byQualifiedName, byPathName, byName, services };
}

function unique(map: Map<string, CodeSymbol[]>, key: string): CodeSymbol[] {
  return map.get(key) ?? [];
}

/**
 * Match a runtime symbol reference against the static graph.
 *
 * `graphNameFallback` allows the *graph side* of a relation to be resolved by
 * an exact graph name when the runtime side supplied only a name AND the graph
 * contains exactly one symbol with that name. When two or more symbols share
 * the name the match is ambiguous — never a first-match win.
 */
export function matchSymbolRef(
  index: SymbolMatchIndex,
  ref: RuntimeSymbolRef | undefined
): SymbolMatch {
  if (!ref) {
    return { status: 'unresolved' };
  }

  if (ref.symbolId) {
    const exact = index.byId.get(ref.symbolId);

    if (!exact) {
      /* An id that the tracked project does not know is an identity conflict. */
      return { status: 'unresolved' };
    }

    return { status: 'matched', symbol: exact, basis: 'symbol_id' };
  }

  const qualified =
    ref.qualifiedName ??
    (ref.module && ref.name && !PATH_LIKE.test(ref.module)
      ? `${ref.module}.${ref.name}`
      : undefined);

  if (qualified) {
    const candidates = unique(index.byQualifiedName, qualified);

    if (candidates.length === 1) {
      return { status: 'matched', symbol: candidates[0]!, basis: 'qualified_name' };
    }

    if (candidates.length > 1) {
      return { status: 'ambiguous', candidates: candidates.length, basis: 'qualified_name' };
    }
  }

  const path = ref.filePath ?? (ref.module && PATH_LIKE.test(ref.module) ? ref.module : undefined);

  if (path && ref.name) {
    const candidates = unique(index.byPathName, pathNameKey(path, ref.name));

    if (candidates.length === 1) {
      return { status: 'matched', symbol: candidates[0]!, basis: 'path_name' };
    }

    if (candidates.length > 1) {
      return { status: 'ambiguous', candidates: candidates.length, basis: 'path_name' };
    }
  }

  return { status: 'unresolved' };
}

/**
 * Match a symbol id that claims to belong to this project.
 * Returns the symbol only when the id both exists and belongs to `projectId`.
 */
export function matchOwnSymbol(index: SymbolMatchIndex, symbolId: string): CodeSymbol | undefined {
  const symbol = index.byId.get(symbolId);

  if (!symbol || symbol.projectId !== index.projectId) {
    return undefined;
  }

  return symbol;
}

export interface ServiceMatch {
  status: 'matched' | 'unresolved' | 'ambiguous';
  symbol?: CodeSymbol;
}

/**
 * Match an HTTP/RPC runtime target to a tracked service.
 *
 * Only explicit service identity or an exact service name matches. A host is
 * reduced to its first DNS label, which is then matched exactly — never
 * fuzzily and never by URL similarity.
 */
export function matchServiceRef(
  index: SymbolMatchIndex,
  ref: { serviceId?: string; host?: string }
): ServiceMatch {
  if (ref.serviceId) {
    const exact = index.byId.get(ref.serviceId);

    if (exact) {
      return { status: 'matched', symbol: exact };
    }

    const byName = index.byName.get(ref.serviceId) ?? [];

    const serviceNamed = byName.filter((symbol) => symbol.type === 'service');

    if (serviceNamed.length === 1) {
      return { status: 'matched', symbol: serviceNamed[0]! };
    }

    if (serviceNamed.length > 1) {
      return { status: 'ambiguous' };
    }

    return { status: 'unresolved' };
  }

  if (ref.host) {
    const label = ref.host.split(':')[0]!.split('.')[0]!.toLowerCase();

    const candidates = (index.byName.get(label) ?? []).filter(
      (symbol) => symbol.type === 'service'
    );

    if (candidates.length === 1) {
      return { status: 'matched', symbol: candidates[0]! };
    }

    if (candidates.length > 1) {
      return { status: 'ambiguous' };
    }
  }

  return { status: 'unresolved' };
}
