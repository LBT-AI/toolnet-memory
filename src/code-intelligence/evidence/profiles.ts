/*
 * Phase 78 — Evidence profile registry.
 *
 * Profile behaviour is declared once, centrally. Nothing else may hard-code
 * "scout can't do that but auditor can": policy, planner and the MCP surface all
 * read this table.
 */

import type { EvidenceClaimKind, EvidenceProfile } from './types.js';

import { auditorLimits, clampLimits, scoutLimits, verifyLimits } from './limits.js';

import type { EvidenceLimits } from './types.js';

/**
 * How strongly a claim may be asserted under a profile.
 *
 * - `allowed`     the profile can support the claim when the evidence is safe
 * - `provisional` the claim may be stated as provisional only, never concluded
 * - `blocked`     the profile cannot support the claim at all
 */
export type ClaimDisposition = 'allowed' | 'provisional' | 'blocked';

export interface EvidenceProfileDefinition {
  profile: EvidenceProfile;
  evidenceLevel: 'provisional' | 'verified' | 'audited';

  requireFreshness: boolean;
  requireCoverage: boolean;
  requireExhaustivePagination: boolean;

  allowNegativeClaims: boolean;

  sourceFallback: 'none' | 'gaps' | 'required';

  /** Profile ceiling. Callers may narrow, never widen. */
  limits: EvidenceLimits;

  claims: Record<EvidenceClaimKind, ClaimDisposition>;
}

export const EVIDENCE_PROFILES: Record<EvidenceProfile, EvidenceProfileDefinition> = {
  scout: {
    profile: 'scout',
    evidenceLevel: 'provisional',

    requireFreshness: false,
    requireCoverage: false,
    requireExhaustivePagination: false,

    allowNegativeClaims: false,
    sourceFallback: 'none',

    limits: scoutLimits(),

    claims: {
      positive: 'allowed',
      impact: 'allowed',
      negative: 'provisional',
      absence: 'provisional',
      uniqueness: 'provisional',
      exhaustive: 'blocked',
      dead_code: 'provisional',
    },
  },

  verify: {
    profile: 'verify',
    evidenceLevel: 'verified',

    requireFreshness: true,
    requireCoverage: true,
    requireExhaustivePagination: false,

    allowNegativeClaims: true,
    sourceFallback: 'gaps',

    limits: verifyLimits(),

    claims: {
      positive: 'allowed',
      impact: 'allowed',
      negative: 'allowed',
      absence: 'allowed',
      uniqueness: 'allowed',
      exhaustive: 'blocked',
      dead_code: 'provisional',
    },
  },

  auditor: {
    profile: 'auditor',
    evidenceLevel: 'audited',

    requireFreshness: true,
    requireCoverage: true,
    requireExhaustivePagination: true,

    allowNegativeClaims: true,
    sourceFallback: 'gaps',

    limits: auditorLimits(),

    claims: {
      positive: 'allowed',
      impact: 'allowed',
      negative: 'allowed',
      absence: 'allowed',
      uniqueness: 'allowed',
      exhaustive: 'allowed',
      dead_code: 'provisional',
    },
  },
};

export const EVIDENCE_PROFILE_NAMES: readonly EvidenceProfile[] = ['scout', 'verify', 'auditor'];

export function isEvidenceProfile(value: unknown): value is EvidenceProfile {
  return typeof value === 'string' && (EVIDENCE_PROFILE_NAMES as readonly string[]).includes(value);
}

export function profileDefinition(profile: EvidenceProfile): EvidenceProfileDefinition {
  return EVIDENCE_PROFILES[profile];
}

/** Resolve the effective limits: caller request clamped to the profile ceiling. */
export function resolveProfileLimits(
  profile: EvidenceProfile,
  requested?: Partial<EvidenceLimits>
): EvidenceLimits {
  return clampLimits(EVIDENCE_PROFILES[profile].limits, requested);
}

/** True when a capability is needed only to make a negative/exhaustive claim. */
export function isNegativeClaim(claim: EvidenceClaimKind): boolean {
  return (
    claim === 'negative' ||
    claim === 'absence' ||
    claim === 'exhaustive' ||
    claim === 'uniqueness' ||
    claim === 'dead_code'
  );
}
