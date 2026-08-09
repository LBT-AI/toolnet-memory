import type { CodeSymbol, GraphEdge } from '../../core/types.js';

export class CodeGraphStore {
  private readonly symbols = new Map<string, CodeSymbol>();

  private readonly edges = new Map<string, GraphEdge>();

  addSymbol(symbol: CodeSymbol): void {
    this.symbols.set(symbol.id, symbol);
  }

  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);
  }

  getSymbol(id: string): CodeSymbol | undefined {
    return this.symbols.get(id);
  }

  findByName(projectId: string, name: string): CodeSymbol[] {
    return [...this.symbols.values()].filter(
      (symbol) =>
        symbol.projectId === projectId && (symbol.name === name || symbol.qualifiedName === name)
    );
  }

  allSymbols(projectId: string): CodeSymbol[] {
    return [...this.symbols.values()].filter((symbol) => symbol.projectId === projectId);
  }

  allEdges(projectId: string): GraphEdge[] {
    return [...this.edges.values()].filter((edge) => edge.projectId === projectId);
  }

  import(symbols: CodeSymbol[], edges: GraphEdge[]): void {
    for (const symbol of symbols) {
      this.addSymbol(symbol);
    }

    for (const edge of edges) {
      this.addEdge(edge);
    }
  }

  clearProject(projectId: string): void {
    for (const [id, symbol] of this.symbols) {
      if (symbol.projectId === projectId) {
        this.symbols.delete(id);
      }
    }

    for (const [id, edge] of this.edges) {
      if (edge.projectId === projectId) {
        this.edges.delete(id);
      }
    }
  }
}
