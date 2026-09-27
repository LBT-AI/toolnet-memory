/*
 * Phase 78 — central evidence limits.
 *
 * Auditor means "bounded exhaustive", never "unlimited". Exceeding a limit
 * always yields an incomplete audit, never a silently truncated complete one.
 */

import type { EvidenceLimits } from './types.js';

export const EVIDENCE_LIMITS = {
  /** Hard bound on files a single source-fallback pass may read. */
  maxAuditFiles: 200,

  /** Hard bound on references inspected by an audit. */
  maxAuditReferences: 5_000,

  /** Hard bound on evidence rows collected by an audit. */
  maxAuditRows: 2_000,

  /** Hard bound on Fleet participants considered by an audit. */
  maxAuditProjects: 64,

  /** Hard bound on traversal depth. */
  maxAuditPathDepth: 8,

  /** Pages an audit may consume before declaring itself incomplete. */
  maxAuditPages: 64,

  /** Rows per page. */
  defaultPageSize: 100,

  /** Scout is deliberately shallow and bounded. */
  maxScoutRows: 50,
  maxScoutDepth: 2,

  /** Source-fallback match budget per file. */
  maxSourceMatchesPerFile: 20,
} as const;

export function scoutLimits(): EvidenceLimits {
  return {
    maxDepth: EVIDENCE_LIMITS.maxScoutDepth,
    maxRows: EVIDENCE_LIMITS.maxScoutRows,
    maxProjects: 8,
    maxPages: 1,
    pageSize: EVIDENCE_LIMITS.maxScoutRows,
  };
}

export function verifyLimits(): EvidenceLimits {
  return {
    maxDepth: 6,
    maxRows: 1_000,
    maxProjects: 16,
    maxPages: 16,
    pageSize: EVIDENCE_LIMITS.defaultPageSize,
  };
}

export function auditorLimits(): EvidenceLimits {
  return {
    maxDepth: EVIDENCE_LIMITS.maxAuditPathDepth,
    maxRows: EVIDENCE_LIMITS.maxAuditRows,
    maxProjects: EVIDENCE_LIMITS.maxAuditProjects,
    maxPages: EVIDENCE_LIMITS.maxAuditPages,
    pageSize: EVIDENCE_LIMITS.defaultPageSize,
  };
}

/** Clamp caller requests so a caller can never widen past the profile ceiling. */
export function clampLimits(
  ceiling: EvidenceLimits,
  requested: Partial<EvidenceLimits> | undefined
): EvidenceLimits {
  const pick = (value: number | undefined, max: number): number => {
    if (value === undefined || !Number.isFinite(value) || value < 1) {
      return max;
    }

    return Math.min(Math.floor(value), max);
  };

  return {
    maxDepth: pick(requested?.maxDepth, ceiling.maxDepth),
    maxRows: pick(requested?.maxRows, ceiling.maxRows),
    maxProjects: pick(requested?.maxProjects, ceiling.maxProjects),
    maxPages: pick(requested?.maxPages, ceiling.maxPages),
    pageSize: pick(requested?.pageSize, ceiling.pageSize),
  };
}
