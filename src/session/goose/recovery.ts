import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncGooseSession } from './adapter.js';

export async function recoverGooseProject(
  project: ProjectManifest,

  storage: StorageProvider,

  limit = 100
) {
  const results = [];

  for (let i = 0; i < limit; i++) {
    const sessionId = `goose-recovery-${project.id}-${i}`;

    results.push(
      await syncGooseSession({
        project,
        storage,

        sessionId,

        cwd: project.rootPath,
      })
    );
  }

  return results;
}
