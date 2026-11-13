import { describe, expect, it } from 'vitest';

import type { AuthoritySeed, AuthoritySnapshot } from '../../src/v0.7/authority-state.js';

import { createAuthorityState } from '../../src/v0.7/authority-state.js';

import { benchmarkResumeTokens } from '../../src/v0.7/token-benchmark.js';

const NOW = 1_700_000_000_000;

const TITLES: Record<string, string> = {
  T1: 'Define order schema and migrations for the orders service',
  T2: 'Create database migrations and rollback scripts',
  T3: 'Implement the create-order API endpoint with validation',
  T4: 'Add the queue worker that persists order events',
  T5: 'Write unit tests for the order API and worker',
  T6: 'Add the authentication guard to the admin routes',
  T7: 'Deploy the staging worker and verify the queue binding',
  T8: 'Fix worker retry handling and error propagation',
  T9: 'Write the operations runbook for failed orders',
  T10: 'Load test the queue with 10k concurrent orders',
};

function legacyBaseline(): string {
  const taskLines = Object.entries(TITLES).map(([id, title], index) => {
    if (index < 7) {
      return `- [x] ${id} ${title}`;
    }

    if (id === 'T8') {
      return `- [~] ${id} ${title}`;
    }

    return `- [ ] ${id} ${title}`;
  });

  return [
    '# ToolNet Stable Work State',
    '',
    'Updated: 2026-11-13T09:41:00.000Z',
    'Last agent: agy-cli',
    'Last session: agy-session-8842',
    '',
    'Current request: Implement the order pipeline end to end.',
    'Current activity: Fixing worker retry handling.',
    'Goal: Ship the orders service to staging with verified tests.',
    'Plan: T1-T7 complete; finish T8; then T9 and T10.',
    '',
    'Current task: [~] T8 Fix worker retry handling and error propagation',
    '',
    'Phases:',
    '- [x] Phase 1 Schema',
    '- [x] Phase 2 API',
    '- [~] Phase 3 Worker hardening',
    '',
    'TODO / Tasks:',
    ...taskLines,
    '',
    'Next actions:',
    '- Finish retry error propagation',
    '- Run integration tests',
    '- Write the operations runbook',
    '- Load test the queue',
    '',
    'Blockers:',
    '- none recorded',
    '',
    'Important decisions:',
    '- Worker retries use exponential backoff with jitter',
    '- Orders are written through the queue, never directly by the API',
    '',
    'Active files:',
    '- src/worker/retry.ts',
    '- src/api/orders.ts',
    '',
    'Modified files:',
    '- src/worker/retry.ts',
    '',
    'Files touched:',
    '- src/api/orders.ts',
    '- src/worker/retry.ts',
    '- src/db/migrations/0003-orders.sql',
    '',
    'Recent commands:',
    '- npm test -- order-api',
    '- npm run typecheck',
    '- npm run lint',
    '',
    'Checks:',
    '- [pass] typecheck: npm run typecheck',
    '- [pass] unit: npm test -- order-api',
    '- [unknown] integration: npm test -- order-integration',
    '',
    'Progress:',
    '- Phases: 2/3',
    '- Tasks: 7/10',
    '- Blocked: 0',
    '',
    'Continuation:',
    '- Resume current unfinished task.',
    '- Never redo completed TODO/Phase unless explicitly requested.',
    '- Ask ToolNet Memory for deeper history only when necessary.',
    '',
    'Project rules:',
    '- [mandatory] Never log raw access tokens.',
    '- [mandatory] Preserve the public API contract.',
    '',
    'Critical flows:',
    '- API -> Queue -> Worker -> DB',
    '- Admin UI -> Admin API -> DB',
  ].join('\n');
}

function snapshot(): AuthoritySnapshot {
  const seed: AuthoritySeed = {
    projectId: 'project-a',
    projectName: 'Project A',
    branch: 'main',
    codeRevision: 'sha-agy',
    tasks: Object.entries(TITLES).map(([id, title]) => ({
      id,
      title,
      status: id === 'T8' ? 'in_progress' : Number(id.slice(1)) <= 7 ? 'completed' : 'pending',
      verification:
        Number(id.slice(1)) <= 7 ? 'verified' : id === 'T8' ? 'partially_verified' : 'unverified',
      done: Number(id.slice(1)) <= 7 ? [`${id} implementation`] : [],
      remaining: id === 'T8' ? ['Finish retry error propagation', 'Run integration tests'] : [],
      filesTouched: id === 'T8' ? ['src/worker/retry.ts'] : [],
      blockers: [],
      ...(id === 'T8'
        ? { nextAction: 'Finish retry error propagation and run the integration suite.' }
        : {}),
      evidence: id === 'T8' ? [{ ref: 'test-run:42', at: new Date(NOW).toISOString() }] : [],
      tests: id === 'T8' ? [{ name: 'retry unit', outcome: 'pass' as const }] : [],
    })),
    rules: [
      {
        id: 'no-secret-logs',
        text: 'Never log raw access tokens.',
        mandatory: true,
        verified: true,
        provenance: 'user',
      },
      {
        id: 'public-api',
        text: 'Preserve the public API contract.',
        mandatory: true,
        verified: true,
        provenance: 'code',
      },
      {
        id: 'prettier',
        text: 'Run Prettier before committing.',
        mandatory: false,
        verified: true,
        provenance: 'code',
      },
    ],
    flows: [
      {
        id: 'order-flow',
        description: 'API -> Queue -> Worker -> DB',
        critical: true,
        verified: true,
        provenance: 'code',
      },
      {
        id: 'admin-flow',
        description: 'Admin UI -> Admin API -> DB',
        critical: false,
        verified: true,
        provenance: 'code',
      },
    ],
    decisions: ['Worker retries use exponential backoff with jitter'],
  };

  const machine = createAuthorityState(seed, NOW);

  machine.commit({
    projectId: 'project-a',
    agentId: 'agy',
    operations: [{ type: 'decision.add', text: 'Orders are written through the queue' }],
    expectedRevision: 0,
    now: NOW,
    codeRevision: 'sha-agy',
  });

  return machine.snapshot();
}

describe('v0.7 resume token benchmark', () => {
  it('measures a real reduction while keeping every mandatory fact', () => {
    const result = benchmarkResumeTokens({
      snapshot: snapshot(),
      baselineText: legacyBaseline(),
      currentCodeRevision: 'sha-agy',
    });

    console.log(
      `V07_TOKEN_BENCHMARK baseline=${result.baselineTokens} tiny=${result.tinyTokens} ` +
        `standard=${result.standardTokens} tiny_reduction=${result.tinyReductionPercent}% ` +
        `standard_reduction=${result.standardReductionPercent}%`
    );

    expect(result.baselineTokens).toBeGreaterThan(result.tinyTokens);
    expect(result.baselineTokens).toBeGreaterThan(result.standardTokens);
    expect(result.tinyReductionPercent).toBeGreaterThanOrEqual(30);
    expect(result.missingMandatoryFacts).toEqual([]);
    expect(result.tinyTargetMet).toBe(true);
    expect(result.standardTargetMet).toBe(true);
  });

  it('flags a reduced packet that dropped a mandatory rule instead of hiding it', () => {
    const state = snapshot();
    const baseline = legacyBaseline();

    /* A packet budget of one token cannot hold anything; the compiler keeps the
     * facts and reports overflow rather than truncating them. */
    const result = benchmarkResumeTokens({
      snapshot: {
        ...state,
        rules: [
          ...state.rules,
          {
            id: 'extra-mandatory',
            text: 'All money amounts use integer cents.',
            mandatory: true,
            verified: true,
            provenance: 'user',
          },
        ],
      },
      baselineText: baseline,
      countTokens: (text) => text.length,
    });

    expect(result.missingMandatoryFacts).toEqual([]);
  });
});
