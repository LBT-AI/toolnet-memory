import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, normalize, relative, resolve, sep } from 'node:path';

import type { ServiceDescriptor, ServiceDetectionResult, ServiceKind } from './types.js';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.toolnet',
  '.toolnet-memory',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  '.parcel-cache',
  '.turbo',
  'vendor',
  'target',
  '__pycache__',
  '.venv',
  'venv',
]);

const MAX_WALK_DEPTH = 4;

const FRONTEND_DEPS = [
  'react',
  'react-dom',
  'next',
  'vue',
  'nuxt',
  'svelte',
  '@angular/core',
  'solid-js',
  'astro',
];

const BACKEND_DEPS = [
  'express',
  'fastify',
  '@nestjs/core',
  'koa',
  'hono',
  '@hapi/hapi',
  'restify',
  'fastapi',
  'flask',
  'django',
  'uvicorn',
  'gin',
  'echo',
];

const WORKER_DEPS = [
  'bull',
  'bullmq',
  'bee-queue',
  'kafkajs',
  'amqplib',
  'ioredis',
  'celery',
  'rq',
];

function cleanPath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//u, '');
}

function toProjectRelative(rootPath: string, absolute: string): string {
  const rel = cleanPath(relative(rootPath, absolute));
  return rel === '' ? '.' : rel;
}

function withinRoot(rootPath: string, candidate: string): boolean {
  const root = resolve(rootPath);
  const target = resolve(candidate);
  if (target === root) {
    return true;
  }
  const rel = relative(root, target);
  return rel.length > 0 && !rel.startsWith('..') && !rel.startsWith(`..${sep}`);
}

function readTextSafe(absolute: string, maxBytes = 262_144): string | null {
  try {
    const stats = statSync(absolute);
    if (!stats.isFile() || stats.size > maxBytes) {
      return null;
    }
    return readFileSync(absolute, 'utf8');
  } catch {
    return null;
  }
}

export function serviceId(projectId: string, rootPath: string): string {
  return createHash('sha256')
    .update(`${projectId}:${cleanPath(rootPath)}`)
    .digest('hex')
    .slice(0, 24);
}

function parseJsonSafe(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function dependencyNames(pkg: Record<string, unknown>): string[] {
  const names: string[] = [];
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const value = pkg[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      names.push(...Object.keys(value as Record<string, unknown>));
    }
  }
  return names;
}

function classifyNodeKind(pkg: Record<string, unknown>): ServiceKind {
  const deps = dependencyNames(pkg);
  const hasFrontend = deps.some((name) => FRONTEND_DEPS.includes(name));
  const hasBackend = deps.some((name) => BACKEND_DEPS.includes(name));
  const hasWorker = deps.some((name) => WORKER_DEPS.includes(name));

  if (hasWorker && !hasBackend) {
    return 'worker';
  }

  if (hasBackend) {
    return 'backend';
  }

  if (hasFrontend) {
    return 'frontend';
  }

  const scripts = pkg.scripts;
  if (scripts && typeof scripts === 'object') {
    const start = (scripts as Record<string, unknown>).start;
    if (typeof start === 'string' && /server|api|serve/u.test(start)) {
      return 'backend';
    }
  }

  if (typeof pkg.main === 'string' || typeof pkg.exports === 'object') {
    return 'library';
  }

  return 'unknown';
}

function classifyPythonKind(text: string): ServiceKind {
  const lower = text.toLowerCase();
  if (/\bfastapi\b|\bflask\b|\bdjango\b|\buvicorn\b/u.test(lower)) {
    return 'backend';
  }
  if (/\bcelery\b|\brq\b/u.test(lower)) {
    return 'worker';
  }
  return 'unknown';
}

function classifyGoKind(text: string): ServiceKind {
  if (/\bgin-gonic\/gin\b|\blabstack\/echo\b|\bgofiber\/fiber\b/u.test(text)) {
    return 'backend';
  }
  if (/\bsegmentio\/kafka-go\b|\bstreadway\/amqp091-go\b/u.test(text)) {
    return 'worker';
  }
  return 'unknown';
}

interface ManifestInfo {
  dir: string;
  filePath: string;
  kind: ServiceKind;
  name: string;
  entryPoints: string[];
}

function readNodeManifest(dir: string, filePath: string): ManifestInfo | null {
  const text = readTextSafe(join(dir, 'package.json'));
  if (!text) {
    return null;
  }
  const pkg = parseJsonSafe(text);
  if (!pkg) {
    return null;
  }
  const entryPoints: string[] = [];
  for (const key of ['main', 'module', 'bin']) {
    const value = pkg[key];
    if (typeof value === 'string' && value.endsWith('.js')) {
      entryPoints.push(cleanPath(join(dir, value)));
    }
  }
  return {
    dir,
    filePath,
    kind: classifyNodeKind(pkg),
    name: typeof pkg.name === 'string' ? pkg.name : '',
    entryPoints,
  };
}

function readGoManifest(dir: string, filePath: string): ManifestInfo | null {
  const text = readTextSafe(join(dir, 'go.mod'));
  if (!text) {
    return null;
  }
  const moduleMatch = /^module\s+(\S+)/mu.exec(text);
  return {
    dir,
    filePath,
    kind: classifyGoKind(text),
    name: moduleMatch?.[1] ?? '',
    entryPoints: [],
  };
}

function readPythonManifest(dir: string, filePath: string): ManifestInfo | null {
  const text = readTextSafe(join(dir, 'pyproject.toml'));
  if (!text) {
    return null;
  }
  const nameMatch = /^\s*name\s*=\s*"([^"]+)"/mu.exec(text);
  const kind = /\[project\.scripts\]|\[project\.entry-points\]/u.test(text)
    ? 'library'
    : classifyPythonKind(text);
  return {
    dir,
    filePath,
    kind,
    name: nameMatch?.[1] ?? '',
    entryPoints: [],
  };
}

function manifestFor(dir: string): ManifestInfo | null {
  const rootRelative = (...parts: string[]) => cleanPath(parts.join('/'));

  if (existsSync(join(dir, 'package.json'))) {
    return readNodeManifest(dir, rootRelative(toProjectRelative(dir, join(dir, 'package.json'))));
  }
  if (existsSync(join(dir, 'go.mod'))) {
    return readGoManifest(dir, 'go.mod');
  }
  if (existsSync(join(dir, 'pyproject.toml'))) {
    return readPythonManifest(dir, 'pyproject.toml');
  }
  return null;
}

function walkManifestDirs(rootPath: string): string[] {
  const found: string[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: resolve(rootPath), depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.depth > MAX_WALK_DEPTH) {
      continue;
    }

    let entries: string[];
    try {
      entries = readdirSync(current.dir).sort();
    } catch {
      continue;
    }

    for (const entry of entries) {
      const absolute = join(current.dir, entry);

      if (!withinRoot(rootPath, absolute)) {
        continue;
      }

      let stats;
      try {
        stats = statSync(absolute);
      } catch {
        continue;
      }

      if (!stats.isDirectory() || stats.isSymbolicLink()) {
        continue;
      }

      if (IGNORED_DIRECTORIES.has(entry)) {
        continue;
      }

      if (
        existsSync(join(absolute, 'package.json')) ||
        existsSync(join(absolute, 'go.mod')) ||
        existsSync(join(absolute, 'pyproject.toml'))
      ) {
        found.push(absolute);
      }

      queue.push({ dir: absolute, depth: current.depth + 1 });
    }
  }

  return found;
}

/**
 * Deterministic service boundary detection.
 *
 * Boundaries are derived only from manifest evidence (package.json,
 * go.mod, pyproject.toml, workspace declarations). Directory names are
 * never used as the sole authority; when no manifest proves a boundary the
 * service kind stays `unknown`.
 */
export function detectServices(projectId: string, rootPath: string): ServiceDetectionResult {
  const notes: string[] = [];
  const manifests: ManifestInfo[] = [];

  const rootManifest = existsSync(join(rootPath, 'package.json'))
    ? readNodeManifest(resolve(rootPath), 'package.json')
    : existsSync(join(rootPath, 'go.mod'))
      ? readGoManifest(resolve(rootPath), 'go.mod')
      : existsSync(join(rootPath, 'pyproject.toml'))
        ? readPythonManifest(resolve(rootPath), 'pyproject.toml')
        : null;

  if (rootManifest) {
    manifests.push(rootManifest);
  }

  for (const dir of walkManifestDirs(rootPath)) {
    const rel = toProjectRelative(rootPath, dir);
    const manifest = manifestFor(dir);
    if (manifest) {
      manifests.push({ ...manifest, filePath: cleanPath(`${rel}/${manifest.filePath}`) });
    }
  }

  const deduped = new Map<string, ManifestInfo>();
  for (const manifest of manifests) {
    const key = cleanPath(
      manifest.dir === resolve(rootPath) ? '.' : toProjectRelative(rootPath, manifest.dir)
    );
    if (!deduped.has(key)) {
      deduped.set(key, { ...manifest, dir: key });
    }
  }

  if (deduped.size > 1) {
    notes.push(`detected ${deduped.size} manifest-defined boundaries`);
  }

  const services: ServiceDescriptor[] = [...deduped.values()]
    .map((manifest) => ({
      id: serviceId(projectId, manifest.dir),
      projectId,
      name: manifest.name || manifest.dir || 'root',
      rootPath: manifest.dir,
      kind: manifest.kind,
      entryPoints: manifest.entryPoints
        .map((entry) => cleanPath(relative(resolve(rootPath), resolve(rootPath, entry))))
        .sort(),
      manifests: [manifest.filePath],
    }))
    .sort((left, right) =>
      left.rootPath === right.rootPath
        ? left.id.localeCompare(right.id)
        : left.rootPath.localeCompare(right.rootPath)
    );

  return {
    services,
    unassignedFiles: [],
    notes,
  };
}

/**
 * Longest-prefix file -> service attribution.
 *
 * Identity includes the canonical service root so `apps/api` and
 * `examples/api` never collide even when both packages are named `api`.
 */
export function serviceForFile(
  services: readonly ServiceDescriptor[],
  filePath: string
): ServiceDescriptor | undefined {
  const normalized = cleanPath(filePath);

  let best: ServiceDescriptor | undefined;
  let bestLength = -1;

  for (const service of services) {
    const root = service.rootPath === '.' ? '' : service.rootPath;

    if (root === '') {
      if (bestLength < 0) {
        best = service;
        bestLength = 0;
      }
      continue;
    }

    if (normalized === root || normalized.startsWith(`${root}/`)) {
      if (root.length > bestLength) {
        best = service;
        bestLength = root.length;
      }
    }
  }

  return best;
}

const UNSUPPORTED_FRAMEWORK_MARKERS: ReadonlyArray<{ label: string; markers: string[] }> = [
  {
    label: 'graphql',
    markers: [
      '"graphql"',
      "'graphql'",
      '@nestjs/graphql',
      '@apollo/server',
      'apollo-server',
      'graphene',
      'strawberry-graphql',
    ],
  },
  {
    label: 'grpc',
    markers: ['@grpc/grpc-js', 'google.golang.org/grpc', 'grpcio', 'grpc-go'],
  },
  { label: 'trpc', markers: ['@trpc/server', '@trpc/client'] },
  { label: 'kafka', markers: ['kafkajs', 'segmentio/kafka-go', 'confluent-kafka', 'kafka-python'] },
  { label: 'amqp', markers: ['amqplib', 'streadway/amqp', 'amqp091-go', 'pika'] },
  { label: 'bull-queue', markers: ['bullmq', 'bee-queue'] },
  { label: 'celery', markers: ['celery'] },
];

/**
 * Deterministic framework coverage signal.
 *
 * A service that declares a protocol framework for which Phase 72 has no
 * extractor can never be trusted for a negative cross-service claim. This is
 * read from manifest text only; no package manager is executed.
 */
export function detectUnsupportedFrameworks(
  rootPath: string,
  services: readonly ServiceDescriptor[]
): string[] {
  const found = new Set<string>();

  for (const service of services) {
    for (const manifest of service.manifests) {
      const absolute = resolve(rootPath, manifest);
      if (!withinRoot(rootPath, absolute)) {
        continue;
      }
      const text = readTextSafe(absolute);
      if (!text) {
        continue;
      }
      const lower = text.toLowerCase();
      for (const { label, markers } of UNSUPPORTED_FRAMEWORK_MARKERS) {
        if (markers.some((marker) => lower.includes(marker.toLowerCase()))) {
          found.add(label);
        }
      }
    }
  }

  return [...found].sort();
}

export { normalize as normalizeServicePath };
