import { existsSync, readFileSync } from 'node:fs';

import { dirname, join, parse, resolve } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

const REPOSITORY_MARKERS = [
  '.git',
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'composer.json',
];

function hasRepositoryMarker(directory: string): boolean {
  return REPOSITORY_MARKERS.some((marker) => existsSync(join(directory, marker)));
}

function repositoryBoundary(startPath: string): string | null {
  let current = resolve(startPath);

  const root = parse(current).root;

  while (true) {
    if (hasRepositoryMarker(current)) {
      return current;
    }

    if (current === root) {
      return null;
    }

    const parent = dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

function findManifest(startPath: string): string | null {
  let current = resolve(startPath);

  const boundary = repositoryBoundary(current);

  const filesystemRoot = parse(current).root;

  while (true) {
    const candidate = join(current, '.toolnet', 'project.json');

    if (existsSync(candidate)) {
      return candidate;
    }

    if (boundary && current === boundary) {
      return null;
    }

    if (current === filesystemRoot) {
      return null;
    }

    const parent = dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export function requireInitializedProject(startPath: string = process.cwd()): ProjectManifest {
  const file = findManifest(startPath);

  if (!file) {
    throw new Error('PROJECT_NOT_INITIALIZED');
  }

  let value: unknown;

  try {
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`INVALID_PROJECT_MANIFEST: ${file}`);
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`INVALID_PROJECT_MANIFEST: ${file}`);
  }

  const data = value as Record<string, unknown>;

  if (typeof data.id !== 'string' || !data.id.trim()) {
    throw new Error(`INVALID_PROJECT_MANIFEST: missing id`);
  }

  if (typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error(`INVALID_PROJECT_MANIFEST: missing name`);
  }

  const projectRoot = dirname(dirname(file));

  return {
    id: data.id,
    name: data.name,
    remote: typeof data.remote === 'string' && data.remote.trim() ? data.remote : data.name,
    rootPath: projectRoot,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString(),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(0).toISOString(),
    graphVersion: typeof data.graphVersion === 'number' ? data.graphVersion : 0,
    memoryVersion: typeof data.memoryVersion === 'number' ? data.memoryVersion : 0,
    metadata:
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : undefined,
  };
}
