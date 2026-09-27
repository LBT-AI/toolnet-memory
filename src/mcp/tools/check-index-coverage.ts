import { z } from 'zod';

import { GRAPH_CAPABILITIES } from '../../code-intelligence/graph-coverage/types.js';

import { GraphCoverageEvaluator } from '../../code-intelligence/graph-coverage/coverage-evaluator.js';

import type { GraphCoverageSnapshot } from '../../code-intelligence/graph-coverage/types.js';

import { PersistentCodeGraphStore } from '../../storage/code-graph-store.js';

import { PersistentGraphCoverageStore } from '../../storage/graph-coverage-store.js';

import { PersistentCrossServiceStore } from '../../storage/cross-service-store.js';

import {
  summarizeDiagnostics,
  type CrossServiceSnapshot,
} from '../../code-intelligence/cross-service/index.js';

import type { MCPContext } from '../context.js';

const MAX_DIAGNOSTIC_PATHS = 20;

export const checkIndexCoverageSchema = {
  capability: z.enum(GRAPH_CAPABILITIES).optional(),
  paths: z.array(z.string().min(1).max(500)).max(500).optional(),
  /*
   * Safe default: verify manifest freshness so a negative claim is only
   * trusted when the current source matches the last index.
   */
  verifyFreshness: z.boolean().optional(),
};

interface FreshnessOutput {
  checked: boolean;
  stale: boolean;
  addedCount?: number;
  modifiedCount?: number;
  deletedCount?: number;
  paths?: {
    added: string[];
    modified: string[];
    deleted: string[];
  };
  truncated?: boolean;
  error?: string;
}

function compactFreshness(
  freshness: Awaited<ReturnType<GraphCoverageEvaluator['checkFreshness']>>
): FreshnessOutput {
  const output: FreshnessOutput = {
    checked: freshness.checked,
    stale: freshness.stale,
  };

  if (!freshness.checked) {
    return output;
  }

  output.addedCount = freshness.added.length;
  output.modifiedCount = freshness.modified.length;
  output.deletedCount = freshness.deleted.length;

  if (freshness.error) {
    output.error = freshness.error;
  }

  const added = freshness.added.slice(0, MAX_DIAGNOSTIC_PATHS);
  const modified = freshness.modified.slice(0, MAX_DIAGNOSTIC_PATHS);
  const deleted = freshness.deleted.slice(0, MAX_DIAGNOSTIC_PATHS);

  const truncated =
    freshness.added.length > MAX_DIAGNOSTIC_PATHS ||
    freshness.modified.length > MAX_DIAGNOSTIC_PATHS ||
    freshness.deleted.length > MAX_DIAGNOSTIC_PATHS;

  output.paths = { added, modified, deleted };
  output.truncated = truncated;

  return output;
}

function compactCrossService(snapshot: CrossServiceSnapshot | null | undefined) {
  if (!snapshot) {
    return null;
  }

  return {
    services: snapshot.stats.services,
    routes: snapshot.stats.routes,
    operations: snapshot.stats.operations,
    events: snapshot.stats.events,
    clientCalls: snapshot.stats.clientCalls,
    links: snapshot.stats.links,
    sameServiceLinks: snapshot.stats.sameServiceLinks,
    crossServiceLinks: snapshot.stats.crossServiceLinks,
    ambiguous: snapshot.stats.ambiguous,
    unresolved: snapshot.stats.unresolved,
    unsupportedFrameworks: snapshot.stats.unsupportedFrameworks,
    diagnostics: summarizeDiagnostics(snapshot),
  };
}

function compactCoverage(snapshot: GraphCoverageSnapshot | null) {
  if (!snapshot) {
    return null;
  }

  return {
    acceptedFiles: snapshot.files.accepted,
    indexedFiles: snapshot.files.indexed,
    structuralFiles: snapshot.files.structural,
    lexicalOnlyFiles: snapshot.files.lexicalOnly,
    parseFailures: snapshot.files.parseFailures,
  };
}

export interface CheckIndexCoverageResult {
  projectId: string;
  capability?: (typeof GRAPH_CAPABILITIES)[number];
  status: string;
  negativeClaimSafe: boolean;
  reasons: string[];
  coverage: ReturnType<typeof compactCoverage>;
  capabilities?: Record<string, unknown>;
  scope?: GraphCoverageSnapshot['scope'] | null;
  crossService?: ReturnType<typeof compactCrossService>;
  freshness: FreshnessOutput;
}

export async function checkIndexCoverage(
  ctx: MCPContext,
  input: {
    capability?: (typeof GRAPH_CAPABILITIES)[number];
    paths?: string[];
    verifyFreshness?: boolean;
  }
): Promise<CheckIndexCoverageResult> {
  let evaluator = ctx.coverage;

  if (!evaluator && ctx.storage) {
    /*
     * Fallback for calls before hydration completes: build a temporary
     * evaluator from storage. This never throws; missing snapshots
     * degrade to 'unavailable'.
     */
    const coverageStore = new PersistentGraphCoverageStore(ctx.storage);

    const graphStore = new PersistentCodeGraphStore(ctx.storage);

    let snapshot: GraphCoverageSnapshot | null = null;

    let graphAvailable = false;

    try {
      snapshot = await coverageStore.load(ctx.project.id);
    } catch {
      snapshot = null;
    }

    try {
      graphAvailable = (await graphStore.load(ctx.project.id)) !== null;
    } catch {
      graphAvailable = false;
    }

    evaluator = new GraphCoverageEvaluator({
      projectId: ctx.project.id,
      rootPath: ctx.project.rootPath,
      storage: ctx.storage,
      snapshot,
      graphAvailable,
    });
  }

  if (!evaluator) {
    return {
      projectId: ctx.project.id,
      status: 'unavailable',
      negativeClaimSafe: false,
      reasons: ['COVERAGE_MISSING'],
      coverage: null,
      freshness: {
        checked: false,
        stale: false,
      },
    };
  }

  if (input.paths?.length) {
    evaluator.assertPathsWithinRoot(input.paths);
  }

  let crossService = ctx.crossService ?? null;

  if (!crossService && ctx.storage) {
    try {
      crossService = await new PersistentCrossServiceStore(ctx.storage).load(ctx.project.id);
    } catch {
      crossService = null;
    }
  }

  const verifyFreshness = input.verifyFreshness ?? true;

  const freshnessOptions = input.paths?.length ? { paths: input.paths } : {};

  const freshness = verifyFreshness
    ? await evaluator.checkFreshness(freshnessOptions)
    : {
        checked: false,
        stale: false,
        added: [],
        modified: [],
        deleted: [],
      };

  const inputWithFreshness = {
    freshness,
  };

  if (input.capability) {
    const evaluation = evaluator.evaluate(input.capability, inputWithFreshness);

    return {
      projectId: ctx.project.id,
      capability: input.capability,
      status: evaluation.status,
      negativeClaimSafe: evaluation.negativeClaimSafe,
      reasons: evaluation.reasons,
      coverage: compactCoverage(evaluator.currentSnapshot),
      ...(crossService ? { crossService: compactCrossService(crossService) } : {}),
      freshness: compactFreshness(freshness),
    };
  }

  const all = evaluator.evaluateAll(inputWithFreshness);

  const capabilities = {} as Record<string, unknown>;

  for (const [capability, evaluation] of Object.entries(all.capabilities)) {
    capabilities[capability] = {
      status: evaluation.status,
      negativeClaimSafe: evaluation.negativeClaimSafe,
      reasons: evaluation.reasons,
    };
  }

  return {
    projectId: ctx.project.id,
    status: all.overall.status,
    negativeClaimSafe: all.overall.negativeClaimSafe,
    reasons: all.overall.reasons,
    capabilities,
    coverage: compactCoverage(evaluator.currentSnapshot),
    scope: evaluator.currentSnapshot?.scope ?? null,
    ...(crossService ? { crossService: compactCrossService(crossService) } : {}),
    freshness: compactFreshness(freshness),
  };
}
