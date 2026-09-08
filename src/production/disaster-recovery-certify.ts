import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProjectManifest } from '../core/types.js';
import type { StorageObject, StorageProvider } from '../storage/types.js';
import { TaskStore } from '../tasks/store.js';
import {
  createRecoveryBackup,
  restoreRecoveryBackup,
  verifyRecoveryBackup,
} from '../recovery/disaster-recovery.js';
class MemoryStorage implements StorageProvider {
  readonly name = 'phase67-memory';
  private readonly values = new Map<string, Uint8Array>();
  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.values.set(
      key,
      typeof data === 'string' ? Buffer.from(data, 'utf8') : Uint8Array.from(data)
    );
  }
  async get(key: string): Promise<Uint8Array | null> {
    const value = this.values.get(key);
    return value ? Uint8Array.from(value) : null;
  }
  async getText(key: string): Promise<string | null> {
    const value = await this.get(key);
    return value ? Buffer.from(value).toString('utf8') : null;
  }
  async exists(key: string): Promise<boolean> {
    return this.values.has(key);
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.values.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,
        size: value.byteLength,
      }))
      .sort((left, right) => left.key.localeCompare(right.key));
  }
}
export interface DisasterRecoveryCertification {
  passed: boolean;
  backupIntegrity: boolean;
  taskRecovered: boolean;
  projectionRebuilt: boolean;
  walRecovered: boolean;
  journalRebuilt: boolean;
  remoteRecovered: boolean;
  newerRemoteObjectPreserved: boolean;
  tamperDetected: boolean;
  dryRunSafe: boolean;
  safetyBackupCreated: boolean;
  detail?: string;
}
function project(rootPath: string): ProjectManifest {
  return {
    id: 'phase67-recovery',
    name: 'phase67-recovery',
    rootPath,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}
function sessionEvent() {
  return {
    version: 1,
    id: 'phase67-session-event',
    sequence: 1,
    projectId: 'phase67-recovery',
    agent: 'opencode',
    nativeSessionId: 'phase67-session',
    sessionId: 'phase67-session',
    type: 'tool_result',
    timestamp: '2026-09-08T00:00:00.000Z',
    source: 'phase67',
    data: {
      summary: 'Recovery source WAL',
    },
    provenance: {
      rawDigest: 'phase67',
    },
  };
}
export async function certifyDisasterRecovery(): Promise<DisasterRecoveryCertification> {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase67-project-'));
  const recoveryRoot = mkdtempSync(join(tmpdir(), 'toolnet-phase67-backup-'));
  const manifest = project(root);
  const storage = new MemoryStorage();
  try {
    mkdirSync(join(root, '.toolnet'), {
      recursive: true,
    });
    const taskStore = new TaskStore(manifest);
    const task = await taskStore.createTask({
      id: 'phase67-task',
      kind: 'task',
      title: 'Recover ToolNet state',
      priority: 'high',
    });
    const sourceWal = join(
      root,
      '.toolnet',
      'runtime',
      'sources',
      'opencode',
      'phase67-session',
      'events.jsonl'
    );
    mkdirSync(join(root, '.toolnet', 'runtime', 'sources', 'opencode', 'phase67-session'), {
      recursive: true,
    });
    writeFileSync(sourceWal, `${JSON.stringify(sessionEvent())}\n`, 'utf8');
    /*
     * Simulated remote canonical state.
     *
     * One immutable Memory operation + one current projection.
     */
    const remoteOperationKey = 'projects/phase67-recovery/operations/memory/host-a/memory-op.json';
    const remoteProjectionKey = 'projects/phase67-recovery/memories/current.json';
    await storage.put(remoteOperationKey, '{"immutable":"memory-operation"}\n');
    await storage.put(remoteProjectionKey, '[{"id":"memory-a"}]\n');
    const backup = await createRecoveryBackup(manifest, {
      reason: 'phase67-certification',
      recoveryRoot,
      storage,
    });
    const verification = verifyRecoveryBackup(manifest, backup.id, recoveryRoot);
    const backupIntegrity =
      verification.ok && verification.localFiles >= 2 && verification.remoteObjects >= 2;
    /*
     * Dry-run must not touch corrupt current state.
     */
    const taskLog = join(root, '.toolnet', 'tasks', 'events.jsonl');
    const originalTaskLog = readFileSync(taskLog, 'utf8');
    writeFileSync(taskLog, '{"corrupted":true}\n', 'utf8');
    const beforeDry = readFileSync(taskLog, 'utf8');
    const dry = await restoreRecoveryBackup(manifest, backup.id, {
      apply: false,
      recoveryRoot,
      storage,
    });
    const afterDry = readFileSync(taskLog, 'utf8');
    const dryRunSafe = !dry.applied && beforeDry === afterDry;
    /*
     * Destroy local WAL + derived state.
     */
    rmSync(sourceWal, {
      force: true,
    });
    writeFileSync(join(root, '.toolnet', 'tasks', 'state.json'), '{"corrupt":true}\n', 'utf8');
    /*
     * Corrupt one remote object, and create a NEW immutable
     * object after the backup.
     *
     * Restore must repair the old object WITHOUT deleting the new.
     */
    await storage.put(remoteProjectionKey, '{"corrupt":true}\n');
    const newerRemoteKey = 'projects/phase67-recovery/operations/memory/host-b/newer-op.json';
    await storage.put(newerRemoteKey, '{"immutable":"newer-after-backup"}\n');
    const restored = await restoreRecoveryBackup(manifest, backup.id, {
      apply: true,
      recoveryRoot,
      storage,
    });
    const recoveredTask = new TaskStore(manifest).getTask(task.id);
    const taskRecovered =
      recoveredTask?.title === 'Recover ToolNet state' &&
      readFileSync(taskLog, 'utf8') === originalTaskLog;
    const projectionRebuilt =
      restored.taskProjectionRebuilt && existsSync(join(root, '.toolnet', 'tasks', 'state.json'));
    const walRecovered =
      existsSync(sourceWal) && readFileSync(sourceWal, 'utf8').includes('phase67-session-event');
    const journal = join(root, '.toolnet', 'journal', 'events.jsonl');
    const journalRebuilt =
      restored.journalReconciled &&
      existsSync(journal) &&
      readFileSync(journal, 'utf8').includes('phase67-session-event');
    const remoteRecovered =
      (await storage.getText(remoteProjectionKey)) === '[{"id":"memory-a"}]\n';
    const newerRemoteObjectPreserved = await storage.exists(newerRemoteKey);
    const safetyBackupCreated = Boolean(restored.safetyBackupId);
    /*
     * Tamper proof.
     */
    const backupLocalFile = backup.localFiles[0];
    let tamperDetected = false;
    if (backupLocalFile) {
      const tamperTarget = join(
        recoveryRoot,
        backup.id,
        'local',
        ...backupLocalFile.path.split('/')
      );
      writeFileSync(tamperTarget, 'tampered', 'utf8');
      tamperDetected = !verifyRecoveryBackup(manifest, backup.id, recoveryRoot).ok;
    }
    const passed =
      backupIntegrity &&
      taskRecovered &&
      projectionRebuilt &&
      walRecovered &&
      journalRebuilt &&
      remoteRecovered &&
      newerRemoteObjectPreserved &&
      tamperDetected &&
      dryRunSafe &&
      safetyBackupCreated;
    return {
      passed,
      backupIntegrity,
      taskRecovered,
      projectionRebuilt,
      walRecovered,
      journalRebuilt,
      remoteRecovered,
      newerRemoteObjectPreserved,
      tamperDetected,
      dryRunSafe,
      safetyBackupCreated,
      ...(passed
        ? {}
        : {
            detail: JSON.stringify(
              {
                backup,
                verification,
                dry,
                restored,
              },
              null,
              2
            ),
          }),
    };
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
    rmSync(recoveryRoot, {
      recursive: true,
      force: true,
    });
  }
}
