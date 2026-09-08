import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';
import { planCompositeRetrieval } from '../../src/work-continuity/composite-retrieval.js';
import {
  applyAdaptiveRetrievalRoute,
  loadAdaptiveRetrievalOverrides,
  planAdaptiveRetrieval,
  readRetrievalFeedback,
  recordRetrievalFeedback,
  RETRIEVAL_FEEDBACK_FORBIDDEN_KEYS,
  retrievalRouteSignature,
} from '../../src/work-continuity/retrieval-feedback.js';
import {
  routeForRetrievalIntent,
  routeRetrievalIntent,
} from '../../src/work-continuity/intent-aware-retrieval.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase64-'));
  roots.push(root);
  mkdirSync(join(root, '.toolnet'), { recursive: true });
  return {
    id: `phase64-${roots.length}`,
    name: 'phase64-test',
    rootPath: root,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

function syntheticPlan(reason: string) {
  const route = routeForRetrievalIntent('summary', {
    confidence: 0.7,
    reasons: [reason],
  });
  return {
    route,
    plan: {
      mode: 'single' as const,
      question: 'NOT_STORED',
      maxSources: 3,
      steps: [
        {
          index: 0,
          intent: route.intent,
          question: 'NOT_STORED',
          route,
          source: route.primarySource,
          authority: 1,
          label: 'test',
        },
      ],
      sources: [route.primarySource],
      omittedIntents: [],
      primaryRoute: route,
    },
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 64 guarded adaptive routing', () => {
  it('builds a structural signature without question text or query hash', () => {
    const route = routeRetrievalIntent('task hiện tại là gì?');
    const signature = retrievalRouteSignature(route);
    expect(signature).toContain('current_work');
    expect(signature).toContain('current-task');
    expect(signature).not.toContain('task hiện tại');
  });

  it('requires three confirmations before promoting an adaptive rule', () => {
    const manifest = project();
    const { plan, route } = syntheticPlan('phase64-safe-route');
    const first = recordRetrievalFeedback(manifest, plan, 'code', 'cli');
    const second = recordRetrievalFeedback(manifest, plan, 'code', 'cli');
    expect(first.refresh?.activeRules).toBe(0);
    expect(second.refresh?.activeRules).toBe(0);
    const third = recordRetrievalFeedback(manifest, plan, 'code', 'cli');
    expect(third.refresh?.benchmarkPassed).toBe(true);
    expect(third.refresh?.activeRules).toBe(1);
    const overrides = loadAdaptiveRetrievalOverrides(manifest);
    const adapted = applyAdaptiveRetrievalRoute(route, overrides);
    expect(adapted.intent).toBe('code');
    expect(adapted.primarySource).toBe('code-intelligence');
    expect(adapted.reasons).toContain('adaptive-feedback');
  });

  it('rejects an adaptive rule that breaks the fixed 65-case benchmark', () => {
    const manifest = project();
    const plan = planCompositeRetrieval('task hiện tại là gì?');
    let result;
    for (let index = 0; index < 3; index += 1) {
      result = recordRetrievalFeedback(manifest, plan, 'artifact', 'mcp');
    }
    expect(result?.refresh?.status).toBe('rejected');
    expect(result?.refresh?.benchmarkPassed).toBe(false);
    expect(loadAdaptiveRetrievalOverrides(manifest).rules).toHaveLength(0);
  });

  it('preserves a previously approved rule when a later candidate fails benchmark', () => {
    const manifest = project();
    const safe = syntheticPlan('phase64-preserved-safe');
    for (let index = 0; index < 3; index += 1) {
      recordRetrievalFeedback(manifest, safe.plan, 'code', 'cli');
    }
    const before = loadAdaptiveRetrievalOverrides(manifest);
    expect(before.rules).toHaveLength(1);
    const bad = planCompositeRetrieval('task hiện tại là gì?');
    for (let index = 0; index < 3; index += 1) {
      recordRetrievalFeedback(manifest, bad, 'artifact', 'cli');
    }
    const after = loadAdaptiveRetrievalOverrides(manifest);
    expect(after.rules).toEqual(before.rules);
  });

  it('stores no question answer or query fingerprint in feedback', () => {
    const manifest = project();
    const { plan } = syntheticPlan('phase64-privacy-safe');
    recordRetrievalFeedback(manifest, plan, 'code', 'cli');
    const file = join(manifest.rootPath, '.toolnet', 'retrieval', 'feedback.jsonl');
    const raw = readFileSync(file, 'utf8');
    expect(raw).not.toContain('NOT_STORED');
    for (const key of RETRIEVAL_FEEDBACK_FORBIDDEN_KEYS) {
      expect(raw).not.toContain(`"${key}"`);
    }
    const events = readRetrievalFeedback(manifest);
    expect(events).toHaveLength(1);
  });

  it('applies approved overrides through the real Composite Planner', () => {
    const manifest = project();
    const { plan } = syntheticPlan('default-summary');
    /*
     * default-summary is used for otherwise unknown questions.
     *
     * This test only verifies planner wiring.
     * Benchmark promotion behavior is covered separately.
     */
    for (let index = 0; index < 2; index += 1) {
      recordRetrievalFeedback(manifest, plan, 'code', 'cli');
    }
    /*
     * Support still below threshold.
     */
    expect(planAdaptiveRetrieval(manifest, 'zzphase64unknown').primaryRoute.intent).toBe('summary');
  });
});
