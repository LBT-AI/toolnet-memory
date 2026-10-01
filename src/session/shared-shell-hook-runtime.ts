import { existsSync } from 'node:fs';

import { join } from 'node:path';

import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

import { findProjectRoot } from '../work-continuity/fast-context.js';

import { SessionCore } from './core.js';

import type { ProjectManifest } from '../core/types.js';

export interface ShellHookCaptureOptions {
  agent: string;
  sessionId: string;
  cwd: string;
  transcriptPath?: string;
  turnId?: string;
  source?: string;
}

export interface ShellHookCaptureResult {
  active: boolean;
  projectRoot?: string;
  sessionId?: string;
  captured: number;
  flushed: boolean;
  materialized?: boolean;
  materializationStatus?: 'ok' | 'noop' | 'failed';
  materializationErrorCode?: string;
  error?: string;
}

function findProject(cwd: string): ProjectManifest | null {
  const root = findProjectRoot(cwd);

  if (!root) {
    return null;
  }

  if (!existsSync(join(root, '.toolnet', 'project.json'))) {
    return null;
  }

  try {
    return new ProjectManager().detect(root);
  } catch {
    return null;
  }
}

function storageFor(project: ProjectManifest) {
  const config = loadConfig();

  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 2,
    }
  );

  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}

export async function captureShellHookSession(
  options: ShellHookCaptureOptions
): Promise<ShellHookCaptureResult> {
  const { agent, sessionId, cwd, transcriptPath, turnId, source } = options;

  if (!cwd || !sessionId) {
    return {
      active: false,
      captured: 0,
      flushed: false,
    };
  }

  const project = findProject(cwd);

  if (!project) {
    return {
      active: false,
      captured: 0,
      flushed: false,
    };
  }

  try {
    const core = new SessionCore({
      project,
      storage: storageFor(project),
      agent,
      nativeSessionId: sessionId,
      metadata: {
        source: `${agent}-hook`,
      },
      eventContext: {
        source: agent,
        cwd,
      },
    });

    const flushResult = await core.flush();

    return {
      active: true,
      projectRoot: project.rootPath,
      sessionId,
      captured: 1,
      flushed: true,
      materialized: flushResult.materialization?.status !== 'failed',
      materializationStatus: flushResult.materialization?.status,
      materializationErrorCode: flushResult.materialization?.errorCode,
    };
  } catch (error) {
    return {
      active: true,
      projectRoot: project.rootPath,
      sessionId,
      captured: 0,
      flushed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
