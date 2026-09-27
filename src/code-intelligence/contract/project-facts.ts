/*
 * Phase 81 — shared contract facts builder.
 *
 * Produces the read-only ContractFacts surface consumed by the contract
 * pipeline. It is shared by the MCP layer and the daemon runtime so standalone
 * and daemon analyses observe identical generations, coverage and provenance.
 *
 * Baseline content is read with a strictly read-only `git show <rev>:<path>`
 * (external diff/textconv disabled, argument-array invocation, validated path).
 * Candidate content is read from the working tree inside the project root, with
 * sensitive files refused. Nothing is ever written.
 */

import { execFile } from 'node:child_process';

import { existsSync, readFileSync } from 'node:fs';

import { isAbsolute, normalize, resolve } from 'node:path';

import { promisify } from 'node:util';

import { isSensitiveFile } from '../../security/file-filter.js';

import { assertSafeRevision } from '../change/git-reader.js';

import { isPathContained, isSensitiveChangePath } from '../change/paths.js';

import { buildGraphSchema } from '../query-v2/index.js';

import { FleetImpactAnalyzer } from '../fleet/impact.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { GraphCapability } from '../graph-coverage/types.js';

import type { FleetSnapshot } from '../fleet/types.js';

import type { CrossServiceSnapshot } from '../cross-service/types.js';

import type { RuntimeObservation } from '../runtime-trace/index.js';

import type {
  ContractAdrConstraint,
  ContractCapabilityCoverage,
  ContractFacts,
  ContractFleetProjectImpact,
  ContractKind,
  ContractRuntimeObservation,
  ContractSymbol,
} from './types.js';

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 20_000;

export interface ContractCoverageProvider {
  available: boolean;
  evaluate(capability: GraphCapability): {
    status: string;
    negativeClaimSafe: boolean;
    reasons: string[];
  };
}

export interface ProjectContractFactsInput {
  projectId: string;
  rootPath: string;
  generation: string;
  candidateGeneration?: string;
  graph: CodeGraphStore;
  coverage?: ContractCoverageProvider | null;
  fleetSnapshot?: FleetSnapshot | null;
  crossServiceSnapshot?: CrossServiceSnapshot | null;
  runtimeObservations?: readonly RuntimeObservation[];
  changedFiles: readonly {
    path: string;
    kind: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  }[];
  /** Baseline revision for `git show`; defaults to HEAD. */
  baseRevision?: string;
  adr?: (input: { filePaths: string[]; symbols: string[] }) => Promise<ContractAdrConstraint[]>;
  includeRuntime?: boolean;
  includeFleet?: boolean;
  supportedKinds?: readonly ContractKind[];
  currentGeneration?: () => string;
  recheckSnapshot?: () => Promise<string>;
}

function toContractSymbol(symbol: {
  id: string;
  name: string;
  qualifiedName?: string;
  type: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  metadata?: Record<string, unknown>;
}): ContractSymbol {
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

function boundedCandidateReader(root: string): (path: string, maxBytes: number) => string | null {
  const absoluteRoot = resolve(root);

  return (path: string, maxBytes: number): string | null => {
    if (!isPathContained(path) || isSensitiveChangePath(path) || isAbsolute(path)) {
      return null;
    }

    const normalized = normalize(path).replaceAll('\\', '/');

    if (isSensitiveFile(normalized)) {
      return null;
    }

    const absolute = resolve(absoluteRoot, normalized);

    if (absolute !== absoluteRoot && !absolute.startsWith(`${absoluteRoot}/`)) {
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

/**
 * Bounded, read-only read of a project-contained file at a baseline revision.
 *
 * `git show <rev>:<path>` never mutates the repository and external diff/
 * textconv drivers are disabled, so a hostile repository config cannot execute
 * code. Returns null when the revision/path is invalid or the file is absent.
 */
export async function readBaselineFile(
  rootPath: string,
  revision: string,
  path: string,
  maxBytes: number
): Promise<string | null> {
  if (!isPathContained(path) || isSensitiveChangePath(path)) {
    return null;
  }

  let safeRevision: string;

  try {
    safeRevision = assertSafeRevision(revision.length > 0 ? revision : 'HEAD', 'base');
  } catch {
    return null;
  }

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['--no-pager', 'show', '--no-ext-diff', '--no-textconv', `${safeRevision}:${path}`],
      {
        cwd: rootPath,
        maxBuffer: Math.max(maxBytes, 1024 * 1024),
        timeout: GIT_TIMEOUT_MS,
        windowsHide: true,
        env: {
          ...process.env,
          GIT_EXTERNAL_DIFF: '',
          GIT_PAGER: 'cat',
        },
      }
    );

    return stdout.slice(0, maxBytes);
  } catch {
    return null;
  }
}

function producedCapabilities(): Map<string, Set<string>> {
  const produced = new Map<string, Set<string>>();

  try {
    const schema = buildGraphSchema();

    for (const edge of schema.edgeTypes) {
      if (!edge.currentlyProduced) {
        continue;
      }

      const capability = edge.capability ?? 'symbol_graph';

      const set = produced.get(capability) ?? new Set<string>();

      set.add(String(edge.name));

      produced.set(capability, set);
    }
  } catch {
    /* Reserved-capability honesty degrades to "no producer known". */
  }

  return produced;
}

function toRuntimeObservation(observation: RuntimeObservation): ContractRuntimeObservation {
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

export function buildProjectContractFacts(input: ProjectContractFactsInput): ContractFacts {
  const symbols = input.graph.allSymbols(input.projectId).map(toContractSymbol);
  const symbolIndex = new Map(symbols.map((symbol) => [symbol.id, symbol]));

  const edges = input.graph.allEdges(input.projectId).map((edge) => ({
    id: edge.id,
    type: String(edge.type),
    from: edge.from,
    to: edge.to,
  }));

  const coverageAvailable = Boolean(input.coverage?.available);

  const coverageFor = (capability: string): ContractCapabilityCoverage => {
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

  const produced = producedCapabilities();

  const fleetSnapshot = input.fleetSnapshot ?? null;

  const fleetImpactAnalyzer =
    input.includeFleet && fleetSnapshot ? new FleetImpactAnalyzer(fleetSnapshot) : null;

  const runtimeObservations = input.runtimeObservations ?? [];

  const kindByPath = new Map(input.changedFiles.map((file) => [file.path, file.kind]));

  const readCandidate = boundedCandidateReader(input.rootPath);

  const revision = input.baseRevision ?? 'HEAD';

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
    },

    coverageAvailable,
    coverageFor,

    capabilityProduced: (capability, edgeType) => {
      const set = produced.get(capability);

      if (!set) {
        return false;
      }

      return edgeType === undefined ? set.size > 0 : set.has(edgeType);
    },

    fleet: fleetSnapshot
      ? {
          ...(fleetSnapshot.generation ? { generation: fleetSnapshot.generation } : {}),
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

    changedPaths: () => input.changedFiles.map((file) => file.path),

    fileKind: (path) => kindByPath.get(path),

    ...(input.includeRuntime
      ? {
          runtime: (symbolIds: readonly string[]): readonly ContractRuntimeObservation[] => {
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

    readBaseline: (path: string, maxBytes: number) =>
      readBaselineFile(input.rootPath, revision, path, maxBytes),

    readCandidate,

    ...(input.supportedKinds ? { supportedKinds: () => input.supportedKinds! } : {}),

    ...(input.recheckSnapshot ? { recheckSnapshot: input.recheckSnapshot } : {}),

    ...(fleetImpactAnalyzer
      ? {
          fleetImpact: (resourceIds: readonly string[]): readonly ContractFleetProjectImpact[] => {
            const seen = new Set<string>();

            const out: ContractFleetProjectImpact[] = [];

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
