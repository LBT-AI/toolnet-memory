/*
 * Phase 78 — capability requirements.
 *
 * The single central mapping from "what is being asked" to "which graph
 * capabilities must be trustworthy". Every profile and operation routes through
 * here, so an audit can never accidentally skip a required capability.
 */

import type {
  EvidenceCapability,
  EvidenceOperation,
  EvidenceRequest,
  EvidenceRequirement,
} from './types.js';

import { isNegativeClaim } from './profiles.js';

export interface OperationRequirement {
  /** Capability that makes the positive finding possible. */
  capabilities: EvidenceCapability[];
  /** Extra capabilities needed before any absence claim is permitted. */
  negativeCapabilities: EvidenceCapability[];
}

const OPERATION_REQUIREMENTS: Record<EvidenceOperation, OperationRequirement> = {
  find_symbol: {
    capabilities: ['symbol_graph'],
    negativeCapabilities: ['symbol_graph'],
  },

  find_callers: {
    capabilities: ['call_graph'],
    negativeCapabilities: ['call_graph'],
  },

  find_dependents: {
    capabilities: ['dependency_graph'],
    negativeCapabilities: ['dependency_graph'],
  },

  graph_path: {
    capabilities: ['call_graph'],
    negativeCapabilities: ['call_graph', 'dependency_graph'],
  },

  dead_code: {
    capabilities: ['call_graph', 'dependency_graph'],
    negativeCapabilities: ['call_graph', 'dependency_graph', 'architecture'],
  },

  impact: {
    capabilities: ['impact_analysis'],
    negativeCapabilities: ['impact_analysis', 'call_graph', 'dependency_graph'],
  },

  cross_service_endpoint: {
    capabilities: ['cross_service_graph'],
    negativeCapabilities: ['cross_service_graph'],
  },

  fleet_dependency: {
    capabilities: ['fleet_graph'],
    negativeCapabilities: ['fleet_graph'],
  },

  query: {
    capabilities: ['symbol_graph'],
    negativeCapabilities: ['symbol_graph'],
  },
};

export function operationRequirements(operation: EvidenceOperation): OperationRequirement {
  return OPERATION_REQUIREMENTS[operation];
}

/**
 * Derive the ordered requirement set for a request.
 *
 * Order is deterministic: declared capabilities first, then the extra negative
 * capabilities, in declaration order, deduped.
 */
export function requirementFor(request: EvidenceRequest): EvidenceRequirement[] {
  const base = operationRequirements(request.operation);

  const negative = isNegativeClaim(request.claim);

  const capabilities = [...base.capabilities];

  if (negative) {
    for (const capability of base.negativeCapabilities) {
      capabilities.push(capability);
    }
  }

  if (request.options?.includeCrossService) {
    capabilities.push('cross_service_graph');
  }

  if (request.options?.includeCrossRepo) {
    capabilities.push('fleet_graph');
  }

  const seen = new Set<EvidenceCapability>();

  const requirements: EvidenceRequirement[] = [];

  for (const capability of capabilities) {
    if (seen.has(capability)) {
      continue;
    }

    seen.add(capability);

    requirements.push({
      capability,
      requiredForNegative: negative,
      producerRequired: true,
    });
  }

  return requirements;
}
