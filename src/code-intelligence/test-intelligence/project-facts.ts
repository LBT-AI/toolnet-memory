/*
 * Phase 82 — shared test-intelligence facts builder.
 *
 * Produces the read-only TestSelectionFacts surface consumed by the selection
 * and verification pipelines. Shared by the MCP layer and the daemon runtime so
 * standalone and daemon results are equivalent.
 *
 * It consumes the Phase 80 change report and the Phase 81 contract report — it
 * never re-reads git and never re-parses a change. Source reads are bounded and
 * project-contained, and sensitive files are refused. Nothing is ever written.
 */

import { existsSync, readFileSync } from 'node:fs';

import { isAbsolute, normalize, resolve } from 'node:path';

import { isSensitiveFile } from '../../security/file-filter.js';

import { isPathContained, isSensitiveChangePath } from '../change/paths.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { GraphCapability } from '../graph-coverage/types.js';

import type { FleetSnapshot } from '../fleet/types.js';

import type { RuntimeObservation } from '../runtime-trace/index.js';

import type { ContractIntelligenceReport } from '../contract/types.js';

import type { ChangeIntelligenceReport } from '../change/types.js';

import type {
  FleetTestRef,
  TestAdrConstraint,
  TestCapabilityCoverage,
  TestChangedEntity,
  TestContractChange,
  TestFacts,
  TestFramework,
  TestRuntimeObservation,
} from './types.js';

export interface TestCoverageProvider {
  available: boolean;
  evaluate(capability: GraphCapability): {
    status: string;
    negativeClaimSafe: boolean;
    reasons: string[];
  };
}

export interface ProjectTestFactsInput {
  projectId: string;
  rootPath: string;
  generation: string;
  candidateGeneration?: string;
  graph: CodeGraphStore;
  coverage?: TestCoverageProvider | null;
  fleetSnapshot?: FleetSnapshot | null;
  runtimeObservations?: readonly RuntimeObservation[];
  change?: ChangeIntelligenceReport | null;
  contract?: ContractIntelligenceReport | null;
  adr?: (input: { filePaths: string[]; symbols: string[] }) => Promise<TestAdrConstraint[]>;
  adrConstraints?: readonly TestAdrConstraint[];
  fleetTests?: (resourceIds: readonly string[]) => readonly FleetTestRef[] | null;
  includeRuntime?: boolean;
  includeFleet?: boolean;
  currentGeneration?: () => string;
  recheckSnapshot?: () => Promise<string>;
  runnerPlan?: (
    framework: TestFramework,
    testPath: string
  ) => { command: string; args: string[] } | null;
}

function boundedReader(rootPath: string): (path: string, maxBytes: number) => string | null {
  const root = resolve(rootPath);

  return (path: string, maxBytes: number): string | null => {
    if (!isPathContained(path) || isSensitiveChangePath(path) || isAbsolute(path)) {
      return null;
    }

    const normalized = normalize(path).replaceAll('\\', '/');

    if (isSensitiveFile(normalized)) {
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

function toRuntimeObservation(observation: RuntimeObservation): TestRuntimeObservation {
  return {
    id: observation.id,
    kind: String(observation.kind),
    validation: String(observation.validation),
    observationCount: observation.observationCount,
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

/** Project the Phase 80 change report into the selection's changed entities. */
export function changedEntitiesFromChange(
  change: ChangeIntelligenceReport | null | undefined
): TestChangedEntity[] {
  if (!change) {
    return [];
  }

  return change.changedEntities
    .map((entity) => ({
      id: entity.id,
      ...(entity.symbolId ? { symbolId: entity.symbolId } : {}),
      ...(entity.name ? { name: entity.name } : {}),
      ...(entity.qualifiedName ? { qualifiedName: entity.qualifiedName } : {}),
      filePath: entity.filePath,
      publicSurface: entity.publicSurface,
      semantic: [...entity.semantic],
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Project the Phase 81 contract report into contract changes and resolve the
 * graph nodes each contract maps onto (exact identity / source path only).
 */
export function contractChangesFromReport(
  contract: ContractIntelligenceReport | null | undefined,
  graph: CodeGraphStore,
  projectId: string
): TestContractChange[] {
  if (!contract) {
    return [];
  }

  const symbols = graph.allSymbols(projectId);

  return contract.changes
    .map((delta) => {
      const symbolIds = [
        ...new Set(
          symbols
            .filter(
              (symbol) =>
                symbol.name === delta.identity ||
                symbol.qualifiedName === delta.identity ||
                (symbol.filePath === delta.sourcePath && symbol.type !== 'file')
            )
            .map((symbol) => symbol.id)
        ),
      ].sort();

      return {
        contractId: delta.contractId,
        kind: delta.kind,
        identity: delta.identity,
        compatibility: delta.compatibility,
        sourcePaths: [delta.sourcePath],
        symbolIds,
      };
    })
    .sort((left, right) => left.contractId.localeCompare(right.contractId));
}

export function buildProjectTestFacts(input: ProjectTestFactsInput): TestFacts {
  const symbols = input.graph.allSymbols(input.projectId).map((symbol) => ({
    id: symbol.id,
    name: symbol.name,
    ...(symbol.qualifiedName ? { qualifiedName: symbol.qualifiedName } : {}),
    type: String(symbol.type),
    filePath: symbol.filePath,
  }));

  const symbolIndex = new Map(symbols.map((symbol) => [symbol.id, symbol]));

  const edges = input.graph.allEdges(input.projectId).map((edge) => ({
    id: edge.id,
    type: String(edge.type),
    from: edge.from,
    to: edge.to,
  }));

  const coverageAvailable = Boolean(input.coverage?.available);

  const coverageFor = (capability: string): TestCapabilityCoverage => {
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

  const runtimeObservations = input.runtimeObservations ?? [];

  const changedEntities = changedEntitiesFromChange(input.change);

  const contractChanges = contractChangesFromReport(input.contract, input.graph, input.projectId);

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

    fleet: fleetSnapshot
      ? {
          ...(fleetSnapshot.generation ? { generation: fleetSnapshot.generation } : {}),
          registeredProjects: fleetSnapshot.coverage.projects,
          staleProjects: fleetSnapshot.coverage.staleProjects,
          missingProjects: fleetSnapshot.coverage.missingProjects,
        }
      : null,

    changedEntities,
    ...(input.change?.fingerprint ? { changeFingerprint: input.change.fingerprint } : {}),
    contractChanges,
    ...(input.contract?.fingerprint ? { contractFingerprint: input.contract.fingerprint } : {}),

    ...(input.includeRuntime
      ? {
          runtime: (symbolIds: readonly string[]): readonly TestRuntimeObservation[] => {
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

    ...(input.fleetTests ? { fleetTests: input.fleetTests } : {}),

    ...(input.adr
      ? {
          adr: async (adrInput: { filePaths: string[]; symbols: string[] }) => input.adr!(adrInput),
        }
      : {}),

    adrConstraints: [...(input.adrConstraints ?? [])].sort((left, right) =>
      left.id.localeCompare(right.id)
    ),

    readSource: boundedReader(input.rootPath),

    ...(input.runnerPlan ? { runnerPlan: input.runnerPlan } : {}),

    ...(input.recheckSnapshot ? { recheckSnapshot: input.recheckSnapshot } : {}),
  };
}
