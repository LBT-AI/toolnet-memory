/*
 * Phase 74 — TGQL executor.
 *
 * Bounded, deterministic, read-only. Every loop checks the AbortSignal and the
 * shared expansion budget. Nothing here can mutate a graph: the executor only
 * receives a ReadableGraph.
 */

import type { ReadableGraph } from './adapter.js';

import { MAX_EXPANSIONS } from './limits.js';

import { assertNotAborted, expandEdge, type TraversalState } from './traversal.js';

import {
  QueryError,
  QUERY_NODE_TYPES,
  type EdgePattern,
  type MatchPattern,
  type QueryAst,
  type QueryEdge,
  type QueryEdgeOutput,
  type QueryEdgeType,
  type QueryExpression,
  type QueryNode,
  type QueryNodeOutput,
  type QueryOperand,
  type QueryParameters,
  type QueryPathOutput,
  type QueryPropertyValue,
  type QueryRow,
  type QueryRowValue,
} from './types.js';

import type { ValidatedQuery } from './validator.js';

export interface ExecuteOptions {
  ast: QueryAst;
  validated: ValidatedQuery;
  parameters: QueryParameters;
  graph: ReadableGraph;
  rowLimit: number;
  offset: number;
  signal?: AbortSignal;
  maxRows?: number;
}

export interface ExecuteResult {
  columns: string[];
  rows: QueryRow[];
  truncated: boolean;
  nextOffset?: number;
  expansions: number;
}

interface PatternPath {
  nodes: QueryNode[];
  edges: QueryEdge[];
}

interface PatternBinding {
  nodes: Map<string, QueryNode>;
  paths: Map<string, PatternPath>;
}

function propertyValue(node: QueryNode, property: string): QueryPropertyValue | null {
  const direct = node.properties[property];
  if (direct !== undefined) {
    return direct;
  }

  switch (property) {
    case 'qualifiedName':
      return node.qualifiedName ?? null;
    case 'filePath':
      return node.filePath ?? null;
    case 'line':
      return node.line ?? null;
    case 'language':
      return node.language ?? null;
    case 'projectId':
      return node.projectId ?? null;
    case 'type':
      return node.type;
    case 'scope':
      return node.scope;
    default:
      return null;
  }
}

function parameterLiteral(
  name: string,
  parameters: QueryParameters
): string | number | boolean | null {
  const value = parameters[name];
  if (value === undefined) {
    throw new QueryError('QUERY_SYNTAX_ERROR', `Missing parameter "$${name}"`);
  }
  if (Array.isArray(value)) {
    throw new QueryError('QUERY_SYNTAX_ERROR', `Parameter "$${name}" must be a scalar value here`);
  }
  return value;
}

function operandValue(
  operand: QueryOperand,
  binding: PatternBinding,
  parameters: QueryParameters
): string | number | boolean | null {
  switch (operand.kind) {
    case 'literal':
      return operand.value;
    case 'parameter':
      return parameterLiteral(operand.name, parameters);
    case 'property': {
      const node = binding.nodes.get(operand.variable);
      if (!node) {
        return null;
      }
      return propertyValue(node, operand.property);
    }
    default:
      return null;
  }
}

function compareValues(
  left: string | number | boolean | null,
  right: string | number | boolean | null,
  op: '=' | '!=' | '<' | '<=' | '>' | '>='
): boolean {
  if (op === '=' || op === '!=') {
    const equal =
      left === null || right === null
        ? left === right
        : typeof left === typeof right && left === right;
    return op === '=' ? equal : !equal;
  }

  if (left === null || right === null || typeof left !== typeof right) {
    return false;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    switch (op) {
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case '>':
        return left > right;
      default:
        return left >= right;
    }
  }

  if (typeof left === 'string' && typeof right === 'string') {
    const order = left.localeCompare(right);
    switch (op) {
      case '<':
        return order < 0;
      case '<=':
        return order <= 0;
      case '>':
        return order > 0;
      default:
        return order >= 0;
    }
  }

  return false;
}

function evaluate(
  expression: QueryExpression,
  binding: PatternBinding,
  parameters: QueryParameters
): boolean {
  switch (expression.kind) {
    case 'comparison':
      return compareValues(
        operandValue(expression.left, binding, parameters),
        operandValue(expression.right, binding, parameters),
        expression.op
      );
    case 'in': {
      const value = operandValue(expression.left, binding, parameters);
      return expression.values.some((operand) =>
        compareValues(value, operandValue(operand, binding, parameters), '=')
      );
    }
    case 'null': {
      const value = operandValue(expression.operand, binding, parameters);
      return expression.negated ? value !== null : value === null;
    }
    case 'string': {
      const value = operandValue(expression.left, binding, parameters);
      const pattern = operandValue(expression.right, binding, parameters);
      if (typeof value !== 'string' || typeof pattern !== 'string') {
        return false;
      }
      if (expression.op === 'STARTS WITH') {
        return value.startsWith(pattern);
      }
      if (expression.op === 'ENDS WITH') {
        return value.endsWith(pattern);
      }
      return value.includes(pattern);
    }
    case 'not':
      return !evaluate(expression.operand, binding, parameters);
    case 'logical':
      return expression.op === 'AND'
        ? expression.operands.every((operand) => evaluate(operand, binding, parameters))
        : expression.operands.some((operand) => evaluate(operand, binding, parameters));
    default:
      return false;
  }
}

function nodeCandidates(type: QueryNode['type'] | undefined, graph: ReadableGraph): QueryNode[] {
  if (type) {
    return [...graph.nodesByType(type)];
  }

  const all: QueryNode[] = [];
  for (const candidate of QUERY_NODE_TYPES) {
    all.push(...graph.nodesByType(candidate));
  }
  return all.sort((left, right) => left.id.localeCompare(right.id));
}

function edgeTypeSet(
  pattern: EdgePattern,
  universe: ReadonlySet<QueryEdgeType>
): ReadonlySet<QueryEdgeType> {
  if (pattern.types.length === 0) {
    return universe;
  }
  return new Set(pattern.types);
}

function enumeratePattern(
  pattern: MatchPattern,
  graph: ReadableGraph,
  universe: ReadonlySet<QueryEdgeType>,
  state: TraversalState,
  signal: AbortSignal | undefined
): PatternBinding[] {
  const elements = pattern.elements;
  const results: PatternBinding[] = [];

  const first = elements[0]!;
  const candidates = nodeCandidates(first.node.type, graph);

  const walk = (
    index: number,
    current: QueryNode,
    nodes: Map<string, QueryNode>,
    pathNodes: QueryNode[],
    pathEdges: QueryEdge[]
  ): void => {
    assertNotAborted(signal);

    const element = elements[index]!;

    if (!element.edge) {
      const paths = new Map<string, PatternPath>();
      if (pattern.pathAlias) {
        paths.set(pattern.pathAlias, { nodes: pathNodes, edges: pathEdges });
      }
      results.push({ nodes, paths });

      if (results.length > MAX_EXPANSIONS) {
        throw new QueryError(
          'QUERY_LIMIT_EXCEEDED',
          `Pattern produced more than ${MAX_EXPANSIONS} bindings`
        );
      }
      return;
    }

    const allowed = edgeTypeSet(element.edge, universe);
    const hops = expandEdge(graph, current.id, element.edge, allowed, state, signal);

    for (const hop of hops) {
      const nextElement = elements[index + 1]!;
      if (nextElement.node.type && hop.node.type !== nextElement.node.type) {
        continue;
      }

      const nextNodes = new Map(nodes);
      if (nextElement.node.alias) {
        const existing = nextNodes.get(nextElement.node.alias);
        if (existing && existing.id !== hop.node.id) {
          continue;
        }
        nextNodes.set(nextElement.node.alias, hop.node);
      }

      walk(
        index + 1,
        hop.node,
        nextNodes,
        [...pathNodes, ...hop.intermediateNodes, hop.node],
        [...pathEdges, ...hop.edges]
      );
    }
  };

  for (const candidate of candidates) {
    assertNotAborted(signal);
    const nodes = new Map<string, QueryNode>();
    if (first.node.alias) {
      nodes.set(first.node.alias, candidate);
    }
    walk(0, candidate, nodes, [candidate], []);
  }

  return results;
}

function mergeBindings(left: PatternBinding, right: PatternBinding): PatternBinding | null {
  const nodes = new Map(left.nodes);
  for (const [alias, node] of right.nodes) {
    const existing = nodes.get(alias);
    if (existing && existing.id !== node.id) {
      return null;
    }
    nodes.set(alias, node);
  }

  const paths = new Map(left.paths);
  for (const [alias, path] of right.paths) {
    paths.set(alias, path);
  }

  return { nodes, paths };
}

function nodeOutput(node: QueryNode): QueryNodeOutput {
  return {
    id: node.id,
    type: node.type,
    scope: node.scope,
    name: node.name,
    ...(node.qualifiedName ? { qualifiedName: node.qualifiedName } : {}),
    ...(node.filePath ? { filePath: node.filePath } : {}),
    ...(node.line !== undefined ? { line: node.line } : {}),
    ...(node.language ? { language: node.language } : {}),
    ...(node.projectId ? { projectId: node.projectId } : {}),
  };
}

function edgeOutput(edge: QueryEdge): QueryEdgeOutput {
  return {
    id: edge.id,
    type: edge.type,
    scope: edge.scope,
    from: edge.from,
    to: edge.to,
    ...(edge.projectId ? { projectId: edge.projectId } : {}),
    ...(edge.fromProjectId ? { fromProjectId: edge.fromProjectId } : {}),
    ...(edge.toProjectId ? { toProjectId: edge.toProjectId } : {}),
    ...(edge.protocol ? { protocol: edge.protocol } : {}),
    ...(edge.origin ? { origin: edge.origin } : {}),
    ...(edge.evidence ? { evidence: edge.evidence } : {}),
    ...(edge.certainty ? { certainty: edge.certainty } : {}),
    ...(edge.crossEvidence ? { crossEvidence: edge.crossEvidence } : {}),
  };
}

function pathOutput(path: PatternPath): QueryPathOutput {
  return { nodes: path.nodes.map(nodeOutput), edges: path.edges.map(edgeOutput) };
}

function rowKey(row: QueryRow, columns: readonly string[]): string {
  return columns
    .map((column) => {
      const value = row[column];
      if (value === null || value === undefined) {
        return 'null';
      }
      if (typeof value === 'object') {
        if ('nodes' in value) {
          return `p:${value.edges.map((edge) => edge.id).join('>')}`;
        }
        if ('from' in value && 'to' in value) {
          return `e:${(value as QueryEdgeOutput).id}`;
        }
        return `n:${(value as QueryNodeOutput).id}`;
      }
      return `v:${String(value)}`;
    })
    .join('|');
}

function orderValue(
  item: { variable: string; property?: string },
  binding: PatternBinding | undefined,
  parameters: QueryParameters
): string | number | boolean | null {
  if (!binding) {
    return null;
  }

  const path = binding.paths.get(item.variable);
  if (path) {
    return path.edges.map((edge) => edge.id).join('>');
  }

  const node = binding.nodes.get(item.variable);
  if (!node) {
    return null;
  }

  return item.property ? propertyValue(node, item.property) : node.id;
}

function sortRows(
  entries: Array<{ binding: PatternBinding; row: QueryRow }>,
  ast: QueryAst,
  columns: readonly string[],
  parameters: QueryParameters
): QueryRow[] {
  const decorated = entries.map((entry, index) => ({
    ...entry,
    index,
    key: rowKey(entry.row, columns),
  }));

  decorated.sort((left, right) => {
    for (const item of ast.orderBy) {
      const order = compareOrder(
        orderValue(item, left.binding, parameters),
        orderValue(item, right.binding, parameters)
      );
      if (order !== 0) {
        return item.direction === 'ASC' ? order : -order;
      }
    }
    /* No ORDER BY (or all keys equal): deterministic default ordering. */
    return left.key.localeCompare(right.key);
  });

  return decorated.map((entry) => entry.row);
}

function compareOrder(
  left: string | number | boolean | null,
  right: string | number | boolean | null
): number {
  if (left === right) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }
  return String(left).localeCompare(String(right));
}

export function executeQuery(options: ExecuteOptions): ExecuteResult {
  const { ast, graph, parameters, signal } = options;
  const universe = new Set(options.validated.edgeTypes);
  const state: TraversalState = { expansions: 0 };

  let joined: PatternBinding[] = [{ nodes: new Map(), paths: new Map() }];

  for (const pattern of ast.match) {
    assertNotAborted(signal);
    const bindings = enumeratePattern(pattern, graph, universe, state, signal);

    const next: PatternBinding[] = [];
    for (const accumulator of joined) {
      for (const binding of bindings) {
        assertNotAborted(signal);
        const merged = mergeBindings(accumulator, binding);
        if (merged) {
          next.push(merged);
        }
        if (next.length > MAX_EXPANSIONS) {
          throw new QueryError(
            'QUERY_LIMIT_EXCEEDED',
            `Join produced more than ${MAX_EXPANSIONS} bindings`
          );
        }
      }
    }

    joined = next;
  }

  if (ast.where) {
    joined = joined.filter((binding) => evaluate(ast.where!, binding, parameters));
  }

  const columns = ast.projection.map((item) => item.alias);

  interface Projected {
    binding: PatternBinding;
    row: QueryRow;
  }

  let projected: Projected[] = joined.map((binding) => {
    const row: QueryRow = {};
    for (const item of ast.projection) {
      row[item.alias] = projectItem(item, binding) as QueryRowValue;
    }
    return { binding, row };
  });

  if (ast.distinct) {
    const seen = new Set<string>();
    projected = projected.filter((entry) => {
      const key = rowKey(entry.row, columns);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  const sortedRows = sortRows(projected, ast, columns, parameters);

  const total = sortedRows.length;
  const start = Math.max(0, options.offset);
  const limit = Math.max(1, options.rowLimit);
  const page = sortedRows.slice(start, start + limit);

  const nextOffset = start + page.length;
  const truncated = nextOffset < total;

  return {
    columns,
    rows: page,
    truncated,
    ...(truncated ? { nextOffset } : {}),
    expansions: state.expansions,
  };
}

function projectItem(
  item: { variable: string; property?: string },
  binding: PatternBinding
): QueryRowValue {
  const path = binding.paths.get(item.variable);
  if (path) {
    return item.property ? null : pathOutput(path);
  }

  const node = binding.nodes.get(item.variable);
  if (!node) {
    return null;
  }

  if (item.property) {
    return propertyValue(node, item.property);
  }

  return nodeOutput(node);
}
