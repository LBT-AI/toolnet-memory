import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

import { homedir } from 'node:os';

import { join, resolve } from 'node:path';

export interface CodexRolloutMeta {
  threadId?: string;
  cwd?: string;

  raw: Record<string, unknown>;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function codexHome(): string {
  return process.env.CODEX_HOME ?? join(homedir(), '.codex');
}

export function inspectCodexRollout(file: string): CodexRolloutMeta {
  let content = '';

  try {
    const fd = readFileSync(file, 'utf8');

    content = fd.slice(0, 128 * 1024);
  } catch {
    return {
      raw: {},
    };
  }

  for (const line of content.split('\n')) {
    if (!line) {
      continue;
    }

    try {
      const row = object(JSON.parse(line));

      if (row.type !== 'session_meta') {
        continue;
      }

      const payload = object(row.payload);

      const threadId = [
        payload.id,
        payload.thread_id,
        payload.threadId,
        payload.session_id,
        payload.sessionId,
      ].find((item) => typeof item === 'string') as string | undefined;

      const cwd = typeof payload.cwd === 'string' ? payload.cwd : undefined;

      return {
        threadId,
        cwd,
        raw: payload,
      };
    } catch {
      // continue
    }
  }

  return {
    raw: {},
  };
}

function walk(
  directory: string,

  output: string[]
): void {
  if (!existsSync(directory)) {
    return;
  }

  let entries;

  try {
    entries = readdirSync(directory, {
      withFileTypes: true,
    });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(path, output);

      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      output.push(path);
    }
  }
}

export function listCodexRollouts(): string[] {
  const home = codexHome();

  const files: string[] = [];

  walk(join(home, 'sessions'), files);

  walk(join(home, 'archived_sessions'), files);

  return files.sort((left, right) => {
    try {
      return statSync(right).mtimeMs - statSync(left).mtimeMs;
    } catch {
      return 0;
    }
  });
}

export function findCodexRollout(threadId: string): string | null {
  const files = listCodexRollouts();

  /*
   * Official rollout filenames contain the UUID.
   * Cheap path first.
   */
  const direct = files.find((file) => file.includes(threadId));

  if (direct) {
    return direct;
  }

  /*
   * Fallback for future filename layouts:
   * read session_meta.
   */
  for (const file of files) {
    const meta = inspectCodexRollout(file);

    if (meta.threadId === threadId) {
      return file;
    }
  }

  return null;
}

export function pathBelongsToProject(
  projectRoot: string,

  cwd: string
): boolean {
  const root = resolve(projectRoot);

  const candidate = resolve(cwd);

  return candidate === root || candidate.startsWith(root + '/') || root.startsWith(candidate + '/');
}
