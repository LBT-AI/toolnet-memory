/*
 * Phase 83 — synchronous read-only git helper.
 *
 * Release inspection must never mutate the repository: only non-mutating git
 * subcommands are used, every argument is passed as an array element (never a
 * shell string), external diff/textconv execution is disabled, and the git
 * environment is scrubbed of pagers. Mutating subcommands (checkout, reset,
 * restore, clean, stash, commit, merge, rebase, tag, push) are never invoked.
 */

import { spawnSync } from 'node:child_process';

export interface GitResult {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
}

const GIT_TIMEOUT_MS = 20_000;

/** Run a read-only git command. Never throws; the caller inspects `ok`. */
export function gitReadOnly(rootPath: string, args: readonly string[]): GitResult {
  const result = spawnSync('git', [...args], {
    cwd: rootPath,
    encoding: 'utf8',
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      GIT_EXTERNAL_DIFF: '',
      GIT_PAGER: 'cat',
    },
  });

  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/** A conservative revision grammar: no leading dash, no shell metacharacters. */
const REVISION_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_./@{}~^:-]{0,199}$/u;

/** Validate a git revision/ref before it is ever used as an argument. */
export function isSafeRevision(value: unknown): value is string {
  return typeof value === 'string' && REVISION_PATTERN.test(value) && !value.startsWith('-');
}
