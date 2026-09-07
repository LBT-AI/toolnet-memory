import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import type { ProjectManifest } from '../core/types.js';
import { TaskStore } from '../tasks/store.js';

export interface ArtifactPathHealth {
  ok: boolean;
  total: number;
  local: number;
  remote: number;
  existing: number;
  missing: number;
  missingPaths: string[];
  error?: string;
}

function terminal(status: string): boolean {
  return status === 'completed' || status === 'cancelled';
}

function remoteReference(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//iu.test(value);
}

function logicalArtifactKey(
  taskId: string,
  evidence: {
    artifact?: {
      key?: string;
      type?: string;
      path?: string;
    };
  }
): string | undefined {
  const artifact = evidence.artifact;
  if (!artifact?.path) {
    return undefined;
  }
  return artifact.key
    ? `${taskId}|key:${artifact.key}`
    : `${taskId}|${artifact.type ?? 'artifact'}|${artifact.path}`;
}

/**
 * Inspect newest logical structured Artifact evidence
 * for non-terminal Tasks only.
 *
 * Read-only. Task lifecycle/evidence is never changed.
 */
export function inspectActiveTaskArtifactPaths(project: ProjectManifest): ArtifactPathHealth {
  try {
    const tasks = Object.values(new TaskStore(project).projection().tasks);
    const paths: string[] = [];
    for (const task of tasks) {
      if (terminal(task.status)) {
        continue;
      }
      const seen = new Set<string>();
      for (let index = task.evidence.length - 1; index >= 0; index -= 1) {
        const evidence = task.evidence[index];
        if (!evidence || evidence.kind !== 'artifact' || !evidence.artifact?.path) {
          continue;
        }
        const key = logicalArtifactKey(task.id, evidence);
        if (!key || seen.has(key)) {
          continue;
        }
        seen.add(key);
        paths.push(evidence.artifact.path.trim());
      }
    }
    const unique = [...new Set(paths.filter(Boolean))];
    let local = 0;
    let remote = 0;
    let existing = 0;
    const missingPaths: string[] = [];
    for (const path of unique) {
      if (remoteReference(path)) {
        remote += 1;
        continue;
      }
      local += 1;
      const resolved = isAbsolute(path) ? path : resolve(project.rootPath, path);
      if (existsSync(resolved)) {
        existing += 1;
      } else {
        missingPaths.push(path);
      }
    }
    return {
      ok: missingPaths.length === 0,
      total: unique.length,
      local,
      remote,
      existing,
      missing: missingPaths.length,
      missingPaths: missingPaths.slice(0, 20),
    };
  } catch (error) {
    return {
      ok: false,
      total: 0,
      local: 0,
      remote: 0,
      existing: 0,
      missing: 0,
      missingPaths: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
