import type { CodeSymbol, GraphEdge } from '../../core/types.js';

export interface GraphQueryNode {
  symbol: CodeSymbol;
  depth: number;
  via?: GraphEdge;
}

export interface GraphPath {
  found: boolean;
  distance: number;
  symbols: CodeSymbol[];
  edges: GraphEdge[];
}

export interface GraphNeighborhood {
  center: CodeSymbol;
  incoming: GraphQueryNode[];
  outgoing: GraphQueryNode[];
}
