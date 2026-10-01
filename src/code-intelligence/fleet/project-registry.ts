import { existsSync } from 'node:fs';

import type { StorageProvider } from '../../storage/types.js';

import { normalizeGitRemote } from '../../core/project-identity.js';

import { redactUrl } from '../cross-service/endpoint-normalizer.js';

import type { FleetProjectExport, FleetProjectInput } from './types.js';

import { PersistentFleetStore, type FleetRegistryEntry } from './fleet-store.js';

interface RemoteProjectManifest {
  id: string;
  name: string;
  remote: string;
}

const MANIFEST_PATTERN = /^projects\/([^/]+)\/project\.json$/u;

export function fleetExportKey(folder: string): string {
  /* mapProjectStoragePath moves graph/ under code/graph/. */
  return `projects/${folder}/code/graph/fleet-export.json`;
}

/**
 * Bounded project registry.
 *
 * Discovery is limited to ToolNet-owned storage: projects/<folder>/project.json.
 * The filesystem is never scanned and no repository is ever cloned.
 */
export class FleetProjectRegistry {
  private readonly store: PersistentFleetStore;

  constructor(private readonly storage: StorageProvider) {
    this.store = new PersistentFleetStore(storage);
  }

  async listRegisteredFolders(): Promise<
    Array<{ folder: string; manifest: RemoteProjectManifest }>
  > {
    let objects: Array<{ key: string }> = [];

    try {
      objects = await this.storage.list('projects/');
    } catch {
      return [];
    }

    const folders: Array<{ folder: string; manifest: RemoteProjectManifest }> = [];

    for (const object of objects) {
      const match = MANIFEST_PATTERN.exec(object.key);
      if (!match) {
        continue;
      }

      const text = await this.storage.getText(object.key);
      if (!text) {
        continue;
      }

      try {
        const manifest = JSON.parse(text) as Partial<RemoteProjectManifest>;
        if (typeof manifest.id === 'string' && manifest.id.trim()) {
          folders.push({
            folder: match[1],
            manifest: {
              id: manifest.id,
              name:
                typeof manifest.name === 'string' && manifest.name.trim()
                  ? manifest.name
                  : match[1],
              remote:
                typeof manifest.remote === 'string' && manifest.remote.trim()
                  ? manifest.remote
                  : match[1],
            },
          });
        }
      } catch {
        continue;
      }
    }

    return folders.sort((left, right) => left.manifest.id.localeCompare(right.manifest.id));
  }

  async loadExport(folder: string): Promise<FleetProjectExport | null> {
    const text = await this.storage.getText(fleetExportKey(folder));
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text) as FleetProjectExport;
    } catch {
      return null;
    }
  }

  /**
   * Registered projects, enriched from the registry record and the persisted
   * per-project exports.
   *
   * Phase 86E registry authority: when the registry has at least one entry, it
   * is the ONLY source of Fleet membership. Physical project folders that were
   * never registered are not silently promoted into the user's Fleet. When the
   * registry is empty (never configured), discovery falls back to the physical
   * folders so a fresh single-project setup still works — the state inspector
   * reports that fallback explicitly as `registry_empty`.
   */
  async discover(): Promise<FleetProjectInput[]> {
    const [registry, folders] = await Promise.all([
      this.store.loadRegistry(),
      this.listRegisteredFolders(),
    ]);

    const foldersById = new Map<string, { folder: string; name: string; remote: string }>();

    for (const { folder, manifest } of folders) {
      foldersById.set(manifest.id, { folder, name: manifest.name, remote: manifest.remote });
    }

    if (registry.projects.length === 0) {
      const legacy: FleetProjectInput[] = [];

      for (const { folder, manifest } of folders) {
        legacy.push({
          projectId: manifest.id,
          name: manifest.name,
          remote: manifest.remote,
          export: await this.loadExport(folder),
        });
      }

      return legacy.sort((left, right) => left.projectId.localeCompare(right.projectId));
    }

    const inputs: FleetProjectInput[] = [];

    for (const entry of registry.projects) {
      const located = foldersById.get(entry.projectId);

      inputs.push({
        projectId: entry.projectId,
        name: entry.name ?? located?.name ?? entry.projectId,
        ...((entry.remote ?? located?.remote) ? { remote: entry.remote ?? located?.remote } : {}),
        ...(entry.rootPath && existsSync(entry.rootPath) ? { rootPath: entry.rootPath } : {}),
        ...(entry.pinnedGeneration ? { pinnedGeneration: entry.pinnedGeneration } : {}),
        /* A registered project without a physical manifest stays unavailable. */
        export: located ? await this.loadExport(located.folder) : null,
      });
    }

    return inputs.sort((left, right) => left.projectId.localeCompare(right.projectId));
  }

  /**
   * Physical project folders that are not part of the registered Fleet.
   * Reported (counted) by status surfaces, never silently promoted.
   */
  async unregisteredFolders(): Promise<string[]> {
    const [registry, folders] = await Promise.all([
      this.store.loadRegistry(),
      this.listRegisteredFolders(),
    ]);

    if (registry.projects.length === 0) {
      return [];
    }

    const registered = new Set(registry.projects.map((entry) => entry.projectId));

    return folders
      .filter(({ manifest }) => !registered.has(manifest.id))
      .map(({ manifest }) => manifest.id)
      .sort((left, right) => left.localeCompare(right));
  }

  async register(entry: {
    projectId: string;
    name: string;
    remote?: string;
    rootPath?: string;
    pinnedGeneration?: string;
  }): Promise<void> {
    const registry = await this.store.loadRegistry();
    const now = new Date().toISOString();

    const projects = registry.projects.filter((item) => item.projectId !== entry.projectId);
    const existing = registry.projects.find((item) => item.projectId === entry.projectId);

    /* Registry metadata must never retain credentials from a Git URL. */
    const remote = entry.remote
      ? (normalizeGitRemote(entry.remote) ?? redactUrl(entry.remote))
      : undefined;

    projects.push({
      projectId: entry.projectId,
      name: entry.name,
      ...(remote ? { remote } : {}),
      ...(entry.rootPath ? { rootPath: entry.rootPath } : {}),
      registeredAt: existing?.registeredAt ?? now,
      ...(entry.pinnedGeneration ? { pinnedGeneration: entry.pinnedGeneration } : {}),
    });

    await this.store.saveRegistry({ version: registry.version, updatedAt: now, projects });
  }

  async unregister(projectId: string): Promise<void> {
    const registry = await this.store.loadRegistry();
    const projects = registry.projects.filter((item) => item.projectId !== projectId);

    if (projects.length === registry.projects.length) {
      return;
    }

    await this.store.saveRegistry({
      version: registry.version,
      updatedAt: new Date().toISOString(),
      projects,
    });
  }

  store_(): PersistentFleetStore {
    return this.store;
  }
}
