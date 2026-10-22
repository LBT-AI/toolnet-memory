import { existsSync, readdirSync, statSync } from 'node:fs';

import { join, resolve } from 'node:path';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncContinueSession, type ContinueSyncResult } from './adapter.js';

import { continueSessionsDirectory } from './config-paths.js';

import { readContinueSession } from './transcript.js';

interface Candidate {
  path: string;

  mtimeMs: number;
}

/**
 * Import Continue CLI session files that explicitly record this project's
 * workspace directory. Sessions from other projects are skipped.
 */
export async function recoverContinueProject(
  project: ProjectManifest,
  storage: StorageProvider,
  limit = 20
): Promise<ContinueSyncResult[]> {
  const directory = process.env.TOOLNET_CONTINUE_SESSIONS_DIR ?? continueSessionsDirectory();

  if (!existsSync(directory)) {
    return [];
  }

  const target = resolve(project.rootPath);

  const candidates: Candidate[] = [];

  for (const entry of readdirSync(directory)) {
    if (!entry.endsWith('.json')) {
      continue;
    }

    const path = join(directory, entry);

    try {
      if (!statSync(path).isFile()) {
        continue;
      }
    } catch {
      continue;
    }

    const session = readContinueSession(path);

    if (!session.workspaceDirectory || resolve(session.workspaceDirectory) !== target) {
      continue;
    }

    candidates.push({ path, mtimeMs: statSync(path).mtimeMs });
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const results: ContinueSyncResult[] = [];

  for (const candidate of candidates.slice(0, limit)) {
    results.push(
      await syncContinueSession({
        project,
        storage,
        sessionFile: candidate.path,
        cwd: project.rootPath,
      })
    );
  }

  return results;
}
