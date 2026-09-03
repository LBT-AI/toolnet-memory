import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';

import { basename, join, relative, resolve } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { GcCandidate, GcPlan, GcProtectedEntry, RetentionPolicy } from './types.js';

function ageMs(mtimeMs: number, nowMs: number): number {
  return Math.max(0, nowMs - mtimeMs);
}

function processAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;

    if (code === 'ESRCH') {
      return false;
    }

    /*
     * EPERM means process exists but
     * current user cannot signal it.
     */
    return true;
  }
}

function lockOwnerAlive(file: string): boolean {
  let text = '';

  try {
    text = readFileSync(file, 'utf8').trim();
  } catch {
    return false;
  }

  if (!text) {
    return false;
  }

  try {
    const parsed = JSON.parse(text) as {
      pid?: unknown;
    };

    if (typeof parsed.pid !== 'number') {
      return false;
    }

    return processAlive(parsed.pid);
  } catch {
    return false;
  }
}

function isLockName(name: string): boolean {
  return name === 'journal.lock' || name === '.current.lock' || name.endsWith('.lock');
}

function isTemporaryName(name: string): boolean {
  return (
    name.startsWith('.tmp-') ||
    name.includes('.tmp-') ||
    name.endsWith('.tmp') ||
    name.endsWith('.partial')
  );
}

function walkFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const output: string[] = [];

  for (const entry of readdirSync(directory, {
    withFileTypes: true,
  })) {
    const full = join(directory, entry.name);

    if (entry.isSymbolicLink()) {
      /*
       * Never follow links from runtime metadata.
       */
      continue;
    }

    if (entry.isDirectory()) {
      output.push(...walkFiles(full));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    output.push(full);
  }

  return output.sort();
}

function candidateId(category: string, target: string): string {
  return [category, target].join(':');
}

export function localRuntimeRoot(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'runtime');
}

/*
 * ESM-safe containment helper.
 */
function insideRuntime(project: ProjectManifest, target: string): boolean {
  const root = resolve(localRuntimeRoot(project));

  const absolute = resolve(target);

  const rel = relative(root, absolute);

  return Boolean(rel) && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\');
}

export function safeLocalCandidateNow(
  project: ProjectManifest,
  candidate: GcCandidate,
  policy: RetentionPolicy,
  nowMs = Date.now()
): {
  safe: boolean;
  detail?: string;
} {
  if (candidate.scope !== 'local') {
    return {
      safe: false,
      detail: 'candidate is not local',
    };
  }

  if (!insideRuntime(project, candidate.target)) {
    return {
      safe: false,
      detail: 'target escaped .toolnet/runtime',
    };
  }

  if (!existsSync(candidate.target)) {
    return {
      safe: false,
      detail: 'target disappeared',
    };
  }

  let stat;
  try {
    stat = lstatSync(candidate.target);
  } catch {
    return {
      safe: false,
      detail: 'cannot stat target',
    };
  }

  if (!stat.isFile() || stat.isSymbolicLink()) {
    return {
      safe: false,
      detail: 'target is not a regular file',
    };
  }

  if (candidate.expectedMtimeMs !== undefined && stat.mtimeMs !== candidate.expectedMtimeMs) {
    return {
      safe: false,
      detail: 'target changed after planning',
    };
  }

  const name = basename(candidate.target);

  if (candidate.category === 'runtime-lock') {
    if (!isLockName(name)) {
      return {
        safe: false,
        detail: 'lock name no longer matches policy',
      };
    }

    const minimumAge = policy.staleLockMinutes * 60_000;

    if (ageMs(stat.mtimeMs, nowMs) < minimumAge) {
      return {
        safe: false,
        detail: 'lock is no longer stale',
      };
    }

    if (lockOwnerAlive(candidate.target)) {
      return {
        safe: false,
        detail: 'lock owner is alive',
      };
    }

    return {
      safe: true,
    };
  }

  if (candidate.category === 'runtime-temp') {
    if (!isTemporaryName(name)) {
      return {
        safe: false,
        detail: 'temporary file name no longer matches policy',
      };
    }

    const minimumAge = policy.runtimeDays * 86_400_000;

    if (ageMs(stat.mtimeMs, nowMs) < minimumAge) {
      return {
        safe: false,
        detail: 'temporary file is too new',
      };
    }

    return {
      safe: true,
    };
  }

  return {
    safe: false,
    detail: 'category is protected from local deletion',
  };
}

export function planLocalGc(
  project: ProjectManifest,
  policy: RetentionPolicy,
  nowMs = Date.now()
): GcPlan {
  const toolnet = join(project.rootPath, '.toolnet');

  const runtime = join(toolnet, 'runtime');

  const candidates: GcCandidate[] = [];

  const protectedEntries: GcProtectedEntry[] = [
    {
      scope: 'local',
      category: 'protected-memory',
      target: join(toolnet, 'memory'),
      reason: 'durable semantic memory is never age-GCed',
    },
    {
      scope: 'local',
      category: 'protected-work',
      target: join(toolnet, 'work'),
      reason: 'current work continuity is authoritative state',
    },
    {
      scope: 'local',
      category: 'protected-context',
      target: join(toolnet, 'context'),
      reason: 'context is not deleted by retention policy',
    },
    {
      scope: 'local',
      category: 'protected-journal',
      target: join(toolnet, 'journal', 'events.jsonl'),
      reason: 'shared project journal is durable continuity data',
    },
    {
      scope: 'local',
      category: 'protected-audit',
      target: join(toolnet, 'audit', 'events.jsonl'),
      reason: 'tamper-evident audit history is durable security data',
    },
    {
      scope: 'local',
      category: 'protected-legacy-session',
      target: join(toolnet, 'sessions'),
      reason: 'legacy sessions remain read/protected and are never automatically removed',
    },
    {
      scope: 'local',
      category: 'protected-wal',
      target: join(runtime, 'sources'),
      reason: 'events.jsonl and state.json remain authoritative crash-recovery WAL/state',
    },
  ];

  const staleLockMs = policy.staleLockMinutes * 60_000;

  const runtimeAgeMs = policy.runtimeDays * 86_400_000;

  for (const file of walkFiles(runtime)) {
    let stat;
    try {
      stat = lstatSync(file);
    } catch {
      continue;
    }

    if (!stat.isFile() || stat.isSymbolicLink()) {
      continue;
    }

    const name = basename(file);

    const age = ageMs(stat.mtimeMs, nowMs);

    if (isLockName(name)) {
      if (age < staleLockMs) {
        continue;
      }

      if (lockOwnerAlive(file)) {
        continue;
      }

      candidates.push({
        id: candidateId('runtime-lock', file),
        scope: 'local',
        category: 'runtime-lock',
        target: file,
        reason: `stale runtime lock older than ${policy.staleLockMinutes} minutes with no live owner`,
        action: 'delete-file',
        ageMs: age,
        size: stat.size,
        expectedMtimeMs: stat.mtimeMs,
      });

      continue;
    }

    if (name === 'events.jsonl' || name === 'state.json') {
      continue;
    }

    if (!isTemporaryName(name)) {
      continue;
    }

    if (age < runtimeAgeMs) {
      continue;
    }

    candidates.push({
      id: candidateId('runtime-temp', file),
      scope: 'local',
      category: 'runtime-temp',
      target: file,
      reason: `temporary runtime artifact older than ${policy.runtimeDays} days`,
      action: 'delete-file',
      ageMs: age,
      size: stat.size,
      expectedMtimeMs: stat.mtimeMs,
    });
  }

  candidates.sort((left, right) => left.target.localeCompare(right.target));

  return {
    version: 1,
    generatedAt: new Date(nowMs).toISOString(),
    projectId: project.id,
    projectRoot: project.rootPath,
    policy,
    candidates,
    protected: protectedEntries,
    estimatedBytes: candidates.reduce((total, item) => total + (item.size ?? 0), 0),
  };
}
