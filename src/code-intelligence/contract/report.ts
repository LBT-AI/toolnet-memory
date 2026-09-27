/*
 * Phase 81 — contract-intelligence report orchestrator.
 *
 * Deterministic pipeline:
 *   Phase 80 change paths -> discovery (baseline vs candidate) -> structural
 *   diff -> consumer mapping -> ADR/runtime context -> compatibility guard.
 *
 * Derived analysis only. It never mutates the static graph, never rewrites
 * source/schema, never fetches a remote ref, never runs protoc/npm and never
 * executes source. Compatibility is structural; consumers never influence it.
 */

import { findConsumers } from './consumers.js';

import { diffContracts } from './diff.js';

import { discoverContracts } from './discover.js';

import { contractReportFingerprint } from './fingerprint.js';

import { evaluateContractGuard } from './guard.js';

import { resolveContractLimits } from './limits.js';

import { SUPPORTED_CONTRACT_KINDS } from './parsers/index.js';

import type {
  CompatibilitySummary,
  ContractAdrConstraint,
  ContractAnalysisRequest,
  ContractCoverage,
  ContractFacts,
  ContractIntelligenceReport,
  ContractRuntimeEvidence,
} from './types.js';

export interface AnalyzeContractsInput {
  request: ContractAnalysisRequest;
  facts: ContractFacts;
}

function summarizeCompatibility(input: {
  deltas: readonly ContractIntelligenceReport['changes'][number][];
  consumers: readonly ContractIntelligenceReport['consumers'][number][];
}): CompatibilitySummary {
  let breaking = 0;
  let potentiallyBreaking = 0;
  let compatible = 0;
  let unknown = 0;

  for (const delta of input.deltas) {
    if (delta.compatibility === 'breaking') {
      breaking += 1;
    } else if (delta.compatibility === 'potentially_breaking') {
      potentiallyBreaking += 1;
    } else if (delta.compatibility === 'unknown') {
      unknown += 1;
    } else {
      compatible += 1;
    }
  }

  const overall: CompatibilitySummary['overall'] =
    breaking > 0
      ? 'breaking'
      : potentiallyBreaking > 0
        ? 'potentially_breaking'
        : unknown > 0
          ? 'unknown'
          : 'compatible';

  return {
    overall,
    contracts: input.deltas.length,
    breaking,
    potentiallyBreaking,
    compatible,
    unknown,
    consumers: {
      local: input.consumers.filter((consumer) => consumer.origin === 'local').length,
      crossService: input.consumers.filter((consumer) => consumer.origin === 'cross_service')
        .length,
      fleet: input.consumers.filter((consumer) => consumer.origin === 'fleet').length,
    },
  };
}

export async function analyzeContracts(
  input: AnalyzeContractsInput
): Promise<ContractIntelligenceReport> {
  const { request, facts } = input;

  const limits = resolveContractLimits(request.limits);

  const profile = request.profile ?? 'verify';
  const claim = request.claim ?? 'impact';

  let inputChanged = false;

  if (facts.recheckSnapshot) {
    try {
      inputChanged = (await facts.recheckSnapshot()) !== facts.generation;
    } catch {
      inputChanged = true;
    }
  }

  const discovery = await discoverContracts({ facts, limits });

  const diff = diffContracts(discovery.baseline.entries, discovery.candidate.entries, {
    maxContractChanges: limits.maxContractChanges,
  });

  const consumerResult = findConsumers({
    deltas: diff.deltas,
    facts,
    limits,
  });

  const coverage: ContractCoverage = {
    filesChecked: discovery.filesChecked,
    filesParsed: discovery.filesParsed,
    supportedKinds: facts.supportedKinds
      ? [...facts.supportedKinds()]
      : [...SUPPORTED_CONTRACT_KINDS],
    unsupported: discovery.baseline.unsupported,
    unresolvedRefs: discovery.baseline.unresolvedRefs,
    baselinesUnavailable: discovery.baselinesUnavailable,
    candidatesUnavailable: discovery.candidatesUnavailable,
    consumerCoveragePartial: consumerResult.partial,
    truncated: discovery.truncated || diff.truncated || consumerResult.truncated,
  };

  const adrConstraints: ContractAdrConstraint[] = facts.adr
    ? [
        ...((await facts.adr({
          filePaths: [
            ...new Set(discovery.baseline.entries.map((entry) => entry.sourcePath)),
          ].sort(),
          symbols: [
            ...new Set(
              diff.deltas
                .flatMap((delta) => [delta.identity, delta.contractId])
                .filter((value) => value.length > 0)
            ),
          ].sort(),
        })) ?? []),
      ]
    : [];

  let runtimeEvidence: ContractRuntimeEvidence[] = [];

  if (request.includeRuntimeEvidence && facts.runtime) {
    const subjectIds = [
      ...new Set(consumerResult.consumers.map((consumer) => consumer.symbolId)),
    ].sort();

    if (subjectIds.length > 0) {
      runtimeEvidence = facts
        .runtime(subjectIds)
        .map((observation) => ({
          id: observation.id,
          kind: observation.kind,
          validation: observation.validation,
          observationCount: observation.observationCount,
          sessionCount: observation.sessionCount,
          compatibility: observation.compatibility,
          source: observation.source,
          target: observation.target,
        }))
        .sort((left, right) => left.id.localeCompare(right.id));
    }
  }

  const evaluation = evaluateContractGuard({
    profile,
    claim,
    facts,
    deltas: diff.deltas,
    consumers: consumerResult.consumers,
    coverage,
    adrConstraints,
    inputChanged,
    limitReached: coverage.truncated,
    consumerPartial: consumerResult.partial,
  });

  const compatibility = summarizeCompatibility({
    deltas: diff.deltas,
    consumers: consumerResult.consumers,
  });

  const fingerprint = contractReportFingerprint({
    projectId: request.projectId,
    baselineFingerprint: discovery.baseline.fingerprint,
    candidateFingerprint: discovery.candidate.fingerprint,
    baselineGeneration: facts.generation,
    ...(facts.candidateGeneration ? { candidateGeneration: facts.candidateGeneration } : {}),
    ...(facts.fleet?.generation ? { fleetGeneration: facts.fleet.generation } : {}),
    profile,
  });

  const diagnostics = [...evaluation.diagnostics];

  if (coverage.truncated) {
    diagnostics.push('CONTRACT_ANALYSIS_TRUNCATED');
  }

  return {
    profile,
    evidenceLevel:
      profile === 'auditor' ? 'audited' : profile === 'verify' ? 'verified' : 'provisional',

    generations: {
      baseline: facts.generation,
      ...(facts.candidateGeneration ? { candidate: facts.candidateGeneration } : {}),
      ...(facts.fleet?.generation ? { fleet: facts.fleet.generation } : {}),
    },

    baseline: {
      generation: discovery.baseline.generation,
      fingerprint: discovery.baseline.fingerprint,
      entries: discovery.baseline.entries.length,
      unsupported: discovery.baseline.unsupported.length,
      unresolvedRefs: discovery.baseline.unresolvedRefs.length,
    },

    candidate: {
      generation: discovery.candidate.generation,
      fingerprint: discovery.candidate.fingerprint,
      entries: discovery.candidate.entries.length,
      unsupported: discovery.candidate.unsupported.length,
      unresolvedRefs: discovery.candidate.unresolvedRefs.length,
    },

    changes: diff.deltas,
    compatibility,
    consumers: consumerResult.consumers,
    runtimeEvidence,
    adrConstraints,
    coverage,

    guard: evaluation.guard,
    claimSafety: evaluation.claimSafety,

    limitations: evaluation.limitations,
    diagnostics: [...new Set(diagnostics)],

    complete: evaluation.complete,
    fingerprint,
  };
}
