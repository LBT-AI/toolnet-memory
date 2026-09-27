import type { StorageProvider } from '../../storage/types.js';

import {
  GRAPH_CAPABILITIES,
  STRUCTURAL_CAPABILITIES,
  type CoverageReasonCode,
  type GraphCapability,
  type GraphCoverageSnapshot,
  type GraphCoverageStatus,
} from './types.js';

import {
  GraphFreshnessChecker,
  type FreshnessCheckOptions,
  type FreshnessCheckResult,
} from './freshness-checker.js';

import { assertPathsWithinRoot } from './paths.js';

export interface CoverageEvaluation {
  capability: GraphCapability;
  status: GraphCoverageStatus;
  negativeClaimSafe: boolean;
  reasons: CoverageReasonCode[];
  freshness: {
    checked: boolean;
    stale: boolean;
  };
  impactMayBeUnderreported?: boolean;
}

export interface CoverageEvaluatorOptions {
  projectId: string;
  rootPath: string;
  storage?: StorageProvider;
  snapshot?: GraphCoverageSnapshot | null;
  /*
   * Whether a persisted graph snapshot exists for the project.
   * Used only to distinguish INDEX_MISSING from COVERAGE_MISSING
   * when the coverage snapshot is absent.
   */
  graphAvailable?: boolean;
}

export interface CoverageEvaluationInput {
  freshness?: FreshnessCheckResult | null;
}

const STATUS_RANK: Record<GraphCoverageStatus, number> = {
  unavailable: 3,
  stale: 2,
  partial: 1,
  complete: 0,
};

function worstStatus(left: GraphCoverageStatus, right: GraphCoverageStatus): GraphCoverageStatus {
  return STATUS_RANK[left] >= STATUS_RANK[right] ? left : right;
}

/*
 * Single central implementation for MCP tools.
 *
 * Tools never read coverage JSON directly; they evaluate through this
 * class (optionally with manifest freshness verification for negative
 * claims).
 */
export class GraphCoverageEvaluator {
  private readonly snapshot: GraphCoverageSnapshot | null;

  private readonly graphAvailable: boolean;

  constructor(private readonly options: CoverageEvaluatorOptions) {
    this.snapshot = options.snapshot ?? null;

    this.graphAvailable = options.graphAvailable ?? false;
  }

  get projectId(): string {
    return this.options.projectId;
  }

  get rootPath(): string {
    return this.options.rootPath;
  }

  get currentSnapshot(): GraphCoverageSnapshot | null {
    return this.snapshot;
  }

  assertPathsWithinRoot(paths: readonly string[]): void {
    assertPathsWithinRoot(this.options.rootPath, paths);
  }

  evaluate(capability: GraphCapability, input: CoverageEvaluationInput = {}): CoverageEvaluation {
    if (!this.snapshot) {
      const reason: CoverageReasonCode = this.graphAvailable ? 'COVERAGE_MISSING' : 'INDEX_MISSING';

      return {
        capability,
        status: 'unavailable',
        negativeClaimSafe: false,
        reasons: [reason],
        freshness: {
          checked: false,
          stale: false,
        },
      };
    }

    const freshness = input.freshness ?? null;

    if (freshness?.checked && freshness.stale) {
      const reasons: CoverageReasonCode[] = [];

      if (freshness.error) {
        reasons.push('INDEX_STALE');
      } else {
        if (freshness.added.length > 0) {
          reasons.push('SOURCE_ADDED_AFTER_INDEX');
        }

        if (freshness.modified.length > 0) {
          reasons.push('SOURCE_MODIFIED_AFTER_INDEX');
        }

        if (freshness.deleted.length > 0) {
          reasons.push('SOURCE_DELETED_AFTER_INDEX');
        }
      }

      return {
        capability,
        status: 'stale',
        negativeClaimSafe: false,
        reasons,
        freshness: {
          checked: true,
          stale: true,
        },
      };
    }

    const persisted = this.snapshot.capabilities[capability];

    return {
      capability,
      status: persisted.status,
      negativeClaimSafe: persisted.negativeClaimSafe,
      reasons: persisted.reasons,
      freshness: {
        checked: freshness?.checked ?? false,
        stale: false,
      },
    };
  }

  /*
   * Worst-case evaluation across structural capabilities.
   *
   * Used by dead-code analysis, where both the call graph and the
   * dependency graph contribute to a "no usage" claim.
   */
  evaluateStructural(input: CoverageEvaluationInput = {}): CoverageEvaluation {
    const evaluations = STRUCTURAL_CAPABILITIES.map((capability) =>
      this.evaluate(capability, input)
    );

    return {
      capability: 'call_graph',
      status: evaluations.reduce(
        (worst, evaluation) => worstStatus(worst, evaluation.status),
        'complete' as GraphCoverageStatus
      ),
      negativeClaimSafe: evaluations.every((evaluation) => evaluation.negativeClaimSafe),
      reasons: [...new Set(evaluations.flatMap((evaluation) => evaluation.reasons))],
      freshness: evaluations[0]!.freshness,
    };
  }

  evaluateAll(input: CoverageEvaluationInput = {}): {
    capabilities: Record<GraphCapability, CoverageEvaluation>;
    overall: CoverageEvaluation;
  } {
    const capabilities = {} as Record<GraphCapability, CoverageEvaluation>;

    for (const capability of GRAPH_CAPABILITIES) {
      capabilities[capability] = this.evaluate(capability, input);
    }

    const overall = Object.values(capabilities).reduce(
      (worst, evaluation) => ({
        capability: 'lexical_search' as GraphCapability,
        status: worstStatus(worst.status, evaluation.status),
        negativeClaimSafe: worst.negativeClaimSafe && evaluation.negativeClaimSafe,
        reasons: [...new Set([...worst.reasons, ...evaluation.reasons])],
        freshness: worst.freshness,
      }),
      {
        capability: 'lexical_search' as GraphCapability,
        status: 'complete' as GraphCoverageStatus,
        negativeClaimSafe: true,
        reasons: [] as CoverageReasonCode[],
        freshness: { checked: false, stale: false },
      }
    );

    return { capabilities, overall };
  }

  async checkFreshness(options: FreshnessCheckOptions = {}): Promise<FreshnessCheckResult> {
    if (!this.options.storage) {
      return {
        checked: false,
        stale: false,
        added: [],
        modified: [],
        deleted: [],
      };
    }

    return new GraphFreshnessChecker(this.options.storage).check(
      this.options.projectId,
      this.options.rootPath,
      options
    );
  }

  async evaluateWithFreshness(
    capability: GraphCapability,
    options: FreshnessCheckOptions = {}
  ): Promise<CoverageEvaluation> {
    const freshness = await this.checkFreshness(options);

    return this.evaluate(capability, { freshness });
  }

  async evaluateStructuralWithFreshness(
    options: FreshnessCheckOptions = {}
  ): Promise<CoverageEvaluation> {
    const freshness = await this.checkFreshness(options);

    return this.evaluateStructural({ freshness });
  }
}
