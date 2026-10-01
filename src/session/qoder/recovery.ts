import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncQoderSession } from './adapter.js';

export async function recoverQoderProject(
  project: ProjectManifest,

  storage: StorageProvider,

  limit = 100
) {
  const results = [];

  for (let i = 0; i < limit; i++) {
    const sessionId = `qoder-recovery-${project.id}-${i}`;

    results.push(
      await syncQoderSession({
        project,
        storage,

        sessionId,

        cwd: project.rootPath,
      })
    );
  }

  return results;
}
