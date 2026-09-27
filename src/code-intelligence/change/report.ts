/*
 * Phase 80 — change-intelligence report orchestrator.
 *
 * Deterministic pipeline:
 *   change input -> mapper -> impact expansion -> ADR/runtime context -> guard.
 *
 * The result is derived analysis. It never mutates the static graph, never
 * executes source or tests, never publishes an artifact and never becomes an
 * authority for Memory, Tasks, Sessions or ADRs.
 */

import { changeFingerprint, changeSnapshotId } from './fingerprint.js';

import { expandImpact } from './impact.js';

import { evaluateGuard } from './guard.js';

import { resolveChangeLimits } from './limits.js';

import { mapChange } from './mapper.js';

import { isPathContained } from './paths.js';

import type { GitChangeSnapshot } from './git-reader.js';

import type {
  AdrConstraintEntry,
  ChangeAnalysisRequest,
  ChangeFacts,
  ChangeIntelligenceReport,
  FileChange,
} from './types.js';

import { ChangeError } from './types.js';

export interface AnalyzeChangeInput {
  request: ChangeAnalysisRequest;
  facts: ChangeFacts;
  snapshot: GitChangeSnapshot;
}

function assertContainedPaths(mode: string, files: readonly FileChange[]): void {
  if (mode !== 'patch') {
    return;
  }

  for (const file of files) {
    if (
      !isPathContained(file.path) ||
      (file.oldPath !== undefined && !isPathContained(file.oldPath))
    ) {
      throw new ChangeError(
        'CHANGE_PATCH_PATH_ESCAPE',
        'Patch contains a path that escapes the project root.'
      );
    }
  }
}

export async function analyzeChange(input: AnalyzeChangeInput): Promise<ChangeIntelligenceReport> {
  const { request, facts, snapshot } = input;

  assertContainedPaths(request.mode, snapshot.files);

  const limits = resolveChangeLimits(request.limits);

  const profile = request.profile ?? 'verify';
  const claim = request.claim ?? 'impact';

  const snapshotId = changeSnapshotId(snapshot.files, snapshot.changedLines);

  /* Detect a working tree / index change relative to the analysed snapshot. */
  let inputChanged = false;

  if (facts.recheckSnapshot) {
    try {
      const rechecked = await facts.recheckSnapshot();

      inputChanged = rechecked !== snapshot.rawDigest;
    } catch {
      /* A recheck failure is not a silent pass; treat it as a changed input. */
      inputChanged = true;
    }
  }

  const mapped = await mapChange({
    files: snapshot.files,
    changedLines: snapshot.changedLines,
    facts,
    limits,
  });

  const impact = expandImpact({
    entities: mapped.entities,
    facts,
    limits,
    includeCrossService: request.includeCrossService ?? true,
    includeFleet: request.includeFleet ?? false,
    includeRuntimeEvidence: request.includeRuntimeEvidence ?? false,
  });

  const adrConstraints: AdrConstraintEntry[] = facts.adr
    ? [
        ...((await facts.adr({
          filePaths: [...new Set(mapped.entities.map((entity) => entity.filePath))],
          symbols: [
            ...new Set(
              mapped.entities
                .flatMap((entity) =>
                  [entity.symbolId, entity.name, entity.qualifiedName].filter(
                    (value): value is string => typeof value === 'string' && value.length > 0
                  )
                )
                .sort()
            ),
          ],
        })) ?? []),
      ]
    : [];

  const limitReached = snapshot.truncated || mapped.truncated || impact.truncated;

  const gaps = [...mapped.gaps, ...impact.gaps];

  const evaluation = evaluateGuard({
    profile,
    claim,
    facts,
    entities: mapped.entities,
    coverage: mapped.coverage,
    gaps,
    impact,
    adrConstraints,
    inputChanged,
    limitReached,
  });

  const coverage = {
    ...mapped.coverage,
    truncated: mapped.coverage.truncated || impact.truncated,
  };

  const fingerprint = changeFingerprint({
    projectId: request.projectId,
    mode: request.mode,
    ...(snapshot.base ? { base: snapshot.base } : {}),
    ...(snapshot.head ? { head: snapshot.head } : {}),
    snapshotId,
    baselineGeneration: facts.generation,
    ...(facts.candidateGeneration ? { candidateGeneration: facts.candidateGeneration } : {}),
    ...(facts.fleet?.generation ? { fleetGeneration: facts.fleet.generation } : {}),
    profile,
  });

  const diagnostics = [...evaluation.diagnostics];

  if (coverage.binaryFiles > 0) {
    diagnostics.push('BINARY_FILES_PRESENT');
  }

  const report: ChangeIntelligenceReport = {
    profile,
    evidenceLevel:
      profile === 'auditor' ? 'audited' : profile === 'verify' ? 'verified' : 'provisional',

    change: {
      mode: request.mode,
      ...(snapshot.base ? { base: snapshot.base } : {}),
      ...(snapshot.head ? { head: snapshot.head } : {}),
      files: snapshot.files,
      changedFiles: snapshot.files.length,
      additions: snapshot.files.reduce((total, file) => total + file.additions, 0),
      deletions: snapshot.files.reduce((total, file) => total + file.deletions, 0),
      binaryFiles: snapshot.files.filter((file) => file.binary).length,
      snapshotId,
    },

    generations: {
      baseline: facts.generation,
      ...(facts.candidateGeneration ? { candidate: facts.candidateGeneration } : {}),
      ...(facts.fleet?.generation ? { fleet: facts.fleet.generation } : {}),
    },

    changedEntities: mapped.entities,

    directImpact: impact.directImpact,
    transitiveImpact: impact.transitiveImpact,

    crossServiceImpact: impact.crossServiceImpact,
    crossRepoImpact: impact.crossRepoImpact,

    runtimeEvidence: impact.runtimeEvidence,

    adrConstraints,

    tests: impact.tests,

    coverage,
    gaps,

    guard: evaluation.guard,
    claimSafety: evaluation.claimSafety,

    limitations: evaluation.limitations,
    diagnostics: [...new Set(diagnostics)],

    complete: evaluation.complete,
    fingerprint,
  };

  return report;
}
