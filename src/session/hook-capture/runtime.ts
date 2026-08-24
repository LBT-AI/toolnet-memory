import { existsSync } from 'node:fs';

import { join } from 'node:path';

import { loadConfig, ProjectManager } from '../../core/index.js';

import type { ProjectManifest } from '../../core/types.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { findProjectRoot } from '../../work-continuity/fast-context.js';

import { refreshFastHandoffFromCurrent } from '../../work-continuity/handoff-refresh.js';

import { SessionCore } from '../core.js';

import { createSessionIdentity } from '../identity.js';

import { checkpointLocalSession } from '../local-checkpoint.js';

import { SessionWal } from '../wal.js';

import {
  mapNormalizedHookToSessionEvents,
  type HookCaptureAgent,
  type NormalizedHookInput,
} from './event-mapper.js';

export interface HookCaptureRuntimeResult {
  active: boolean;

  projectRoot?: string;

  sessionId?: string;

  captured: number;

  flushed: boolean;

  error?: string;
}

export interface HookCaptureRuntimeDependencies {
  flushSession?: (
    project: ProjectManifest,
    agent: HookCaptureAgent,
    sessionId: string,
    cwd: string
  ) => Promise<void>;
}

function findProject(cwd: string): ProjectManifest | null {
  const root = findProjectRoot(cwd);

  if (!root) {
    return null;
  }

  /*
   * Hooks must never initialize ToolNet implicitly.
   */
  if (!existsSync(join(root, '.toolnet', 'project.json'))) {
    return null;
  }

  try {
    return new ProjectManager().detect(root);
  } catch {
    return null;
  }
}

function captureLocal(project: ProjectManifest, input: NormalizedHookInput): number {
  const events = mapNormalizedHookToSessionEvents(input, project);

  if (events.length === 0) {
    return 0;
  }

  const identity = createSessionIdentity(project, input.agent, input.sessionId);

  const wal = new SessionWal(identity, {
    source: input.agent,
    cwd: input.cwd,
  });

  const recorded = wal.append(events);

  checkpointLocalSession(project, identity, recorded);

  return recorded.length;
}

export async function flushHookCaptureSession(
  project: ProjectManifest,
  agent: HookCaptureAgent,
  sessionId: string,
  cwd: string
): Promise<void> {
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

  const storage = new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  const core = new SessionCore({
    project,
    storage,
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

  await core.flush();
}

export async function handleNormalizedHookInput(
  input: NormalizedHookInput,
  dependencies: HookCaptureRuntimeDependencies = {}
): Promise<HookCaptureRuntimeResult> {
  if (!input.cwd || !input.sessionId) {
    return {
      active: false,
      captured: 0,
      flushed: false,
    };
  }

  const project = findProject(input.cwd);

  if (!project) {
    return {
      active: false,
      captured: 0,
      flushed: false,
    };
  }

  let captured = 0;

  try {
    /*
     * LOCAL FIRST:
     * fsync to WAL before any remote work.
     */
    captured = captureLocal(project, input);
  } catch (error) {
    return {
      active: true,
      projectRoot: project.rootPath,
      sessionId: input.sessionId,
      captured: 0,
      flushed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (
    input.event === 'PostToolUse' ||
    input.event === 'AssistantMessage' ||
    input.event === 'Stop'
  ) {
    try {
      refreshFastHandoffFromCurrent(project);
    } catch {
      // Derived continuity projection; WAL remains authoritative.
    }
  }

  if (input.event !== 'Stop') {
    return {
      active: true,
      projectRoot: project.rootPath,
      sessionId: input.sessionId,
      captured,
      flushed: false,
    };
  }

  const flush = dependencies.flushSession ?? flushHookCaptureSession;

  try {
    await flush(project, input.agent, input.sessionId, input.cwd);

    return {
      active: true,
      projectRoot: project.rootPath,
      sessionId: input.sessionId,
      captured,
      flushed: true,
    };
  } catch (error) {
    /*
     * Fail open. Pending WAL remains available for later recovery.
     */
    return {
      active: true,
      projectRoot: project.rootPath,
      sessionId: input.sessionId,
      captured,
      flushed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
