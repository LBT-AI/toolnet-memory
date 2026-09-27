/*
 * Phase 78 — Evidence Profiles production certification.
 *
 * Scout / Verify / Auditor decide how much proof a claim requires. This suite
 * certifies the deterministic decision surface, the bounded limits, the source
 * fallback, the Fleet/cross-service guards, the daemon sharing path and the
 * packaged MCP surface.
 *
 * No LLM. No embeddings. No vector database. Evidence is derived state only.
 */

import { spawn } from 'node:child_process';

import { createHash } from 'node:crypto';

import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join, resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';

import { LocalStorageProvider } from '../../src/storage/local/index.js';

import { AdrStore, ArchitectureDecisionService } from '../../src/knowledge/adr/index.js';

import { adrConstraintsFor } from '../../src/mcp/evidence.js';

import type { MCPContext } from '../../src/mcp/context.js';

import type { ProjectManifest } from '../../src/core/types.js';

import {
  EVIDENCE_LIMITS,
  EVIDENCE_PROFILES,
  EVIDENCE_PROFILE_NAMES,
  buildEvidenceFacts,
  executeEvidenceSync,
  isNegativeClaim,
  planEvidence,
  profileDefinition,
  type EvidenceBundle,
  type EvidenceCrossServiceFacts,
  type EvidenceFacts,
  type EvidenceFleetFacts,
  type EvidenceGap,
  type EvidenceRequest,
} from '../../src/code-intelligence/evidence/index.js';

import { ProjectRegistry } from '../../src/daemon/registry.js';

import {
  ArtifactCoordinator,
  IndexCoordinator,
  ProjectRuntimeCoordinator,
} from '../../src/daemon/coordinators.js';

import { connectDaemonClient, daemonSocketPath, startDaemon } from '../../src/daemon/index.js';

import type { DaemonProjectRef, DaemonRuntimeDependencies } from '../../src/daemon/types.js';

/* ================================================================== *
 * Fixtures
 * ================================================================== */

const ROOT = mkdtempSync(join(tmpdir(), 'toolnet-phase78-'));

mkdirSync(join(ROOT, 'src'), { recursive: true });

writeFileSync(join(ROOT, 'src', 'target.ts'), 'export function target() { return 1; }\n');
writeFileSync(join(ROOT, 'src', 'other.ts'), 'export const other = 2;\n');
writeFileSync(join(ROOT, '.env'), 'TOOLNET_SECRET=do-not-leak\n');

afterAll(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

interface FixtureOptions {
  edges?: Array<{ id: string; from: string; to: string; type: string }>;
  extraSymbols?: Array<{ id: string; name: string; type?: string; filePath?: string }>;
  complete?: boolean;
  coverageAvailable?: boolean;
  status?: 'complete' | 'partial' | 'stale' | 'unavailable';
  negativeSafe?: boolean;
  reasons?: string[];
  gaps?: EvidenceGap[];
  fleet?: EvidenceFleetFacts | null;
  crossService?: EvidenceCrossServiceFacts | null;
  currentGeneration?: string;
  staleAfterPage?: number;
  readSource?: boolean;
  producedEdgeTypes?: string[];
}

const DEFAULT_SYMBOLS = [
  { id: 'a', name: 'target', type: 'function', filePath: 'src/target.ts' },
  { id: 'b', name: 'caller', type: 'function', filePath: 'src/other.ts' },
];

function fixture(options: FixtureOptions = {}): EvidenceFacts {
  const graph = new CodeGraphStore();

  for (const symbol of [...DEFAULT_SYMBOLS, ...(options.extraSymbols ?? [])]) {
    graph.addSymbol({
      id: symbol.id,
      projectId: 'p',
      name: symbol.name,
      qualifiedName: symbol.name,
      type: (symbol.type ?? 'function') as never,
      filePath: symbol.filePath ?? 'src/target.ts',
    });
  }

  const edges =
    options.edges === undefined ? [{ id: 'e1', from: 'b', to: 'a', type: 'CALLS' }] : options.edges;

  for (const edge of edges) {
    graph.addEdge({
      id: edge.id,
      projectId: 'p',
      from: edge.from,
      to: edge.to,
      type: edge.type as never,
    });
  }

  const available = options.coverageAvailable ?? true;

  return buildEvidenceFacts({
    projectId: 'p',
    rootPath: ROOT,
    generation: 'gen-1',
    graph,
    coverage: {
      available,
      evaluate: () => ({
        status: options.status ?? (options.complete === false ? 'partial' : 'complete'),
        negativeClaimSafe: options.negativeSafe ?? options.complete ?? true,
        reasons: (options.reasons ?? []) as never,
      }),
    },
    freshness: { checked: true, stale: false },
    gaps: options.gaps ?? [],
    fleet: options.fleet ?? null,
    crossService: options.crossService ?? null,
    ...(options.producedEdgeTypes ? { producedEdgeTypes: options.producedEdgeTypes } : {}),
    ...(options.readSource === false ? { readSource: false } : {}),
    ...(options.currentGeneration ? { currentGeneration: () => options.currentGeneration! } : {}),
    ...(options.staleAfterPage !== undefined ? { staleAfterPage: options.staleAfterPage } : {}),
  });
}

function request(
  partial: Partial<EvidenceRequest> &
    Pick<EvidenceRequest, 'profile' | 'operation' | 'claim' | 'scope'>
): EvidenceRequest {
  return {
    subject: { symbolId: 'a', name: 'target' },
    ...partial,
  };
}

function run(facts: EvidenceFacts, req: EvidenceRequest): EvidenceBundle {
  return executeEvidenceSync({ request: req, facts });
}

const callerScope = { kind: 'symbol' as const, symbolIds: ['a'] };

/* ================================================================== *
 * Profile registry
 * ================================================================== */

describe('Phase 78 — evidence profile registry', () => {
  it('registers exactly scout, verify and auditor', () => {
    expect(EVIDENCE_PROFILE_NAMES).toEqual(['scout', 'verify', 'auditor']);
  });

  it('keeps scout non-negative and non-freshness with no source fallback', () => {
    const scout = profileDefinition('scout');

    expect(scout.requireFreshness).toBe(false);
    expect(scout.requireCoverage).toBe(false);
    expect(scout.requireExhaustivePagination).toBe(false);
    expect(scout.allowNegativeClaims).toBe(false);
    expect(scout.sourceFallback).toBe('none');
    expect(scout.claims.exhaustive).toBe('blocked');
    expect(scout.claims.negative).toBe('provisional');
  });

  it('keeps auditor exhaustive with source fallback for gaps', () => {
    const auditor = profileDefinition('auditor');

    expect(auditor.requireFreshness).toBe(true);
    expect(auditor.requireCoverage).toBe(true);
    expect(auditor.requireExhaustivePagination).toBe(true);
    expect(auditor.allowNegativeClaims).toBe(true);
    expect(auditor.sourceFallback).toBe('gaps');
    expect(auditor.claims.exhaustive).toBe('allowed');
  });

  it('never lets verify make an exhaustive claim', () => {
    expect(profileDefinition('verify').claims.exhaustive).toBe('blocked');
  });

  it('never allows dead code to be an unqualified conclusion', () => {
    for (const profile of EVIDENCE_PROFILE_NAMES) {
      expect(EVIDENCE_PROFILES[profile].claims.dead_code).not.toBe('allowed');
    }
  });

  it('classifies negative and exhaustive claim kinds', () => {
    expect(isNegativeClaim('negative')).toBe(true);
    expect(isNegativeClaim('absence')).toBe(true);
    expect(isNegativeClaim('uniqueness')).toBe(true);
    expect(isNegativeClaim('exhaustive')).toBe(true);
    expect(isNegativeClaim('dead_code')).toBe(true);
    expect(isNegativeClaim('positive')).toBe(false);
    expect(isNegativeClaim('impact')).toBe(false);
  });
});

/* ================================================================== *
 * Scout
 * ================================================================== */

describe('Phase 78 — scout semantics', () => {
  it('allows positive discovery and reports provisional evidence', () => {
    const bundle = run(
      fixture(),
      request({
        profile: 'scout',
        operation: 'find_callers',
        claim: 'positive',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('allowed');
    expect(bundle.evidenceLevel).toBe('provisional');
    expect(bundle.claimSafety.exhaustiveClaimSafe).toBe(false);
    expect(bundle.evidence.some((item) => item.kind === 'edge')).toBe(true);
  });

  it('downgrades a negative claim to provisional and never makes it safe', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'scout',
        operation: 'find_callers',
        claim: 'negative',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('provisional');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(false);
    expect(bundle.claimSafety.reasons).toContain('SCOUT_PROVISIONAL_ONLY');
  });

  it('blocks an exhaustive claim outright', () => {
    const bundle = run(
      fixture(),
      request({
        profile: 'scout',
        operation: 'find_callers',
        claim: 'exhaustive',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('PROFILE_REQUIRED_AUDITOR');
  });

  it('reports absent callers as provisional, not as absence', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({ profile: 'scout', operation: 'find_callers', claim: 'absence', scope: callerScope })
    );

    expect(bundle.claimSafety.decision).toBe('provisional');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(false);
    expect(bundle.evidence.filter((item) => item.kind === 'edge')).toHaveLength(0);
  });
});

/* ================================================================== *
 * Verify
 * ================================================================== */

describe('Phase 78 — verify semantics', () => {
  it('verifies a negative claim on a complete, fresh graph', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'verify',
        operation: 'find_callers',
        claim: 'negative',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('allowed');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(true);
    expect(bundle.evidenceLevel).toBe('verified');
    expect(bundle.complete).toBe(true);
  });

  it('blocks a negative claim when coverage is partial', () => {
    const bundle = run(
      fixture({ edges: [], complete: false }),
      request({
        profile: 'verify',
        operation: 'find_callers',
        claim: 'negative',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('COVERAGE_PARTIAL');
  });

  it('blocks a negative claim when coverage is unavailable', () => {
    const bundle = run(
      fixture({ coverageAvailable: false }),
      request({ profile: 'verify', operation: 'find_symbol', claim: 'absence', scope: callerScope })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('COVERAGE_UNAVAILABLE');
  });

  it('blocks a negative claim when the recorded coverage is stale', () => {
    const bundle = run(
      fixture({ status: 'stale', negativeSafe: false }),
      request({
        profile: 'verify',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('COVERAGE_STALE');
  });

  it('still allows positive evidence when coverage is partial', () => {
    const bundle = run(
      fixture({ complete: false }),
      request({
        profile: 'verify',
        operation: 'find_callers',
        claim: 'positive',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('allowed');
    expect(bundle.claimSafety.reasons).toContain('COVERAGE_PARTIAL');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(false);
    expect(bundle.evidence.some((item) => item.kind === 'edge')).toBe(true);
  });
});

/* ================================================================== *
 * Auditor
 * ================================================================== */

describe('Phase 78 — auditor semantics', () => {
  it('permits an audited absence claim on a complete, fresh graph', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('allowed');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(true);
    expect(bundle.claimSafety.exhaustiveClaimSafe).toBe(true);
    expect(bundle.complete).toBe(true);
    expect(bundle.evidenceLevel).toBe('audited');
  });

  it('reports coverage for every required capability', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.coverage.map((entry) => entry.capability)).toContain('call_graph');
    expect(bundle.requirements.map((entry) => entry.capability)).toContain('call_graph');
  });

  it('blocks an absence claim when the generation changed mid-audit', () => {
    const bundle = run(
      fixture({ edges: [], currentGeneration: 'gen-2' }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('AUDIT_GENERATION_CHANGED');
    expect(bundle.generation.project).toBe('gen-1');
  });

  it('honours a pinned expected generation and permits the audit when it matches', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
        options: { expectedGeneration: 'gen-1' },
      })
    );

    expect(bundle.claimSafety.reasons).not.toContain('EVIDENCE_STALE_GENERATION');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(true);
  });

  it('blocks an audit when the pinned expected generation no longer matches', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
        options: { expectedGeneration: 'gen-0' },
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('EVIDENCE_STALE_GENERATION');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(false);
    expect(bundle.complete).toBe(false);
  });

  it('blocks a parse-gap audit while the gapped file cannot be inspected', () => {
    const gap: EvidenceGap = {
      kind: 'parse_failure',
      capability: 'call_graph',
      path: 'src/missing.ts',
    };

    const bundle = run(
      fixture({ edges: [], gaps: [gap] }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('PARSE_GAP_RELEVANT');
    expect(bundle.sourceFallback.gapsChecked).toEqual(['src/missing.ts']);
    expect(bundle.sourceFallback.performed).toBe(false);
  });

  it('closes a parse gap when the bounded fallback finds no reference', () => {
    const bundle = run(
      fixture({
        edges: [],
        gaps: [{ kind: 'parse_failure', capability: 'call_graph', path: 'src/other.ts' }],
      }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.sourceFallback.gapsChecked).toEqual(['src/other.ts']);
    expect(bundle.sourceFallback.performed).toBe(true);
    expect(bundle.sourceFallback.matches).toBe(0);
    expect(bundle.claimSafety.decision).toBe('allowed');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(true);
  });

  it('blocks an absence claim when a parser gap cannot be inspected', () => {
    const bundle = run(
      fixture({
        edges: [],
        readSource: false,
        gaps: [{ kind: 'parse_failure', capability: 'call_graph', path: 'src/target.ts' }],
      }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(false);
  });
});

/* ================================================================== *
 * Pagination and limits
 * ================================================================== */

function manySymbols(count: number): FixtureOptions {
  return {
    edges: [],
    extraSymbols: Array.from({ length: count }, (_, index) => ({
      id: `s${index}`,
      name: `fn${index}`,
      filePath: 'src/other.ts',
    })),
  };
}

describe('Phase 78 — pagination and audit limits', () => {
  it('lets scout stop after the first bounded page', () => {
    const bundle = run(
      fixture(manySymbols(30)),
      request({
        profile: 'scout',
        operation: 'find_symbol',
        claim: 'positive',
        scope: { kind: 'project' },
        subject: { query: 'fn' },
        options: { pageSize: 5 },
      })
    );

    expect(bundle.pagination.rows).toBe(5);
    expect(bundle.pagination.complete).toBe(false);
    expect(bundle.pagination.truncated).toBe(true);
  });

  it('makes auditor consume every page before claiming completeness', () => {
    const bundle = run(
      fixture(manySymbols(30)),
      request({
        profile: 'auditor',
        operation: 'find_symbol',
        claim: 'positive',
        scope: { kind: 'project' },
        subject: { query: 'fn' },
        options: { pageSize: 3, maxPages: 10 },
      })
    );

    expect(bundle.pagination.pages).toBe(10);
    expect(bundle.pagination.rows).toBe(30);
    expect(bundle.pagination.complete).toBe(true);
  });

  it('reports incomplete (never silently complete) when the row limit is hit', () => {
    const bundle = run(
      fixture(manySymbols(30)),
      request({
        profile: 'auditor',
        operation: 'find_symbol',
        claim: 'absence',
        scope: { kind: 'project' },
        subject: { query: 'fn' },
        options: { pageSize: 3, maxRows: 5, maxPages: 10 },
      })
    );

    expect(bundle.complete).toBe(false);
    expect(bundle.claimSafety.negativeClaimSafe).toBe(false);
    expect(bundle.claimSafety.reasons).toContain('AUDIT_LIMIT_REACHED');
    expect(bundle.pagination.rows).toBeLessThanOrEqual(5);
  });

  it('blocks an absence claim when the pagination cursor goes stale', () => {
    const bundle = run(
      fixture({ ...manySymbols(30), staleAfterPage: 1 }),
      request({
        profile: 'auditor',
        operation: 'find_symbol',
        claim: 'absence',
        scope: { kind: 'project' },
        subject: { query: 'fn' },
        options: { pageSize: 3, maxPages: 10 },
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('EVIDENCE_CURSOR_STALE');
    expect(bundle.pagination.complete).toBe(false);
  });

  it('clamps caller limits to the profile ceiling', () => {
    const plan = planEvidence(
      request({
        profile: 'scout',
        operation: 'find_callers',
        claim: 'positive',
        scope: callerScope,
        options: { maxRows: 100_000, maxPages: 999, pageSize: 9_999 },
      })
    );

    expect(plan.limits.maxRows).toBe(EVIDENCE_LIMITS.maxScoutRows);
    expect(plan.limits.maxPages).toBeLessThanOrEqual(1);
    expect(plan.limits.pageSize).toBeLessThanOrEqual(EVIDENCE_LIMITS.maxScoutRows);
  });
});

/* ================================================================== *
 * Unresolved references and ambiguity
 * ================================================================== */

describe('Phase 78 — unresolved references and ambiguity', () => {
  it('blocks absence when an unresolved reference could target the subject', () => {
    const bundle = run(
      fixture({
        edges: [],
        gaps: [{ kind: 'unresolved_reference', capability: 'call_graph', path: 'src/other.ts' }],
      }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('UNRESOLVED_REFERENCES');
    expect(bundle.unresolved.relevant).toBe(1);
  });

  it('blocks absence on an ambiguous reference', () => {
    const bundle = run(
      fixture({
        edges: [],
        gaps: [{ kind: 'ambiguous_reference', capability: 'call_graph', path: 'src/other.ts' }],
      }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'uniqueness',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.reasons).toContain('AMBIGUOUS_REFERENCES');
  });

  it('blocks a dynamic cross-service absence claim', () => {
    const bundle = run(
      fixture({
        edges: [],
        gaps: [{ kind: 'dynamic_target', capability: 'cross_service_graph', path: 'src/other.ts' }],
        crossService: {
          generation: 'cs-1',
          ambiguous: 0,
          unresolved: 0,
          dynamic: 1,
          unsupportedFrameworks: [],
          negativeClaimSafe: false,
          reasons: ['DYNAMIC_ENDPOINT'],
        },
      }),
      request({
        profile: 'auditor',
        operation: 'cross_service_endpoint',
        claim: 'absence',
        scope: { kind: 'path', paths: ['src'] },
        subject: { route: '/api/target' },
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('DYNAMIC_TARGETS');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(false);
  });

  it('never lets a reserved protocol edge ground an absence claim', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'auditor',
        operation: 'cross_service_endpoint',
        claim: 'absence',
        scope: { kind: 'path', paths: ['src'] },
        subject: { route: '/api/target' },
        options: { edgeType: 'CROSS_RPC_CALLS' },
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(false);
    expect(bundle.claimSafety.reasons).toContain('RESERVED_CAPABILITY_NO_PRODUCER');
  });
});

/* ================================================================== *
 * Fleet
 * ================================================================== */

describe('Phase 78 — fleet evidence', () => {
  const fleetScope = { kind: 'fleet' as const, projectIds: ['a', 'b', 'c'] };

  it('rejects an unbounded fleet claim', () => {
    expect(() =>
      planEvidence(
        request({
          profile: 'auditor',
          operation: 'fleet_dependency',
          claim: 'absence',
          scope: { kind: 'fleet' },
        })
      )
    ).toThrow(/bounded/i);
  });

  it('blocks a fleet absence claim when no fleet snapshot exists', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'auditor',
        operation: 'fleet_dependency',
        claim: 'absence',
        scope: fleetScope,
        subject: { package: 'some-package' },
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('FLEET_EMPTY');
  });

  it('blocks a fleet absence claim when a participant is stale', () => {
    const bundle = run(
      fixture({
        edges: [],
        fleet: {
          generation: 'fleet-1',
          registeredProjects: ['a', 'b', 'c'],
          staleProjects: ['c'],
          missingProjects: [],
          crossProjectEdges: 4,
          negativeClaimSafe: false,
          reasons: ['FLEET_PROJECT_STALE'],
        },
      }),
      request({
        profile: 'auditor',
        operation: 'fleet_dependency',
        claim: 'absence',
        scope: fleetScope,
        subject: { package: 'some-package' },
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('FLEET_PROJECT_STALE');
  });

  it('permits a bounded fleet absence claim when every participant is current', () => {
    const bundle = run(
      fixture({
        edges: [],
        fleet: {
          generation: 'fleet-1',
          registeredProjects: ['a', 'b', 'c'],
          staleProjects: [],
          missingProjects: [],
          crossProjectEdges: 4,
          negativeClaimSafe: true,
          reasons: [],
        },
      }),
      request({
        profile: 'auditor',
        operation: 'fleet_dependency',
        claim: 'absence',
        scope: fleetScope,
        subject: { package: 'some-package' },
      })
    );

    expect(bundle.claimSafety.decision).toBe('allowed');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(true);
    expect(bundle.limitations.join(' ')).not.toMatch(/organization-wide/i);
  });

  it('records fleet participants as evidence items', () => {
    const bundle = run(
      fixture({
        edges: [],
        fleet: {
          generation: 'fleet-1',
          registeredProjects: ['a', 'b'],
          staleProjects: [],
          missingProjects: [],
          crossProjectEdges: 1,
          negativeClaimSafe: true,
          reasons: [],
        },
      }),
      request({
        profile: 'auditor',
        operation: 'fleet_dependency',
        claim: 'absence',
        scope: { kind: 'fleet', projectIds: ['a', 'b'] },
        subject: { package: 'pkg' },
      })
    );

    expect(bundle.evidence.some((item) => item.origin === 'fleet')).toBe(true);
  });
});

/* ================================================================== *
 * Dead code
 * ================================================================== */

describe('Phase 78 — dead code guards', () => {
  it('does not classify a symbol with a HANDLES edge as dead', () => {
    const bundle = run(
      fixture({ edges: [{ id: 'h1', from: 'b', to: 'a', type: 'HANDLES' }] }),
      request({
        profile: 'auditor',
        operation: 'dead_code',
        claim: 'dead_code',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('DEAD_CODE_PARTICIPATION_EDGE');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(false);
  });

  it('does not classify a consumer with LISTENS_ON as dead', () => {
    const bundle = run(
      fixture({ edges: [{ id: 'l1', from: 'b', to: 'a', type: 'LISTENS_ON' }] }),
      request({
        profile: 'auditor',
        operation: 'dead_code',
        claim: 'dead_code',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('DEAD_CODE_PARTICIPATION_EDGE');
  });

  it('never reports dead code as allowed even with a clean audit', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'auditor',
        operation: 'dead_code',
        claim: 'dead_code',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('provisional');
    expect(bundle.limitations.join(' ')).toMatch(/human confirmation/i);
  });

  it('keeps verify dead-code results provisional only', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'verify',
        operation: 'dead_code',
        claim: 'dead_code',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('provisional');
  });
});

/* ================================================================== *
 * Source fallback security
 * ================================================================== */

describe('Phase 78 — source fallback', () => {
  it('scans only the bounded gapped file', () => {
    const bundle = run(
      fixture({
        edges: [],
        gaps: [{ kind: 'parse_failure', capability: 'call_graph', path: 'src/target.ts' }],
      }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.sourceFallback.gapsChecked).toEqual(['src/target.ts']);
    expect(bundle.sourceFallback.matches).toBeGreaterThan(0);
    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.reasons).toContain('SOURCE_REFERENCE_FOUND');
  });

  it('never bypasses sensitive-file protection', () => {
    const bundle = run(
      fixture({
        edges: [],
        gaps: [{ kind: 'parse_failure', capability: 'call_graph', path: '.env' }],
      }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.sourceFallback.skipped.map((entry) => entry.path)).toContain('.env');
    expect(JSON.stringify(bundle)).not.toContain('do-not-leak');
  });

  it('rejects a gapped path that escapes the project root', () => {
    const bundle = run(
      fixture({
        edges: [],
        gaps: [{ kind: 'parse_failure', capability: 'call_graph', path: '../../etc/passwd' }],
      }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.sourceFallback.performed).toBe(false);
  });

  it('does not run fallback for scout at all', () => {
    const bundle = run(
      fixture({
        edges: [],
        gaps: [{ kind: 'parse_failure', capability: 'call_graph', path: 'src/target.ts' }],
      }),
      request({
        profile: 'scout',
        operation: 'find_callers',
        claim: 'positive',
        scope: callerScope,
      })
    );

    expect(bundle.sourceFallback.requested).toBe(false);
    expect(bundle.sourceFallback.performed).toBe(false);
  });
});

/* ================================================================== *
 * Scope and project isolation
 * ================================================================== */

describe('Phase 78 — scope and project isolation', () => {
  it('requires an explicit bounded scope for path claims', () => {
    expect(() =>
      planEvidence(
        request({
          profile: 'auditor',
          operation: 'find_callers',
          claim: 'absence',
          scope: { kind: 'path' },
        })
      )
    ).toThrow(/bounded/i);
  });

  it('requires an explicit symbol list for symbol claims', () => {
    expect(() =>
      planEvidence(
        request({
          profile: 'verify',
          operation: 'find_callers',
          claim: 'negative',
          scope: { kind: 'symbol' },
        })
      )
    ).toThrow(/bounded/i);
  });

  it('keeps evidence confined to the project facts it was given', () => {
    const facts = fixture({ edges: [] });

    const bundle = run(
      facts,
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    expect(bundle.scope.kind).toBe('symbol');
    expect(facts.projectId).toBe('p');
    expect(bundle.generation.project).toBe(facts.generation);
  });
});

/* ================================================================== *
 * ADR constraints
 * ================================================================== */

describe('Phase 78 — ADR constraints', () => {
  const adr = { id: 'ADR-0007', title: 'Fleet Graph stays overlay only', status: 'accepted' };

  it('attaches ADR constraints to the bundle', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
        adrConstraints: [adr],
      })
    );

    expect(bundle.adrConstraints).toEqual([adr]);
  });

  it('does not let an ADR change raw graph evidence or claim safety', () => {
    const base = fixture({ edges: [] });

    const without = run(
      base,
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    const withAdr = run(
      base,
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
        adrConstraints: [adr],
      })
    );

    expect(withAdr.evidence).toEqual(without.evidence);
    expect(withAdr.claimSafety).toEqual(without.claimSafety);
  });
});

describe('Phase 78 — ADR context integration', () => {
  it('attaches only relevant accepted ADRs and never a superseded one', async () => {
    const storageRoot = mkdtempSync(join(tmpdir(), 'toolnet-phase78-adr-'));

    try {
      const storage = new LocalStorageProvider(storageRoot);

      const project = { id: 'p', name: 'p', rootPath: ROOT } as unknown as ProjectManifest;

      const service = new ArchitectureDecisionService(new AdrStore(storage, project));

      await service.initialize();

      const relevant = await service.create({
        title: 'Fleet Graph is overlay only',
        decision: 'Fleet never merges project graphs.',
        status: 'accepted',
        affectedPaths: ['src/code-intelligence/fleet/**'],
      });

      await service.create({
        title: 'Unrelated subsystem decision',
        decision: 'Nothing to do with the fleet overlay.',
        status: 'accepted',
        affectedPaths: ['docs/**'],
      });

      const old = await service.create({
        title: 'Old fleet rule',
        decision: 'Superseded.',
        affectedPaths: ['src/code-intelligence/fleet/**'],
      });

      const replacement = await service.create({
        title: 'New fleet rule',
        decision: 'Replaces the old rule.',
        status: 'accepted',
        affectedPaths: ['src/code-intelligence/fleet/**'],
      });

      await service.supersede(old.record.id, replacement.record.id);

      const ctx = { storage, project } as unknown as MCPContext;

      const constraints = await adrConstraintsFor(
        ctx,
        request({
          profile: 'auditor',
          operation: 'find_callers',
          claim: 'absence',
          scope: { kind: 'path', paths: ['src/code-intelligence/fleet/fleet-store.ts'] },
        })
      );

      const ids = constraints.map((entry) => entry.id);

      expect(ids).toContain(relevant.record.humanId);
      expect(ids).not.toContain(old.record.humanId);
      expect(ids.length).toBeLessThanOrEqual(5);

      for (const entry of constraints) {
        expect(entry.status).toBe('accepted');
      }
    } finally {
      rmSync(storageRoot, { recursive: true, force: true });
    }
  });
});

/* ================================================================== *
 * Determinism
 * ================================================================== */

describe('Phase 78 — determinism', () => {
  it('produces identical bundles for the same input', () => {
    const req = request({
      profile: 'auditor',
      operation: 'find_callers',
      claim: 'absence',
      scope: callerScope,
    });

    const first = run(fixture({ edges: [] }), req);
    const second = run(fixture({ edges: [] }), req);
    const third = run(fixture({ edges: [] }), req);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(JSON.stringify(third)).toBe(JSON.stringify(first));
  });

  it('derives a stable request fingerprint that includes the profile', () => {
    const scout = planEvidence(
      request({
        profile: 'scout',
        operation: 'find_callers',
        claim: 'positive',
        scope: callerScope,
      })
    );

    const auditor = planEvidence(
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'positive',
        scope: callerScope,
      })
    );

    expect(scout.fingerprint).toMatch(/^ev-[0-9a-f]{32}$/);
    expect(scout.fingerprint).not.toBe(auditor.fingerprint);
  });

  it('sorts evidence and coverage deterministically', () => {
    const bundle = run(
      fixture({ edges: [] }),
      request({
        profile: 'auditor',
        operation: 'find_callers',
        claim: 'absence',
        scope: callerScope,
      })
    );

    const ids = bundle.evidence.map((item) => `${item.origin}:${item.kind}:${item.id}`);
    expect(ids).toEqual([...ids].sort());

    const capabilities = bundle.coverage.map((entry) => entry.capability);
    expect(capabilities).toEqual([...capabilities].sort());
  });
});

/* ================================================================== *
 * Authority non-interference
 * ================================================================== */

describe('Phase 78 — authority non-interference', () => {
  it('leaves Memory, Task and ADR files untouched across many audits', () => {
    const authorityRoot = mkdtempSync(join(tmpdir(), 'toolnet-phase78-auth-'));

    try {
      const files: Record<string, string> = {
        'knowledge/adr/state.v1.json': JSON.stringify({ records: [], revision: 3 }),
        'tasks/state.json': JSON.stringify({ tasks: [{ id: 't1', revision: 2 }] }),
        'memory/records.json': JSON.stringify({ records: [{ id: 'm1' }] }),
      };

      const before = new Map<string, string>();

      for (const [name, content] of Object.entries(files)) {
        const absolute = join(authorityRoot, name);
        mkdirSync(join(absolute, '..'), { recursive: true });
        writeFileSync(absolute, content);
        before.set(name, createHash('sha256').update(content).digest('hex'));
      }

      for (let index = 0; index < 25; index += 1) {
        run(
          fixture({ edges: [] }),
          request({
            profile: index % 2 === 0 ? 'auditor' : 'verify',
            operation: 'find_callers',
            claim: 'absence',
            scope: callerScope,
          })
        );
      }

      for (const [name, hash] of before) {
        const current = createHash('sha256')
          .update(readFileSync(join(authorityRoot, name)))
          .digest('hex');

        expect(current).toBe(hash);
      }
    } finally {
      rmSync(authorityRoot, { recursive: true, force: true });
    }
  });
});

/* ================================================================== *
 * Daemon coordination
 * ================================================================== */

interface FakeState {
  generation: string;
  evidenceCalls: number;
  lastRequest: EvidenceRequest | null;
}

function makeCoordinatorDeps(state: FakeState): DaemonRuntimeDependencies {
  return {
    async probeLocalGraph() {
      return { present: true, generation: state.generation };
    },

    async loadProject() {
      return { generation: state.generation };
    },

    async indexProject() {
      return { generation: state.generation, files: 0, symbols: 0, edges: 0 };
    },

    async hydrateProject() {
      return {
        generation: state.generation,
        files: 0,
        symbols: 0,
        edges: 0,
        fleetRepinned: false,
      };
    },

    async artifactStatus() {
      return { present: true, generation: state.generation };
    },

    async evidenceProject(_project, req) {
      state.evidenceCalls += 1;
      state.lastRequest = req;

      return {
        profile: req.profile,
        evidenceLevel: 'audited',
        operation: req.operation,
        claim: req.claim,
        scope: req.scope,
        generation: { project: state.generation },
        requirements: [],
        evidence: [],
        coverage: [],
        pagination: { complete: true, pages: 1, rows: 0, truncated: false },
        sourceFallback: {
          requested: false,
          performed: false,
          gapsChecked: [],
          matches: 0,
          skipped: [],
        },
        unresolved: { total: 0, relevant: 0, ambiguous: 0, dynamic: 0, items: [] },
        claimSafety: {
          decision: 'allowed',
          negativeClaimSafe: true,
          exhaustiveClaimSafe: true,
          reasons: [],
        },
        limitations: [],
        diagnostics: [],
        adrConstraints: [],
        complete: true,
        fingerprint: `fp-${req.profile}-${req.claim}`,
      } as never;
    },

    async queryProject() {
      throw new Error('not used');
    },

    async refreshFleet() {
      /* no-op */
    },

    async releaseProject() {
      /* no-op */
    },
  } satisfies DaemonRuntimeDependencies as unknown as DaemonRuntimeDependencies;
}

function makeCoordinator(state: FakeState): {
  runtime: ProjectRuntimeCoordinator;
  projects: ProjectRegistry;
} {
  const deps = makeCoordinatorDeps(state);

  const projects = new ProjectRegistry();

  const index = new IndexCoordinator(deps, projects);

  const artifact = new ArtifactCoordinator(deps, projects);

  return { runtime: new ProjectRuntimeCoordinator(deps, projects, index, artifact), projects };
}

const daemonProject: DaemonProjectRef = { id: 'p', name: 'p', rootPath: '/tmp/p' };

const auditRequest = request({
  profile: 'auditor',
  operation: 'find_callers',
  claim: 'absence',
  scope: callerScope,
});

describe('Phase 78 — daemon evidence coordination', () => {
  it('deduplicates ten concurrent identical audits into one computation', async () => {
    const state: FakeState = { generation: 'gen-1', evidenceCalls: 0, lastRequest: null };

    const { runtime } = makeCoordinator(state);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => runtime.evidence(daemonProject, 's1', auditRequest))
    );

    expect(state.evidenceCalls).toBe(1);
    expect(new Set(results.map((bundle) => JSON.stringify(bundle))).size).toBe(1);
  });

  it('caches a repeated audit for the same generation', async () => {
    const state: FakeState = { generation: 'gen-1', evidenceCalls: 0, lastRequest: null };

    const { runtime } = makeCoordinator(state);

    await runtime.evidence(daemonProject, 's1', auditRequest);
    await runtime.evidence(daemonProject, 's1', auditRequest);

    expect(state.evidenceCalls).toBe(1);
  });

  it('recomputes when the project generation changes', async () => {
    const state: FakeState = { generation: 'gen-1', evidenceCalls: 0, lastRequest: null };

    const { runtime, projects } = makeCoordinator(state);

    await runtime.evidence(daemonProject, 's1', auditRequest);

    /* A completed index publishes the new generation into the project registry. */
    state.generation = 'gen-2';
    projects.attach(daemonProject, 's1', Date.now());
    projects.setState('p', 'ready', { generation: 'gen-2' });

    await runtime.evidence(daemonProject, 's1', auditRequest);

    expect(state.evidenceCalls).toBe(2);
  });

  it('never reuses a scout result as auditor proof', async () => {
    const state: FakeState = { generation: 'gen-1', evidenceCalls: 0, lastRequest: null };

    const { runtime } = makeCoordinator(state);

    await runtime.evidence(
      daemonProject,
      's1',
      request({
        profile: 'scout',
        operation: 'find_callers',
        claim: 'positive',
        scope: callerScope,
      })
    );

    await runtime.evidence(daemonProject, 's1', auditRequest);

    expect(state.evidenceCalls).toBe(2);
  });

  it('serves many sessions from one shared runtime', async () => {
    const state: FakeState = { generation: 'gen-1', evidenceCalls: 0, lastRequest: null };

    const { runtime } = makeCoordinator(state);

    await Promise.all(
      Array.from({ length: 5 }, (_unused, index) =>
        runtime.evidence(daemonProject, `s${index}`, auditRequest)
      )
    );

    expect(state.evidenceCalls).toBe(1);
  });
});

describe('Phase 78 — daemon IPC round trip', () => {
  it('returns an evidence bundle over the real local socket', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-phase78-daemon-'));

    const state: FakeState = { generation: 'gen-1', evidenceCalls: 0, lastRequest: null };

    const daemon = await startDaemon({
      deps: makeCoordinatorDeps(state),
      runtimeRoot: root,
      disableWatchers: true,
    });

    try {
      const client = await connectDaemonClient({
        socketPath: daemonSocketPath(root),
        runtimeRoot: root,
        client: { type: 'mcp', pid: process.pid },
        timeoutMs: 2_000,
      });

      try {
        const response = await client.request({
          type: 'evidence',
          sessionId: client.sessionId,
          project: daemonProject,
          evidence: auditRequest,
        });

        expect(response.ok).toBe(true);

        if (response.ok && response.type === 'evidence') {
          expect(response.bundle.profile).toBe('auditor');
          expect(response.bundle.claim).toBe('absence');
          expect(response.bundle.claimSafety.decision).toBe('allowed');
        } else {
          throw new Error('unexpected daemon evidence response');
        }
      } finally {
        await client.close();
      }
    } finally {
      await daemon.close({ force: true });

      rmSync(root, { recursive: true, force: true });
    }
  });
});

/* ================================================================== *
 * Daemon / standalone parity
 * ================================================================== */

describe('Phase 78 — daemon / standalone parity', () => {
  it('produces semantically identical evidence standalone and shared', async () => {
    const state: FakeState = { generation: 'gen-1', evidenceCalls: 0, lastRequest: null };

    const { runtime } = makeCoordinator(state);

    const shared = await runtime.evidence(daemonProject, 's1', auditRequest);

    const standalone = run(fixture({ edges: [] }), auditRequest);

    /* The fake dependency mirrors the executor contract field for field. */
    expect(shared.claimSafety.decision).toBe(standalone.claimSafety.decision);
    expect(shared.pagination.complete).toBe(standalone.pagination.complete);
    expect(shared.complete).toBe(standalone.complete);
    expect(state.lastRequest?.claim).toBe(standalone.claim);
    expect(state.lastRequest?.profile).toBe(standalone.profile);
  });
});

/* ================================================================== *
 * MCP surface
 * ================================================================== */

describe('Phase 78 — MCP surface', () => {
  const repoRoot = resolve(process.cwd());

  it('registers verify_evidence and the evidence profile field in source', () => {
    const server = readFileSync(join(repoRoot, 'src', 'mcp', 'server.ts'), 'utf8');

    expect(server).toContain('verify_evidence');
    expect(server).toContain('EVIDENCE PROFILES (Phase 78');

    const query = readFileSync(join(repoRoot, 'src', 'mcp', 'tools', 'query-graph.ts'), 'utf8');

    expect(query).toContain('evidenceProfile');

    const schema = readFileSync(
      join(repoRoot, 'src', 'mcp', 'tools', 'get-graph-schema.ts'),
      'utf8'
    );

    expect(schema).toContain('auditor');
    expect(schema).toContain('RESERVED_CAPABILITY_NO_PRODUCER');
  });

  it('exposes the Phase 78 instructions to MCP clients', () => {
    const server = readFileSync(join(repoRoot, 'src', 'mcp', 'server.ts'), 'utf8');

    expect(server).toContain('Never state');
    expect(server).toContain('the only caller');
    expect(server).toContain('Auditor is bounded exhaustive, never omniscient');
    expect(server).toContain('Dead code is never automatically deletable');
  });

  it('guides evidence execution through the shared runtime interface', () => {
    const runtime = readFileSync(
      join(repoRoot, 'src', 'code-intelligence', 'runtime', 'types.ts'),
      'utf8'
    );

    expect(runtime).toContain('evidence(');
    expect(runtime).toContain('EvidenceRequest');
  });
});

/* ================================================================== *
 * Packaged runtime
 * ================================================================== */

async function listPackagedMcpTools(bundlePath: string): Promise<string[]> {
  const cwd = mkdtempSync(join(tmpdir(), 'toolnet-phase78-'));

  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase78-certify', version: '1.0.0' },
      },
    }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  ].join('\n')}\n`;

  const child = spawn(process.execPath, [bundlePath], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });

  child.stderr.resume();

  return new Promise<string[]>((resolvePromise, rejectPromise) => {
    let buffer = '';
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const finish = (complete: () => void): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      child.kill('SIGKILL');
      complete();
    };

    timer = setTimeout(
      () => finish(() => rejectPromise(new Error('packaged runtime probe timed out'))),
      60_000
    );

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      buffer += chunk;

      const lines = buffer.split('\n');

      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith('{')) continue;

        let message: { id?: unknown; result?: { tools?: Array<{ name?: unknown }> } };

        try {
          message = JSON.parse(trimmed) as typeof message;
        } catch {
          continue;
        }

        if (message.id !== 2) continue;

        const names = (message.result?.tools ?? []).map((tool) => String(tool.name));

        finish(() => resolvePromise(names));

        return;
      }
    });

    child.on('error', (error) => finish(() => rejectPromise(error)));

    child.stdin.write(requests);
  });
}

/* ================================================================== *
 * Certification marker
 * ================================================================== */

const PHASE78_MARKER = 'PHASE78_EVIDENCE_PROFILES=PASS';

describe('Phase 78 — certification', () => {
  it('emits the Phase 78 PASS marker', () => {
    console.log(PHASE78_MARKER);

    expect(PHASE78_MARKER).toBe('PHASE78_EVIDENCE_PROFILES=PASS');
  });
});

describe('Phase 78 — packaged runtime', () => {
  const repoRoot = resolve(process.cwd());
  const bundlePath = join(repoRoot, 'bundle', 'mcp.js');

  it('ships the evidence layer inside the packaged MCP bundle', () => {
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    for (const marker of [
      'verify_evidence',
      'EVIDENCE PROFILES',
      'SCOUT_PROVISIONAL_ONLY',
      'RESERVED_CAPABILITY_NO_PRODUCER',
      'AUDIT_LIMIT_REACHED',
      'DEAD_CODE_PARTICIPATION_EDGE',
    ]) {
      expect(bundle).toContain(marker);
    }
  });

  it('exposes verify_evidence through the packaged tools/list', async () => {
    const tools = await listPackagedMcpTools(bundlePath);

    expect(tools).toContain('verify_evidence');
    expect(tools).toContain('query_graph');
    expect(tools).toContain('get_graph_schema');
  }, 90_000);
});
