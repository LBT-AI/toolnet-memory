import type { StorageProvider } from './types.js';

import type { FleetProjectExport } from '../code-intelligence/fleet/types.js';

/*
 * Phase 73 — per-project Fleet export.
 *
 * This is project-scoped derived state (it belongs to one project), persisted
 * through the normal project-scoped provider so isolation is preserved:
 *
 *   projects/<projectId>/graph/fleet-export.json
 *
 * It is the ONLY project data the Fleet Builder is allowed to read.
 */
export class PersistentFleetExportStore {
  constructor(private readonly storage: StorageProvider) {}

  private key(projectId: string): string {
    return ['projects', projectId, 'graph', 'fleet-export.json'].join('/');
  }

  async load(projectId: string): Promise<FleetProjectExport | null> {
    const text = await this.storage.getText(this.key(projectId));

    if (!text) {
      return null;
    }

    return JSON.parse(text) as FleetProjectExport;
  }

  async save(exportView: FleetProjectExport): Promise<void> {
    await this.storage.put(
      this.key(exportView.projectId),
      JSON.stringify(exportView),
      'application/json'
    );
  }
}
