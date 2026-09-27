/*
 * Phase 77 — real daemon runtime dependencies.
 *
 * These are the production implementations of the injected dependency surface.
 * They reuse the existing index pipeline, Phase 76 artifact module and Phase 73
 * Fleet registry instead of duplicating any of that logic.
 */

import type { ProjectManifest } from '../core/types.js';

import { runProductionIndex } from '../production/index-pipeline.js';

import {
  CodeIntelligenceArtifactStore,
  artifactProjectContext,
  artifactStatus,
  hydrateArtifact,
} from '../code-intelligence/artifact/index.js';

import { FleetBuilder } from '../code-intelligence/fleet/fleet-builder.js';

import { FleetProjectRegistry } from '../code-intelligence/fleet/project-registry.js';

import { PersistentFleetStore } from '../code-intelligence/fleet/fleet-store.js';

import { LocalCodeIntelligenceRuntime } from '../code-intelligence/runtime/local-runtime.js';

import { daemonProjectStorage, daemonRootStorage } from '../code-intelligence/runtime/storage.js';

import type {
  DaemonHydrateResult,
  DaemonIndexResult,
  DaemonProjectRef,
  DaemonRuntimeDependencies,
} from './types.js';

function toManifest(project: DaemonProjectRef): ProjectManifest {
  const now = new Date().toISOString();

  return {
    id: project.id,
    name: project.name,
    rootPath: project.rootPath,
    ...(project.remote ? { remote: project.remote } : {}),
    createdAt: now,
    updatedAt: now,
    graphVersion: 1,
    memoryVersion: 1,
  };
}

export function createDaemonRuntimeDependencies(): DaemonRuntimeDependencies {
  const local = new LocalCodeIntelligenceRuntime();

  return {
    async probeLocalGraph(project) {
      return local.probeLocalGraph(project);
    },

    async loadProject(project) {
      const probe = await local.probeLocalGraph(project);

      if (!probe.present) {
        throw new Error('PROJECT_RUNTIME_FAILED: no local derived graph.');
      }

      return { generation: probe.generation ?? 'unknown' };
    },

    async indexProject(project, signal, report): Promise<DaemonIndexResult> {
      if (signal.aborted) {
        throw new Error('INDEX_CANCELLED');
      }

      const result = await runProductionIndex(toManifest(project), {
        onStage: (event) => {
          if (signal.aborted) {
            return;
          }

          report({
            kind: 'stage',
            stage: event.id,
            state: event.state,
            ...(event.durationMs !== undefined ? { durationMs: event.durationMs } : {}),
          });
        },

        onSourceProgress: (event) => {
          if (signal.aborted) {
            return;
          }

          report({
            kind: 'source',
            phase: event.phase,
            current: event.current,
            total: event.total,
            ...(event.file ? { file: event.file } : {}),
          });
        },

        onStageProgress: (event) => {
          if (signal.aborted) {
            return;
          }

          report({
            kind: 'stage-progress',
            stage: event.stage,
            current: event.current,
            total: event.total,
            ...(event.phase ? { phase: event.phase } : {}),
            ...(event.detail ? { detail: event.detail } : {}),
          });
        },
      });

      /* A cancelled job must never advertise the just-built generation. */
      if (signal.aborted) {
        throw new Error('INDEX_CANCELLED');
      }

      const probe = await local.probeLocalGraph(project);

      return {
        generation: probe.generation ?? 'unknown',
        files: result.files,
        symbols: result.graph.symbols,
        edges: result.graph.edges,
      };
    },

    async hydrateProject(project, signal): Promise<DaemonHydrateResult> {
      if (signal.aborted) {
        throw new Error('ARTIFACT_HYDRATION_FAILED');
      }

      const storage = daemonProjectStorage(project);

      const context = artifactProjectContext(project);

      const result = await hydrateArtifact(storage, context, {
        rootStorage: daemonRootStorage(),
        signal,
      });

      return {
        generation: result.generation,
        files: result.files,
        symbols: result.symbols,
        edges: result.edges,
        fleetRepinned: result.fleetRepinned,
      };
    },

    async artifactStatus(project) {
      const storage = daemonProjectStorage(project);

      return artifactStatus(storage, artifactProjectContext(project));
    },

    async evidenceProject(project, request) {
      return local.evidence(project, request);
    },

    async ingestTracesProject(project, input) {
      return local.ingestTraces(project, input);
    },

    async changeProject(project, input) {
      return local.change(project, input);
    },

    async contractProject(project, input) {
      return local.contract(project, input);
    },

    async selectTestsProject(project, input) {
      return local.testSelection(project, input);
    },

    async runTestsProject(project, input) {
      return local.runTests(project, input);
    },

    async testStatusProject(project, limit) {
      return local.testStatus(project, limit);
    },

    async queryProject(project, input) {
      return local.query(project, {
        query: input.query,
        scope: input.scope,
        ...(input.parameters ? { parameters: input.parameters } : {}),
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
        ...(input.cursor ? { cursor: input.cursor } : {}),
        ...(input.explain !== undefined ? { explain: input.explain } : {}),
      });
    },

    /**
     * Fleet relink: recompute the derived overlay from the registered sanitized
     * exports. Coalescing happens in the FleetCoordinator, so this runs once per
     * burst, never once per session or per project.
     */
    async refreshFleet(_projectIds: string[]): Promise<void> {
      const rootStorage = daemonRootStorage();

      try {
        const registry = new FleetProjectRegistry(rootStorage);

        const projects = await registry.discover();

        const built = new FleetBuilder().build({ projects });

        const store = new PersistentFleetStore(rootStorage);

        await store.saveSnapshot(built.snapshot);

        if (built.snapshot.coverage) {
          await store.saveCoverage(built.snapshot.coverage);
        }
      } catch {
        /* Fleet state is derived; a relink failure must never fail an index. */
      }
    },

    async releaseProject(projectId: string): Promise<void> {
      await local.releaseProject(projectId);
    },
  };
}

export { CodeIntelligenceArtifactStore };
