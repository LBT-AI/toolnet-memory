/*
 * Phase 80 — shared change facts builder.
 *
 * Produces the read-only ChangeFacts surface consumed by the change pipeline.
 * It is shared by the MCP layer and the daemon runtime so standalone and daemon
 * analyses observe identical generations, coverage and provenance.
 *
 * Read-only by construction: it never mutates the graph and never loads a
 * second copy of it.
 */

import { existsSync, readFileSync } from 'node:fs';

import { isAbsolute, normalize, resolve } from 'node:path';

import { isSensitiveFile } from '../../security/file-filter.js';

import { parseCodeFile } from '../parsers/parse-code-file.js';

import { FleetImpactAnalyzer } from '../fleet/impact.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { GraphCapability } from '../graph-coverage/types.js';

import type { FleetSnapshot } from '../fleet/types.js';

import type { CrossServiceSnapshot } from '../cross-service/types.js';

import type { RuntimeObservation } from '../runtime-trace/index.js';

import type {
  AdrConstraintEntry,
  ChangeCapabilityCoverage,
  ChangeFacts,
  ChangeRuntimeObservation,
  ChangeSymbol,
} from './types.js';

export interface ChangeCoverageProvider {
  available: boolean;
  evaluate(capability: GraphCapability): {
    status: string;
    negativeClaimSafe: boolean;
    reasons: string[];
  };
}

export interface ProjectChangeFactsInput {
  projectId: string;
  rootPath: string;
  generation: string;
  candidateGeneration?: string;
  graph: CodeGraphStore;
  coverage?: ChangeCoverageProvider | null;
  fleetSnapshot?: FleetSnapshot | null;
  crossServiceSnapshot?: CrossServiceSnapshot | null;
  runtimeObservations?: readonly RuntimeObservation[];
  /** Relevant ADR constraints, resolved lazily for the changed entities. */
  adr?: (input: { filePaths: string[]; symbols: string[] }) => Promise<AdrConstraintEntry[]>;
  includeRuntime?: boolean;
  includeFleet?: boolean;
  currentGeneration?: () => string;
}

function toChangeSymbol(symbol: {
  id: string;
  name: string;
  qualifiedName?: string;
  type: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  metadata?: Record<string, unknown>;
}): ChangeSymbol {
  const exported =
    symbol.metadata?.exported === true ||
    symbol.metadata?.isExported === true ||
    symbol.metadata?.public === true;

  return {
    id: symbol.id,
    name: symbol.name,
    ...(symbol.qualifiedName ? { qualifiedName: symbol.qualifiedName } : {}),
    type: String(symbol.type),
    filePath: symbol.filePath,
    ...(symbol.startLine !== undefined ? { startLine: symbol.startLine } : {}),
    ...(symbol.endLine !== undefined ? { endLine: symbol.endLine } : {}),
    ...(exported ? { exported: true } : {}),
  };
}

function boundedSourceReader(rootPath: string): (path: string, maxBytes: number) => string | null {
  const root = resolve(rootPath);

  return (path: string, maxBytes: number): string | null => {
    if (!path || isAbsolute(path)) {
      return null;
    }

    const normalized = normalize(path).replaceAll('\\', '/');

    if (normalized.startsWith('..') || normalized.includes('../') || isSensitiveFile(normalized)) {
      return null;
    }

    const absolute = resolve(root, normalized);

    if (absolute !== root && !absolute.startsWith(`${root}/`)) {
      return null;
    }

    try {
      if (!existsSync(absolute)) {
        return null;
      }

      return readFileSync(absolute, 'utf8').slice(0, maxBytes);
    } catch {
      return null;
    }
  };
}

function toRuntimeObservation(observation: RuntimeObservation): ChangeRuntimeObservation {
  return {
    id: observation.id,
    kind: String(observation.kind),
    validation: String(observation.validation),
    observationCount: observation.observationCount,
    sessionCount: observation.sessionCount,
    compatibility: String(observation.compatibility),
    source: {
      ...(observation.sourceSymbolId ? { symbolId: observation.sourceSymbolId } : {}),
      ...(observation.source.name ? { name: observation.source.name } : {}),
    },
    target: {
      ...(observation.targetSymbolId ? { symbolId: observation.targetSymbolId } : {}),
      ...(observation.target.name ? { name: observation.target.name } : {}),
    },
  };
}

export function buildProjectChangeFacts(input: ProjectChangeFactsInput): ChangeFacts {
  const symbols = input.graph.allSymbols(input.projectId).map(toChangeSymbol);
  const symbolIndex = new Map(symbols.map((symbol) => [symbol.id, symbol]));

  const edges = input.graph.allEdges(input.projectId).map((edge) => ({
    id: edge.id,
    type: String(edge.type),
    from: edge.from,
    to: edge.to,
  }));

  const coverageAvailable = Boolean(input.coverage?.available);

  const coverageFor = (capability: string): ChangeCapabilityCoverage => {
    if (!input.coverage || !input.coverage.available) {
      return {
        available: false,
        status: 'unavailable',
        negativeClaimSafe: false,
        reasons: ['COVERAGE_UNAVAILABLE'],
      };
    }

    const evaluation = input.coverage.evaluate(capability as GraphCapability);

    return {
      available: true,
      status: evaluation.status,
      negativeClaimSafe: evaluation.negativeClaimSafe,
      reasons: evaluation.reasons,
    };
  };

  const fleetSnapshot = input.fleetSnapshot ?? null;

  const fleetImpactAnalyzer =
    input.includeFleet && fleetSnapshot ? new FleetImpactAnalyzer(fleetSnapshot) : null;

  const runtimeObservations = input.runtimeObservations ?? [];

  const readSource = boundedSourceReader(input.rootPath);

  return {
    projectId: input.projectId,
    rootPath: input.rootPath,
    generation: input.generation,
    ...(input.candidateGeneration ? { candidateGeneration: input.candidateGeneration } : {}),
    currentGeneration: input.currentGeneration ?? (() => input.generation),

    graph: {
      symbols: () => symbols,
      symbolById: (id) => symbolIndex.get(id),
      incoming: (symbolId, edgeTypes) =>
        edges.filter((edge) => edge.to === symbolId && edgeTypes.includes(edge.type)),
      outgoing: (symbolId, edgeTypes) =>
        edges.filter((edge) => edge.from === symbolId && edgeTypes.includes(edge.type)),
      allEdges: () => edges,
    },

    coverageAvailable,
    coverageFor,

    fleet: fleetSnapshot
      ? {
          generation: fleetSnapshot.generation,
          registeredProjects: fleetSnapshot.coverage.projects,
          staleProjects: fleetSnapshot.coverage.staleProjects,
          missingProjects: fleetSnapshot.coverage.missingProjects,
        }
      : null,

    crossService: input.crossServiceSnapshot
      ? {
          ambiguous: input.crossServiceSnapshot.stats.ambiguous,
          unresolved: input.crossServiceSnapshot.stats.unresolved,
          dynamic: input.crossServiceSnapshot.unresolved.filter((reference) =>
            String(reference.reason).toLowerCase().includes('dynamic')
          ).length,
          negativeClaimSafe:
            input.coverage?.available === true
              ? input.coverage.evaluate('cross_service_graph').negativeClaimSafe
              : false,
          reasons:
            input.coverage?.available === true
              ? input.coverage.evaluate('cross_service_graph').reasons
              : ['COVERAGE_UNAVAILABLE'],
        }
      : null,

    ...(input.includeRuntime
      ? {
          runtime: (symbolIds: readonly string[]): readonly ChangeRuntimeObservation[] => {
            const wanted = new Set(symbolIds);

            return runtimeObservations
              .filter(
                (observation) =>
                  (observation.sourceSymbolId !== undefined &&
                    wanted.has(observation.sourceSymbolId)) ||
                  (observation.targetSymbolId !== undefined &&
                    wanted.has(observation.targetSymbolId))
              )
              .map(toRuntimeObservation);
          },
        }
      : {}),

    ...(input.adr
      ? {
          adr: async (adrInput: { filePaths: string[]; symbols: string[] }) => input.adr!(adrInput),
        }
      : {}),

    parseCandidate: async (path: string) => {
      try {
        const parsed = await parseCodeFile(input.projectId, input.rootPath, path);
        return parsed.symbols.map(toChangeSymbol);
      } catch {
        return null;
      }
    },

    readSource,

    ...(fleetImpactAnalyzer
      ? {
          fleetImpact: (resourceIds: readonly string[]) => {
            const seen = new Set<string>();
            const out: Array<{
              projectId: string;
              depth: number;
              steps: Array<{ from: string; to: string; edgeType: string }>;
            }> = [];

            for (const resourceId of resourceIds) {
              const result = fleetImpactAnalyzer.analyze({
                projectId: input.projectId,
                resourceId,
              });

              for (const path of result.paths) {
                const key = `${path.projectId}:${path.depth}`;

                if (seen.has(key)) {
                  continue;
                }

                seen.add(key);

                out.push({
                  projectId: path.projectId,
                  depth: path.depth,
                  steps: path.steps.map((step) => ({
                    from: step.fromProjectId,
                    to: step.toProjectId,
                    edgeType: String(step.edgeType),
                  })),
                });
              }
            }

            return out;
          },
        }
      : {}),
  };
}
