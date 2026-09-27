/*
 * Phase 83 — deterministic release fingerprints.
 *
 * No timestamp is ever part of an identity. The worktree fingerprint covers
 * tracked modifications (content, not mtime) and untracked release-relevant
 * files; the capability fingerprint covers the sorted source and packaged
 * capability ids; the release fingerprint pins the scope and profile.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { gitReadOnly } from './git.js';

function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export interface WorktreeFingerprint {
  dirty: boolean;
  fingerprint: string;
  trackedChanges: number;
  untrackedFiles: number;
}

/**
 * Deterministically fingerprint the working tree.
 *
 * Uses git status (path + status), the tracked diff content and the untracked
 * file list. Content hashing means a re-touched but unchanged file keeps the
 * same identity, while any real content change moves it.
 */
export function worktreeFingerprint(projectRoot: string, maxFiles: number): WorktreeFingerprint {
  const status = gitReadOnly(projectRoot, ['status', '--porcelain=v1', '-z']);

  const entries = status.stdout.split('\u0000').filter(Boolean).slice(0, maxFiles).sort();

  const diff = gitReadOnly(projectRoot, [
    'diff',
    'HEAD',
    '--no-ext-diff',
    '--no-textconv',
    '--no-color',
  ]);

  const untracked = gitReadOnly(projectRoot, ['ls-files', '--others', '--exclude-standard']);

  const untrackedFiles = untracked.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .sort()
    .slice(0, maxFiles);

  const untrackedHashes: Array<[string, string]> = [];

  for (const file of untrackedFiles) {
    try {
      untrackedHashes.push([file, hash(readFileSync(join(projectRoot, file)))]);
    } catch {
      untrackedHashes.push([file, 'unreadable']);
    }
  }

  const fingerprint = hash(
    JSON.stringify({
      status: entries,
      diff: hash(diff.stdout),
      untracked: untrackedHashes,
    })
  );

  return {
    dirty: entries.length > 0,
    fingerprint,
    trackedChanges: entries.length,
    untrackedFiles: untrackedFiles.length,
  };
}

/** Fingerprint the sorted capability inventories. */
export function capabilityFingerprint(
  sourceIds: readonly string[],
  packagedIds: readonly string[]
): string {
  return hash(
    JSON.stringify({
      source: [...sourceIds].sort(),
      packaged: [...packagedIds].sort(),
    })
  );
}

/** Fingerprint a bundle's normalized content (line endings normalised). */
export function contentFingerprint(content: Buffer | string): string {
  const text = Buffer.isBuffer(content) ? content.toString('utf8') : content;

  return hash(text.replace(/\r\n/gu, '\n'));
}

/** Final release fingerprint pinned to scope + profile. */
export function releaseFingerprint(input: {
  currentVersion: string;
  headCommit: string;
  worktreeFingerprint: string;
  sourceCapabilityFingerprint: string;
  packagedCapabilityFingerprint: string;
  profile: string;
}): string {
  return hash(
    JSON.stringify({
      currentVersion: input.currentVersion,
      headCommit: input.headCommit,
      worktreeFingerprint: input.worktreeFingerprint,
      sourceCapabilityFingerprint: input.sourceCapabilityFingerprint,
      packagedCapabilityFingerprint: input.packagedCapabilityFingerprint,
      profile: input.profile,
    })
  );
}
