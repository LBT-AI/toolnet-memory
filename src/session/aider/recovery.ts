import { existsSync, readdirSync } from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncAiderSession } from './adapter.js';

export async function recoverAiderProject(
  project: ProjectManifest,
  storage: StorageProvider,
  limit = 100
) {
  const results: Array<{
    sessionId: string;
    imported: number;
    eventCount: number;
    chunkCount: number;
    status: string;
    reset: boolean;
  }> = [];

  const toolnetHome = process.env.TOOLNET_HOME ?? join(project.rootPath, '.toolnet');
  const historyDir = join(toolnetHome, 'aider-history');

  if (!existsSync(historyDir)) {
    return results;
  }

  const entries = readdirSync(historyDir)
    .filter((entry) => entry.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, limit);

  for (const entry of entries) {
    const sessionId = entry.replace(/\.md$/, '');
    const historyPath = join(historyDir, entry);

    results.push(
      await syncAiderSession({
        project,
        storage,
        sessionId,
        cwd: project.rootPath,
        historyPath,
      })
    );
  }

  return results;
}
