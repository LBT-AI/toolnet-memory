import { createHash } from 'node:crypto';

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { basename, dirname, join, parse, resolve } from 'node:path';

import type { ProjectManifest } from './types.js';

const TOOLNET_DIRECTORY = '.toolnet';

const PROJECT_FILE = 'project.json';

interface LocalProjectManifest {
  version: 1;

  id: string;
  name: string;

  /**
   * Physical namespace in remote storage:
   *
   * projects/<remote>/
   */
  remote: string;

  rootPath: string;

  createdAt: string;
  updatedAt: string;

  graphVersion: number;
  memoryVersion: number;

  metadata?: Record<string, unknown>;
}

/**
 * Legacy ID algorithm.
 *
 * IMPORTANT:
 * Existing ToolNet projects already use this ID internally.
 * We keep it for the first local manifest creation so no
 * graph/memory/snapshot projectId is invalidated.
 *
 * Once stored in .toolnet/project.json, the ID no longer
 * depends on the path.
 */
function legacyProjectIdFromPath(rootPath: string): string {
  return createHash('sha256').update(rootPath).digest('hex').slice(0, 16);
}

function manifestPath(rootPath: string): string {
  return join(rootPath, TOOLNET_DIRECTORY, PROJECT_FILE);
}

function hasProjectManifest(rootPath: string): boolean {
  return existsSync(manifestPath(rootPath));
}

/**
 * Search upwards for an existing ToolNet project identity.
 *
 * This means running ToolNet from:
 *
 * ~/mercedes/src/foo/
 *
 * still resolves:
 *
 * ~/mercedes/.toolnet/project.json
 */
function findExistingProjectRoot(startPath: string, stopAt?: string): string | null {
  let current = resolve(startPath);

  const filesystemRoot = parse(current).root;

  while (true) {
    if (hasProjectManifest(current)) {
      return current;
    }

    if (current === filesystemRoot || (stopAt && current === resolve(stopAt))) {
      break;
    }

    const parent = dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  return null;
}

/**
 * When a project has not been initialized yet, try to identify
 * its repository root instead of accidentally creating
 * .toolnet inside src/foo/.
 */
function findRepositoryRoot(startPath: string): string {
  let current = resolve(startPath);

  const filesystemRoot = parse(current).root;

  const markers = [
    '.git',
    'package.json',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'composer.json',
  ];

  while (true) {
    if (markers.some((marker) => existsSync(join(current, marker)))) {
      return current;
    }

    if (current === filesystemRoot) {
      break;
    }

    const parent = dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  return resolve(startPath);
}

function parseManifest(filePath: string): LocalProjectManifest {
  let value: unknown;

  try {
    value = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Invalid ToolNet project manifest: ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!value || typeof value !== 'object') {
    throw new Error(`Invalid ToolNet project manifest: ${filePath}`);
  }

  const data = value as Record<string, unknown>;

  if (typeof data.id !== 'string' || !data.id.trim()) {
    throw new Error(`ToolNet project manifest is missing id: ${filePath}`);
  }

  if (typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error(`ToolNet project manifest is missing name: ${filePath}`);
  }

  const now = new Date().toISOString();

  return {
    version: 1,

    id: data.id,

    name: data.name,

    remote: typeof data.remote === 'string' && data.remote.trim() ? data.remote : data.name,

    rootPath: typeof data.rootPath === 'string' ? data.rootPath : dirname(dirname(filePath)),

    createdAt: typeof data.createdAt === 'string' ? data.createdAt : now,

    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : now,

    graphVersion: typeof data.graphVersion === 'number' ? data.graphVersion : 0,

    memoryVersion: typeof data.memoryVersion === 'number' ? data.memoryVersion : 0,

    metadata:
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : undefined,
  };
}

function writeManifest(rootPath: string, manifest: LocalProjectManifest): void {
  const directory = join(rootPath, TOOLNET_DIRECTORY);

  mkdirSync(directory, {
    recursive: true,
  });

  const target = manifestPath(rootPath);

  const temporary = `${target}.tmp-${process.pid}`;

  writeFileSync(temporary, JSON.stringify(manifest, null, 2) + '\n', {
    encoding: 'utf8',

    mode: 0o600,
  });

  renameSync(temporary, target);
}

function toProjectManifest(
  local: LocalProjectManifest,

  rootPath: string
): ProjectManifest {
  return {
    id: local.id,

    name: local.name,

    remote: local.remote,

    rootPath,

    createdAt: local.createdAt,

    updatedAt: local.updatedAt,

    graphVersion: local.graphVersion,

    memoryVersion: local.memoryVersion,

    metadata: local.metadata,
  };
}

export class ProjectManager {
  detect(rootPath: string = process.cwd()): ProjectManifest {
    const requestedPath = resolve(rootPath);

    /*
     * Determine the nearest repository boundary first.
     *
     * A ToolNet manifest belonging to a parent directory must
     * never capture a nested repository. Example:
     *
     *   /home/user/.toolnet/project.json
     *   /home/user/my-app/package.json
     *
     * my-app must become its own project instead of inheriting
     * the HOME project identity.
     */
    const projectRoot = findRepositoryRoot(requestedPath);

    const repositoryMarkers = [
      '.git',
      'package.json',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
      'composer.json',
    ];

    const hasRepositoryBoundary = repositoryMarkers.some((marker) =>
      existsSync(join(projectRoot, marker))
    );

    /*
     * Existing identity wins only inside the current repository.
     * If no repository marker exists, preserve legacy upward
     * discovery behaviour.
     */
    const existingRoot = findExistingProjectRoot(
      requestedPath,
      hasRepositoryBoundary ? projectRoot : undefined
    );

    if (existingRoot) {
      const filePath = manifestPath(existingRoot);

      const local = parseManifest(filePath);

      /*
       * Project may have been moved or its folder renamed.
       *
       * Update only rootPath.
       * DO NOT change:
       *   id
       *   name
       *   remote
       */
      if (local.rootPath !== existingRoot) {
        local.rootPath = existingRoot;

        local.updatedAt = new Date().toISOString();

        writeManifest(existingRoot, local);
      }

      return toProjectManifest(local, existingRoot);
    }

    /*
     * First ToolNet initialization.
     */
    const now = new Date().toISOString();

    const name = basename(projectRoot);

    const local: LocalProjectManifest = {
      version: 1,

      /*
       * Preserve the legacy ID on first initialization.
       *
       * From now on this value lives in the manifest
       * and becomes path-independent.
       */
      id: legacyProjectIdFromPath(projectRoot),

      name,

      remote: name,

      rootPath: projectRoot,

      createdAt: now,

      updatedAt: now,

      graphVersion: 0,

      memoryVersion: 0,
    };

    writeManifest(projectRoot, local);

    return toProjectManifest(local, projectRoot);
  }
}
