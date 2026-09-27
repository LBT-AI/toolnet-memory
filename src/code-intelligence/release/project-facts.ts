/*
 * Phase 83 — shared project facts builder.
 *
 * One deterministic facts bundle (source/packaged inventories, version truth,
 * manifest truth, build state) consumed by both the runtime report
 * orchestrator and the MCP tool so standalone and daemon paths stay in parity.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { buildPackagedInventory, buildSourceInventory } from './capabilities.js';
import { gitReadOnly } from './git.js';
import { worktreeFingerprint } from './fingerprint.js';
import { collectManifestTruth, collectVersionTruth } from './version-truth.js';

import type { ReleaseFacts } from './types.js';

/**
 * Phase certifications the release gate requires to have recorded PASS
 * results. The declared chain currently runs 68..83; Phase 83's own script is
 * included so the gate is self-verifying.
 */
export const REQUIRED_RELEASE_PHASES: number[] = Array.from(
  { length: 16 },
  (_, index) => 68 + index
);

export interface ReleaseFactsInput {
  projectRoot: string;
  profile: string;
  requiredPhases: number[];
  maxCapabilities: number;
  maxBundleReadBytes: number;
  maxPackageJsonBytes: number;
  maxWorktreeFiles: number;
}

/**
 * Build the deterministic facts bundle for the project. Never mutates
 * anything: reads source files, runs read-only git commands and reads the
 * built bundle.
 */
export function buildReleaseFacts(input: ReleaseFactsInput): ReleaseFacts {
  const source = buildSourceInventory({
    projectRoot: input.projectRoot,
    maxCapabilities: input.maxCapabilities,
  });

  const packaged = buildPackagedInventory({
    projectRoot: input.projectRoot,
    maxCapabilities: input.maxCapabilities,
    maxBundleReadBytes: input.maxBundleReadBytes,
  });

  const sourcePhase = source.inventory.ids
    .map((id) => Number(/^phase(\d+):certify$/u.exec(id)?.[1] ?? 0))
    .reduce((max, phase) => Math.max(max, phase), 0);

  const versionTruth = collectVersionTruth({
    projectRoot: input.projectRoot,
    sourcePhase,
    maxPackageJsonBytes: input.maxPackageJsonBytes,
  });

  const manifestTruth = collectManifestTruth({
    projectRoot: input.projectRoot,
    sourcePhase,
  });

  const head = gitReadOnly(input.projectRoot, ['rev-parse', 'HEAD']);
  const branch = gitReadOnly(input.projectRoot, ['branch', '--show-current']);
  const latestTag = gitReadOnly(input.projectRoot, ['tag', '--sort=-version:refname'])
    .stdout.split('\n')
    .map((line) => line.trim())
    .find((line) => /^v[0-9]/u.test(line));

  const tree = worktreeFingerprint(input.projectRoot, input.maxWorktreeFiles);

  const bundlePath = join(input.projectRoot, 'bundle', 'mcp.js');

  let bundleBytes = 0;
  let bundleFingerprint = '';

  if (existsSync(bundlePath)) {
    const content = readFileSync(bundlePath);

    bundleBytes = content.byteLength;
    bundleFingerprint = content.toString('base64').slice(0, 32);
  }

  const pkg = JSON.parse(readFileSync(join(input.projectRoot, 'package.json'), 'utf8')) as {
    version?: string;
    name?: string;
  };

  return {
    projectRoot: input.projectRoot,
    profile: input.profile,
    requiredPhases: input.requiredPhases.slice().sort((a, b) => a - b),
    sourcePhase,
    headCommit: head.ok ? head.stdout.trim() : '',
    ...(branch.ok && branch.stdout.trim() ? { branch: branch.stdout.trim() } : {}),
    ...(latestTag !== undefined ? { latestTag } : {}),
    dirty: tree.dirty,
    worktree: tree,
    packageVersion: pkg.version ?? '',
    packageName: pkg.name ?? '',
    nodeVersion: process.version,
    platform: `${process.platform}-${process.arch}`,
    source,
    packaged,
    versionTruth,
    manifestTruth,
    build: {
      bundlePresent: packaged.inventory.bundlePresent,
      bundleFingerprint,
      bundleBytes,
      stale: false,
    },
  };
}

/** Resolve the project root for the CLI/release path. */
export function resolveReleaseProjectRoot(): string {
  return process.cwd();
}

/** Bounded stat helper used by the report for package-size context. */
export function safeStat(path: string): { size: number } | undefined {
  try {
    const stats = statSync(path);

    return { size: stats.size };
  } catch {
    return undefined;
  }
}
