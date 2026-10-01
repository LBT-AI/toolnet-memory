import type { StorageProvider } from '../../storage/types.js';

import { FLEET_SCHEMA_VERSION, type FleetSnapshot } from './types.js';

export interface FleetRegistryEntry {
  projectId: string;
  name: string;
  remote?: string;
  rootPath?: string;
  registeredAt: string;
  /** Generation observed the last time the fleet was (re)built. */
  pinnedGeneration?: string;
}

export interface FleetRegistryRecord {
  version: number;
  updatedAt: string;
  projects: FleetRegistryEntry[];
}

export type FleetStateErrorCode =
  | 'FLEET_REGISTRY_CORRUPT'
  | 'FLEET_SNAPSHOT_CORRUPT'
  | 'FLEET_COVERAGE_CORRUPT'
  | 'FLEET_SCHEMA_UNSUPPORTED';

export class FleetStateError extends Error {
  readonly code: FleetStateErrorCode;

  readonly statusCode: number;

  constructor(code: FleetStateErrorCode, message: string, statusCode = 422) {
    super(message);

    this.name = 'FleetStateError';

    this.code = code;

    this.statusCode = statusCode;
  }
}

export function isFleetStateError(value: unknown): value is FleetStateError {
  return value instanceof FleetStateError;
}

export type FleetRegistryState =
  | { status: 'absent' }
  | { status: 'current'; registry: FleetRegistryRecord }
  | { status: 'unsupported_schema'; version: number }
  | { status: 'corrupt'; reason: string };

export type FleetSnapshotState =
  | { status: 'missing' }
  | { status: 'current'; snapshot: FleetSnapshot }
  | { status: 'unsupported_schema'; version: number }
  | { status: 'corrupt'; reason: string };

export type FleetCoverageState =
  | { status: 'missing' }
  | { status: 'current'; coverage: FleetSnapshot['coverage'] }
  | { status: 'corrupt'; reason: string };

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/*
 * Phase 73 — Fleet state lives in its own namespace, never inside a project
 * namespace. It is derived state: rebuildable from project exports and never
 * a Memory/Task/Session authority.
 *
 *   fleet/
 *     registry.json
 *     graph/current.json
 *     coverage.json
 *
 * Phase 86E: reading never mutates, and every failure is classified precisely
 * (absent / missing / corrupt / unsupported) so `fleet_projects` can never
 * report a generic "unavailable" when the exact state is known.
 */
export class PersistentFleetStore {
  constructor(private readonly storage: StorageProvider) {}

  static readonly REGISTRY_KEY = 'fleet/registry.json';

  static readonly SNAPSHOT_KEY = 'fleet/graph/current.json';

  static readonly COVERAGE_KEY = 'fleet/coverage.json';

  /** Pure registry classification. Never writes. */
  async readRegistryState(): Promise<FleetRegistryState> {
    const text = await this.storage.getText(PersistentFleetStore.REGISTRY_KEY);

    if (!text) {
      return { status: 'absent' };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      return { status: 'corrupt', reason: 'json-unparseable' };
    }

    const value = record(parsed);

    if (!value) {
      return { status: 'corrupt', reason: 'not-an-object' };
    }

    const version = typeof value.version === 'number' ? value.version : FLEET_SCHEMA_VERSION;

    if (version > FLEET_SCHEMA_VERSION) {
      return { status: 'unsupported_schema', version };
    }

    if (!Array.isArray(value.projects)) {
      return { status: 'corrupt', reason: 'invalid-projects' };
    }

    const projects: FleetRegistryEntry[] = [];

    for (const entry of value.projects) {
      const item = record(entry);

      if (!item || typeof item.projectId !== 'string' || !item.projectId.trim()) {
        return { status: 'corrupt', reason: 'invalid-project-entry' };
      }

      projects.push({
        projectId: item.projectId,
        name: typeof item.name === 'string' && item.name.trim() ? item.name : item.projectId,
        ...(typeof item.remote === 'string' && item.remote ? { remote: item.remote } : {}),
        ...(typeof item.rootPath === 'string' && item.rootPath ? { rootPath: item.rootPath } : {}),
        registeredAt:
          typeof item.registeredAt === 'string' ? item.registeredAt : new Date(0).toISOString(),
        ...(typeof item.pinnedGeneration === 'string' && item.pinnedGeneration
          ? { pinnedGeneration: item.pinnedGeneration }
          : {}),
      });
    }

    return {
      status: 'current',
      registry: {
        version,
        updatedAt:
          typeof value.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString(),
        projects: projects.sort((left, right) => left.projectId.localeCompare(right.projectId)),
      },
    };
  }

  /** Pure snapshot classification. Never writes. */
  async readSnapshotState(): Promise<FleetSnapshotState> {
    const text = await this.storage.getText(PersistentFleetStore.SNAPSHOT_KEY);

    if (!text) {
      return { status: 'missing' };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      return { status: 'corrupt', reason: 'json-unparseable' };
    }

    const value = record(parsed);

    if (!value) {
      return { status: 'corrupt', reason: 'not-an-object' };
    }

    const version = typeof value.version === 'number' ? value.version : undefined;

    if (version !== undefined && version > FLEET_SCHEMA_VERSION) {
      return { status: 'unsupported_schema', version };
    }

    if (
      version !== FLEET_SCHEMA_VERSION ||
      typeof value.generation !== 'string' ||
      typeof value.fingerprint !== 'string' ||
      !Array.isArray(value.projects) ||
      !Array.isArray(value.edges) ||
      !Array.isArray(value.unresolved)
    ) {
      return { status: 'corrupt', reason: 'invalid-snapshot' };
    }

    const coverage = record(value.coverage);

    if (!coverage || typeof coverage.status !== 'string') {
      return { status: 'corrupt', reason: 'invalid-coverage' };
    }

    const stats = record(value.stats);

    if (!stats || typeof stats.registeredProjects !== 'number') {
      return { status: 'corrupt', reason: 'invalid-stats' };
    }

    return { status: 'current', snapshot: value as unknown as FleetSnapshot };
  }

  /** Pure coverage classification. Never writes. */
  async readCoverageState(): Promise<FleetCoverageState> {
    const text = await this.storage.getText(PersistentFleetStore.COVERAGE_KEY);

    if (!text) {
      return { status: 'missing' };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      return { status: 'corrupt', reason: 'json-unparseable' };
    }

    const value = record(parsed);

    if (!value || typeof value.status !== 'string' || !Array.isArray(value.projects)) {
      return { status: 'corrupt', reason: 'invalid-coverage' };
    }

    return { status: 'current', coverage: value as unknown as FleetSnapshot['coverage'] };
  }

  async loadRegistry(): Promise<FleetRegistryRecord> {
    const state = await this.readRegistryState();

    if (state.status === 'absent') {
      return { version: FLEET_SCHEMA_VERSION, updatedAt: new Date(0).toISOString(), projects: [] };
    }

    if (state.status === 'unsupported_schema') {
      throw new FleetStateError(
        'FLEET_SCHEMA_UNSUPPORTED',
        `Fleet registry version ${String(state.version)} is newer than this ToolNet build. The existing registry is preserved.`,
        409
      );
    }

    if (state.status === 'corrupt') {
      throw new FleetStateError(
        'FLEET_REGISTRY_CORRUPT',
        `Fleet registry is corrupt (${state.reason}). The existing registry is preserved.`
      );
    }

    return state.registry;
  }

  async saveRegistry(record: FleetRegistryRecord): Promise<void> {
    const normalised: FleetRegistryRecord = {
      version: FLEET_SCHEMA_VERSION,
      updatedAt: record.updatedAt,
      projects: [...record.projects].sort((left, right) =>
        left.projectId.localeCompare(right.projectId)
      ),
    };

    await this.storage.put(
      PersistentFleetStore.REGISTRY_KEY,
      JSON.stringify(normalised, null, 2) + '\n',
      'application/json'
    );
  }

  async loadSnapshot(): Promise<FleetSnapshot | null> {
    const state = await this.readSnapshotState();

    if (state.status === 'missing') {
      return null;
    }

    if (state.status === 'unsupported_schema') {
      throw new FleetStateError(
        'FLEET_SCHEMA_UNSUPPORTED',
        `Fleet snapshot version ${String(state.version)} is newer than this ToolNet build. The existing snapshot is preserved.`,
        409
      );
    }

    if (state.status === 'corrupt') {
      throw new FleetStateError(
        'FLEET_SNAPSHOT_CORRUPT',
        `Fleet snapshot is corrupt (${state.reason}). The existing snapshot is preserved.`
      );
    }

    return state.snapshot;
  }

  async saveSnapshot(snapshot: FleetSnapshot): Promise<void> {
    await this.storage.put(
      PersistentFleetStore.SNAPSHOT_KEY,
      JSON.stringify(snapshot, null, 2) + '\n',
      'application/json'
    );
  }

  async loadCoverage(): Promise<FleetSnapshot['coverage'] | null> {
    const state = await this.readCoverageState();

    if (state.status === 'missing') {
      return null;
    }

    if (state.status === 'corrupt') {
      throw new FleetStateError(
        'FLEET_COVERAGE_CORRUPT',
        `Fleet coverage is corrupt (${state.reason}). The existing coverage is preserved.`
      );
    }

    return state.coverage;
  }

  /**
   * Publish coverage for a specific snapshot generation.
   *
   * Phase 86E atomicity model: the snapshot is published first, then coverage
   * carrying the same generation. A reader therefore sees either the previous
   * (snapshot + coverage) pair, a new snapshot with stale coverage — which is
   * reported as `snapshot_stale`, never as `current` — or the new pair.
   */
  async saveCoverage(coverage: FleetSnapshot['coverage']): Promise<void> {
    await this.storage.put(
      PersistentFleetStore.COVERAGE_KEY,
      JSON.stringify(coverage, null, 2) + '\n',
      'application/json'
    );
  }
}
