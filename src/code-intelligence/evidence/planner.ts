/*
 * Phase 78 — deterministic evidence planner.
 *
 * The planner turns an explicit request into an explicit plan: which
 * capabilities must be trustworthy, how fresh and how complete the evidence has
 * to be, and how far the run may go. It never guesses intent from prose — the
 * claim kind is a required field precisely so that correctness does not depend
 * on natural-language keyword matching.
 */

import { canonicalJson } from '../artifact/serializer.js';

import { sha256Digest } from '../artifact/integrity.js';

import { isNegativeClaim, resolveProfileLimits } from './profiles.js';

import { requirementFor } from './requirements.js';

import { EvidenceError } from './types.js';

import type { EvidencePlan, EvidenceRequest, EvidenceScope } from './types.js';

function scopeIsBounded(scope: EvidenceScope): { bounded: boolean; reason?: string } {
  switch (scope.kind) {
    case 'project':
      return { bounded: true };

    case 'path':
      return scope.paths && scope.paths.length > 0
        ? { bounded: true }
        : { bounded: false, reason: 'SCOPE_REQUIRED' };

    case 'symbol':
      return scope.symbolIds && scope.symbolIds.length > 0
        ? { bounded: true }
        : { bounded: false, reason: 'SCOPE_REQUIRED' };

    case 'service':
      return scope.serviceIds && scope.serviceIds.length > 0
        ? { bounded: true }
        : { bounded: false, reason: 'SCOPE_REQUIRED' };

    case 'fleet':
      /*
       * An exhaustive cross-repo claim is always relative to the registered
       * Fleet scope. Without an explicit participant list there is no bounded
       * "everything" to audit, so the request is rejected.
       */
      return scope.projectIds && scope.projectIds.length > 0
        ? { bounded: true }
        : { bounded: false, reason: 'FLEET_SCOPE_NOT_BOUNDED' };

    default:
      return { bounded: false, reason: 'SCOPE_REQUIRED' };
  }
}

/** Deterministic request fingerprint: profile + operation + claim + scope + subject. */
export function evidenceFingerprint(request: EvidenceRequest): string {
  return `ev-${sha256Digest(
    canonicalJson({
      profile: request.profile,
      operation: request.operation,
      claim: request.claim,
      scope: request.scope,
      subject: request.subject ?? null,
      includeCrossService: request.options?.includeCrossService ?? false,
      includeCrossRepo: request.options?.includeCrossRepo ?? false,
      edgeType: request.options?.edgeType ?? null,
    })
  )}`;
}

export function planEvidence(request: EvidenceRequest): EvidencePlan {
  const scope = scopeIsBounded(request.scope);

  if (!scope.bounded) {
    throw new EvidenceError(
      scope.reason ?? 'SCOPE_REQUIRED',
      'Evidence scope must be explicit and bounded.'
    );
  }

  const requirements = requirementFor(request);

  const limits = resolveProfileLimits(request.profile, request.options);

  const negative = isNegativeClaim(request.claim);

  /*
   * Auditor always exhausts pagination. Verify must exhaust when the task is a
   * negative/exhaustive conclusion, because an unfinished page walk cannot
   * support an absence claim.
   */
  const needPaginationComplete =
    request.profile === 'auditor' || (request.profile === 'verify' && negative);

  const needSourceFallback =
    request.profile === 'scout'
      ? false
      : request.options?.sourceFallback !== false &&
        requirements.some((requirement) => requirement.requiredForNegative);

  const needsFleet =
    request.operation === 'fleet_dependency' ||
    request.options?.includeCrossRepo === true ||
    request.scope.kind === 'fleet';

  const needsCrossService =
    request.operation === 'cross_service_endpoint' || request.options?.includeCrossService === true;

  return {
    profile: request.profile,
    operation: request.operation,
    claim: request.claim,
    scope: request.scope,
    requirements,
    limits,
    needFreshness: request.profile !== 'scout',
    needPaginationComplete,
    needSourceFallback,
    needsFleet,
    needsCrossService,
    fingerprint: evidenceFingerprint(request),
  };
}
