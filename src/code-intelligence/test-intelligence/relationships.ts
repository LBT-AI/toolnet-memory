/*
 * Phase 82 — deterministic test→target relationships.
 *
 * Evidence strength is explicit and never flattened:
 *
 *   TESTS / CALLS        -> the test targets the symbol (direct)
 *   HTTP_CALLS           -> the test exercises a route
 *   EMITS / LISTENS_ON   -> the test exercises an event channel
 *   USES_TYPE / IMPLEMENTS / CALL_REFERENCE -> type/contract evidence
 *   IMPORTS              -> the test imports the module (related, NOT direct)
 *   a call path          -> transitive evidence, preserving the semantic path
 *
 * A file name alone never proves what a production symbol a test covers.
 */

import type { TestDescriptor, TestEdge, TestFacts, TestPathStep, TestReasonCode } from './types.js';

/** Direct relationship vocabulary: the test itself names the target. */
const DIRECT_EDGES: Record<string, TestReasonCode> = {
  TESTS: 'EXPLICIT_TESTS_EDGE',
  CALLS: 'DIRECT_CALLS_CHANGED_SYMBOL',
  HTTP_CALLS: 'TESTS_CHANGED_ROUTE',
  RPC_CALLS: 'TESTS_CHANGED_ROUTE',
  GRAPHQL_CALLS: 'TESTS_CHANGED_ROUTE',
  TRPC_CALLS: 'TESTS_CHANGED_ROUTE',
  EMITS: 'TESTS_EVENT_CHANNEL',
  LISTENS_ON: 'TESTS_EVENT_CHANNEL',
  USES_TYPE: 'USES_CHANGED_TYPE',
  IMPLEMENTS: 'USES_CHANGED_TYPE',
  CALL_REFERENCE: 'USES_CHANGED_TYPE',
  IMPORTS: 'IMPORTS_CHANGED_MODULE',
};

/** Vocabulary followed to reach transitive targets. */
const TRANSITIVE_EDGES = ['CALLS', 'CALL_REFERENCE', 'IMPORTS'] as const;

export interface TestRelationship {
  testId: string;
  targetSymbolId: string;
  reasonCode: TestReasonCode;
  depth: number;
  path: TestPathStep[];
}

export interface RelationshipInput {
  facts: TestFacts;
  descriptors: readonly TestDescriptor[];
  limits: { maxDepth: number; maxSelectedTests: number };
}

function fileSymbolIds(facts: TestFacts, path: string): string[] {
  return facts.graph
    .symbols()
    .filter((symbol) => symbol.filePath === path)
    .map((symbol) => symbol.id);
}

export function buildTestRelationships(input: RelationshipInput): Map<string, TestRelationship[]> {
  const { facts } = input;

  const out = new Map<string, TestRelationship[]>();

  const pathCache = new Map<string, TestRelationship[]>();

  for (const descriptor of input.descriptors) {
    let perTarget = pathCache.get(descriptor.path);

    if (!perTarget) {
      perTarget = relationshipsForPath(facts, descriptor.path, input.limits);

      pathCache.set(descriptor.path, perTarget);
    }

    const copy = perTarget.map((relationship) => ({ ...relationship, testId: descriptor.id }));

    out.set(descriptor.id, copy);
  }

  return out;
}

function relationshipsForPath(
  facts: TestFacts,
  path: string,
  limits: { maxDepth: number }
): TestRelationship[] {
  const roots = fileSymbolIds(facts, path);

  const found = new Map<string, TestRelationship>();

  for (const rootId of roots) {
    /* Direct relationships. */
    const directEdges = facts.graph.outgoing(rootId, Object.keys(DIRECT_EDGES));

    for (const edge of directEdges) {
      const reason = DIRECT_EDGES[edge.type];

      if (!reason) {
        continue;
      }

      const key = `${edge.to}:${reason}`;

      if (!found.has(key)) {
        found.set(key, {
          testId: '',
          targetSymbolId: edge.to,
          reasonCode: reason,
          depth: 1,
          path: [{ from: rootId, to: edge.to, edgeType: edge.type }],
        });
      }
    }

    /* Transitive call paths. */
    const queue: Array<{ id: string; depth: number; path: TestPathStep[] }> = [
      { id: rootId, depth: 0, path: [] },
    ];

    const visited = new Set<string>([rootId]);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= limits.maxDepth) {
        continue;
      }

      for (const edge of facts.graph.outgoing(current.id, TRANSITIVE_EDGES)) {
        if (visited.has(edge.to)) {
          continue;
        }

        visited.add(edge.to);

        const depth = current.depth + 1;
        const nextPath: TestPathStep[] = [
          ...current.path,
          { from: edge.from, to: edge.to, edgeType: edge.type },
        ];

        /* Skip direct edges: they are already recorded with stronger evidence. */
        if (depth > 1) {
          const key = `${edge.to}:TRANSITIVE_CALL_PATH`;

          const existing = found.get(key);

          if (!existing || existing.depth > depth) {
            found.set(key, {
              testId: '',
              targetSymbolId: edge.to,
              reasonCode: 'TRANSITIVE_CALL_PATH',
              depth,
              path: nextPath,
            });
          }
        }

        queue.push({ id: edge.to, depth, path: nextPath });
      }
    }
  }

  return [...found.values()].sort(
    (left, right) =>
      left.depth - right.depth ||
      left.targetSymbolId.localeCompare(right.targetSymbolId) ||
      left.reasonCode.localeCompare(right.reasonCode)
  );
}

export { DIRECT_EDGES, TRANSITIVE_EDGES };

export type { TestEdge };
