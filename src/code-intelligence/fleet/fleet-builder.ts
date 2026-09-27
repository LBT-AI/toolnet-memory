import { existsSync } from 'node:fs';

import {
  FLEET_SCHEMA_VERSION,
  type FleetBuildResult,
  type FleetCoverageReason,
  type FleetProjectExport,
  type FleetProjectInput,
  type FleetProjectRef,
  type FleetSnapshot,
  type UnresolvedCrossProjectReference,
} from './types.js';

import { CrossProjectLinker, compareEdges, compareUnresolved } from './cross-project-linker.js';

import { fleetFingerprint, fleetGenerationFromFingerprint } from './fingerprint.js';

function resolveAvailability(input: FleetProjectInput): FleetProjectRef['availability'] {
  if (!input.export) {
    return 'unavailable';
  }
  if (input.rootPath && existsSync(input.rootPath)) {
    return 'available';
  }
  return 'derived';
}

/**
 * Phase 73 — Fleet Builder.
 *
 * Builds the derived cross-project overlay. It never mutates a project graph
 * and never reads project-internal storage directly: it consumes the sanitized
 * `FleetProjectExport` views supplied by the caller.
 */
export class FleetBuilder {
  constructor(private readonly linker: CrossProjectLinker = new CrossProjectLinker()) {}

  build(input: { projects: readonly FleetProjectInput[] }): FleetBuildResult {
    const sorted = [...input.projects].sort((left, right) =>
      left.projectId.localeCompare(right.projectId)
    );

    const refs: FleetProjectRef[] = [];
    const staleProjects: string[] = [];
    const missingProjects: string[] = [];

    for (const project of sorted) {
      const availability = resolveAvailability(project);
      const exportView: FleetProjectExport | null = project.export;

      const stale =
        exportView !== null &&
        project.pinnedGeneration !== undefined &&
        project.pinnedGeneration !== exportView.generation;

      if (availability === 'unavailable') {
        missingProjects.push(project.projectId);
      }

      if (stale) {
        staleProjects.push(project.projectId);
      }

      refs.push({
        projectId: project.projectId,
        name: project.name,
        ...(project.remote ? { remoteIdentity: project.remote } : {}),
        availability,
        graphGeneration: exportView?.generation ?? 'unavailable',
        graphFingerprint: exportView?.graphFingerprint ?? '',
        updatedAt: exportView?.indexedAt ?? new Date(0).toISOString(),
        stale,
      });
    }

    const fingerprint = fleetFingerprint({
      schemaVersion: FLEET_SCHEMA_VERSION,
      projectGenerations: refs.map((ref) => `${ref.projectId}:${ref.graphGeneration}`),
    });

    const generation = fleetGenerationFromFingerprint(fingerprint);

    const linkable = sorted
      .filter((project) => {
        const ref = refs.find((item) => item.projectId === project.projectId);
        return (
          project.export !== null &&
          ref !== undefined &&
          !ref.stale &&
          ref.availability !== 'unavailable'
        );
      })
      .map((project) => ({
        ref: refs.find((item) => item.projectId === project.projectId)!,
        export: project.export!,
      }));

    const linked = this.linker.link({ projects: linkable, generation });

    const unresolved: UnresolvedCrossProjectReference[] = [...linked.unresolved].sort(
      compareUnresolved
    );

    const coverage = this.buildCoverage({
      refs,
      staleProjects,
      missingProjects,
      unresolved,
      crossServiceIncomplete: sorted
        .filter((project) => project.export !== null)
        .filter((project) => project.export!.crossServiceComplete === false)
        .map((project) => project.projectId),
    });

    const crossProjectEdgesByType: Record<string, number> = {};
    for (const edge of linked.edges) {
      crossProjectEdgesByType[edge.type] = (crossProjectEdgesByType[edge.type] ?? 0) + 1;
    }

    const snapshot: FleetSnapshot = {
      version: FLEET_SCHEMA_VERSION,
      generation,
      fingerprint,
      indexedAt: new Date().toISOString(),
      projects: refs,
      edges: [...linked.edges].sort(compareEdges),
      unresolved,
      coverage,
      stats: {
        registeredProjects: refs.length,
        availableProjects: refs.filter((ref) => ref.availability !== 'unavailable').length,
        staleProjects: staleProjects.length,
        crossProjectEdges: linked.edges.length,
        crossProjectEdgesByType: Object.fromEntries(
          Object.entries(crossProjectEdgesByType).sort(([left], [right]) =>
            left.localeCompare(right)
          )
        ),
        unresolved: unresolved.length,
      },
    };

    return { snapshot, staleProjects, missingProjects };
  }

  private buildCoverage(input: {
    refs: readonly FleetProjectRef[];
    staleProjects: readonly string[];
    missingProjects: readonly string[];
    unresolved: readonly UnresolvedCrossProjectReference[];
    crossServiceIncomplete: readonly string[];
  }): FleetSnapshot['coverage'] {
    const reasons = new Set<FleetCoverageReason>();

    if (input.refs.length === 0) {
      reasons.add('FLEET_EMPTY');
      return {
        status: 'unavailable',
        negativeClaimSafe: false,
        reasons: [...reasons].sort(),
        projects: [],
        missingProjects: [],
        staleProjects: [],
      };
    }

    if (input.missingProjects.length > 0) {
      reasons.add('FLEET_PROJECT_UNAVAILABLE');
    }

    if (input.staleProjects.length > 0) {
      reasons.add('FLEET_PROJECT_STALE');
    }

    if (input.crossServiceIncomplete.length > 0) {
      reasons.add('FLEET_CROSS_SERVICE_PARTIAL');
    }

    for (const reference of input.unresolved) {
      if (reference.reason === 'AMBIGUOUS_CROSS_PROJECT_ENDPOINT') {
        reasons.add('FLEET_CROSS_REPO_AMBIGUOUS');
      } else if (reference.reason === 'UNKNOWN_HOST') {
        reasons.add('FLEET_HOST_UNKNOWN');
      } else if (reference.type === 'CROSS_PACKAGE_DEPENDS_ON') {
        reasons.add('FLEET_SHARED_PACKAGE_UNRESOLVED');
      } else {
        reasons.add('FLEET_CROSS_REPO_UNRESOLVED');
      }
    }

    const partial = reasons.size > 0;

    return {
      status: partial ? 'partial' : 'complete',
      negativeClaimSafe: !partial,
      reasons: [...reasons].sort(),
      projects: input.refs.map((ref) => ref.projectId),
      missingProjects: [...input.missingProjects].sort(),
      staleProjects: [...input.staleProjects].sort(),
    };
  }
}
