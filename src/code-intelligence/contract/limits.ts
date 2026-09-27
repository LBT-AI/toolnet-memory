/*
 * Phase 81 — central contract-intelligence limits.
 *
 * Every bound the discovery, parsing, diff and consumer mapping use lives here,
 * so no code path can accept an unbounded schema or return a silently truncated
 * "compatible" answer. Exceeding a limit always yields
 * CONTRACT_ANALYSIS_LIMIT_REACHED with complete: false.
 */

import type { ContractLimits } from './types.js';

export const CONTRACT_LIMITS: ContractLimits = {
  /** Maximum changed paths considered as contract candidates. */
  maxContractFiles: 200,

  /** Maximum contract entries collected per side. */
  maxContracts: 2_000,

  /** Maximum schema nodes visited while normalising one contract file. */
  maxSchemaNodes: 50_000,

  /** Maximum local `$ref` resolution depth. */
  maxRefDepth: 16,

  /** Maximum structural changes reported per analysis. */
  maxContractChanges: 5_000,

  /** Maximum consumer entries reported per analysis. */
  maxConsumers: 2_000,

  /** Maximum Fleet participants considered for cross-repo consumers. */
  maxFleetProjects: 64,

  /** Maximum bytes read from one contract/source file. */
  maxSourceReadBytes: 2 * 1024 * 1024,
} as const;

/**
 * Resolve effective limits. Every override must be a positive safe integer and
 * may only NARROW the central ceiling, never widen it.
 */
export function resolveContractLimits(overrides: Partial<ContractLimits> = {}): ContractLimits {
  const narrow = (key: keyof ContractLimits): number => {
    const ceiling = CONTRACT_LIMITS[key];
    const value = overrides[key];

    if (value === undefined || !Number.isSafeInteger(value) || value < 1) {
      return ceiling;
    }

    return Math.min(value, ceiling);
  };

  return {
    maxContractFiles: narrow('maxContractFiles'),
    maxContracts: narrow('maxContracts'),
    maxSchemaNodes: narrow('maxSchemaNodes'),
    maxRefDepth: narrow('maxRefDepth'),
    maxContractChanges: narrow('maxContractChanges'),
    maxConsumers: narrow('maxConsumers'),
    maxFleetProjects: narrow('maxFleetProjects'),
    maxSourceReadBytes: narrow('maxSourceReadBytes'),
  };
}
