/*
 * Phase 74 — get_graph_schema MCP tool.
 *
 * Returns the machine-readable schema derived from the Phase 71/72/73
 * registries. Reserved edge vocabulary is never presented as populated.
 *
 * Phase 78 adds the evidence-capability section: which capabilities Scout,
 * Verify and Auditor can actually use right now, and what blocks an audit.
 */

import {
  buildGraphSchema,
  type GraphSchemaOutput,
} from '../../code-intelligence/query-v2/index.js';

import {
  GRAPH_CAPABILITIES,
  type GraphCapability,
} from '../../code-intelligence/graph-coverage/types.js';

import {
  EVIDENCE_PROFILES,
  EVIDENCE_PROFILE_NAMES,
  type EvidenceProfile,
} from '../../code-intelligence/evidence/index.js';

import type { MCPContext } from '../context.js';

export const getGraphSchemaSchema = {};

export interface GraphSchemaEvidenceCapability {
  capability: GraphCapability;
  producer: boolean;
  status: string;
  scout: boolean;
  verify: boolean;
  auditor: boolean;
  blocker?: string;
}

export interface GraphSchemaEvidence {
  profiles: Array<{
    profile: EvidenceProfile;
    evidenceLevel: string;
    requireFreshness: boolean;
    requireCoverage: boolean;
    requireExhaustivePagination: boolean;
    allowNegativeClaims: boolean;
    sourceFallback: 'none' | 'gaps' | 'required';
  }>;
  capabilities: GraphSchemaEvidenceCapability[];
}

export interface GetGraphSchemaResult extends GraphSchemaOutput {
  /**
   * Edge types actually present in graphs this install can see. This is the
   * honest counterpart to the static `status` field: a reserved edge type is
   * queryable but will not appear here.
   */
  observed: {
    project: string[];
    fleet: string[];
  };
  /** Phase 78: auditable capabilities per evidence profile. */
  evidence: GraphSchemaEvidence;
}

function producedCapabilities(): Set<GraphCapability> {
  const schema = buildGraphSchema();

  const produced = new Set<GraphCapability>();

  for (const edge of schema.edgeTypes) {
    if (edge.currentlyProduced && edge.capability) {
      produced.add(edge.capability);
    }
  }

  produced.add('lexical_search');

  return produced;
}

function evidenceSection(ctx: MCPContext): GraphSchemaEvidence {
  const produced = producedCapabilities();

  const capabilities = GRAPH_CAPABILITIES.map((capability) => {
    const evaluation = ctx.coverage?.evaluate(capability) ?? null;

    const status = evaluation?.status ?? 'unavailable';

    const producer = produced.has(capability);

    let blocker: string | undefined;

    if (!producer) {
      blocker = 'RESERVED_CAPABILITY_NO_PRODUCER';
    } else if (status !== 'complete') {
      blocker = 'COVERAGE_PARTIAL';
    }

    return {
      capability,
      producer,
      status,
      scout: true,
      verify: producer && status !== 'unavailable',
      auditor: producer && status === 'complete' && (evaluation?.negativeClaimSafe ?? false),
      ...(blocker ? { blocker } : {}),
    };
  });

  return {
    profiles: EVIDENCE_PROFILE_NAMES.map((profile) => {
      const definition = EVIDENCE_PROFILES[profile];

      return {
        profile,
        evidenceLevel: definition.evidenceLevel,
        requireFreshness: definition.requireFreshness,
        requireCoverage: definition.requireCoverage,
        requireExhaustivePagination: definition.requireExhaustivePagination,
        allowNegativeClaims: definition.allowNegativeClaims,
        sourceFallback: definition.sourceFallback,
      };
    }),
    capabilities,
  };
}

export async function getGraphSchema(
  ctx: MCPContext,
  _input: Record<string, never> = {}
): Promise<GetGraphSchemaResult> {
  const schema = buildGraphSchema();

  const project = [
    ...new Set(ctx.graph.allEdges(ctx.project.id).map((edge) => String(edge.type))),
  ].sort();

  const fleet = Object.keys(ctx.fleet?.stats.crossProjectEdgesByType ?? {}).sort();

  return {
    ...schema,
    observed: { project, fleet },
    evidence: evidenceSection(ctx),
  };
}
