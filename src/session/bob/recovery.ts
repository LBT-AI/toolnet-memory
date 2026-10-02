import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncBobSession } from './adapter.js';

export interface BobRecoveryOptions {
  projectRoot: string;

  sessionId?: string;

  limit?: number;
}

export interface BobRecoveryResult {
  project: string;

  sessions: number;

  imported: number;
}

export async function recoverBobProject(options: BobRecoveryOptions): Promise<BobRecoveryResult> {
  const project = new ProjectManager().detect(options.projectRoot);

  const config = loadConfig();

  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 3,
    }
  );

  const storage = new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  if (options.sessionId) {
    const result = await syncBobSession({
      project,
      storage,
      sessionId: options.sessionId,
      cwd: project.rootPath,
    });

    return {
      project: project.name,

      sessions: 1,

      imported: result.imported,
    };
  }

  return {
    project: project.name,

    sessions: 0,

    imported: 0,
  };
}
