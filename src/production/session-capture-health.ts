import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

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

/** One durable per-source state entry and its WAL footprint. */
export interface SessionSourceEntry {
  state: LocalSessionState;

  directory: string;

  eventsFileSize: number;
}

function scanSessionStates(root: string, project: ProjectManifest): SessionSourceEntry[] {
  if (!existsSync(root)) {
    return [];
  }

  const output: SessionSourceEntry[] = [];

  for (const agentEntry of readdirSync(root, { withFileTypes: true })) {
    if (!agentEntry.isDirectory()) {
      continue;
    }

    const agentRoot = join(root, agentEntry.name);

    for (const sessionEntry of readdirSync(agentRoot, { withFileTypes: true })) {
      if (!sessionEntry.isDirectory()) {
        continue;
      }

      const directory = join(agentRoot, sessionEntry.name);

      const state = readJson<LocalSessionState>(join(directory, 'state.json'));

      if (!state) {
        continue;
      }

      if (state.version !== 1) {
        continue;
      }

      if (state.projectId !== project.id) {
        continue;
      }

      output.push({ state, directory, eventsFileSize: eventsFileSize(directory) });
    }
  }

  return output;
}

function eventsFileSize(directory: string): number {
  const file = join(directory, 'events.jsonl');

  if (!existsSync(file)) {
    return 0;
  }

  try {
    return statSync(file).size;
  } catch {
    return 0;
  }
}

/**
 * Read-only view of durable session sources. Never acquires the WAL lock and
 * never repairs state: status inspection must not mutate anything.
 */
export function readSessionSourceStates(project: ProjectManifest): SessionSourceEntry[] {
  return sessionStates(project);
}

function sessionStates(project: ProjectManifest): SessionSourceEntry[] {
  /*
   * Current runtime source metadata.
   *
   * These files are NOT separate memories.
   * They only hold native-session cursor / WAL / recovery state.
   */
  const currentRoot = join(project.rootPath, '.toolnet', 'runtime', 'sources');

  /*
   * Backward-compatible READ ONLY source.
   *
   * Existing projects may still contain pre-shared-memory
   * .toolnet/sessions/<agent>/<session>/state.json.
   *
   * Never write new state there.
   */
  const legacyRoot = join(project.rootPath, '.toolnet', 'sessions');

  const current = scanSessionStates(currentRoot, project);

  const legacy = scanSessionStates(legacyRoot, project);

  /*
   * Prefer current runtime state when the same native
   * agent/session exists in both layouts.
   */
  const merged = new Map<string, SessionSourceEntry>();

  for (const entry of legacy) {
    merged.set(`${entry.state.agent}:${entry.state.nativeSessionId}`, entry);
  }

  for (const entry of current) {
    merged.set(`${entry.state.agent}:${entry.state.nativeSessionId}`, entry);
  }

  return Array.from(merged.values());
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
  const entries = sessionStates(project);

  const ordered = [...entries].sort((a, b) =>
    (a.state.lastLocalEventAt ?? a.state.updatedAt).localeCompare(
      b.state.lastLocalEventAt ?? b.state.updatedAt
    )
  );

  const latest = ordered.at(-1)?.state;

  const agents = Array.from(new Set(entries.map((entry) => entry.state.agent))).sort();

  const pendingWal = entries.reduce(
    (sum, entry) => sum + Math.max(0, entry.state.lastSequence - entry.state.lastRemoteSequence),
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
  } else if (entries.length > 0) {
    syncHealth = 'healthy';
  } else {
    syncHealth = 'unknown';
  }

  const work = loadLocalWorkState(project);

  return {
    ok: syncHealth !== 'degraded',

    agents,

    sessions: entries.length,

    latestAgent: latest?.agent,

    latestSessionId: latest?.nativeSessionId,

    lastCaptureAt: latestTimestamp(
      entries.map((entry) => entry.state.lastLocalEventAt ?? entry.state.updatedAt)
    ),

    lastFlushAt: latestTimestamp(entries.map((entry) => entry.state.lastRemoteAt)),

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
