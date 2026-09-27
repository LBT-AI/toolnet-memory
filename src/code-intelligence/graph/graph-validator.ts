import type { CodeSymbol, GraphEdge } from '../../core/types.js';
import type { CodeGraphStore } from './graph-store.js';
import {
  EDGE_SEMANTIC_REGISTRY,
  type GraphEdgeType,
  getEdgeSemanticDefinition,
} from './edge-semantic-registry.js';

export interface GraphValidationError {
  edgeId: string;
  type:
    | 'missing_source'
    | 'missing_target'
    | 'cross_project'
    | 'invalid_type'
    | 'semantic_mismatch'
    | 'duplicate'
    | 'illegal_self_edge';
  message: string;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationError[];
  stats: {
    totalEdges: number;
    validEdges: number;
    invalidEdges: number;
    duplicates: number;
  };
}

export class GraphValidationFailure extends Error {
  constructor(public readonly result: GraphValidationResult) {
    super(
      `Graph validation failed: ${result.stats.invalidEdges} invalid of ${result.stats.totalEdges} edge(s)`
    );
    this.name = 'GraphValidationFailure';
  }
}

/**
 * Fail before persisting a corrupt semantic graph.
 *
 * A partially valid generation must never replace a valid one.
 */
export function assertValidGraph(graph: CodeGraphStore, projectId: string): GraphValidationResult {
  const result = new GraphValidator(graph).validate(projectId);
  if (!result.valid) {
    throw new GraphValidationFailure(result);
  }
  return result;
}

export class GraphValidator {
  constructor(private readonly graph: CodeGraphStore) {}

  validate(projectId: string): GraphValidationResult {
    const errors: GraphValidationError[] = [];
    let validEdges = 0;
    let duplicates = 0;

    const symbols = this.graph.allSymbols(projectId);
    const symbolById = new Map(symbols.map((s) => [s.id, s]));
    const edges = this.graph.allEdges(projectId);
    const seen = new Map<string, number>();

    for (const edge of edges) {
      if (edge.projectId !== projectId) {
        errors.push({
          edgeId: edge.id,
          type: 'cross_project',
          message: `Edge ${edge.id} belongs to project ${edge.projectId}, expected ${projectId}`,
        });
        continue;
      }

      const source = symbolById.get(edge.from);
      const target = symbolById.get(edge.to);

      if (!source) {
        errors.push({
          edgeId: edge.id,
          type: 'missing_source',
          message: `Missing source symbol: ${edge.from}`,
        });
        continue;
      }

      if (!target) {
        errors.push({
          edgeId: edge.id,
          type: 'missing_target',
          message: `Missing target symbol: ${edge.to}`,
        });
        continue;
      }

      const definition = getEdgeSemanticDefinition(edge.type as GraphEdgeType);
      if (!definition) {
        errors.push({
          edgeId: edge.id,
          type: 'invalid_type',
          message: `Unknown edge type: ${edge.type}`,
        });
        continue;
      }

      if (!definition.allowedSourceTypes.includes(source.type)) {
        errors.push({
          edgeId: edge.id,
          type: 'semantic_mismatch',
          message: `Edge type ${edge.type} does not allow source type ${source.type}`,
        });
        continue;
      }

      if (!definition.allowedTargetTypes.includes(target.type)) {
        errors.push({
          edgeId: edge.id,
          type: 'semantic_mismatch',
          message: `Edge type ${edge.type} does not allow target type ${target.type}`,
        });
        continue;
      }

      const key = `${edge.projectId}:${edge.from}:${edge.type}:${edge.to}`;
      const existing = seen.get(key);
      if (existing !== undefined) {
        duplicates++;
        errors.push({
          edgeId: edge.id,
          type: 'duplicate',
          message: `Duplicate edge: ${key}`,
        });
        continue;
      }
      seen.set(key, 1);

      validEdges++;
    }

    return {
      valid: errors.length === 0,
      errors,
      stats: {
        totalEdges: edges.length,
        validEdges,
        invalidEdges: errors.length,
        duplicates,
      },
    };
  }
}
