import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncHermesSession } from './adapter.js';

export async function recoverHermesProject(
  project: ProjectManifest,

  storage: StorageProvider,

  limit = 100
) {
  const results = [];

  for (let i = 0; i < limit; i++) {
    const sessionId = `hermes-recovery-${project.id}-${i}`;

    results.push(
      await syncHermesSession({
        project,
        storage,

        sessionId,

        cwd: project.rootPath,
      })
    );
  }

  return results;
}
