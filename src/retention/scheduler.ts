import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';

import { loadConfig } from '../core/config.js';
import { ProjectManager } from '../core/project-manager.js';
import type { ProjectManifest } from '../core/types.js';
import { safeAppendAuditEvent } from '../audit/log.js';
import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';
import { retentionPolicy } from './policy.js';
import { GarbageCollector } from './service.js';
import type { GcExecutionResult, RetentionPolicy } from './types.js';

const DEFAULT_INTERVAL_HOURS = 168;
const DEFAULT_TICK_MINUTES = 15;
const GC_LOCK_STALE_MS = 30 * 60_000;

export interface AutoGcConfig {
  enabled: boolean;
  intervalMs: number;
  tickMs: number;
  includeRemote: boolean;
  policy: RetentionPolicy;
}

export interface AutoGcState {
  version: 1;
  projectId: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  nextDueAt?: string;
  lastResult?: {
    deleted: number;
    skipped: number;
    failed: number;
    bytesFreed: number;
  };
  lastError?: string;
}

export interface AutoGcRunResult {
  status: 'disabled' | 'not-due' | 'locked' | 'success' | 'failed';
  result?: GcExecutionResult;
  error?: string;
}

function enabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value.trim().toLowerCase());
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function autoGcConfig(env: NodeJS.ProcessEnv = process.env): AutoGcConfig {
  const intervalHours = positiveInteger(env.TOOLNET_AUTO_GC_INTERVAL_HOURS, DEFAULT_INTERVAL_HOURS);
  const tickMinutes = positiveInteger(env.TOOLNET_AUTO_GC_TICK_MINUTES, DEFAULT_TICK_MINUTES);
  return {
    enabled: enabled(env.TOOLNET_AUTO_GC),
    intervalMs: intervalHours * 60 * 60_000,
    tickMs: tickMinutes * 60_000,
    includeRemote: enabled(env.TOOLNET_AUTO_GC_REMOTE),
    policy: retentionPolicy({
      keepSnapshots: positiveInteger(env.TOOLNET_AUTO_GC_KEEP_SNAPSHOTS, 10),
      runtimeDays: positiveInteger(env.TOOLNET_AUTO_GC_RUNTIME_DAYS, 30),
      staleLockMinutes: positiveInteger(env.TOOLNET_AUTO_GC_STALE_LOCK_MINUTES, 10),
      ...(env.TOOLNET_AUTO_GC_SNAPSHOT_DAYS
        ? {
            snapshotMaxAgeDays: positiveInteger(env.TOOLNET_AUTO_GC_SNAPSHOT_DAYS, 30),
          }
        : {}),
    }),
  };
}

function statePath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(project.rootPath, '.toolnet', 'runtime', 'gc', 'auto-gc-state.json');
}

function lockPath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(project.rootPath, '.toolnet', 'runtime', 'gc', 'auto-gc.lock');
}

function readState(project: Pick<ProjectManifest, 'rootPath'>): AutoGcState | undefined {
  const file = statePath(project);
  if (!existsSync(file)) {
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as AutoGcState;
  } catch {
    return undefined;
  }
}

function writeState(project: Pick<ProjectManifest, 'rootPath'>, state: AutoGcState): void {
  const file = statePath(project);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n', {
    encoding: 'utf8',
    mode: 0o600,
  });
  renameSync(temporary, file);
}

function lockIsStale(file: string): boolean {
  try {
    return Date.now() - statSync(file).mtimeMs > GC_LOCK_STALE_MS;
  } catch {
    return true;
  }
}

function acquireGcLock(project: Pick<ProjectManifest, 'rootPath'>): string | null {
  const file = lockPath(project);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  if (existsSync(file) && lockIsStale(file)) {
    try {
      unlinkSync(file);
    } catch {
      // Another scheduler may have recovered it.
    }
  }
  const token = randomUUID();
  try {
    const fd = openSync(file, 'wx', 0o600);
    try {
      writeFileSync(
        fd,
        JSON.stringify({
          token,
          pid: process.pid,
          createdAt: new Date().toISOString(),
        }) + '\n'
      );
    } finally {
      closeSync(fd);
    }
    return token;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return null;
    }
    throw error;
  }
}

function releaseGcLock(project: Pick<ProjectManifest, 'rootPath'>, token: string): void {
  const file = lockPath(project);
  if (!existsSync(file)) {
    return;
  }
  try {
    const current = JSON.parse(readFileSync(file, 'utf8')) as {
      token?: string;
    };
    if (current.token === token) {
      unlinkSync(file);
    }
  } catch {
    /*
     * Do not remove a lock without ownership proof.
     */
  }
}

export function autoGcDue(
  project: Pick<ProjectManifest, 'rootPath'>,
  config: AutoGcConfig,
  now: number = Date.now()
): boolean {
  if (!config.enabled) {
    return false;
  }
  const state = readState(project);
  if (!state?.lastSuccessAt) {
    return true;
  }
  const last = Date.parse(state.lastSuccessAt);
  if (!Number.isFinite(last)) {
    return true;
  }
  return now - last >= config.intervalMs;
}

async function remoteStorage(project: ProjectManifest) {
  const config = loadConfig();
  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      r2: config.storage.r2,
      s3: config.storage.s3,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    {
      attempts: Number(process.env.TOOLNET_STORAGE_RETRIES ?? 3),
    }
  );
  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}

export async function runAutoGcProject(
  project: ProjectManifest,
  config = autoGcConfig(),
  options: { force?: boolean; now?: number } = {}
): Promise<AutoGcRunResult> {
  const now = options.now ?? Date.now();
  if (!config.enabled) {
    return { status: 'disabled' };
  }
  if (!options.force && !autoGcDue(project, config, now)) {
    return { status: 'not-due' };
  }
  const token = acquireGcLock(project);
  if (!token) {
    return { status: 'locked' };
  }
  const attemptAt = new Date(now).toISOString();
  try {
    const storage = config.includeRemote ? await remoteStorage(project) : undefined;
    const collector = new GarbageCollector(project, config.policy, {
      ...(storage ? { remoteStorage: storage } : {}),
    });
    const plan = await collector.plan(config.includeRemote);
    const result = await collector.execute(plan, false);
    const success = result.failed === 0;
    const state: AutoGcState = {
      version: 1,
      projectId: project.id,
      lastAttemptAt: attemptAt,
      ...(success
        ? {
            lastSuccessAt: attemptAt,
            nextDueAt: new Date(now + config.intervalMs).toISOString(),
          }
        : {}),
      lastResult: {
        deleted: result.deleted,
        skipped: result.skipped,
        failed: result.failed,
        bytesFreed: result.bytesFreed,
      },
      ...(success ? {} : { lastError: 'GC_EXECUTION_ITEMS_FAILED' }),
    };
    writeState(project, state);
    await safeAppendAuditEvent(project, {
      action: 'gc.auto',
      outcome: success ? 'success' : 'failed',
      actor: { kind: 'service', id: `pid:${process.pid}` },
      details: {
        includeRemote: config.includeRemote,
        candidates: plan.candidates.length,
        deleted: result.deleted,
        skipped: result.skipped,
        failed: result.failed,
        bytesFreed: result.bytesFreed,
      },
    });
    return { status: success ? 'success' : 'failed', result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeState(project, {
      version: 1,
      projectId: project.id,
      lastAttemptAt: attemptAt,
      lastError: message,
    });
    await safeAppendAuditEvent(project, {
      action: 'gc.auto',
      outcome: 'failed',
      actor: { kind: 'service', id: `pid:${process.pid}` },
      details: {
        includeRemote: config.includeRemote,
        error: message,
      },
    });
    return { status: 'failed', error: message };
  } finally {
    releaseGcLock(project, token);
  }
}

export interface AutoGcScheduler {
  enabled: boolean;
  observeRoot(rootPath: string): void;
  close(): void;
}

export function createAutoGcScheduler(config = autoGcConfig()): AutoGcScheduler {
  const projects = new Map<string, ProjectManifest>();
  const running = new Set<string>();
  const manager = new ProjectManager();

  async function run(project: ProjectManifest) {
    if (running.has(project.id)) {
      return;
    }
    running.add(project.id);
    try {
      await runAutoGcProject(project, config);
    } finally {
      running.delete(project.id);
    }
  }

  function observeRoot(rootPath: string): void {
    if (!config.enabled) {
      return;
    }
    let project: ProjectManifest;
    try {
      project = manager.requireExisting(rootPath);
    } catch {
      return;
    }
    projects.set(project.id, project);
    void run(project);
  }

  const timer = config.enabled
    ? setInterval(() => {
        for (const project of projects.values()) {
          void run(project);
        }
      }, config.tickMs)
    : undefined;
  timer?.unref();

  return {
    enabled: config.enabled,
    observeRoot,
    close() {
      if (timer) {
        clearInterval(timer);
      }
    },
  };
}
