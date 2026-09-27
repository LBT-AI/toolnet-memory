/*
 * Phase 81 — contract parser contract.
 *
 * Every parser is deterministic, dependency-light and project-contained. No
 * parser fetches a network reference, executes source, runs protoc/npm or reads
 * outside the provided source text.
 */

import type { ContractEntry, ContractUnresolvedRef, ContractUnsupported } from '../types.js';

export interface ContractParseInput {
  path: string;
  source: string;
  /** Maximum schema nodes to visit before bailing out. */
  maxNodes: number;
  /** Maximum local $ref resolution depth. */
  maxRefDepth: number;
  serviceId?: string;
}

export interface ContractParseResult {
  entries: ContractEntry[];
  unsupported: ContractUnsupported[];
  unresolvedRefs: ContractUnresolvedRef[];
  /** True when a bound stopped the parse early. */
  truncated: boolean;
}

export function emptyParseResult(): ContractParseResult {
  return { entries: [], unsupported: [], unresolvedRefs: [], truncated: false };
}
