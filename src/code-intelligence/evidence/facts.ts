/*
 * Phase 78 — evidence facts builder.
 *
 * Produces the read-only `EvidenceFacts` surface the executor consumes. It is
 * shared by the MCP layer and the daemon runtime so both observe identical
 * generation, coverage and source-fallback behaviour.
 *
 * The builder never mutates the graph and never loads a second copy of it.
 */

import { existsSync, readFileSync } from 'node:fs';

import { isAbsolute, normalize, resolve } from 'node:path';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { GraphCapability } from '../graph-coverage/types.js';

import { buildGraphSchema } from '../query-v2/schema-registry.js';

import { isSensitiveFile } from '../../security/file-filter.js';

import type {
  EvidenceCapability,
  EvidenceCapabilityCoverage,
  EvidenceCrossServiceFacts,
  EvidenceEdge,
  EvidenceFacts,
  EvidenceFleetFacts,
  EvidenceGap,
  EvidenceRuntimeFacts,
  EvidenceSourceReadResult,
  EvidenceSymbol,
} from './types.js';

export interface EvidenceCoverageProvider {
  available: boolean;
  evaluate(capability: GraphCapability): EvidenceCapabilityCoverage;
}

export interface EvidenceFactsInput {
  projectId: string;
  rootPath: string;
  generation: string;
  currentGeneration?: () => string;
  graph: CodeGraphStore;
  coverage?: EvidenceCoverageProvider | null;
  freshness?: { checked: boolean; stale: boolean };
  gaps?: readonly EvidenceGap[];
  fleet?: EvidenceFleetFacts | null;
  crossService?: EvidenceCrossServiceFacts | null;
  /**
   * Phase 79 runtime trace facts, when the project has imported traces.
   * Omitted means "no runtime evidence", never "nothing observed at runtime".
   */
  runtime?: EvidenceRuntimeFacts | null;
  /** Extra produced capabilities (used by tests to simulate reserved vocabulary). */
  producedCapabilities?: readonly EvidenceCapability[];
  /** Extra produced edge types on top of the static schema registry. */
  producedEdgeTypes?: readonly string[];
  readSource?: boolean;
  staleAfterPage?: number;
}

interface CapabilityProducers {
  capabilities: Set<EvidenceCapability>;
  edgeTypes: Set<string>;
}

function collectProducers(): CapabilityProducers {
  const schema = buildGraphSchema();

  const capabilities = new Set<EvidenceCapability>();
  const edgeTypes = new Set<string>();

  for (const edge of schema.edgeTypes) {
    if (!edge.currentlyProduced) {
      continue;
    }

    edgeTypes.add(edge.name);

    if (edge.capability) {
      capabilities.add(edge.capability);
    }

    if (edge.scope === 'fleet') {
      capabilities.add('fleet_graph');
    }
  }

  /*
   * Lexical search is always produced (the FTS index is local and rebuilt),
   * and source fallback is an evidence-layer capability that exists whenever
   * the project root is readable.
   */
  capabilities.add('lexical_search');
  capabilities.add('source_fallback');

  return { capabilities, edgeTypes };
}

const STATIC_PRODUCERS = collectProducers();

function coverageFromFleet(fleet: EvidenceFleetFacts | null): EvidenceCapabilityCoverage {
  if (!fleet) {
    return { status: 'unavailable', negativeClaimSafe: false, reasons: ['COVERAGE_UNAVAILABLE'] };
  }

  return {
    status: fleet.negativeClaimSafe ? 'complete' : 'partial',
    negativeClaimSafe: fleet.negativeClaimSafe,
    reasons: fleet.reasons,
  };
}

/**
 * Bounded, project-contained source read used by fallback.
 *
 * Rejects absolute paths, path escapes and sensitive files before touching the
 * filesystem. No source is ever executed.
 */
export function createSourceReader(
  rootPath: string
): (path: string, needle: string, maxMatches: number) => EvidenceSourceReadResult {
  const root = resolve(rootPath);

  return (path: string, needle: string, maxMatches: number): EvidenceSourceReadResult => {
    if (!path || isAbsolute(path)) {
      throw new Error('SOURCE_FALLBACK_REJECTED_ABSOLUTE');
    }

    const normalized = normalize(path).replaceAll('\\', '/');

    if (normalized.startsWith('..') || normalized.includes('../')) {
      throw new Error('SOURCE_FALLBACK_REJECTED_ESCAPE');
    }

    if (isSensitiveFile(normalized)) {
      throw new Error('SOURCE_FALLBACK_SENSITIVE');
    }

    const absolute = resolve(root, normalized);

    if (absolute !== root && !absolute.startsWith(`${root}/`)) {
      throw new Error('SOURCE_FALLBACK_REJECTED_ESCAPE');
    }

    if (!existsSync(absolute)) {
      /*
       * A gapped file that cannot be read leaves the gap open. Treating a
       * missing file as "no reference found" would turn an inability to check
       * into false certainty.
       */
      throw new Error('SOURCE_FALLBACK_UNAVAILABLE');
    }

    const content = readFileSync(absolute, 'utf8');

    const lines = content.split(/\r?\n/);

    const matches: Array<{ line: number; text: string }> = [];

    let truncated = false;

    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index]!.includes(needle)) {
        continue;
      }

      if (matches.length >= maxMatches) {
        truncated = true;
        break;
      }

      matches.push({ line: index + 1, text: '' });
    }

    return { path: normalized, matches, truncated };
  };
}

export function buildEvidenceFacts(input: EvidenceFactsInput): EvidenceFacts {
  const symbols = input.graph.allSymbols(input.projectId).map<EvidenceSymbol>((symbol) => ({
    id: symbol.id,
    name: symbol.name,
    ...(symbol.qualifiedName ? { qualifiedName: symbol.qualifiedName } : {}),
    type: symbol.type,
    filePath: symbol.filePath,
    ...(symbol.startLine !== undefined ? { startLine: symbol.startLine } : {}),
    ...(symbol.endLine !== undefined ? { endLine: symbol.endLine } : {}),
  }));

  const symbolIndex = new Map(symbols.map((symbol) => [symbol.id, symbol]));

  const edges = input.graph.allEdges(input.projectId).map<EvidenceEdge>((edge) => ({
    id: edge.id,
    type: String(edge.type),
    from: edge.from,
    to: edge.to,
  }));

  const producedCapabilities = new Set<EvidenceCapability>(STATIC_PRODUCERS.capabilities);

  for (const capability of input.producedCapabilities ?? []) {
    producedCapabilities.add(capability);
  }

  const producedEdgeTypes = new Set<string>(STATIC_PRODUCERS.edgeTypes);

  for (const edgeType of input.producedEdgeTypes ?? []) {
    producedEdgeTypes.add(edgeType);
  }

  const coverage = input.coverage ?? null;

  const freshness = input.freshness ?? { checked: false, stale: false };

  const readSource = input.readSource === false ? undefined : createSourceReader(input.rootPath);

  const capabilityProduced = (capability: EvidenceCapability, edgeType?: string): boolean => {
    if (edgeType) {
      return producedEdgeTypes.has(edgeType);
    }

    return producedCapabilities.has(capability);
  };

  const coverageFor = (capability: EvidenceCapability): EvidenceCapabilityCoverage => {
    if (capability === 'fleet_graph') {
      return coverageFromFleet(input.fleet ?? null);
    }

    if (capability === 'source_fallback') {
      return {
        status: readSource ? 'complete' : 'unavailable',
        negativeClaimSafe: Boolean(readSource),
        reasons: [],
      };
    }

    if (!coverage || !coverage.available) {
      return { status: 'unavailable', negativeClaimSafe: false, reasons: ['COVERAGE_UNAVAILABLE'] };
    }

    return coverage.evaluate(capability);
  };

  const facts: EvidenceFacts = {
    projectId: input.projectId,
    rootPath: input.rootPath,
    generation: input.generation,
    currentGeneration: input.currentGeneration ?? (() => input.generation),
    freshness,
    coverageAvailable: Boolean(coverage?.available) || Boolean(input.fleet),
    coverageFor,
    capabilityProduced,
    symbols: () => symbols,
    symbolById: (id) => symbolIndex.get(id),
    incoming: (symbolId, edgeTypes) =>
      edges.filter((edge) => edge.to === symbolId && edgeTypes.includes(edge.type)),
    outgoing: (symbolId, edgeTypes) =>
      edges.filter((edge) => edge.from === symbolId && edgeTypes.includes(edge.type)),
    gaps: () => input.gaps ?? [],
    fleet: () => input.fleet ?? null,
    crossService: () => input.crossService ?? null,
    runtime: () => input.runtime ?? null,
    ...(readSource ? { readSource } : {}),
    ...(input.staleAfterPage !== undefined ? { staleAfterPage: input.staleAfterPage } : {}),
  };

  return facts;
}
