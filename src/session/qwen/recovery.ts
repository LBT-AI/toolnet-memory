import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncQwenSession } from './adapter.js';

export async function recoverQwenProject(
  project: ProjectManifest,

  storage: StorageProvider,

  limit = 100
) {
  const results = [];

  for (let i = 0; i < limit; i++) {
    const sessionId = `qwen-recovery-${project.id}-${i}`;

    results.push(
      await syncQwenSession({
        project,
        storage,

        sessionId,

        cwd: project.rootPath,
      })
    );
  }

  return results;
}
