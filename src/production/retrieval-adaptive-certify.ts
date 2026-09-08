import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';
import { planCompositeRetrieval } from '../work-continuity/composite-retrieval.js';
import {
  applyAdaptiveRetrievalRoute,
  loadAdaptiveRetrievalOverrides,
  recordRetrievalFeedback,
  RETRIEVAL_FEEDBACK_FORBIDDEN_KEYS,
} from '../work-continuity/retrieval-feedback.js';
import {
  routeForRetrievalIntent,
  routeRetrievalIntent,
} from '../work-continuity/intent-aware-retrieval.js';

export interface RetrievalAdaptiveCertification {
  passed: boolean;
  safeRulePromoted: boolean;
  safeRuleApplied: boolean;
  benchmarkBreakingRuleRejected: boolean;
  previousRulesPreserved: boolean;
  privacySafe: boolean;
  detail?: string;
}

function project(rootPath: string): ProjectManifest {
  return {
    id: 'phase64-adaptive-certify',
    name: 'phase64-adaptive-certify',
    rootPath,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

function singlePlanFromRoute(route: ReturnType<typeof routeForRetrievalIntent>) {
  return {
    mode: 'single' as const,
    question: 'not-persisted',
    maxSources: 3,
    steps: [
      {
        index: 0,
        intent: route.intent,
        question: 'not-persisted',
        route,
        source: route.primarySource,
        authority: 1,
        label: 'certification',
      },
    ],
    sources: [route.primarySource],
    omittedIntents: [],
    primaryRoute: route,
  };
}

export function certifyAdaptiveRetrieval(): RetrievalAdaptiveCertification {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase64-adaptive-'));
  const manifest = project(root);
  try {
    /*
     * Safe synthetic structural signature that does not occur
     * in the fixed benchmark.
     */
    const syntheticRoute = routeForRetrievalIntent('summary', {
      confidence: 0.7,
      reasons: ['phase64-safe-synthetic'],
    });
    const syntheticPlan = singlePlanFromRoute(syntheticRoute);
    let finalSafeFeedback;
    for (let index = 0; index < 3; index += 1) {
      finalSafeFeedback = recordRetrievalFeedback(manifest, syntheticPlan, 'code', 'cli');
    }
    const afterSafe = loadAdaptiveRetrievalOverrides(manifest);
    const safeRulePromoted =
      finalSafeFeedback?.refresh?.benchmarkPassed === true && afterSafe.rules.length === 1;
    const safeAdapted = applyAdaptiveRetrievalRoute(syntheticRoute, afterSafe);
    const safeRuleApplied = safeAdapted.intent === 'code';
    /*
     * Real benchmark route.
     *
     * Three wrong correction votes would break Phase 62.
     * They must be rejected.
     */
    const benchmarkRoute = routeRetrievalIntent('task hiện tại là gì?');
    const benchmarkPlan = planCompositeRetrieval('task hiện tại là gì?');
    let rejectedFeedback;
    for (let index = 0; index < 3; index += 1) {
      rejectedFeedback = recordRetrievalFeedback(manifest, benchmarkPlan, 'artifact', 'mcp');
    }
    const afterRejected = loadAdaptiveRetrievalOverrides(manifest);
    const benchmarkBreakingRuleRejected =
      rejectedFeedback?.refresh?.status === 'rejected' &&
      rejectedFeedback?.refresh?.benchmarkPassed === false;
    const previousRulesPreserved =
      afterRejected.rules.length === 1 &&
      afterRejected.rules[0]?.routeSignature === afterSafe.rules[0]?.routeSignature;
    /*
     * Privacy proof.
     */
    const feedbackFile = join(root, '.toolnet', 'retrieval', 'feedback.jsonl');
    const raw = readFileSync(feedbackFile, 'utf8');
    const privacySafe =
      !raw.includes('task hiện tại là gì') &&
      RETRIEVAL_FEEDBACK_FORBIDDEN_KEYS.every((key) => !raw.includes(`"${key}"`));
    const passed =
      safeRulePromoted &&
      safeRuleApplied &&
      benchmarkBreakingRuleRejected &&
      previousRulesPreserved &&
      privacySafe;
    return {
      passed,
      safeRulePromoted,
      safeRuleApplied,
      benchmarkBreakingRuleRejected,
      previousRulesPreserved,
      privacySafe,
      ...(passed
        ? {}
        : {
            detail: JSON.stringify(
              {
                benchmarkRoute: benchmarkRoute.intent,
                safeRules: afterSafe.rules,
                finalRules: afterRejected.rules,
                safeFeedback: finalSafeFeedback,
                rejectedFeedback,
              },
              null,
              2
            ),
          }),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
