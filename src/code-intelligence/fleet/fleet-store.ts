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

/*
 * Phase 73 — Fleet state lives in its own namespace, never inside a project
 * namespace. It is derived state: rebuildable from project exports and never
 * a Memory/Task/Session authority.
 *
 *   fleet/
 *     registry.json
 *     graph/current.json
 *     coverage.json
 */
export class PersistentFleetStore {
  constructor(private readonly storage: StorageProvider) {}

  private static readonly REGISTRY_KEY = 'fleet/registry.json';
  private static readonly SNAPSHOT_KEY = 'fleet/graph/current.json';
  private static readonly COVERAGE_KEY = 'fleet/coverage.json';

  async loadRegistry(): Promise<FleetRegistryRecord> {
    const text = await this.storage.getText(PersistentFleetStore.REGISTRY_KEY);

    if (!text) {
      return { version: FLEET_SCHEMA_VERSION, updatedAt: new Date(0).toISOString(), projects: [] };
    }

    const parsed = JSON.parse(text) as FleetRegistryRecord;

    return {
      version: typeof parsed.version === 'number' ? parsed.version : FLEET_SCHEMA_VERSION,
      updatedAt:
        typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
      projects: Array.isArray(parsed.projects)
        ? [...parsed.projects].sort((left, right) => left.projectId.localeCompare(right.projectId))
        : [],
    };
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
    const text = await this.storage.getText(PersistentFleetStore.SNAPSHOT_KEY);

    if (!text) {
      return null;
    }

    return JSON.parse(text) as FleetSnapshot;
  }

  async saveSnapshot(snapshot: FleetSnapshot): Promise<void> {
    await this.storage.put(
      PersistentFleetStore.SNAPSHOT_KEY,
      JSON.stringify(snapshot, null, 2) + '\n',
      'application/json'
    );
  }

  async loadCoverage(): Promise<FleetSnapshot['coverage'] | null> {
    const text = await this.storage.getText(PersistentFleetStore.COVERAGE_KEY);

    if (!text) {
      return null;
    }

    return JSON.parse(text) as FleetSnapshot['coverage'];
  }

  async saveCoverage(coverage: FleetSnapshot['coverage']): Promise<void> {
    await this.storage.put(
      PersistentFleetStore.COVERAGE_KEY,
      JSON.stringify(coverage, null, 2) + '\n',
      'application/json'
    );
  }
}
