/*
 * Phase 74 — TGQL validator.
 *
 * Enforces the schema contract, read-only enforcement and complexity bounds
 * before any traversal happens. Mutation vocabulary is rejected here as a hard
 * gate; the executor has no mutable graph API at all.
 */

import {
  MAX_DEPTH,
  MAX_MATCH_PATTERNS,
  MAX_ORDER_BY,
  MAX_PATTERN_COUNT,
  MAX_PATTERN_ELEMENTS,
  MAX_ROWS,
} from './limits.js';

import {
  isKnownEdgeType,
  isKnownNodeType,
  isPropertyAllowed,
  availableEdgeTypesForQuery,
  requiredCapabilities,
  usesFleetEdges,
  DENIED_PROPERTIES,
} from './schema-registry.js';

import type { Token } from './lexer.js';

import {
  QueryError,
  type QueryAst,
  type QueryEdgeType,
  type QueryExpression,
  type QueryNodeType,
  type QueryOperand,
  type QueryParameter,
  type QueryParameters,
  type QueryScope,
} from './types.js';

import type { GraphCapability } from '../graph-coverage/types.js';

/*
 * Mutation vocabulary is rejected in the lexer (`assertNoMutationTokens`), so
 * every token stream that reaches the validator is already read-only. That
 * keeps one authority for read-only enforcement instead of two.
 */

export interface ValidatedQuery {
  ast: QueryAst;
  scope: QueryScope;
  edgeTypes: QueryEdgeType[];
  requiredCapabilities: GraphCapability[];
  usesFleet: boolean;
  maxDepth: number;
  patternCount: number;
  /** Node type per bound variable, when the pattern declared one. */
  variableTypes: Map<string, QueryNodeType>;
  pathAliases: Set<string>;
}

function collectOperands(expression: QueryExpression, output: QueryOperand[]): void {
  switch (expression.kind) {
    case 'comparison':
      output.push(expression.left, expression.right);
      return;
    case 'string':
      output.push(expression.left, expression.right);
      return;
    case 'in':
      output.push(expression.left, ...expression.values);
      return;
    case 'null':
      output.push(expression.operand);
      return;
    case 'not':
      collectOperands(expression.operand, output);
      return;
    case 'logical':
      for (const operand of expression.operands) {
        collectOperands(operand, output);
      }
      return;
    default:
      return;
  }
}

function parameterValue(value: QueryParameter | undefined, name: string): QueryParameter {
  if (value === undefined) {
    throw new QueryError('QUERY_SYNTAX_ERROR', `Missing parameter "$${name}"`);
  }
  if (Array.isArray(value)) {
    if (!value.every((entry) => typeof entry === 'string')) {
      throw new QueryError('QUERY_SYNTAX_ERROR', `Parameter "$${name}" must be a string array`);
    }
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  throw new QueryError('QUERY_SYNTAX_ERROR', `Unsupported type for parameter "$${name}"`);
}

export function validateQuery(input: {
  ast: QueryAst;
  tokens: readonly Token[];
  scope: QueryScope;
  parameters: QueryParameters;
}): ValidatedQuery {
  const { ast, scope } = input;

  if (ast.match.length === 0) {
    throw new QueryError('QUERY_SYNTAX_ERROR', 'At least one MATCH pattern is required');
  }

  if (ast.match.length > MAX_MATCH_PATTERNS) {
    throw new QueryError(
      'QUERY_TOO_COMPLEX',
      `At most ${MAX_MATCH_PATTERNS} MATCH patterns are supported`
    );
  }

  if (ast.orderBy.length > MAX_ORDER_BY) {
    throw new QueryError(
      'QUERY_TOO_COMPLEX',
      `At most ${MAX_ORDER_BY} ORDER BY items are supported`
    );
  }

  if (ast.limit !== undefined && (ast.limit <= 0 || ast.limit > MAX_ROWS)) {
    throw new QueryError('QUERY_LIMIT_EXCEEDED', `LIMIT must be between 1 and ${MAX_ROWS}`);
  }

  if (ast.skip !== undefined && ast.skip < 0) {
    throw new QueryError('QUERY_LIMIT_EXCEEDED', 'SKIP must not be negative');
  }

  const edgeTypes = new Set<QueryEdgeType>();
  const variableTypes = new Map<string, QueryNodeType>();
  const boundVariables = new Set<string>();
  const pathAliases = new Set<string>();
  let patternCount = 0;
  let maxDepth = 1;

  const allowed = new Set(availableEdgeTypesForQuery(scope));

  for (const pattern of ast.match) {
    if (pattern.pathAlias) {
      pathAliases.add(pattern.pathAlias);
    }

    if (pattern.elements.length > MAX_PATTERN_ELEMENTS) {
      throw new QueryError(
        'QUERY_TOO_COMPLEX',
        `At most ${MAX_PATTERN_ELEMENTS} elements per pattern are supported`
      );
    }

    patternCount += pattern.elements.length - 1;
    if (patternCount > MAX_PATTERN_COUNT) {
      throw new QueryError(
        'QUERY_TOO_COMPLEX',
        `Pattern exceeds ${MAX_PATTERN_COUNT} relationships`
      );
    }

    pattern.elements.forEach((element, position) => {
      if (element.node.type && !isKnownNodeType(element.node.type)) {
        throw new QueryError('UNKNOWN_NODE_TYPE', `Unknown node type ":${element.node.type}"`);
      }

      if (element.node.alias) {
        boundVariables.add(element.node.alias);
        if (element.node.type && !variableTypes.has(element.node.alias)) {
          variableTypes.set(element.node.alias, element.node.type);
        }
      }

      if (!element.edge) {
        return;
      }

      if (element.edge.maxHops > MAX_DEPTH) {
        throw new QueryError(
          'QUERY_LIMIT_EXCEEDED',
          `Variable-length paths are limited to ${MAX_DEPTH} hops`
        );
      }

      maxDepth = Math.max(
        maxDepth,
        element.edge.maxHops * (pattern.elements.length - position - 1)
      );

      if (element.edge.types.length === 0) {
        /*
         * Open relationship: allowed, but it can only be used in a scope where
         * every edge type is explicit at execution time. Record the scope's
         * full vocabulary so coverage is conservative.
         */
        for (const type of allowed) {
          edgeTypes.add(type);
        }
        return;
      }

      for (const type of element.edge.types) {
        if (!isKnownEdgeType(type)) {
          throw new QueryError('UNKNOWN_EDGE_TYPE', `Unknown edge type ":${type}"`);
        }
        if (!allowed.has(type)) {
          throw new QueryError(
            'UNKNOWN_EDGE_TYPE',
            `Edge type ":${type}" is not available in ${scope} scope`
          );
        }
        edgeTypes.add(type);
      }
    });
  }

  /* Projection targets must be bound. */
  for (const item of ast.projection) {
    if (!boundVariables.has(item.variable) && !pathAliases.has(item.variable)) {
      throw new QueryError(
        'QUERY_SYNTAX_ERROR',
        `RETURN references unbound variable "${item.variable}"`
      );
    }
    if (item.property) {
      checkProperty(variableTypes.get(item.variable), item.property);
    }
  }

  for (const item of ast.orderBy) {
    if (!boundVariables.has(item.variable) && !pathAliases.has(item.variable)) {
      throw new QueryError(
        'QUERY_SYNTAX_ERROR',
        `ORDER BY references unbound variable "${item.variable}"`
      );
    }
    if (item.property) {
      checkProperty(variableTypes.get(item.variable), item.property);
    }
  }

  const operands: QueryOperand[] = [];
  if (ast.where) {
    collectOperands(ast.where, operands);
  }

  for (const operand of operands) {
    if (operand.kind === 'parameter') {
      parameterValue(input.parameters[operand.name], operand.name);
      continue;
    }
    if (operand.kind === 'property') {
      if (!boundVariables.has(operand.variable)) {
        throw new QueryError(
          'QUERY_SYNTAX_ERROR',
          `WHERE references unbound variable "${operand.variable}"`
        );
      }
      checkProperty(variableTypes.get(operand.variable), operand.property);
    }
  }

  const typeList = [...edgeTypes].sort() as QueryEdgeType[];

  return {
    ast,
    scope,
    edgeTypes: typeList,
    requiredCapabilities: requiredCapabilities(typeList),
    usesFleet: usesFleetEdges(typeList),
    maxDepth,
    patternCount,
    variableTypes,
    pathAliases,
  };
}

function checkProperty(type: QueryNodeType | undefined, property: string): void {
  if (DENIED_PROPERTIES.includes(property)) {
    throw new QueryError('INVALID_PROPERTY', `Property "${property}" is not queryable`);
  }
  /*
   * Without a declared node type the variable could match several node types,
   * so only the globally denied set applies. Declared types get the full
   * allowlist check.
   */
  if (!type) {
    return;
  }
  if (!isPropertyAllowed(type, property)) {
    throw new QueryError('INVALID_PROPERTY', `Property "${property}" is not queryable on ${type}`);
  }
}
