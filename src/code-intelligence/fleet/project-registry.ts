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
   */
  async discover(): Promise<FleetProjectInput[]> {
    const [registry, folders] = await Promise.all([
      this.store.loadRegistry(),
      this.listRegisteredFolders(),
    ]);

    const byId = new Map<string, FleetRegistryEntry>();
    for (const entry of registry.projects) {
      byId.set(entry.projectId, entry);
    }

    const inputs: FleetProjectInput[] = [];
    const seen = new Set<string>();

    for (const { folder, manifest } of folders) {
      const entry = byId.get(manifest.id);
      const exportView = await this.loadExport(folder);

      inputs.push({
        projectId: manifest.id,
        name: entry?.name ?? manifest.name,
        remote: manifest.remote,
        ...(entry?.rootPath && existsSync(entry.rootPath) ? { rootPath: entry.rootPath } : {}),
        ...(entry?.pinnedGeneration ? { pinnedGeneration: entry.pinnedGeneration } : {}),
        export: exportView,
      });

      seen.add(manifest.id);
    }

    /* Registry entries without a physical manifest stay unavailable. */
    for (const entry of registry.projects) {
      if (seen.has(entry.projectId)) {
        continue;
      }
      inputs.push({
        projectId: entry.projectId,
        name: entry.name,
        ...(entry.remote ? { remote: entry.remote } : {}),
        ...(entry.rootPath && existsSync(entry.rootPath) ? { rootPath: entry.rootPath } : {}),
        ...(entry.pinnedGeneration ? { pinnedGeneration: entry.pinnedGeneration } : {}),
        export: null,
      });
    }

    return inputs.sort((left, right) => left.projectId.localeCompare(right.projectId));
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
