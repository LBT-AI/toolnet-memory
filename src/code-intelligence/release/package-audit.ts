/*
 * Phase 83 — npm package contents and leak audit.
 *
 * Runs `npm pack --dry-run --json` (never `npm publish`) to enumerate exactly
 * what would ship, then audits the manifest for sensitive files (.env, keys,
 * credentials), unexpected derived state (.toolnet, .local, caches, sockets),
 * and required runtime entrypoints. Sensitive file NAMES are reported; file
 * CONTENTS are never read into the report.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PackageContentAudit } from './types.js';

export interface PackageAuditInput {
  projectRoot: string;
  maxPackageFiles: number;
  maxPackageJsonBytes: number;
}

export interface PackageAuditResult {
  audit: PackageContentAudit;
  truncated: boolean;
  available: boolean;
  note?: string;
}

/** A single packed file as reported by `npm pack --json`. */
export interface PackManifestFile {
  path: string;
  size?: number;
}

/** One packed package as reported by `npm pack --json`. */
export interface PackManifestEntry {
  id?: string;
  name?: string;
  version?: string;
  unpackedSize?: number;
  files: PackManifestFile[];
}

/** Required runtime entrypoints the package must ship. */
const REQUIRED_PACKAGE_FILES = ['package.json', 'bundle/mcp.js', 'release-manifest.json'] as const;

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  /* `.env.example` is an intentional, secret-free template and is NOT sensitive;
   * only real env files (.env, .env.*) count. */
  { pattern: /(^|\/)\.env\.(?!example\b)[A-Za-z0-9_.-]+$/u, label: 'env_file' },
  { pattern: /(^|\/)\.env$/u, label: 'env_file' },
  { pattern: /credentials?\.(json|ts|js)$/iu, label: 'credentials' },
  { pattern: /\.pem$/u, label: 'private_key' },
  { pattern: /id_rsa|\.ed25519$/u, label: 'private_key' },
  { pattern: /secret/iu, label: 'secret_named' },
  { pattern: /(^|\/)\.toolnet(\/|$)/u, label: 'project_data' },
  { pattern: /(^|\/)\.local(\/|$)/u, label: 'local_cache' },
  { pattern: /node_modules\/\.cache\//u, label: 'cache' },
  { pattern: /\.sock$/u, label: 'socket' },
  { pattern: /\.sqlite(-journal|-wal|-shm)?$/u, label: 'database' },
];

const UNEXPECTED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(^|\/)\.toolnet(\/|$)/u, label: 'project_runtime_state' },
  { pattern: /(^|\/)\.local(\/|$)/u, label: 'local_state' },
  { pattern: /(^|\/)\.cache(\/|$)/u, label: 'cache' },
  { pattern: /(^|\/)\.DS_Store$/u, label: 'os_artifact' },
  { pattern: /(^|\/)npm-debug\.log/u, label: 'debug_log' },
  { pattern: /(^|\/)\.toolnet-.*(\/|$)/u, label: 'toolnet_temp' },
  { pattern: /(^|\/)daemon.*\.sock$/u, label: 'daemon_socket' },
  { pattern: /(^|\/)_t\.ts$/u, label: 'scratch_file' },
];

/**
 * Normalize a packed path so comparisons are stable across platforms and npm
 * versions: separators, leading `./`, repeated separators and trailing slashes
 * never change the identity of a shipped file.
 */
export function normalizeManifestPath(raw: string): string {
  let path = raw.replace(/\\/gu, '/');

  while (path.startsWith('./')) {
    path = path.slice(2);
  }

  path = path.replace(/\/{2,}/gu, '/');

  while (path.startsWith('/')) {
    path = path.slice(1);
  }

  return path.length > 1 ? path.replace(/\/+$/u, '') : path;
}

function readFileEntry(item: unknown): PackManifestFile | undefined {
  /* npm reports packed files as objects with a `path`; a bare string is
   * tolerated so a future simplification still parses. */
  const raw = typeof item === 'string' ? item : undefined;

  if (raw === undefined) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return undefined;
    }
  }

  const record = (raw === undefined ? item : undefined) as Record<string, unknown> | undefined;

  const candidate = raw ?? (typeof record?.path === 'string' ? record.path : undefined);

  if (candidate === undefined) {
    return undefined;
  }

  const path = normalizeManifestPath(candidate);

  if (!path) {
    return undefined;
  }

  return typeof record?.size === 'number' ? { path, size: record.size } : { path };
}

function toPackManifestEntry(candidate: unknown): PackManifestEntry | undefined {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return undefined;
  }

  const record = candidate as Record<string, unknown>;

  /* An entry without a `files` array carries no auditable content. */
  if (!Array.isArray(record.files)) {
    return undefined;
  }

  const files: PackManifestFile[] = [];

  for (const item of record.files) {
    const file = readFileEntry(item);

    if (file) {
      files.push(file);
    }
  }

  return {
    ...(typeof record.id === 'string' ? { id: record.id } : {}),
    ...(typeof record.name === 'string' ? { name: record.name } : {}),
    ...(typeof record.version === 'string' ? { version: record.version } : {}),
    ...(typeof record.unpackedSize === 'number' ? { unpackedSize: record.unpackedSize } : {}),
    files,
  };
}

/**
 * Normalize `npm pack --json` output across npm majors.
 *
 * npm <= 11 emits an array of package entries, e.g. `[{ files: [...] }]`.
 * npm >= 12 emits the same shape as `npm publish --json`: an object keyed by
 * package name, e.g. `{ 'toolnet-memory': { files: [...] } }`. A single entry
 * object carrying its own `files` array is accepted too, so the parser never
 * depends on which of those two spellings npm picked.
 *
 * Anything that does not resolve to at least one entry with a `files` array
 * yields no entries, so callers fail closed instead of auditing an empty
 * package and reporting a misleading release blocker.
 */
export function parsePackManifestEntries(stdout: string): PackManifestEntry[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stdout);
  } catch {
    return [];
  }

  let candidates: unknown[];

  if (Array.isArray(parsed)) {
    candidates = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;

    candidates = Array.isArray(record.files) ? [parsed] : Object.values(record);
  } else {
    candidates = [];
  }

  const entries: PackManifestEntry[] = [];

  for (const candidate of candidates) {
    const entry = toPackManifestEntry(candidate);

    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

export function auditPackageContents(input: PackageAuditInput): PackageAuditResult {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: input.projectRoot,
    encoding: 'utf8',
    timeout: 120_000,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      npm_config_progress: 'false',
      /* Never depend on ANSI/localized output: the manifest is JSON only. */
      npm_config_color: 'false',
      NO_COLOR: '1',
    },
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return {
      audit: {
        fileCount: 0,
        duplicatePaths: [],
        sensitivePaths: [],
        unexpectedPaths: [],
        requiredPresent: [],
        requiredMissing: REQUIRED_PACKAGE_FILES.slice(),
        complete: false,
      },
      truncated: false,
      available: false,
      note: 'npm pack --dry-run failed or produced no manifest',
    };
  }

  const entries = parsePackManifestEntries(result.stdout);
  const entry = entries[0];

  /* An unrecognized manifest shape is a failed audit, never an empty package:
   * silently reporting zero files would surface as a missing-capability
   * blocker with a misleading cause. */
  if (!entry) {
    return {
      audit: {
        fileCount: 0,
        duplicatePaths: [],
        sensitivePaths: [],
        unexpectedPaths: [],
        requiredPresent: [],
        requiredMissing: REQUIRED_PACKAGE_FILES.slice(),
        complete: false,
      },
      truncated: false,
      available: false,
      note: 'npm pack manifest shape was not recognized',
    };
  }

  const files = entry.files.slice(0, input.maxPackageFiles);
  const truncated = entry.files.length > input.maxPackageFiles;

  const sensitivePaths: string[] = [];
  const unexpectedPaths: string[] = [];

  for (const file of files) {
    const path = file.path;

    for (const { pattern, label } of SENSITIVE_PATTERNS) {
      if (pattern.test(path)) {
        sensitivePaths.push(`${path} (${label})`);
        break;
      }
    }

    for (const { pattern, label } of UNEXPECTED_PATTERNS) {
      if (pattern.test(path)) {
        unexpectedPaths.push(`${path} (${label})`);
        break;
      }
    }
  }

  /* Deterministic, order-independent inventory: a file listed twice would
   * otherwise be invisible to a Set-based required check. */
  const occurrences = new Map<string, number>();

  for (const file of files) {
    occurrences.set(file.path, (occurrences.get(file.path) ?? 0) + 1);
  }

  const duplicatePaths = [...occurrences.entries()]
    .filter(([, count]) => count > 1)
    .map(([path]) => path)
    .sort();

  const shipped = new Set(occurrences.keys());
  const requiredPresent = REQUIRED_PACKAGE_FILES.filter((file) => shipped.has(file));
  const requiredMissing = REQUIRED_PACKAGE_FILES.filter((file) => !shipped.has(file));

  const pkgPath = join(input.projectRoot, 'package.json');

  let complete = !truncated && requiredMissing.length === 0 && duplicatePaths.length === 0;

  if (complete && existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { files?: string[] };

      /* The declared `files` allow-list is authoritative for shipped content;
       * npm only reports what is actually shipped, so this check stays light. */
      if (Array.isArray(pkg.files) && !pkg.files.includes('release-manifest.json')) {
        complete = false;
      }
    } catch {
      complete = false;
    }
  }

  return {
    audit: {
      fileCount: files.length,
      ...(entry.unpackedSize !== undefined ? { unpackedBytes: entry.unpackedSize } : {}),
      duplicatePaths,
      /* Sorted and de-duplicated so the report never depends on npm's ordering. */
      sensitivePaths: [...new Set(sensitivePaths)].sort().slice(0, input.maxPackageFiles),
      unexpectedPaths: [...new Set(unexpectedPaths)].sort().slice(0, input.maxPackageFiles),
      requiredPresent,
      requiredMissing,
      complete,
    },
    truncated,
    available: true,
  };
}
