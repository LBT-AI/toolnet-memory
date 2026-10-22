import { existsSync, readFileSync } from 'node:fs';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncJunieSession, type JunieSyncResult } from './adapter.js';

import { junieSessionStateFile } from './config-paths.js';

/**
 * Recover the currently open Junie session, if the hook marker exists.
 * Junie does not expose a transcript file, so closed sessions cannot be
 * reconstructed later; recovery is limited to what the hook state proves.
 */
export async function recoverJunieProject(
  project: ProjectManifest,
  storage: StorageProvider
): Promise<JunieSyncResult[]> {
  const stateFile = junieSessionStateFile(project.rootPath);

  if (!existsSync(stateFile)) {
    return [];
  }

  let state: { sessionId?: unknown; cwd?: unknown };

  try {
    state = JSON.parse(readFileSync(stateFile, 'utf8')) as typeof state;
  } catch {
    return [];
  }

  const sessionId = typeof state.sessionId === 'string' ? state.sessionId : '';

  if (!sessionId) {
    return [];
  }

  const result = await syncJunieSession({
    project,
    storage,
    sessionId,
    cwd: typeof state.cwd === 'string' && state.cwd ? state.cwd : project.rootPath,
    event: 'SessionEnd',
  });

  return [result];
}
