import {
  chmodSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { ProjectManifest } from '../core/types.js';
import type { StorageProvider } from '../storage/types.js';
import { TaskStore } from '../tasks/store.js';
import { readTaskOperations, taskOperationLogPath } from '../tasks/operation-log.js';
import { reconcileSharedProjectJournal } from '../session/shared-project-journal.js';
import { refreshAdaptiveRetrievalOverrides } from '../work-continuity/retrieval-feedback.js';
export const RECOVERY_MANIFEST_VERSION = 1;
export const RECOVERY_RECENT_DAYS = 7;
export type RecoveryFileRole =
  | 'task-operations'
  | 'task-replicated'
  | 'session-wal'
  | 'retrieval-feedback'
  | 'retrieval-overrides'
  | 'retrieval-telemetry';
export interface RecoveryLocalFile {
  path: string;
  role: RecoveryFileRole;
  bytes: number;
  sha256: string;
}
export interface RecoveryRemoteObject {
  key: string;
  blob: string;
  bytes: number;
  sha256: string;
}
export interface RecoveryManifest {
  version: 1;
  id: string;
  projectId: string;
  createdAt: string;
  reason: string;
  consistency: 'append-only-crash-consistent';
  localFiles: RecoveryLocalFile[];
  remoteObjects: RecoveryRemoteObject[];
  remoteCaptured: boolean;
  remoteError?: string;
}
export interface RecoveryVerification {
  ok: boolean;
  backupId: string;
  projectMatch: boolean;
  manifestDigestValid: boolean;
  localFiles: number;
  remoteObjects: number;
  missing: string[];
  hashMismatches: string[];
}
export interface RecoveryRestoreResult {
  applied: boolean;
  backupId: string;
  safetyBackupId?: string;
  localRestored: number;
  remoteRestored: number;
  taskOperations: number;
  taskProjectionRebuilt: boolean;
  journalReconciled: boolean;
  adaptiveRecertified: boolean;
  verification: RecoveryVerification;
}
export interface RecoveryBackupOptions {
  reason?: string;
  recoveryRoot?: string;
  storage?: StorageProvider;
}
export interface RecoveryRestoreOptions {
  apply?: boolean;
  recoveryRoot?: string;
  storage?: StorageProvider;
}
export interface RecoveryHealth {
  backups: number;
  latestBackupId?: string;
  latestBackupAt?: string;
  latestAgeDays?: number;
  latestIntegrity?: 'valid' | 'invalid';
  recent: boolean;
}
const LOCAL_SOURCE_FILES = [
  {
    path: '.toolnet/tasks/events.jsonl',
    role: 'task-operations',
  },
  {
    path: '.toolnet/retrieval/feedback.jsonl',
    role: 'retrieval-feedback',
  },
  {
    path: '.toolnet/retrieval/overrides.json',
    role: 'retrieval-overrides',
  },
  {
    path: '.toolnet/retrieval/telemetry.jsonl',
    role: 'retrieval-telemetry',
  },
] as const;
const LOCAL_SOURCE_DIRECTORIES = [
  {
    path: '.toolnet/tasks/replication/replicated',
    role: 'task-replicated',
  },
  {
    path: '.toolnet/runtime/sources',
    role: 'session-wal',
  },
] as const;
/*
 * These are projections/cursors/locks.
 *
 * They are intentionally NOT restored.
 */
export const RECOVERY_DERIVED_PATHS = [
  '.toolnet/tasks/state.json',
  '.toolnet/tasks/replication/cursor.json',
  '.toolnet/journal',
  '.toolnet/runtime/locks',
] as const;
function digest(data: Uint8Array | Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}
function safeBackupId(): string {
  return [new Date().toISOString().replace(/[:.]/gu, '-'), randomUUID().slice(0, 8)].join('-');
}
export function defaultRecoveryRoot(project: Pick<ProjectManifest, 'id'>): string {
  const configured = process.env.TOOLNET_RECOVERY_ROOT?.trim();
  if (configured) {
    return resolve(configured, encodeURIComponent(project.id));
  }
  /*
   * Intentionally OUTSIDE project root.
   *
   * Deleting/corrupting the project directory must not
   * automatically delete the backup.
   */
  return join(homedir(), '.toolnet-memory', 'recovery', encodeURIComponent(project.id));
}
function backupDirectory(
  project: Pick<ProjectManifest, 'id'>,
  backupId: string,
  recoveryRoot?: string
): string {
  return join(recoveryRoot ?? defaultRecoveryRoot(project), backupId);
}
function ensurePrivateDirectory(directory: string): void {
  mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });
  try {
    chmodSync(directory, 0o700);
  } catch {
    // Best effort on non-POSIX filesystems.
  }
}
function atomicWrite(file: string, data: string | Uint8Array): void {
  ensurePrivateDirectory(dirname(file));
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  const fd = openSync(temporary, 'w', 0o600);
  try {
    writeFileSync(fd, data);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, file);
  try {
    chmodSync(file, 0o600);
  } catch {
    // Best effort.
  }
}
function canonicalRelativePath(projectRoot: string, file: string): string {
  const root = resolve(projectRoot);
  const target = resolve(file);
  const value = relative(root, target);
  if (!value || value === '..' || value.startsWith(`..${sep}`) || isAbsolute(value)) {
    throw new Error('RECOVERY_PATH_OUTSIDE_PROJECT');
  }
  return value.split(sep).join('/');
}
function restoreTarget(projectRoot: string, value: string): string {
  if (!value || value.startsWith('/') || value.includes('\\') || value.split('/').includes('..')) {
    throw new Error('RECOVERY_MANIFEST_PATH_INVALID');
  }
  const root = resolve(projectRoot);
  const target = resolve(root, value);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error('RECOVERY_RESTORE_PATH_ESCAPE');
  }
  return target;
}
function collectFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }
  const output: string[] = [];
  for (const entry of readdirSync(directory, {
    withFileTypes: true,
  })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...collectFiles(full));
      continue;
    }
    if (entry.isFile()) {
      output.push(full);
    }
  }
  return output.sort();
}
function roleForSessionFile(file: string): RecoveryFileRole | null {
  /*
   * Runtime source WALs are authoritative.
   *
   * state.json/cursor/locks are rebuildable and intentionally
   * omitted from recovery backups.
   */
  return file.endsWith(`${sep}events.jsonl`) ? 'session-wal' : null;
}
function localRecoverySources(project: Pick<ProjectManifest, 'rootPath'>): Array<{
  file: string;
  role: RecoveryFileRole;
}> {
  const output: Array<{
    file: string;
    role: RecoveryFileRole;
  }> = [];
  for (const source of LOCAL_SOURCE_FILES) {
    const file = join(project.rootPath, ...source.path.split('/'));
    if (existsSync(file)) {
      output.push({
        file,
        role: source.role,
      });
    }
  }
  for (const source of LOCAL_SOURCE_DIRECTORIES) {
    const directory = join(project.rootPath, ...source.path.split('/'));
    for (const file of collectFiles(directory)) {
      const role = source.role === 'session-wal' ? roleForSessionFile(file) : source.role;
      if (!role) {
        continue;
      }
      output.push({
        file,
        role,
      });
    }
  }
  return output.sort((left, right) => left.file.localeCompare(right.file));
}
function localBackupBlob(backup: string, relativePath: string): string {
  return join(backup, 'local', ...relativePath.split('/'));
}
function remoteBackupBlob(backup: string, index: number): string {
  return join(backup, 'remote', `${String(index).padStart(8, '0')}.bin`);
}
function manifestFile(backup: string): string {
  return join(backup, 'manifest.json');
}
function manifestDigestFile(backup: string): string {
  return join(backup, 'manifest.sha256');
}
function manifestJson(manifest: RecoveryManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
async function captureRemote(
  project: Pick<ProjectManifest, 'id'>,
  storage: StorageProvider,
  backup: string
): Promise<RecoveryRemoteObject[]> {
  /*
   * ProjectScopedStorageProvider maps this logical prefix to
   * the real human-readable remote folder.
   */
  const prefix = `projects/${project.id}/`;
  const objects = await storage.list(prefix);
  const captured: RecoveryRemoteObject[] = [];
  for (const object of objects
    .filter(
      (item) =>
        /*
         * Old SnapshotManager snapshots are not source of truth.
         * Do not recursively back up historical snapshots.
         */
        !item.key.includes('/snapshots/')
    )
    .sort((left, right) => left.key.localeCompare(right.key))) {
    const data = await storage.get(object.key);
    if (!data) {
      continue;
    }
    const blob = remoteBackupBlob(backup, captured.length);
    atomicWrite(blob, data);
    captured.push({
      key: object.key,
      blob: relative(backup, blob).split(sep).join('/'),
      bytes: data.byteLength,
      sha256: digest(data),
    });
  }
  return captured;
}
export async function createRecoveryBackup(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  options: RecoveryBackupOptions = {}
): Promise<RecoveryManifest> {
  const id = safeBackupId();
  const backup = backupDirectory(project, id, options.recoveryRoot);
  ensurePrivateDirectory(backup);
  const localFiles: RecoveryLocalFile[] = [];
  for (const source of localRecoverySources(project)) {
    const relativePath = canonicalRelativePath(project.rootPath, source.file);
    const data = readFileSync(source.file);
    atomicWrite(localBackupBlob(backup, relativePath), data);
    localFiles.push({
      path: relativePath,
      role: source.role,
      bytes: data.byteLength,
      sha256: digest(data),
    });
  }
  let remoteObjects: RecoveryRemoteObject[] = [];
  let remoteCaptured = false;
  let remoteError: string | undefined;
  if (options.storage) {
    try {
      remoteObjects = await captureRemote(project, options.storage, backup);
      remoteCaptured = true;
    } catch (error) {
      /*
       * Local authoritative backup is still valuable if remote
       * storage is unavailable during an outage.
       */
      remoteError = error instanceof Error ? error.message : String(error);
    }
  }
  const manifest: RecoveryManifest = {
    version: RECOVERY_MANIFEST_VERSION,
    id,
    projectId: project.id,
    createdAt: new Date().toISOString(),
    reason: options.reason ?? 'manual',
    consistency: 'append-only-crash-consistent',
    localFiles,
    remoteObjects,
    remoteCaptured,
    ...(remoteError
      ? {
          remoteError,
        }
      : {}),
  };
  const text = manifestJson(manifest);
  atomicWrite(manifestFile(backup), text);
  atomicWrite(manifestDigestFile(backup), `${digest(text)}\n`);
  return manifest;
}
export function loadRecoveryManifest(
  project: Pick<ProjectManifest, 'id'>,
  backupId: string,
  recoveryRoot?: string
): RecoveryManifest {
  const backup = backupDirectory(project, backupId, recoveryRoot);
  const file = manifestFile(backup);
  if (!existsSync(file)) {
    throw new Error(`RECOVERY_BACKUP_NOT_FOUND ${backupId}`);
  }
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as RecoveryManifest;
  if (parsed.version !== RECOVERY_MANIFEST_VERSION) {
    throw new Error('RECOVERY_MANIFEST_VERSION_UNSUPPORTED');
  }
  return parsed;
}
export function listRecoveryBackups(
  project: Pick<ProjectManifest, 'id'>,
  recoveryRoot?: string
): RecoveryManifest[] {
  const root = recoveryRoot ?? defaultRecoveryRoot(project);
  if (!existsSync(root)) {
    return [];
  }
  const output: RecoveryManifest[] = [];
  for (const entry of readdirSync(root, {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) {
      continue;
    }
    try {
      output.push(loadRecoveryManifest(project, entry.name, root));
    } catch {
      // Damaged backup remains visible through filesystem,
      // but is excluded from valid backup list.
    }
  }
  return output.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
export function verifyRecoveryBackup(
  project: Pick<ProjectManifest, 'id'>,
  backupId: string,
  recoveryRoot?: string
): RecoveryVerification {
  const backup = backupDirectory(project, backupId, recoveryRoot);
  const manifest = loadRecoveryManifest(project, backupId, recoveryRoot);
  const missing: string[] = [];
  const hashMismatches: string[] = [];
  const manifestPath = manifestFile(backup);
  const digestPath = manifestDigestFile(backup);
  let manifestDigestValid = false;
  if (existsSync(digestPath)) {
    const expected = readFileSync(digestPath, 'utf8').trim();
    const actual = digest(readFileSync(manifestPath));
    manifestDigestValid = expected === actual;
  }
  for (const file of manifest.localFiles) {
    const source = localBackupBlob(backup, file.path);
    if (!existsSync(source)) {
      missing.push(`local:${file.path}`);
      continue;
    }
    if (digest(readFileSync(source)) !== file.sha256) {
      hashMismatches.push(`local:${file.path}`);
    }
  }
  for (const object of manifest.remoteObjects) {
    const source = join(backup, ...object.blob.split('/'));
    if (!existsSync(source)) {
      missing.push(`remote:${object.key}`);
      continue;
    }
    if (digest(readFileSync(source)) !== object.sha256) {
      hashMismatches.push(`remote:${object.key}`);
    }
  }
  const projectMatch = manifest.projectId === project.id;
  return {
    ok: projectMatch && manifestDigestValid && missing.length === 0 && hashMismatches.length === 0,
    backupId,
    projectMatch,
    manifestDigestValid,
    localFiles: manifest.localFiles.length,
    remoteObjects: manifest.remoteObjects.length,
    missing,
    hashMismatches,
  };
}
function clearDerivedState(project: Pick<ProjectManifest, 'rootPath'>): void {
  for (const relativePath of RECOVERY_DERIVED_PATHS) {
    rmSync(join(project.rootPath, ...relativePath.split('/')), {
      recursive: true,
      force: true,
    });
  }
}
async function restoreRemoteObjects(
  backup: string,
  manifest: RecoveryManifest,
  storage: StorageProvider
): Promise<number> {
  let restored = 0;
  /*
   * Deliberately ADDITIVE.
   *
   * Do not delete newer immutable operations that appeared after
   * the backup was created.
   */
  for (const object of manifest.remoteObjects) {
    const blob = join(backup, ...object.blob.split('/'));
    const data = readFileSync(blob);
    if (digest(data) !== object.sha256) {
      throw new Error(`RECOVERY_REMOTE_HASH_MISMATCH ${object.key}`);
    }
    await storage.put(object.key, data);
    const written = await storage.get(object.key);
    if (!written || digest(written) !== object.sha256) {
      throw new Error(`RECOVERY_REMOTE_VERIFY_FAILED ${object.key}`);
    }
    restored += 1;
  }
  return restored;
}
export async function restoreRecoveryBackup(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  backupId: string,
  options: RecoveryRestoreOptions = {}
): Promise<RecoveryRestoreResult> {
  const verification = verifyRecoveryBackup(project, backupId, options.recoveryRoot);
  if (!verification.ok) {
    throw new Error('RECOVERY_BACKUP_INTEGRITY_FAILED');
  }
  if (!options.apply) {
    return {
      applied: false,
      backupId,
      localRestored: 0,
      remoteRestored: 0,
      taskOperations: 0,
      taskProjectionRebuilt: false,
      journalReconciled: false,
      adaptiveRecertified: false,
      verification,
    };
  }
  /*
   * Mandatory safety point.
   *
   * There is deliberately no --no-safety escape hatch.
   */
  const safety = await createRecoveryBackup(project, {
    reason: `pre-restore:${backupId}`,
    recoveryRoot: options.recoveryRoot,
    ...(options.storage
      ? {
          storage: options.storage,
        }
      : {}),
  });
  const backup = backupDirectory(project, backupId, options.recoveryRoot);
  const manifest = loadRecoveryManifest(project, backupId, options.recoveryRoot);
  let localRestored = 0;
  for (const file of manifest.localFiles) {
    const source = localBackupBlob(backup, file.path);
    const data = readFileSync(source);
    if (digest(data) !== file.sha256) {
      throw new Error(`RECOVERY_LOCAL_HASH_MISMATCH ${file.path}`);
    }
    atomicWrite(restoreTarget(project.rootPath, file.path), data);
    localRestored += 1;
  }
  /*
   * Never restore stale projections/cursors/locks.
   */
  clearDerivedState(project);
  let taskOperations = 0;
  let taskProjectionRebuilt = false;
  const taskLog = taskOperationLogPath(project);
  if (existsSync(taskLog)) {
    /*
     * Full cryptographic payload validation.
     */
    taskOperations = readTaskOperations(taskLog, {
      repairCorruptTail: false,
    }).length;
    new TaskStore(project).rebuildProjection();
    taskProjectionRebuilt = true;
  }
  let journalReconciled = false;
  try {
    reconcileSharedProjectJournal(project.rootPath);
    journalReconciled = true;
  } catch {
    /*
     * Source WAL remains authoritative.
     * A later session startup may reconcile again.
     */
  }
  let adaptiveRecertified = false;
  try {
    refreshAdaptiveRetrievalOverrides(project);
    adaptiveRecertified = true;
  } catch {
    /*
     * Adaptive routing is advisory.
     * Deterministic baseline remains authoritative.
     */
  }
  let remoteRestored = 0;
  if (options.storage && manifest.remoteCaptured) {
    remoteRestored = await restoreRemoteObjects(backup, manifest, options.storage);
  }
  return {
    applied: true,
    backupId,
    safetyBackupId: safety.id,
    localRestored,
    remoteRestored,
    taskOperations,
    taskProjectionRebuilt,
    journalReconciled,
    adaptiveRecertified,
    verification,
  };
}
export function inspectRecoveryHealth(
  project: Pick<ProjectManifest, 'id'>,
  recoveryRoot?: string,
  now = Date.now()
): RecoveryHealth {
  const backups = listRecoveryBackups(project, recoveryRoot);
  const latest = backups[0];
  if (!latest) {
    return {
      backups: 0,
      recent: false,
    };
  }
  const ageDays = Math.max(0, (now - Date.parse(latest.createdAt)) / (24 * 60 * 60 * 1_000));
  let valid = false;
  try {
    valid = verifyRecoveryBackup(project, latest.id, recoveryRoot).ok;
  } catch {
    valid = false;
  }
  return {
    backups: backups.length,
    latestBackupId: latest.id,
    latestBackupAt: latest.createdAt,
    latestAgeDays: Math.round(ageDays * 100) / 100,
    latestIntegrity: valid ? 'valid' : 'invalid',
    recent: valid && ageDays <= RECOVERY_RECENT_DAYS,
  };
}
