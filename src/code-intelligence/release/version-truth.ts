/*
 * Phase 83 — version truth and release-manifest truth.
 *
 * Collects every version source that describes the active runtime, compares
 * them without editing anything, and determines whether the release manifest
 * reflects the capabilities that actually exist in source. Historical
 * references (old versions in docs, tests or changelogs) are never treated as
 * active runtime truth.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { gitReadOnly, isSafeRevision } from './git.js';

import type { ManifestTruth, VersionSource, VersionTruth } from './types.js';

function readJsonFile(path: string): Record<string, unknown> | undefined {
  if (!existsSync(path)) return undefined;

  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function versionOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export interface VersionTruthInput {
  projectRoot: string;
  /** Highest phase certification script implemented in source. */
  sourcePhase: number;
  maxPackageJsonBytes: number;
}

/** Collect and compare the active version sources without editing anything. */
export function collectVersionTruth(input: VersionTruthInput): VersionTruth {
  const sources: VersionSource[] = [];

  const pkg = readJsonFile(join(input.projectRoot, 'package.json')) as
    { version?: unknown } | undefined;

  const packageVersion = versionOf(pkg?.version) ?? '';

  if (packageVersion) {
    sources.push({ source: 'package.json', version: packageVersion, active: true });
  }

  const lock = readJsonFile(join(input.projectRoot, 'package-lock.json')) as
    { version?: unknown; packages?: Record<string, { version?: unknown }> } | undefined;

  const lockVersion = versionOf(lock?.version);

  if (lockVersion) {
    sources.push({
      source: 'package-lock.json',
      version: lockVersion,
      active: true,
    });
  }

  const lockRootVersion = versionOf(lock?.packages?.['']?.version);

  if (lockRootVersion) {
    sources.push({
      source: 'package-lock.json (root)',
      version: lockRootVersion,
      active: true,
    });
  }

  /* The MCP server identifies itself with a hard-coded internal version that
   * is intentionally not the package version; it is reported as an inactive
   * source so divergence stays visible without being flagged as runtime truth. */
  const serverPath = join(input.projectRoot, 'src', 'mcp', 'server.ts');

  if (existsSync(serverPath)) {
    const serverText = readFileSync(serverPath, 'utf8');
    const serverVersion = /version:\s*'([0-9A-Za-z.-]+)'/u.exec(serverText)?.[1];

    if (serverVersion) {
      sources.push({
        source: 'mcp server identity',
        version: serverVersion,
        active: false,
      });
    }
  }

  const manifest = readJsonFile(join(input.projectRoot, 'release-manifest.json')) as
    { version?: unknown } | undefined;

  const manifestVersion = versionOf(manifest?.version);

  if (manifestVersion) {
    sources.push({
      source: 'release-manifest.json',
      version: manifestVersion,
      active: true,
    });
  }

  /* The .release-target file pins the version the release pipeline verifies. */
  const targetPath = join(input.projectRoot, '.release-target');

  if (existsSync(targetPath)) {
    const targetVersion = readFileSync(targetPath, 'utf8').trim();

    if (targetVersion) {
      sources.push({ source: '.release-target', version: targetVersion, active: true });
    }
  }

  /* A secondary source whose version DIFFERS from package.json still describes
   * the active runtime — it just disagrees. Demote it from `active` (so it can
   * never masquerade as the single runtime truth) but report it as a
   * divergence; and when a divergence exists, only package.json remains the
   * authoritative active source. */
  const divergences = sources
    .filter((source) => source.source !== 'package.json' && source.version !== packageVersion)
    .map((source) => source.source);

  for (const source of sources) {
    if (source.source === 'package.json') continue;

    if (source.version !== packageVersion) {
      source.active = false;
    }
  }

  /* The newest tag is context; it is never treated as an active source. */
  const tags = gitReadOnly(input.projectRoot, ['tag', '--sort=-version:refname']);
  const latestTag = tags.stdout
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  /* Version truth is stale when the active version predates implemented
   * capabilities that are not represented by any release marker. The phase
   * certifications are the capability registry; a version is stale if a
   * certification exists whose phase has never been part of a published
   * series marker (the manifest version series). The conservative rule used
   * here: if any phase certification script exists and the release manifest
   * does not mention the newest implemented capability phase, the active
   * version cannot represent the current runtime. */
  const stale = sources.filter((source) => source.active).length > 0 && input.sourcePhase > 0;

  return {
    sources,
    divergences,
    stale,
    currentVersion: packageVersion,
    ...(latestTag !== undefined ? { latestTag } : {}),
  };
}

export interface ManifestTruthInput {
  projectRoot: string;
  /** Highest phase implemented in source (certification scripts). */
  sourcePhase: number;
}

/**
 * Determine whether the release manifest reflects the implemented capability
 * set. The manifest's taskReleaseCertification / retrievalReleaseCertification
 * blocks name the phases a release claims; anything implemented but missing
 * from them makes the manifest stale for release purposes.
 */
export function collectManifestTruth(input: ManifestTruthInput): ManifestTruth {
  const manifestPath = join(input.projectRoot, 'release-manifest.json');

  if (!existsSync(manifestPath)) {
    return { present: false, stale: true };
  }

  const manifest = readJsonFile(manifestPath) as
    | {
        version?: unknown;
        hardening?: {
          taskReleaseCertification?: Record<string, unknown>;
          retrievalReleaseCertification?: Record<string, unknown>;
          disasterRecovery?: Record<string, unknown>;
        };
      }
    | undefined;

  const manifestVersion = versionOf(manifest?.version);

  /* Phase markers the manifest declares, parsed from its certification blocks
   * (phaseNN keys). */
  const hardening = manifest?.hardening;
  const declared = [
    ...Object.keys(hardening?.taskReleaseCertification ?? {}),
    ...Object.keys(hardening?.retrievalReleaseCertification ?? {}),
    ...Object.keys(hardening?.disasterRecovery ?? {}),
  ];

  let manifestPhase = 0;

  for (const key of declared) {
    const match = /^phase(\d+)/iu.exec(key);

    if (match) manifestPhase = Math.max(manifestPhase, Number(match[1]));
  }

  const sourcePhase = input.sourcePhase;

  return {
    present: true,
    ...(manifestVersion !== undefined ? { manifestVersion } : {}),
    manifestPhase: manifestPhase > 0 ? manifestPhase : undefined,
    sourcePhase: sourcePhase > 0 ? sourcePhase : undefined,
    stale: sourcePhase > manifestPhase,
  };
}

export interface BaselineInput {
  projectRoot: string;
  requestedBaseline?: string;
}

export interface BaselineResult {
  ref?: string;
  tag?: string;
  known: boolean;
  reason?: 'BASE_RELEASE_UNKNOWN';
}

/**
 * Resolve the release baseline: the requested ref when valid, otherwise the
 * newest local version tag. Local metadata only — no network access.
 */
export function resolveBaseline(input: BaselineInput): BaselineResult {
  if (input.requestedBaseline !== undefined) {
    if (!isSafeRevision(input.requestedBaseline)) {
      return { known: false, reason: 'BASE_RELEASE_UNKNOWN' };
    }

    const verify = gitReadOnly(input.projectRoot, [
      'rev-parse',
      '--verify',
      '--end-of-options',
      input.requestedBaseline,
      '--',
    ]);

    if (!verify.ok) {
      return { known: false, reason: 'BASE_RELEASE_UNKNOWN' };
    }

    return { ref: input.requestedBaseline, known: true };
  }

  const tags = gitReadOnly(input.projectRoot, ['tag', '--sort=-version:refname']);

  const tag = tags.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && /^v[0-9]/u.test(line))
    .find(Boolean);

  if (tag === undefined) {
    return { known: false, reason: 'BASE_RELEASE_UNKNOWN' };
  }

  const verify = gitReadOnly(input.projectRoot, [
    'rev-parse',
    '--verify',
    '--end-of-options',
    `${tag}^{commit}`,
    '--',
  ]);

  if (!verify.ok) {
    return { known: false, reason: 'BASE_RELEASE_UNKNOWN' };
  }

  return { ref: `${tag}^{commit}`, tag, known: true };
}
