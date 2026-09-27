/*
 * Phase 82 — deterministic test selection.
 *
 * Categories are explicit (direct / contract / integration / transitive /
 * related / e2e); every selected test carries a machine-readable reason code and
 * the semantic path that produced it. There is no relevance score — ordering is
 * a deterministic tier order with a stable tiebreak.
 *
 * The "minimal" set is a deterministic GREEDY cover, documented as a heuristic,
 * never as a mathematically minimal solution.
 */

import { testSelectionFingerprint, testSelectionId } from './fingerprint.js';

import { detectFramework } from './frameworks.js';

import { buildTestRelationships } from './relationships.js';

import type { RelationshipInput } from './relationships.js';

import type { EvidenceClaimKind } from '../evidence/types.js';

import type {
  FrameworkDiscoverySupport,
  SelectedTest,
  TestCategory,
  TestChangedEntity,
  TestContractChange,
  TestDescriptor,
  TestFacts,
  TestReasonCode,
  TestSelection,
  TestSelectionCoverage,
  TestSelectionReason,
  TestSelectionRequest,
  UncoveredEntity,
} from './types.js';

import type { TestDiscoveryResult } from './discovery.js';

const DIRECT_REASONS: ReadonlySet<TestReasonCode> = new Set<TestReasonCode>([
  'EXPLICIT_TESTS_EDGE',
  'DIRECT_CALLS_CHANGED_SYMBOL',
]);

const INTEGRATION_REASONS: ReadonlySet<TestReasonCode> = new Set<TestReasonCode>([
  'TESTS_CHANGED_ROUTE',
  'TESTS_EVENT_CHANNEL',
  'CROSS_SERVICE_CONSUMER_TEST',
  'CROSS_REPO_CONSUMER_TEST',
]);

const TIER: Record<TestCategory, number> = {
  direct: 1,
  contract: 2,
  integration: 3,
  transitive: 4,
  related: 5,
  e2e: 3,
};

function isNegativeClaim(claim: EvidenceClaimKind): boolean {
  return (
    claim === 'negative' || claim === 'absence' || claim === 'uniqueness' || claim === 'exhaustive'
  );
}

function categoryFor(
  reason: TestReasonCode,
  targetIsContract: boolean,
  kind: TestDescriptor['kind']
): TestCategory {
  if (kind === 'e2e') {
    return 'e2e';
  }

  if (DIRECT_REASONS.has(reason)) {
    return 'direct';
  }

  if (targetIsContract) {
    return 'contract';
  }

  if (INTEGRATION_REASONS.has(reason)) {
    return 'integration';
  }

  if (reason === 'TRANSITIVE_CALL_PATH') {
    return 'transitive';
  }

  return 'related';
}

export interface TestSelectionResult {
  selection: TestSelection;
}

export function selectTests(input: {
  request: TestSelectionRequest;
  facts: TestFacts;
  discovery: TestDiscoveryResult;
  limits: { maxSelectedTests: number; maxDepth: number };
  now?: () => Date;
}): TestSelectionResult {
  const { request, facts, discovery, limits } = input;

  const profile = request.profile ?? 'verify';
  const claim = request.claim ?? 'impact';

  const changedEntities: readonly TestChangedEntity[] = facts.changedEntities;

  const changedSymbolIds = new Set(
    changedEntities
      .map((entity) => entity.symbolId)
      .filter((value): value is string => typeof value === 'string')
  );

  const entityBySymbolId = new Map<string, TestChangedEntity>();

  for (const entity of changedEntities) {
    if (entity.symbolId) {
      entityBySymbolId.set(entity.symbolId, entity);
    }
  }

  /* Contract targets: the graph nodes a changed contract maps onto. */
  const contractBySymbolId = new Map<string, TestContractChange>();

  const contractSymbolIds = new Set<string>();

  for (const change of facts.contractChanges ?? []) {
    for (const symbolId of change.symbolIds) {
      contractBySymbolId.set(symbolId, change);
      contractSymbolIds.add(symbolId);
    }

    /* Also resolve by source path when the contract carries no direct symbol. */
    if (change.symbolIds.length === 0) {
      for (const symbol of facts.graph.symbols()) {
        if (change.sourcePaths.includes(symbol.filePath)) {
          contractBySymbolId.set(symbol.id, change);
          contractSymbolIds.add(symbol.id);
        }
      }
    }
  }

  const relationships = buildTestRelationships({
    facts,
    descriptors: discovery.tests,
    limits: { maxDepth: limits.maxDepth, maxSelectedTests: limits.maxSelectedTests },
  });

  const descriptorById = new Map(discovery.tests.map((descriptor) => [descriptor.id, descriptor]));

  /* Runtime-observed symbols (Phase 79). */
  const observedSymbols = new Set<string>();

  if (request.includeRuntimeEvidence && facts.runtime) {
    const subjectIds = [...new Set([...changedSymbolIds, ...contractSymbolIds])].sort();

    for (const observation of facts.runtime(subjectIds)) {
      if (observation.source.symbolId) {
        observedSymbols.add(observation.source.symbolId);
      }

      if (observation.target.symbolId) {
        observedSymbols.add(observation.target.symbolId);
      }
    }
  }

  const selected = new Map<string, SelectedTest>();

  const coveredByEntity = new Map<string, Set<string>>();

  /*
   * Every entity a test is deterministically related to.
   *
   * A single test can reach several changed entities (e.g. two direct CALLS).
   * `SelectedTest` carries only its strongest relationship, but coverage and the
   * greedy minimal cover must still see ALL of them, otherwise a test that
   * covers A and B would be reported as covering only one.
   */
  const descriptorTargets = new Map<string, Set<string>>();

  let truncated = false;

  const consider = (
    descriptor: TestDescriptor,
    reason: TestReasonCode,
    targetSymbolId: string | undefined,
    path: SelectedTest['path']
  ): void => {
    if (selected.size >= limits.maxSelectedTests) {
      truncated = true;
      return;
    }

    const targetIsContract = targetSymbolId !== undefined && contractSymbolIds.has(targetSymbolId);

    let reasonCode = reason;

    if (
      targetIsContract &&
      reasonCode !== 'EXPLICIT_TESTS_EDGE' &&
      reasonCode !== 'DIRECT_CALLS_CHANGED_SYMBOL'
    ) {
      reasonCode = 'TESTS_CHANGED_CONTRACT';
    }

    const category = categoryFor(reasonCode, targetIsContract, descriptor.kind);

    const candidate: SelectedTest = {
      test: descriptor,
      category,
      reasonCode,
      tier: TIER[category],
      ...(targetSymbolId ? { targetEntityId: targetSymbolId } : {}),
      path,
    };

    const runtimeObserved =
      observedSymbols.size > 0 &&
      ((targetSymbolId !== undefined && observedSymbols.has(targetSymbolId)) ||
        path.some((step) => observedSymbols.has(step.from) || observedSymbols.has(step.to)));

    if (runtimeObserved) {
      candidate.runtimeObserved = true;

      if (category === 'related' || category === 'transitive') {
        candidate.reasonCode = 'RUNTIME_OBSERVED_PATH_TEST';
      }
    }

    /*
     * Record every changed/contract entity this test reaches, independently of
     * whether this particular relationship becomes the test's headline one.
     */
    if (targetSymbolId) {
      const isChanged = entityBySymbolId.has(targetSymbolId);

      if (isChanged || targetIsContract) {
        const bucket = coveredByEntity.get(targetSymbolId) ?? new Set<string>();

        bucket.add(descriptor.id);

        coveredByEntity.set(targetSymbolId, bucket);

        const targets = descriptorTargets.get(descriptor.id) ?? new Set<string>();

        targets.add(targetSymbolId);

        descriptorTargets.set(descriptor.id, targets);
      }
    }

    const existing = selected.get(descriptor.id);

    if (existing && existing.tier <= candidate.tier) {
      /* Keep the stronger evidence; never downgrade a test's selection tier. */
      if (runtimeObserved) {
        existing.runtimeObserved = true;
      }

      return;
    }

    selected.set(descriptor.id, candidate);
  };

  for (const descriptor of discovery.tests) {
    const relations = relationships.get(descriptor.id) ?? [];

    for (const relation of relations) {
      const target = relation.targetSymbolId;

      const isChanged = changedSymbolIds.has(target);
      const isContract = contractSymbolIds.has(target);

      if (!isChanged && !isContract) {
        continue;
      }

      consider(descriptor, relation.reasonCode, target, relation.path);
    }
  }

  /* Cross-repo tests, only when a deterministic Fleet test declaration exists. */
  if (request.includeFleet) {
    const resourceIds = [...new Set([...changedSymbolIds, ...contractSymbolIds])].sort();

    const fleetTests = facts.fleetTests ? facts.fleetTests(resourceIds) : null;

    if (fleetTests) {
      for (const ref of fleetTests) {
        const descriptor: TestDescriptor = {
          id: `fleet:${ref.projectId}:${ref.testId}`,
          projectId: ref.projectId,
          path: ref.path,
          framework: ref.framework,
          kind: 'integration',
          deterministicIdentity: `fleet:${ref.projectId}:${ref.testId}`,
        };

        if (selected.size >= limits.maxSelectedTests) {
          truncated = true;
          break;
        }

        selected.set(descriptor.id, {
          test: descriptor,
          category: 'integration',
          reasonCode: 'CROSS_REPO_CONSUMER_TEST',
          tier: TIER.integration,
          targetEntityId: ref.resourceId,
          path: [],
        });

        descriptorById.set(descriptor.id, descriptor);
      }
    }
  }

  const list = [...selected.values()].sort(
    (left, right) =>
      left.tier - right.tier ||
      left.test.path.localeCompare(right.test.path) ||
      left.test.id.localeCompare(right.test.id)
  );

  const categories: TestSelection['categories'] = {
    direct: list.filter((entry) => entry.category === 'direct'),
    contract: list.filter((entry) => entry.category === 'contract'),
    integration: list.filter((entry) => entry.category === 'integration'),
    transitive: list.filter((entry) => entry.category === 'transitive'),
    related: list.filter((entry) => entry.category === 'related'),
    e2e: list.filter((entry) => entry.category === 'e2e'),
  };

  /* Deterministic greedy cover of the changed entities. */
  const minimal: SelectedTest[] = [];

  const covered = new Set<string>();

  const missing = new Set(
    changedEntities.map((entity) => entity.symbolId).filter((id): id is string => Boolean(id))
  );

  const byCoverage = [...selected.values()]
    .map((entry) => {
      const targets = new Set<string>();

      for (const target of descriptorTargets.get(entry.test.id) ?? []) {
        if (missing.has(target)) {
          targets.add(target);
        }
      }

      return { entry, targets };
    })
    .filter((item) => item.targets.size > 0)
    .sort(
      (left, right) =>
        right.targets.size - left.targets.size ||
        left.entry.test.path.localeCompare(right.entry.test.path) ||
        left.entry.test.id.localeCompare(right.entry.test.id)
    );

  for (const item of byCoverage) {
    const fresh = [...item.targets].filter((target) => !covered.has(target));

    if (fresh.length === 0) {
      continue;
    }

    minimal.push(item.entry);

    for (const target of fresh) {
      covered.add(target);
    }
  }

  /* Uncovered changed entities. */
  const frameworkSupport = new Map<string, FrameworkDiscoverySupport['support']>();

  for (const item of discovery.coverage.frameworks) {
    frameworkSupport.set(item.framework, item.support);
  }

  const uncoveredEntities: UncoveredEntity[] = [];

  for (const entity of changedEntities) {
    const id = entity.symbolId ?? entity.id;

    if (entity.symbolId && coveredByEntity.has(entity.symbolId)) {
      continue;
    }

    if (!entity.symbolId) {
      continue;
    }

    const framework = detectFramework(entity.filePath);

    const support = framework ? (frameworkSupport.get(framework) ?? 'unsupported') : undefined;

    uncoveredEntities.push({
      entityId: id,
      ...(entity.name ? { name: entity.name } : {}),
      filePath: entity.filePath,
      reasonCode: !discovery.coverage.complete
        ? 'DISCOVERY_INCOMPLETE'
        : support === 'unsupported'
          ? 'UNSUPPORTED_FRAMEWORK'
          : 'NO_KNOWN_TEST',
    });
  }

  uncoveredEntities.sort((left, right) => left.entityId.localeCompare(right.entityId));

  const entitiesWithAnyKnownTest = [...coveredByEntity.keys()].filter((symbolId) =>
    changedSymbolIds.has(symbolId)
  ).length;

  const directTargets = new Set<string>();

  for (const entry of list) {
    if (entry.category !== 'direct') {
      continue;
    }

    for (const target of descriptorTargets.get(entry.test.id) ?? []) {
      directTargets.add(target);
    }
  }

  const coverage: TestSelectionCoverage = {
    changedEntities: changedEntities.filter((entity) => Boolean(entity.symbolId)).length,
    entitiesWithDirectTests: [...directTargets].filter((id) => changedSymbolIds.has(id)).length,
    entitiesWithAnyKnownTest,
    uncoveredEntities: uncoveredEntities.length,
  };

  /* Reasons. */
  const reasons = new Set<TestSelectionReason>();

  if (discovery.coverage.complete) {
    reasons.add('TEST_DISCOVERY_COMPLETE');
  } else {
    reasons.add('TEST_DISCOVERY_PARTIAL');
  }

  if (discovery.coverage.reasons.includes('UNSUPPORTED_TEST_FRAMEWORK')) {
    reasons.add('UNSUPPORTED_TEST_FRAMEWORK');
  }

  const coverageComplete = facts.coverageAvailable
    ? ['call_graph', 'dependency_graph'].every(
        (capability) => facts.coverageFor(capability).negativeClaimSafe
      )
    : false;

  if (!coverageComplete) {
    reasons.add('COVERAGE_PARTIAL');
  }

  if (facts.currentGeneration() !== facts.generation) {
    reasons.add('GRAPH_STALE');
  }

  if (truncated) {
    reasons.add('SELECTION_LIMIT_REACHED');
  }

  if (!discovery.coverage.complete || truncated) {
    reasons.add('TEST_SELECTION_INCOMPLETE');
  }

  if (request.includeFleet) {
    if (!facts.fleetTests) {
      reasons.add('CROSS_REPO_TEST_MAPPING_UNSUPPORTED');
    }

    if (facts.fleet) {
      if (facts.fleet.staleProjects.length > 0 || facts.fleet.missingProjects.length > 0) {
        reasons.add('FLEET_STALE');
      }

      if (facts.fleet.registeredProjects.length === 0) {
        reasons.add('FLEET_SCOPE_UNBOUNDED');
      }
    }
  }

  /*
   * Contract changes with no known test.
   *
   * A contract is covered only when a selected test targets one of the graph
   * nodes that contract maps onto. A structurally breaking contract change with
   * no known test is reported honestly and NEVER downgraded to compatible.
   */
  const coveredContractIds = new Set<string>();

  for (const entry of list) {
    if (entry.category !== 'contract') {
      continue;
    }

    for (const target of descriptorTargets.get(entry.test.id) ?? []) {
      const change = contractBySymbolId.get(target);

      if (change) {
        coveredContractIds.add(change.contractId);
      }
    }
  }

  const contractsWithoutTest: string[] = [];

  for (const change of facts.contractChanges ?? []) {
    if (change.compatibility === 'compatible') {
      continue;
    }

    if (coveredContractIds.has(change.contractId)) {
      continue;
    }

    contractsWithoutTest.push(change.contractId);

    uncoveredEntities.push({
      entityId: change.contractId,
      name: change.identity,
      filePath: change.sourcePaths[0] ?? '',
      reasonCode: discovery.coverage.complete ? 'NO_KNOWN_TEST' : 'DISCOVERY_INCOMPLETE',
    });
  }

  /* Profile gating. */
  const negative = isNegativeClaim(claim);

  if (negative && profile === 'scout') {
    reasons.add('PROFILE_REQUIRES_VERIFY');
  }

  if (claim === 'exhaustive' && profile !== 'auditor') {
    reasons.add('PROFILE_REQUIRES_AUDITOR');
  }

  const negativeClaimSafe =
    negative &&
    profile !== 'scout' &&
    discovery.coverage.complete &&
    coverageComplete &&
    !truncated &&
    facts.currentGeneration() === facts.generation;

  if (negative && !negativeClaimSafe) {
    reasons.add('NEGATIVE_TEST_CLAIM_NOT_SAFE');
  }

  const claimDecision: TestSelection['claimSafety']['decision'] =
    negative && !negativeClaimSafe ? 'blocked' : profile === 'scout' ? 'provisional' : 'allowed';

  const fingerprint = testSelectionFingerprint({
    projectId: request.projectId,
    ...(facts.changeFingerprint ? { changeFingerprint: facts.changeFingerprint } : {}),
    ...(facts.contractFingerprint ? { contractFingerprint: facts.contractFingerprint } : {}),
    baselineGeneration: facts.generation,
    ...(facts.candidateGeneration ? { candidateGeneration: facts.candidateGeneration } : {}),
    ...(facts.fleet?.generation ? { fleetGeneration: facts.fleet.generation } : {}),
    profile,
    selectedTestIds: list.map((entry) => entry.test.id),
  });

  const limitations: string[] = [];

  if (!discovery.coverage.complete) {
    limitations.push(
      'Test discovery is partial: at least one test framework/path could not be parsed, so "no tests exist" is never claimed.'
    );
  }

  if (request.includeFleet && !facts.fleetTests) {
    limitations.push(
      'Cross-repo test selection requires a deterministic Fleet test declaration, which this install does not carry.'
    );
  }

  if (!coverageComplete) {
    limitations.push('Graph coverage is partial; a selected-test pass does not change that.');
  }

  const complete =
    !truncated && discovery.coverage.complete && facts.currentGeneration() === facts.generation;

  return {
    selection: {
      projectId: request.projectId,
      profile,
      evidenceLevel:
        profile === 'auditor' ? 'audited' : profile === 'verify' ? 'verified' : 'provisional',
      selectionId: testSelectionId(fingerprint),
      fingerprint,
      ...(facts.changeFingerprint ? { changeFingerprint: facts.changeFingerprint } : {}),
      ...(facts.contractFingerprint ? { contractFingerprint: facts.contractFingerprint } : {}),
      generations: {
        baseline: facts.generation,
        ...(facts.candidateGeneration ? { candidate: facts.candidateGeneration } : {}),
        ...(facts.fleet?.generation ? { fleet: facts.fleet.generation } : {}),
      },
      categories,
      minimal,
      uncoveredEntities,
      coverage,
      discovery: discovery.coverage,
      changedEntities: coverage.changedEntities,
      reasons: [...reasons].sort(),
      claimSafety: {
        decision: claimDecision,
        negativeClaimSafe,
        exhaustiveClaimSafe: negativeClaimSafe && profile === 'auditor',
        reasons: [...reasons].sort(),
      },
      adrConstraints: [...(facts.adrConstraints ?? [])].sort((left, right) =>
        left.id.localeCompare(right.id)
      ),
      limitations: [...new Set(limitations)],
      diagnostics: [
        ...new Set(
          list.map((entry) => `SELECTED:${entry.category}:${entry.reasonCode}`).slice(0, 50)
        ),
        ...contractsWithoutTest.map((id) => `CONTRACT_CHANGE_WITHOUT_KNOWN_TEST:${id}`),
      ],
      complete,
    },
  };
}

export type { RelationshipInput };

export { TIER, DIRECT_REASONS, INTEGRATION_REASONS };
