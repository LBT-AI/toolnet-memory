import { existsSync, readFileSync, readdirSync } from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { LocalSessionState, SessionAgent } from '../session/types.js';

import { loadLocalWorkState } from '../work-continuity/local-work-state.js';

export type CaptureSyncHealth = 'healthy' | 'pending' | 'degraded' | 'unknown';

export interface SessionCaptureHealth {
  ok: boolean;

  agents: SessionAgent[];

  sessions: number;

  latestAgent?: SessionAgent;

  latestSessionId?: string;

  lastCaptureAt?: string;

  lastFlushAt?: string;

  pendingWal: number;

  currentTask?: string;

  currentFile?: string;

  syncHealth: CaptureSyncHealth;

  opencode?: {
    state?: string;
    reason?: string;
    timestamp?: string;
    error?: string;
  };
}

interface OpenCodeStatus {
  timestamp?: string;
  projectRoot?: string;
  state?: string;
  reason?: string;
  error?: string;
}

function readJson<T>(file: string): T | null {
  if (!existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

function sessionStates(project: ProjectManifest): LocalSessionState[] {
  const root = join(project.rootPath, '.toolnet', 'sessions');

  if (!existsSync(root)) {
    return [];
  }

  const output: LocalSessionState[] = [];

  for (const agentEntry of readdirSync(root, { withFileTypes: true })) {
    if (!agentEntry.isDirectory()) {
      continue;
    }

    const agentRoot = join(root, agentEntry.name);

    for (const sessionEntry of readdirSync(agentRoot, { withFileTypes: true })) {
      if (!sessionEntry.isDirectory()) {
        continue;
      }

      const state = readJson<LocalSessionState>(join(agentRoot, sessionEntry.name, 'state.json'));

      if (!state || state.version !== 1 || state.projectId !== project.id) {
        continue;
      }

      output.push(state);
    }
  }

  return output;
}

function latestTimestamp(values: Array<string | undefined>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
}

function readOpenCodeStatus(project: ProjectManifest): OpenCodeStatus | null {
  const status = readJson<OpenCodeStatus>(
    join(project.rootPath, '.toolnet', 'runtime', 'opencode-status.json')
  );

  if (!status) {
    return null;
  }

  if (status.projectRoot && status.projectRoot !== project.rootPath) {
    return null;
  }

  return status;
}

export function inspectSessionCaptureHealth(project: ProjectManifest): SessionCaptureHealth {
  const states = sessionStates(project);

  const ordered = [...states].sort((a, b) =>
    (a.lastLocalEventAt ?? a.updatedAt).localeCompare(b.lastLocalEventAt ?? b.updatedAt)
  );

  const latest = ordered.at(-1);

  const agents = Array.from(new Set(states.map((state) => state.agent))).sort();

  const pendingWal = states.reduce(
    (sum, state) => sum + Math.max(0, state.lastSequence - state.lastRemoteSequence),
    0
  );

  const opencode = readOpenCodeStatus(project);

  const captureFailed = opencode?.state === 'capture-failed';

  const remoteFailed = opencode?.state === 'sync-failed';

  let syncHealth: CaptureSyncHealth;

  if (captureFailed) {
    syncHealth = 'degraded';
  } else if (pendingWal > 0 || remoteFailed) {
    syncHealth = 'pending';
  } else if (states.length > 0) {
    syncHealth = 'healthy';
  } else {
    syncHealth = 'unknown';
  }

  const work = loadLocalWorkState(project);

  return {
    ok: syncHealth !== 'degraded',

    agents,

    sessions: states.length,

    latestAgent: latest?.agent,

    latestSessionId: latest?.nativeSessionId,

    lastCaptureAt: latestTimestamp(
      states.map((state) => state.lastLocalEventAt ?? state.updatedAt)
    ),

    lastFlushAt: latestTimestamp(states.map((state) => state.lastRemoteAt)),

    pendingWal,

    currentTask: work?.currentTask?.title,

    currentFile: work?.activeFiles?.at(-1) ?? work?.filesTouched.at(-1),

    syncHealth,

    opencode: opencode
      ? {
          state: opencode.state,

          reason: opencode.reason,

          timestamp: opencode.timestamp,

          error: opencode.error,
        }
      : undefined,
  };
}
