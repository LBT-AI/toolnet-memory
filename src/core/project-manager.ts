import { createHash } from 'node:crypto';

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { basename, dirname, join, parse, resolve } from 'node:path';

import type { ProjectManifest } from './types.js';
import {
  GIT_IDENTITY_SCHEME,
  inspectGitProjectIdentity,
  stableProjectIdFromGitRemote,
  type GitProjectIdentity,
} from './project-identity.js';

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

export interface ProjectAdoptionInput {
  id: string;
  name: string;
  remote: string;
  createdAt?: string;
  updatedAt?: string;
  graphVersion?: number;
  memoryVersion?: number;
  metadata?: Record<string, unknown>;
  gitIdentity?: GitProjectIdentity;
}
export interface RecordGitIdentityOptions {
  allowRebind?: boolean;
}
function gitIdentityMetadata(identity: GitProjectIdentity): Record<string, unknown> {
  return {
    version: 1,
    scheme: GIT_IDENTITY_SCHEME,
    canonicalRemote: identity.canonicalRemote,
    fingerprint: identity.fingerprint,
    repositoryName: identity.repositoryName,
  };
}
function manifestGitIdentityFingerprint(manifest: LocalProjectManifest): string | null {
  const raw = manifest.metadata?.toolnetIdentity;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const data = raw as Record<string, unknown>;
  return typeof data.fingerprint === 'string' ? data.fingerprint : null;
}
export class ProjectManager {
  adopt(rootPath: string, input: ProjectAdoptionInput): ProjectManifest {
    const projectRoot = findRepositoryRoot(resolve(rootPath));
    if (!input.id.trim()) {
      throw new Error('PROJECT_ADOPTION_INVALID_ID');
    }
    if (!input.name.trim()) {
      throw new Error('PROJECT_ADOPTION_INVALID_NAME');
    }
    if (!input.remote.trim()) {
      throw new Error('PROJECT_ADOPTION_INVALID_REMOTE');
    }
    if (hasProjectManifest(projectRoot)) {
      const current = parseManifest(manifestPath(projectRoot));
      if (current.id !== input.id) {
        throw new Error(
          [
            'PROJECT_IDENTITY_ALREADY_EXISTS',
            `existing=${current.id}`,
            `requested=${input.id}`,
          ].join(' ')
        );
      }
      return toProjectManifest(current, projectRoot);
    }
    const now = new Date().toISOString();
    const metadata: Record<string, unknown> = {
      ...input.metadata,
    };
    if (input.gitIdentity) {
      metadata.toolnetIdentity = gitIdentityMetadata(input.gitIdentity);
    }
    const local: LocalProjectManifest = {
      version: 1,
      id: input.id.trim(),
      name: input.name.trim(),
      remote: input.remote.trim(),
      rootPath: projectRoot,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
      graphVersion: input.graphVersion ?? 0,
      memoryVersion: input.memoryVersion ?? 0,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    };
    writeManifest(projectRoot, local);
    return toProjectManifest(local, projectRoot);
  }
  recordGitIdentity(
    rootPath: string,
    identity: GitProjectIdentity,
    options: RecordGitIdentityOptions = {}
  ): ProjectManifest {
    const project = this.requireExisting(rootPath);
    const file = manifestPath(project.rootPath);
    const local = parseManifest(file);
    const existingFingerprint = manifestGitIdentityFingerprint(local);
    if (
      existingFingerprint &&
      existingFingerprint !== identity.fingerprint &&
      !options.allowRebind
    ) {
      throw new Error(
        [
          'PROJECT_GIT_REMOTE_CHANGED',
          `existing=${existingFingerprint}`,
          `current=${identity.fingerprint}`,
          'Use explicit rebind only when this repository identity change is intentional.',
        ].join(' ')
      );
    }
    const currentIdentity = local.metadata?.toolnetIdentity;
    if (
      currentIdentity &&
      typeof currentIdentity === 'object' &&
      !Array.isArray(currentIdentity) &&
      (currentIdentity as Record<string, unknown>).fingerprint === identity.fingerprint
    ) {
      return toProjectManifest(local, project.rootPath);
    }
    local.metadata = {
      ...local.metadata,
      toolnetIdentity: gitIdentityMetadata(identity),
    };
    local.updatedAt = new Date().toISOString();
    writeManifest(project.rootPath, local);
    return toProjectManifest(local, project.rootPath);
  }
  findExisting(rootPath: string = process.cwd()): ProjectManifest | null {
    const requestedPath = resolve(rootPath);
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
    const existingRoot = findExistingProjectRoot(
      requestedPath,
      hasRepositoryBoundary ? projectRoot : undefined
    );
    if (!existingRoot) {
      return null;
    }
    const local = parseManifest(manifestPath(existingRoot));
    return toProjectManifest(local, existingRoot);
  }
  requireExisting(rootPath: string = process.cwd()): ProjectManifest {
    const project = this.findExisting(rootPath);
    if (!project) {
      throw new Error('PROJECT_NOT_INITIALIZED');
    }
    return project;
  }
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

    const gitIdentity = inspectGitProjectIdentity(projectRoot);

    const local: LocalProjectManifest = {
      version: 1,

      /*
       * New repositories use canonical Git identity so
       * independent clones receive the same project ID.
       *
       * Non-Git projects retain the legacy path-based
       * fallback for backwards compatibility.
       */
      id: gitIdentity
        ? stableProjectIdFromGitRemote(gitIdentity.canonicalRemote)
        : legacyProjectIdFromPath(projectRoot),

      name,

      /*
       * New Git repositories also receive a stable remote
       * storage namespace based on repository identity
       * rather than the local checkout directory name.
       *
       * Existing projects never change their remote field.
       */
      remote: gitIdentity?.repositoryName ?? name,

      rootPath: projectRoot,

      createdAt: now,

      updatedAt: now,

      graphVersion: 0,

      memoryVersion: 0,

      metadata: gitIdentity
        ? {
            toolnetIdentity: gitIdentityMetadata(gitIdentity),
          }
        : undefined,
    };

    writeManifest(projectRoot, local);

    return toProjectManifest(local, projectRoot);
  }
}
