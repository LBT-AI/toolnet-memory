/*
 * Phase 82 — test-intelligence report orchestrators.
 *
 *   selection   : change/contract -> discovery -> relationships -> selection
 *   verification: selection + an explicit run -> bounded verification evidence
 *
 * Hard invariant: a passing selected-test run is EVIDENCE, never authorisation.
 * `safeToMerge`/`safeToDeploy` are always false, and test success only removes
 * TEST-SPECIFIC blockers — coverage, contract and static blockers remain.
 */

import { discoverTests } from './discovery.js';

import { resolveTestLimits } from './limits.js';

import { selectTests } from './selection.js';

import type { TestDiscoveryResult } from './discovery.js';

import type {
  TestCoverageEvidence,
  TestDescriptor,
  TestFacts,
  TestRun,
  TestSelection,
  TestSelectionRequest,
  TestVerificationBlocker,
  TestVerificationReport,
} from './types.js';

export interface BuildSelectionInput {
  request: TestSelectionRequest;
  facts: TestFacts;
  limits?: Partial<ReturnType<typeof resolveTestLimits>>;
  now?: () => Date;
}

export interface BuildSelectionResult {
  selection: TestSelection;
  discovery: TestDiscoveryResult;
}

export async function buildTestSelection(
  input: BuildSelectionInput
): Promise<BuildSelectionResult> {
  const limits = resolveTestLimits(input.limits);

  const discovery = await discoverTests({
    facts: input.facts,
    limits: {
      maxTestFiles: limits.maxTestFiles,
      maxTestSymbols: limits.maxTestSymbols,
      maxSourceReadBytes: limits.maxSourceReadBytes,
    },
  });

  const { selection } = selectTests({
    request: input.request,
    facts: input.facts,
    discovery,
    limits: { maxSelectedTests: limits.maxSelectedTests, maxDepth: limits.maxDepth },
    ...(input.now ? { now: input.now } : {}),
  });

  return { selection, discovery };
}

export interface BuildVerificationInput {
  selection: TestSelection;
  run?: TestRun;
  coverage?: TestCoverageEvidence;
  facts: TestFacts;
}

function flattenSelection(selection: TestSelection): TestDescriptor[] {
  return [
    ...selection.categories.direct,
    ...selection.categories.contract,
    ...selection.categories.integration,
    ...selection.categories.e2e,
    ...selection.categories.transitive,
    ...selection.categories.related,
  ].map((entry) => entry.test);
}

export function buildTestVerification(input: BuildVerificationInput): TestVerificationReport {
  const { selection, run, coverage } = input;

  const descriptors = flattenSelection(selection);

  const byId = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor]));

  const blockers = new Set<TestVerificationBlocker>();

  const limitations: string[] = [];

  const passed: TestDescriptor[] = [];
  const failed: Array<{ test: TestDescriptor; message?: string }> = [];
  const skipped: TestDescriptor[] = [];
  const errors: Array<{ testId?: string; code: string }> = [];

  if (run) {
    if (run.stale) {
      blockers.add('TEST_RESULT_STALE');
      limitations.push('The run result is stale for the current change/generation.');
    }

    for (const result of run.results) {
      const descriptor = byId.get(result.testId);

      if (!descriptor) {
        continue;
      }

      switch (result.status) {
        case 'passed':
          passed.push(descriptor);
          break;
        case 'failed':
          failed.push({
            test: descriptor,
            ...(result.failure ? { message: result.failure } : {}),
          });
          break;
        case 'skipped':
        case 'todo':
          skipped.push(descriptor);
          blockers.add('REQUIRED_TEST_SKIPPED');
          break;
        default:
          errors.push({ testId: descriptor.id, code: 'TEST_ERRORED' });
      }
    }

    if (failed.length > 0) {
      blockers.add('SELECTED_TEST_FAILED');
    }

    for (const error of run.errors) {
      if (error.startsWith('TEST_RUNNER_UNAVAILABLE')) {
        blockers.add('TEST_RUNNER_UNAVAILABLE');
        errors.push({ code: 'TEST_RUNNER_UNAVAILABLE' });
      } else if (error.startsWith('TEST_RUN_TIMEOUT')) {
        blockers.add('SELECTED_TEST_TIMEOUT');
        errors.push({ code: 'TEST_RUN_TIMEOUT' });
      } else if (error.startsWith('TEST_RUNNER_ERROR')) {
        blockers.add('SELECTED_TEST_ERROR');
        errors.push({ code: 'TEST_RUNNER_ERROR' });
      } else if (error.startsWith('TEST_RUN_CANCELLED')) {
        blockers.add('SELECTED_TEST_ERROR');
        errors.push({ code: 'TEST_RUN_CANCELLED' });
      }
    }

    if (run.userSelectedSubset) {
      limitations.push(
        'Only an explicit subset of the recommended selection was run; verification completeness does not extend to the full selection.'
      );
    }
  }

  /* Test-independent blockers: never removed by a green run. */
  if (selection.uncoveredEntities.some((entity) => entity.reasonCode === 'NO_KNOWN_TEST')) {
    blockers.add('CHANGED_ENTITY_WITHOUT_KNOWN_TEST');
  }

  if (
    selection.diagnostics.some((entry) => entry.startsWith('CONTRACT_CHANGE_WITHOUT_KNOWN_TEST'))
  ) {
    blockers.add('CONTRACT_CHANGE_WITHOUT_KNOWN_TEST');
  }

  if (!selection.discovery.complete) {
    blockers.add('TEST_DISCOVERY_PARTIAL');
  }

  if (!selection.complete) {
    blockers.add('TEST_SELECTION_INCOMPLETE');
  }

  if (!coverage || coverage.stale) {
    if (coverage?.stale) {
      limitations.push('The supplied coverage report is stale for the current source generation.');
    }
  }

  const stale = Boolean(run?.stale);

  const sortedBlockers = [...blockers].sort();

  return {
    selection,
    ...(run ? { run } : {}),
    passed: passed.sort((left, right) => left.id.localeCompare(right.id)),
    failed: failed.sort((left, right) => left.test.id.localeCompare(right.test.id)),
    skipped: skipped.sort((left, right) => left.id.localeCompare(right.id)),
    errors: [...errors].sort((left, right) =>
      (left.testId ?? '').localeCompare(right.testId ?? '')
    ),
    ...(coverage ? { coverage } : {}),
    stale,
    complete: !stale && sortedBlockers.length === 0,
    blockers: sortedBlockers,
    limitations: [...new Set(limitations)],
    safeToMerge: false,
    safeToDeploy: false,
  };
}
