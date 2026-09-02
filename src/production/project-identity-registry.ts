import { resolve } from 'node:path';
import {
  loadConfig,
  ProjectManager,
  inspectGitProjectIdentity,
  type GitProjectIdentity,
  type ProjectManifest,
} from '../core/index.js';
import {
  createStorageProvider,
  sanitizeProjectFolder,
  withStorageRetry,
  type StorageProvider,
} from '../storage/index.js';
const REGISTRY_PREFIX = '_toolnet/registry/project-identities/v1';
export interface ProjectIdentityRegistryRecord {
  version: 1;
  fingerprint: string;
  canonicalGitRemote: string;
  projectId: string;
  projectName: string;
  projectRemote: string;
  createdAt: string;
  updatedAt: string;
}
export type ProjectIdentitySource =
  | 'existing-manifest'
  | 'remote-registry'
  | 'explicit-remote-adoption'
  | 'git-remote'
  | 'legacy-path';
export type ProjectIdentityRegistryStatus =
  'registered' | 'matched' | 'disabled' | 'skipped' | 'unavailable';
export interface ProjectIdentityBootstrapResult {
  project: ProjectManifest;
  source: ProjectIdentitySource;
  gitIdentity: GitProjectIdentity | null;
  registry: ProjectIdentityRegistryStatus;
  registryProvider?: string;
}
export interface ProjectIdentityBootstrapOptions {
  storage?: StorageProvider;
  storageIsCrossMachine?: boolean;
  skipRemoteIdentity?: boolean;
  adoptRemote?: string;
  allowGitRebind?: boolean;
}
interface RegistryStorageContext {
  storage: StorageProvider;
  crossMachine: boolean;
  providerName: string;
}
interface RemoteProjectManifest {
  version?: number;
  id: string;
  name: string;
  remote: string;
  createdAt?: string;
  updatedAt?: string;
}
export class ProjectIdentityCollisionError extends Error {
  readonly code = 'PROJECT_IDENTITY_COLLISION';
  constructor(message: string) {
    super(message);
    this.name = 'ProjectIdentityCollisionError';
  }
}
export class ProjectIdentityAdoptionRequiredError extends Error {
  readonly code = 'PROJECT_IDENTITY_ADOPTION_REQUIRED';
  constructor(remote: string, id: string) {
    super(
      [
        'PROJECT_IDENTITY_ADOPTION_REQUIRED',
        `remote=${remote}`,
        `projectId=${id}`,
        'A legacy remote ToolNet project exists but has no Git fingerprint proof.',
        `Re-run with: toolnet-memory init --adopt-remote ${remote}`,
      ].join(' ')
    );
    this.name = 'ProjectIdentityAdoptionRequiredError';
  }
}
export class ProjectIdentityRegistryUnavailableError extends Error {
  readonly code = 'PROJECT_IDENTITY_REGISTRY_UNAVAILABLE';
  constructor(detail: string) {
    super(
      [
        'PROJECT_IDENTITY_REGISTRY_UNAVAILABLE',
        detail,
        'Refusing to create a possibly split project identity while configured remote storage cannot be checked.',
        'Use --no-remote-identity only when local-only initialization is intentional.',
      ].join(' ')
    );
    this.name = 'ProjectIdentityRegistryUnavailableError';
  }
}
function hasConfiguredRemoteCredentials(): boolean {
  const config = loadConfig();
  if (config.storage.provider === 'r2') {
    const value = config.storage.r2;
    return Boolean(value.accountId && value.bucket && value.accessKeyId && value.secretAccessKey);
  }
  if (config.storage.provider === 's3') {
    const value = config.storage.s3;
    return Boolean(value.bucket && value.accessKeyId && value.secretAccessKey);
  }
  if (config.storage.provider === 'huggingface') {
    const value = config.storage.huggingface;
    return Boolean(value.namespace && value.bucket && value.accessKeyId && value.secretAccessKey);
  }
  return false;
}
function registryStorage(options: ProjectIdentityBootstrapOptions): RegistryStorageContext {
  if (options.storage) {
    return {
      storage: options.storage,
      crossMachine: options.storageIsCrossMachine ?? true,
      providerName: options.storage.name,
    };
  }
  const config = loadConfig();
  const raw = createStorageProvider({
    provider: config.storage.provider,
    r2: config.storage.r2,
    s3: config.storage.s3,
    huggingface: config.storage.huggingface,
    localRoot: config.storage.localRoot,
  });
  const crossMachine = hasConfiguredRemoteCredentials() && raw.name !== 'local';
  return {
    storage: crossMachine
      ? withStorageRetry(raw, {
          attempts: Number(process.env.TOOLNET_STORAGE_RETRIES ?? 3),
        })
      : raw,
    crossMachine,
    providerName: raw.name,
  };
}
function registryKey(identity: GitProjectIdentity): string {
  return [REGISTRY_PREFIX, `${identity.fingerprint}.json`].join('/');
}
function parseRegistryRecord(text: string, key: string): ProjectIdentityRegistryRecord {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ProjectIdentityCollisionError(
      [
        `Invalid ToolNet project identity registry record: ${key}.`,
        error instanceof Error ? error.message : String(error),
      ].join(' ')
    );
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProjectIdentityCollisionError(
      `Invalid ToolNet project identity registry record: ${key}`
    );
  }
  const data = value as Record<string, unknown>;
  for (const field of [
    'fingerprint',
    'canonicalGitRemote',
    'projectId',
    'projectName',
    'projectRemote',
  ]) {
    if (typeof data[field] !== 'string' || !String(data[field]).trim()) {
      throw new ProjectIdentityCollisionError(
        `ToolNet identity registry record ${key} is missing ${field}`
      );
    }
  }
  const now = new Date().toISOString();
  return {
    version: 1,
    fingerprint: String(data.fingerprint),
    canonicalGitRemote: String(data.canonicalGitRemote),
    projectId: String(data.projectId),
    projectName: String(data.projectName),
    projectRemote: String(data.projectRemote),
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : now,
  };
}
function parseRemoteManifest(text: string, key: string): RemoteProjectManifest {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ProjectIdentityCollisionError(
      [
        `Invalid remote ToolNet project manifest: ${key}.`,
        error instanceof Error ? error.message : String(error),
      ].join(' ')
    );
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProjectIdentityCollisionError(`Invalid remote ToolNet project manifest: ${key}`);
  }
  const data = value as Record<string, unknown>;
  if (typeof data.id !== 'string' || !data.id.trim()) {
    throw new ProjectIdentityCollisionError(`Remote ToolNet project manifest ${key} is missing id`);
  }
  const remote =
    typeof data.remote === 'string' && data.remote.trim()
      ? data.remote
      : (key.split('/')[1] ?? 'project');
  const name = typeof data.name === 'string' && data.name.trim() ? data.name : remote;
  return {
    version: typeof data.version === 'number' ? data.version : undefined,
    id: data.id,
    name,
    remote,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  };
}
async function readRemoteProjectManifest(
  storage: StorageProvider,
  remote: string
): Promise<RemoteProjectManifest | null> {
  const folder = sanitizeProjectFolder(remote);
  const key = `projects/${folder}/project.json`;
  const text = await storage.getText(key);
  if (!text) {
    return null;
  }
  return parseRemoteManifest(text, key);
}
async function findRegistryRecord(
  storage: StorageProvider,
  identity: GitProjectIdentity
): Promise<ProjectIdentityRegistryRecord | null> {
  const key = registryKey(identity);
  const text = await storage.getText(key);
  if (!text) {
    return null;
  }
  const record = parseRegistryRecord(text, key);
  if (
    record.fingerprint !== identity.fingerprint ||
    record.canonicalGitRemote !== identity.canonicalRemote
  ) {
    throw new ProjectIdentityCollisionError(
      [
        'PROJECT_IDENTITY_REGISTRY_MISMATCH',
        `key=${key}`,
        `expectedFingerprint=${identity.fingerprint}`,
        `actualFingerprint=${record.fingerprint}`,
      ].join(' ')
    );
  }
  return record;
}
async function verifyRegistryOwnership(
  storage: StorageProvider,
  record: ProjectIdentityRegistryRecord
): Promise<void> {
  const physical = await readRemoteProjectManifest(storage, record.projectRemote);
  if (!physical) {
    /*
     * Registry may be written before the first durable remote
     * payload. That is valid.
     */
    return;
  }
  if (physical.id !== record.projectId) {
    throw new ProjectIdentityCollisionError(
      [
        'PROJECT_IDENTITY_REMOTE_OWNERSHIP_MISMATCH',
        `remote=${record.projectRemote}`,
        `registryId=${record.projectId}`,
        `remoteId=${physical.id}`,
      ].join(' ')
    );
  }
}
async function registerIdentity(
  storage: StorageProvider,
  project: ProjectManifest,
  identity: GitProjectIdentity
): Promise<void> {
  const projectRemote = sanitizeProjectFolder(project.remote ?? project.name);
  const physical = await readRemoteProjectManifest(storage, projectRemote);
  if (physical && physical.id !== project.id) {
    throw new ProjectIdentityCollisionError(
      [
        'PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION',
        `remote=${projectRemote}`,
        `existing=${physical.id}`,
        `current=${project.id}`,
      ].join(' ')
    );
  }
  const key = registryKey(identity);
  const existingText = await storage.getText(key);
  if (existingText) {
    const existing = parseRegistryRecord(existingText, key);
    if (
      existing.projectId !== project.id ||
      existing.canonicalGitRemote !== identity.canonicalRemote
    ) {
      throw new ProjectIdentityCollisionError(
        [
          'PROJECT_IDENTITY_REGISTRY_COLLISION',
          `fingerprint=${identity.fingerprint}`,
          `existingProject=${existing.projectId}`,
          `currentProject=${project.id}`,
        ].join(' ')
      );
    }
    return;
  }
  const now = new Date().toISOString();
  const record: ProjectIdentityRegistryRecord = {
    version: 1,
    fingerprint: identity.fingerprint,
    canonicalGitRemote: identity.canonicalRemote,
    projectId: project.id,
    projectName: project.name,
    projectRemote,
    createdAt: project.createdAt,
    updatedAt: now,
  };
  await storage.put(key, JSON.stringify(record, null, 2) + '\n', 'application/json');
}
function adoptionInput(remote: RemoteProjectManifest, identity: GitProjectIdentity) {
  return {
    id: remote.id,
    name: remote.name,
    remote: remote.remote,
    createdAt: remote.createdAt,
    gitIdentity: identity,
    metadata: {
      adoptedFromRemote: true,
      adoptedAt: new Date().toISOString(),
    },
  };
}
function isIdentitySafetyError(error: unknown): boolean {
  return (
    error instanceof ProjectIdentityCollisionError ||
    error instanceof ProjectIdentityAdoptionRequiredError ||
    error instanceof ProjectIdentityRegistryUnavailableError
  );
}
export async function bootstrapProjectIdentity(
  inputPath: string = process.cwd(),
  options: ProjectIdentityBootstrapOptions = {}
): Promise<ProjectIdentityBootstrapResult> {
  const requestedPath = resolve(inputPath);
  const manager = new ProjectManager();
  const existing = manager.findExisting(requestedPath);
  const gitIdentity = inspectGitProjectIdentity(existing?.rootPath ?? requestedPath);
  /*
   * EXISTING PROJECT
   *
   * Existing local manifest always wins.
   * Never replace its project ID automatically.
   */
  if (existing) {
    let project = existing;
    if (gitIdentity) {
      project = manager.recordGitIdentity(existing.rootPath, gitIdentity, {
        allowRebind: options.allowGitRebind ?? false,
      });
    }
    if (options.skipRemoteIdentity || !gitIdentity) {
      return {
        project,
        source: 'existing-manifest',
        gitIdentity,
        registry: options.skipRemoteIdentity ? 'skipped' : 'disabled',
      };
    }
    const context = registryStorage(options);
    if (!context.crossMachine) {
      return {
        project,
        source: 'existing-manifest',
        gitIdentity,
        registry: 'disabled',
        registryProvider: context.providerName,
      };
    }
    try {
      await registerIdentity(context.storage, project, gitIdentity);
      return {
        project,
        source: 'existing-manifest',
        gitIdentity,
        registry: 'registered',
        registryProvider: context.providerName,
      };
    } catch (error) {
      if (isIdentitySafetyError(error)) {
        throw error;
      }
      /*
       * Existing local project remains usable if remote registry
       * is temporarily unavailable. Its local identity is already
       * canonical and must not be replaced.
       */
      return {
        project,
        source: 'existing-manifest',
        gitIdentity,
        registry: 'unavailable',
        registryProvider: context.providerName,
      };
    }
  }
  /*
   * NO GIT IDENTITY
   *
   * Non-Git projects remain compatible with legacy local identity.
   */
  if (!gitIdentity) {
    const project = manager.detect(requestedPath);
    return {
      project,
      source: 'legacy-path',
      gitIdentity: null,
      registry: 'disabled',
    };
  }
  /*
   * Explicit local-only escape hatch.
   *
   * Git identity is still deterministic, but no remote adoption
   * lookup is performed.
   */
  if (options.skipRemoteIdentity) {
    const project = manager.detect(requestedPath);
    return {
      project,
      source: 'git-remote',
      gitIdentity,
      registry: 'skipped',
    };
  }
  const context = registryStorage(options);
  /*
   * No configured cross-machine provider:
   * deterministic Git ID is still safe for new projects.
   */
  if (!context.crossMachine) {
    if (options.adoptRemote) {
      throw new ProjectIdentityRegistryUnavailableError(
        'Explicit remote adoption was requested but no cross-machine storage provider is configured.'
      );
    }
    const project = manager.detect(requestedPath);
    return {
      project,
      source: 'git-remote',
      gitIdentity,
      registry: 'disabled',
      registryProvider: context.providerName,
    };
  }
  try {
    /*
     * Strong automatic adoption:
     *
     * exact Git fingerprint
     *       ↓
     * registry record
     *       ↓
     * legacy/current ToolNet project ID
     */
    const registered = await findRegistryRecord(context.storage, gitIdentity);
    if (registered) {
      if (
        options.adoptRemote &&
        sanitizeProjectFolder(options.adoptRemote) !==
          sanitizeProjectFolder(registered.projectRemote)
      ) {
        throw new ProjectIdentityCollisionError(
          [
            'PROJECT_IDENTITY_EXPLICIT_ADOPTION_CONFLICT',
            `requested=${options.adoptRemote}`,
            `registered=${registered.projectRemote}`,
          ].join(' ')
        );
      }
      await verifyRegistryOwnership(context.storage, registered);
      const project = manager.adopt(requestedPath, {
        id: registered.projectId,
        name: registered.projectName,
        remote: registered.projectRemote,
        createdAt: registered.createdAt,
        gitIdentity,
        metadata: {
          adoptedFromRegistry: true,
          adoptedAt: new Date().toISOString(),
        },
      });
      return {
        project,
        source: 'remote-registry',
        gitIdentity,
        registry: 'matched',
        registryProvider: context.providerName,
      };
    }
    /*
     * Explicit legacy adoption.
     *
     * Used for an existing v0.3.15 project that predates the
     * Git fingerprint registry.
     */
    if (options.adoptRemote) {
      const legacy = await readRemoteProjectManifest(context.storage, options.adoptRemote);
      if (!legacy) {
        throw new Error(
          ['PROJECT_ADOPTION_REMOTE_NOT_FOUND', `remote=${options.adoptRemote}`].join(' ')
        );
      }
      const project = manager.adopt(requestedPath, adoptionInput(legacy, gitIdentity));
      await registerIdentity(context.storage, project, gitIdentity);
      return {
        project,
        source: 'explicit-remote-adoption',
        gitIdentity,
        registry: 'registered',
        registryProvider: context.providerName,
      };
    }
    /*
     * Legacy v0.3.15 safety gate.
     *
     * Older remote project manifests have no Git fingerprint.
     * If the natural repository namespace already exists,
     * STOP instead of silently claiming it.
     */
    const legacyCandidate = await readRemoteProjectManifest(
      context.storage,
      gitIdentity.repositoryName
    );
    if (legacyCandidate) {
      throw new ProjectIdentityAdoptionRequiredError(legacyCandidate.remote, legacyCandidate.id);
    }
    /*
     * Truly new Git project.
     *
     * ProjectManager creates deterministic ID from canonical
     * Git remote, independent of checkout path/machine.
     */
    const project = manager.detect(requestedPath);
    await registerIdentity(context.storage, project, gitIdentity);
    return {
      project,
      source: 'git-remote',
      gitIdentity,
      registry: 'registered',
      registryProvider: context.providerName,
    };
  } catch (error) {
    if (isIdentitySafetyError(error)) {
      throw error;
    }
    /*
     * For an uninitialized project, remote lookup failure is
     * fail-closed when remote storage is configured.
     *
     * Otherwise we could create a second project ID while old
     * memory already exists remotely.
     */
    throw new ProjectIdentityRegistryUnavailableError(
      error instanceof Error ? error.message : String(error)
    );
  }
}
