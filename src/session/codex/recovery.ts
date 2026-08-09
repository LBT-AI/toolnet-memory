import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { inspectCodexRollout, listCodexRollouts, pathBelongsToProject } from './discovery.js';

import { syncCodexSession } from './adapter.js';

export async function recoverCodexProject(
  project: ProjectManifest,

  storage: StorageProvider,

  limit = 100
) {
  const results = [];

  for (const rolloutPath of listCodexRollouts()) {
    const meta = inspectCodexRollout(rolloutPath);

    if (!meta.threadId || !meta.cwd) {
      continue;
    }

    if (!pathBelongsToProject(project.rootPath, meta.cwd)) {
      continue;
    }

    results.push(
      await syncCodexSession({
        project,
        storage,

        threadId: meta.threadId,

        rolloutPath,

        cwd: meta.cwd,
      })
    );

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}
