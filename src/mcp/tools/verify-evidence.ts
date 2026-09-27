/*
 * Phase 78 — verify_evidence MCP tool.
 *
 * The single entry point for profile-driven evidence. The caller states the
 * claim kind explicitly; ToolNet then decides whether that claim is allowed,
 * provisional or blocked, and reports the machine-readable reasons.
 */

import { z } from 'zod';

import { EvidenceError, type EvidenceBundle } from '../../code-intelligence/evidence/index.js';

import { runEvidence } from '../evidence.js';

import type { MCPContext } from '../context.js';

const scopeSchema = z.object({
  kind: z.enum(['project', 'service', 'path', 'symbol', 'fleet']),
  projectIds: z.array(z.string().min(1).max(200)).max(64).optional(),
  paths: z.array(z.string().min(1).max(500)).max(50).optional(),
  symbolIds: z.array(z.string().min(1).max(300)).max(100).optional(),
  serviceIds: z.array(z.string().min(1).max(200)).max(50).optional(),
});

const subjectSchema = z.object({
  symbolId: z.string().min(1).max(300).optional(),
  name: z.string().min(1).max(300).optional(),
  path: z.string().min(1).max(500).optional(),
  fromSymbolId: z.string().min(1).max(300).optional(),
  toSymbolId: z.string().min(1).max(300).optional(),
  route: z.string().min(1).max(500).optional(),
  protocol: z.string().min(1).max(64).optional(),
  package: z.string().min(1).max(300).optional(),
  query: z.string().min(1).max(500).optional(),
});

const optionsSchema = z.object({
  maxDepth: z.number().int().min(1).max(64).optional(),
  maxRows: z.number().int().min(1).max(10_000).optional(),
  maxProjects: z.number().int().min(1).max(256).optional(),
  pageSize: z.number().int().min(1).max(1_000).optional(),
  maxPages: z.number().int().min(1).max(256).optional(),
  includeCrossService: z.boolean().optional(),
  includeCrossRepo: z.boolean().optional(),
  edgeType: z.string().min(1).max(64).optional(),
  sourceFallback: z.boolean().optional(),
  expectedGeneration: z.string().min(1).max(200).optional(),
});

export const verifyEvidenceSchema = {
  profile: z
    .enum(['scout', 'verify', 'auditor'])
    .describe('scout = fast discovery; verify = task-critical; auditor = bounded exhaustive.'),
  operation: z.enum([
    'find_symbol',
    'find_callers',
    'find_dependents',
    'graph_path',
    'dead_code',
    'impact',
    'cross_service_endpoint',
    'fleet_dependency',
    'query',
  ]),
  claim: z
    .enum(['positive', 'negative', 'exhaustive', 'impact', 'dead_code', 'absence', 'uniqueness'])
    .describe('The claim you intend to make. Absence/exhaustive/uniqueness require auditor.'),
  scope: scopeSchema.describe('Required and bounded: fleet claims need an explicit project list.'),
  subject: subjectSchema.optional(),
  options: optionsSchema.optional(),
  includeAdr: z
    .boolean()
    .optional()
    .describe('Attach relevant accepted ADRs as constraints (never as proof).'),
};

export interface VerifyEvidenceInput {
  profile: 'scout' | 'verify' | 'auditor';
  operation:
    | 'find_symbol'
    | 'find_callers'
    | 'find_dependents'
    | 'graph_path'
    | 'dead_code'
    | 'impact'
    | 'cross_service_endpoint'
    | 'fleet_dependency'
    | 'query';
  claim: 'positive' | 'negative' | 'exhaustive' | 'impact' | 'dead_code' | 'absence' | 'uniqueness';
  scope: {
    kind: 'project' | 'service' | 'path' | 'symbol' | 'fleet';
    projectIds?: string[];
    paths?: string[];
    symbolIds?: string[];
    serviceIds?: string[];
  };
  subject?: {
    symbolId?: string;
    name?: string;
    path?: string;
    fromSymbolId?: string;
    toSymbolId?: string;
    route?: string;
    protocol?: string;
    package?: string;
    query?: string;
  };
  options?: {
    maxDepth?: number;
    maxRows?: number;
    maxProjects?: number;
    pageSize?: number;
    maxPages?: number;
    includeCrossService?: boolean;
    includeCrossRepo?: boolean;
    edgeType?: string;
    sourceFallback?: boolean;
    expectedGeneration?: string;
  };
  includeAdr?: boolean;
}

export type VerifyEvidenceResult =
  { ok: true; bundle: EvidenceBundle } | { ok: false; error: { code: string; message: string } };

export async function verifyEvidence(
  ctx: MCPContext,
  input: VerifyEvidenceInput
): Promise<VerifyEvidenceResult> {
  try {
    const bundle = await runEvidence(
      ctx,
      {
        profile: input.profile,
        operation: input.operation,
        claim: input.claim,
        scope: input.scope,
        ...(input.subject ? { subject: input.subject } : {}),
        ...(input.options ? { options: input.options } : {}),
      },
      { includeAdr: input.includeAdr !== false }
    );

    return { ok: true, bundle };
  } catch (error) {
    if (error instanceof EvidenceError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }

    return {
      ok: false,
      error: {
        code: 'EVIDENCE_FAILED',
        message: error instanceof Error ? error.message : 'Evidence run failed',
      },
    };
  }
}
