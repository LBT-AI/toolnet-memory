/*
 * Phase 80 — read-only git change reader.
 *
 * Git inspection is strictly read-only. Only non-mutating subcommands are used
 * and every argument is passed as an array element (never a shell string).
 * External diff drivers and textconv filters are disabled so a hostile
 * repository config cannot execute code, and revisions are validated before
 * use so an argument can never be interpreted as a git option.
 *
 * Mutating git commands (checkout, reset, restore, clean, stash, commit, merge,
 * rebase) are never invoked.
 */

import { execFile } from 'node:child_process';

import { promisify } from 'node:util';

import { parseUnifiedDiff } from './diff.js';

import { resolveChangeLimits } from './limits.js';

import type { ChangeLimits, ChangeMode, FileChange } from './types.js';

import { ChangeError } from './types.js';

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 20_000;

/** Non-mutating, injection-safe diff flags. */
const SAFE_DIFF_FLAGS = [
  '--no-ext-diff',
  '--no-textconv',
  '--no-color',
  '-M',
  '--unified=0',
] as const;

/** A conservative revision grammar: no leading dash, no shell metacharacters. */
const REVISION_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_./@{}~^:-]{0,199}$/u;

export function assertSafeRevision(value: unknown, label: string, allowRange = false): string {
  if (typeof value !== 'string' || !REVISION_PATTERN.test(value)) {
    throw new ChangeError(
      'CHANGE_REVISION_INVALID',
      `${label} must be a bounded git revision (no options, no shell characters).`
    );
  }

  if (value.startsWith('-')) {
    throw new ChangeError('CHANGE_REVISION_INVALID', `${label} must not begin with '-'.`);
  }

  if (!allowRange && value.includes('..')) {
    throw new ChangeError('CHANGE_REVISION_INVALID', `${label} must be a single revision.`);
  }

  return value;
}

export interface GitChangeInput {
  mode: ChangeMode;
  rootPath: string;
  base?: string;
  head?: string;
  patch?: string;
  limits?: Partial<ChangeLimits>;
}

export interface GitChangeSnapshot {
  mode: ChangeMode;
  base?: string;
  head?: string;
  files: FileChange[];
  /** True when a bound (patch bytes / files / hunks) stopped parsing early. */
  truncated: boolean;
  /** Deterministic digest of the raw snapshot text (used for recheck). */
  rawDigest: string;
  /** Transient changed lines per path, used for signature classification. */
  changedLines: Map<string, string[]>;
}

async function runGit(
  rootPath: string,
  args: readonly string[],
  maxBuffer: number
): Promise<string> {
  try {
    const result = await execFileAsync('git', [...args], {
      cwd: rootPath,
      maxBuffer,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
      env: {
        ...process.env,
        /* Never let a repository config pick an external diff/textconv tool. */
        GIT_EXTERNAL_DIFF: '',
        GIT_PAGER: 'cat',
      },
    });

    return result.stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new ChangeError('CHANGE_GIT_FAILED', `git ${args[0] ?? ''} failed: ${message}`);
  }
}

function digestText(value: string): string {
  /* Bounded deterministic digest; the report only needs equality, not strength. */
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }

  return `${value.length.toString(36)}-${hash.toString(36)}`;
}

async function listUntracked(rootPath: string): Promise<string> {
  try {
    const result = await execFileAsync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: rootPath,
      maxBuffer: 4 * 1024 * 1024,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
    });

    return result.stdout;
  } catch {
    return '';
  }
}

function untrackedFiles(text: string, existing: readonly FileChange[]): FileChange[] {
  const known = new Set(existing.map((file) => file.path));
  const files: FileChange[] = [];

  for (const line of text.split(/\r?\n/u)) {
    const path = line.trim();

    if (!path || known.has(path)) {
      continue;
    }

    files.push({ path, kind: 'added', binary: false, hunks: [], additions: 0, deletions: 0 });
  }

  return files;
}

/**
 * Read the change snapshot for a mode.
 *
 * `patch` is parsed directly from the caller payload and never touches git, so
 * a patch can never be applied, executed or used to escape the project.
 */
export async function readChangeInput(input: GitChangeInput): Promise<GitChangeSnapshot> {
  const limits = resolveChangeLimits(input.limits);

  if (input.mode === 'patch') {
    if (typeof input.patch !== 'string' || input.patch.length === 0) {
      throw new ChangeError('CHANGE_PATCH_REQUIRED', 'mode=patch requires a patch payload.');
    }

    if (Buffer.byteLength(input.patch, 'utf8') > limits.maxPatchBytes) {
      throw new ChangeError('CHANGE_LIMIT_EXCEEDED', 'Patch payload exceeds the size limit.');
    }

    const parsed = parseUnifiedDiff(input.patch, {
      maxFiles: limits.maxChangedFiles,
      maxHunks: limits.maxChangedHunks,
    });

    return {
      mode: 'patch',
      files: parsed.files,
      truncated: parsed.truncated,
      rawDigest: digestText(input.patch),
      changedLines: parsed.changedLines,
    };
  }

  const maxBuffer = Math.min(limits.maxPatchBytes * 2, 64 * 1024 * 1024);

  let raw = '';
  let base: string | undefined;
  let head: string | undefined;

  switch (input.mode) {
    case 'working_tree': {
      base = input.base === undefined ? 'HEAD' : assertSafeRevision(input.base, 'base');
      raw = await runGit(input.rootPath, ['diff', base, ...SAFE_DIFF_FLAGS, '--'], maxBuffer);

      const untracked = await listUntracked(input.rootPath);
      raw = `${raw}\n--untracked--\n${untracked}`;
      break;
    }

    case 'staged': {
      raw = await runGit(input.rootPath, ['diff', '--cached', ...SAFE_DIFF_FLAGS, '--'], maxBuffer);
      break;
    }

    case 'commit': {
      if (input.base === undefined) {
        throw new ChangeError('CHANGE_REVISION_REQUIRED', 'mode=commit requires a base revision.');
      }

      const revision = assertSafeRevision(input.base, 'base');

      raw = await runGit(
        input.rootPath,
        ['show', ...SAFE_DIFF_FLAGS, '--format=', revision, '--'],
        maxBuffer
      );
      break;
    }

    case 'commit_range': {
      if (input.base === undefined || input.head === undefined) {
        throw new ChangeError(
          'CHANGE_REVISION_REQUIRED',
          'mode=commit_range requires base and head revisions.'
        );
      }

      const from = assertSafeRevision(input.base, 'base');
      const to = assertSafeRevision(input.head, 'head');

      raw = await runGit(
        input.rootPath,
        ['diff', ...SAFE_DIFF_FLAGS, `${from}..${to}`, '--'],
        maxBuffer
      );
      break;
    }

    default:
      throw new ChangeError('CHANGE_MODE_UNSUPPORTED', `Unsupported change mode: ${input.mode}`);
  }

  let truncated = false;

  if (Buffer.byteLength(raw, 'utf8') > limits.maxPatchBytes) {
    raw = raw.slice(0, limits.maxPatchBytes);
    truncated = true;
  }

  const parsed = parseUnifiedDiff(raw, {
    maxFiles: limits.maxChangedFiles,
    maxHunks: limits.maxChangedHunks,
  });

  let files = parsed.files;

  if (input.mode === 'working_tree') {
    const untrackedText = raw.split('--untracked--')[1] ?? '';
    const extra = untrackedFiles(untrackedText, files);

    if (files.length + extra.length > limits.maxChangedFiles) {
      truncated = true;
    }

    files = [...files, ...extra].slice(0, limits.maxChangedFiles);
  }

  return {
    mode: input.mode,
    ...(base !== undefined ? { base } : {}),
    ...(head !== undefined ? { head } : {}),
    files,
    truncated: truncated || parsed.truncated,
    rawDigest: digestText(raw),
    changedLines: parsed.changedLines,
  };
}

/** Re-read only the snapshot digest, for mid-analysis change detection. */
export async function readSnapshotDigest(input: GitChangeInput): Promise<string> {
  const snapshot = await readChangeInput(input);
  return snapshot.rawDigest;
}
