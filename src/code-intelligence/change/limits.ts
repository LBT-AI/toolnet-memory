/*
 * Phase 80 — central change-intelligence limits.
 *
 * Every bound the change reader, mapper, impact expansion and guard use lives
 * here, so no code path can accept an unbounded diff or return a silently
 * truncated "complete" answer. Exceeding a limit always yields
 * CHANGE_ANALYSIS_LIMIT_REACHED with complete: false.
 */

import type { ChangeLimits } from './types.js';

export const CHANGE_LIMITS: ChangeLimits = {
  /** Maximum changed files considered by one analysis. */
  maxChangedFiles: 500,

  /** Maximum hunks parsed across all changed files. */
  maxChangedHunks: 5_000,

  /** Maximum changed symbols mapped to impact. */
  maxChangedSymbols: 2_000,

  /** Maximum reverse-dependency traversal depth. */
  maxImpactDepth: 8,

  /** Maximum impact nodes collected. */
  maxImpactNodes: 1_000,

  /** Maximum impact edges inspected. */
  maxImpactEdges: 20_000,

  /** Maximum Fleet participants considered for cross-repo impact. */
  maxFleetProjects: 64,

  /** Maximum patch payload bytes accepted. */
  maxPatchBytes: 8 * 1024 * 1024,

  /** Maximum bytes read from one source file for signature comparison. */
  maxSourceReadBytes: 512 * 1024,
} as const;

/**
 * Resolve effective limits. Every override must be a positive safe integer and
 * may only NARROW the central ceiling, never widen it.
 */
export function resolveChangeLimits(overrides: Partial<ChangeLimits> = {}): ChangeLimits {
  const narrow = (key: keyof ChangeLimits): number => {
    const ceiling = CHANGE_LIMITS[key];
    const value = overrides[key];

    if (value === undefined || !Number.isSafeInteger(value) || value < 1) {
      return ceiling;
    }

    return Math.min(value, ceiling);
  };

  return {
    maxChangedFiles: narrow('maxChangedFiles'),
    maxChangedHunks: narrow('maxChangedHunks'),
    maxChangedSymbols: narrow('maxChangedSymbols'),
    maxImpactDepth: narrow('maxImpactDepth'),
    maxImpactNodes: narrow('maxImpactNodes'),
    maxImpactEdges: narrow('maxImpactEdges'),
    maxFleetProjects: narrow('maxFleetProjects'),
    maxPatchBytes: narrow('maxPatchBytes'),
    maxSourceReadBytes: narrow('maxSourceReadBytes'),
  };
}
