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

import { mapKiroHookToSessionEvents } from './event-mapper.js';

type JsonObject = Record<string, unknown>;

export interface KiroRuntimeResult {
  active: boolean;

  projectRoot?: string;

  sessionId?: string;

  captured: number;

  flushed: boolean;

  error?: string;
}

export interface KiroRuntimeDependencies {
  flushSession?: (project: ProjectManifest, sessionId: string, cwd: string) => Promise<void>;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeHookEvent(value: unknown): string {
  switch (text(value)) {
    case 'agentSpawn':
      return 'SessionStart';

    case 'userPromptSubmit':
      return 'UserPromptSubmit';

    case 'postToolUse':
      return 'PostToolUse';

    case 'stop':
      return 'Stop';

    default:
      return text(value) ?? '';
  }
}

function findProject(cwd: string): ProjectManifest | null {
  const root = findProjectRoot(cwd);

  if (!root) {
    return null;
  }

  /*
   * Do not let a Kiro hook initialize a ToolNet project implicitly.
   * Integration is active only for an already initialized ToolNet project.
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

function captureLocal(
  project: ProjectManifest,
  sessionId: string,
  cwd: string,
  input: JsonObject
): number {
  const events = mapKiroHookToSessionEvents(input, project);

  if (events.length === 0) {
    return 0;
  }

  const identity = createSessionIdentity(project, 'kiro', sessionId);

  const wal = new SessionWal(identity, {
    source: 'kiro',

    cwd,
  });

  const recorded = wal.append(events);

  /*
   * WAL is the crash-safe source of truth.
   * current.json is a local projection for fast continuity.
   */
  checkpointLocalSession(project, identity, recorded);

  return recorded.length;
}

export async function flushKiroSession(
  project: ProjectManifest,
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

    agent: 'kiro',

    nativeSessionId: sessionId,

    metadata: {
      source: 'kiro-hook',
    },

    eventContext: {
      source: 'kiro',

      cwd,
    },
  });

  await core.flush();
}

export async function handleKiroHookInput(
  input: JsonObject,
  dependencies: KiroRuntimeDependencies = {}
): Promise<KiroRuntimeResult> {
  const cwd = text(input.cwd);

  const sessionId = text(input.session_id);

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

  let captured = 0;

  try {
    /*
     * LOCAL FIRST.
     *
     * Every useful Kiro lifecycle event is fsync'd to ToolNet WAL before
     * any remote work is attempted. A failed remote provider must not
     * lose the current Kiro turn.
     */
    captured = captureLocal(project, sessionId, cwd, input);
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

  const hookEvent = normalizeHookEvent(input.hook_event_name);

  if (hookEvent === 'PostToolUse' || hookEvent === 'Stop') {
    try {
      refreshFastHandoffFromCurrent(project);
    } catch {
      // Derived continuity projection. Local WAL remains authoritative.
    }
  }

  if (hookEvent !== 'Stop') {
    return {
      active: true,

      projectRoot: project.rootPath,

      sessionId,

      captured,

      flushed: false,
    };
  }

  const flush = dependencies.flushSession ?? flushKiroSession;

  try {
    /*
     * Stop is the remote durability boundary.
     *
     * Pending events from SessionStart/UserPromptSubmit/PostToolUse plus
     * the final assistant response/session_idle are flushed together.
     */
    await flush(project, sessionId, cwd);

    return {
      active: true,

      projectRoot: project.rootPath,

      sessionId,

      captured,

      flushed: true,
    };
  } catch (error) {
    /*
     * Fail open.
     *
     * WAL is intentionally left pending so a later recovery/flush can
     * retry. Kiro itself must never fail because remote memory is down.
     */
    return {
      active: true,

      projectRoot: project.rootPath,

      sessionId,

      captured,

      flushed: false,

      error: error instanceof Error ? error.message : String(error),
    };
  }
}
