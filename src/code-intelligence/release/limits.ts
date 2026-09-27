/*
 * Phase 83 — central release-intelligence limits.
 *
 * Every bound release analysis uses lives here. Exceeding a bound yields
 * RELEASE_LIMIT_REACHED with complete: false — never a silently truncated
 * "ready".
 */

import type { ReleaseLimits } from './types.js';

export const RELEASE_LIMITS: ReleaseLimits = {
  /** Maximum files read from the npm pack manifest. */
  maxPackageFiles: 20_000,

  /** Maximum capabilities tracked in one inventory. */
  maxCapabilities: 2_000,

  /** Maximum public-surface changes reported. */
  maxSurfaceChanges: 2_000,

  /** Maximum phase certifications considered. */
  maxCertifications: 512,

  /** Maximum bytes read from the packaged bundle. */
  maxBundleReadBytes: 32 * 1024 * 1024,

  /** Maximum bytes read from any package.json/package-lock. */
  maxPackageJsonBytes: 16 * 1024 * 1024,

  /** Maximum working-tree files fingerprinted. */
  maxWorktreeFiles: 100_000,
} as const;

/** Resolve effective limits, narrowing only. */
export function resolveReleaseLimits(overrides: Partial<ReleaseLimits> = {}): ReleaseLimits {
  const narrow = (key: keyof ReleaseLimits): number => {
    const ceiling = RELEASE_LIMITS[key];
    const value = overrides[key];

    if (value === undefined || !Number.isSafeInteger(value) || value < 1) {
      return ceiling;
    }

    return Math.min(value, ceiling);
  };

  return {
    maxPackageFiles: narrow('maxPackageFiles'),
    maxCapabilities: narrow('maxCapabilities'),
    maxSurfaceChanges: narrow('maxSurfaceChanges'),
    maxCertifications: narrow('maxCertifications'),
    maxBundleReadBytes: narrow('maxBundleReadBytes'),
    maxPackageJsonBytes: narrow('maxPackageJsonBytes'),
    maxWorktreeFiles: narrow('maxWorktreeFiles'),
  };
}
