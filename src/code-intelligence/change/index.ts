/*
 * Phase 80 — Change Intelligence barrel.
 *
 *   change input -> mapper -> impact -> guard -> report
 *
 * Analysis only. The static graph stays the structural authority; git describes
 * the change, runtime traces corroborate and ADRs constrain. Nothing here
 * executes source, executes tests, mutates git or publishes artifacts.
 */

export * from './types.js';

export { CHANGE_LIMITS, resolveChangeLimits } from './limits.js';

export { changeFingerprint, changeSnapshotId, type ChangeFingerprintInput } from './fingerprint.js';

export {
  isPathContained,
  isSensitiveChangePath,
  normalizeRelativePath,
  unquoteGitPath,
} from './paths.js';

export { parseUnifiedDiff, type ParsedDiff, type ParseDiffOptions } from './diff.js';

export {
  assertSafeRevision,
  readChangeInput,
  readSnapshotDigest,
  type GitChangeInput,
  type GitChangeSnapshot,
} from './git-reader.js';

export {
  buildProjectChangeFacts,
  type ChangeCoverageProvider,
  type ProjectChangeFactsInput,
} from './project-facts.js';

export { mapChange, type MapChangeInput, type MapChangeResult } from './mapper.js';

export { expandImpact, type ImpactInput, type ImpactResult } from './impact.js';

export { evaluateGuard, type GuardEvaluation, type GuardInput } from './guard.js';

export { analyzeChange, type AnalyzeChangeInput } from './report.js';

import { readChangeInput, readSnapshotDigest } from './git-reader.js';

import { analyzeChange } from './report.js';

import type { ChangeAnalysisRequest, ChangeFacts, ChangeIntelligenceReport } from './types.js';

/**
 * Read the change for the request's mode and analyse it.
 *
 * When the mode reads live git state the reader is re-run at the end to detect
 * a working tree / index change during analysis; the report then pins the
 * snapshot it actually analysed.
 */
export async function runChangeAnalysis(
  request: ChangeAnalysisRequest,
  facts: ChangeFacts,
  git: { rootPath: string; patch?: string }
): Promise<ChangeIntelligenceReport> {
  const snapshot = await readChangeInput({
    mode: request.mode,
    rootPath: git.rootPath,
    ...(request.base !== undefined ? { base: request.base } : {}),
    ...(request.head !== undefined ? { head: request.head } : {}),
    ...(git.patch !== undefined ? { patch: git.patch } : {}),
    ...(request.limits ? { limits: request.limits } : {}),
  });

  const needsRecheck = request.mode !== 'patch';

  return analyzeChange({
    request,
    facts: needsRecheck
      ? {
          ...facts,
          recheckSnapshot: () =>
            readSnapshotDigest({
              mode: request.mode,
              rootPath: git.rootPath,
              ...(request.base !== undefined ? { base: request.base } : {}),
              ...(request.head !== undefined ? { head: request.head } : {}),
              ...(request.limits ? { limits: request.limits } : {}),
            }),
        }
      : facts,
    snapshot,
  });
}
