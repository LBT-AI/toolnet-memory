import type { CodeSymbol } from '../../core/types.js';

import { CodeGraphStore } from '../graph/graph-store.js';

export class ReferenceResolver {
  constructor(private readonly graph: CodeGraphStore) {}

  findSymbol(projectId: string, name: string): CodeSymbol[] {
    return this.graph.findByName(projectId, name);
  }

  findCallers(projectId: string, symbolId: string): CodeSymbol[] {
    const callerIds = this.graph
      .allEdges(projectId)
      .filter((edge) => edge.type === 'CALLS' && edge.to === symbolId)
      .map((edge) => edge.from);

    return callerIds
      .map((id) => this.graph.getSymbol(id))
      .filter((symbol): symbol is CodeSymbol => Boolean(symbol));
  }
}
