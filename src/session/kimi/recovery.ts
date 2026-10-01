import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncKimiSession } from './adapter.js';

export async function recoverKimiProject(
  project: ProjectManifest,

  storage: StorageProvider,

  limit = 100
) {
  const results = [];

  for (let i = 0; i < limit; i++) {
    const sessionId = `kimi-recovery-${project.id}-${i}`;

    results.push(
      await syncKimiSession({
        project,
        storage,

        sessionId,

        cwd: project.rootPath,
      })
    );
  }

  return results;
}
