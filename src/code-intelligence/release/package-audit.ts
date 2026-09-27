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

export function auditPackageContents(input: PackageAuditInput): PackageAuditResult {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: input.projectRoot,
    encoding: 'utf8',
    timeout: 120_000,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, npm_config_progress: 'false' },
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return {
      audit: {
        fileCount: 0,
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

  let parsed: Array<{
    files?: Array<{ path: string; size?: number }>;
    size?: number;
    unpackedSize?: number;
  }>;

  try {
    parsed = JSON.parse(result.stdout) as typeof parsed;
  } catch {
    return {
      audit: {
        fileCount: 0,
        sensitivePaths: [],
        unexpectedPaths: [],
        requiredPresent: [],
        requiredMissing: REQUIRED_PACKAGE_FILES.slice(),
        complete: false,
      },
      truncated: false,
      available: false,
      note: 'npm pack manifest was not parseable JSON',
    };
  }

  const entry = parsed[0] ?? {};
  const files = (entry.files ?? []).slice(0, input.maxPackageFiles);
  const truncated = (entry.files ?? []).length > input.maxPackageFiles;

  const sensitivePaths: string[] = [];
  const unexpectedPaths: string[] = [];
  const labels: string[] = [];

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

    labels.push(path);
  }

  const shipped = new Set(files.map((file) => file.path));
  const requiredPresent = REQUIRED_PACKAGE_FILES.filter((file) => shipped.has(file));
  const requiredMissing = REQUIRED_PACKAGE_FILES.filter((file) => !shipped.has(file));

  const pkgPath = join(input.projectRoot, 'package.json');

  let complete = !truncated && requiredMissing.length === 0;

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
      sensitivePaths: sensitivePaths.slice(0, input.maxPackageFiles),
      unexpectedPaths: unexpectedPaths.slice(0, input.maxPackageFiles),
      requiredPresent,
      requiredMissing,
      complete,
    },
    truncated,
    available: true,
  };
}
