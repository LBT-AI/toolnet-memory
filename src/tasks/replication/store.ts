import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ProjectManifest } from '../../core/types.js';
import { writeJsonAtomic } from '../../session/utils.js';
import { validateTaskOperation } from '../operation-log.js';
import type { TaskOperation } from '../types.js';
import type { TaskReplicationCursor } from './types.js';

function directory(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(project.rootPath, '.toolnet', 'tasks', 'replication');
}

export function taskReplicationCursorPath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(directory(project), 'cursor.json');
}

export function taskReplicatedOperationsPath(
  project: Pick<ProjectManifest, 'rootPath'>,
  hostId: string
): string {
  return join(directory(project), 'replicated', `${encodeURIComponent(hostId)}.jsonl`);
}

export function defaultTaskReplicationCursor(hostId: string): TaskReplicationCursor {
  return {
    version: 1,
    hostId,
    uploadedLocalSequence: 0,
    remoteHostCursors: {},
  };
}

export function readTaskReplicationCursor(
  project: Pick<ProjectManifest, 'rootPath'>,
  hostId: string
): TaskReplicationCursor {
  const file = taskReplicationCursorPath(project);
  if (!existsSync(file)) {
    return defaultTaskReplicationCursor(hostId);
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<TaskReplicationCursor>;
    if (
      parsed.version !== 1 ||
      parsed.hostId !== hostId ||
      !Number.isSafeInteger(parsed.uploadedLocalSequence) ||
      parsed.uploadedLocalSequence === undefined ||
      parsed.uploadedLocalSequence < 0
    ) {
      return defaultTaskReplicationCursor(hostId);
    }
    const remoteHostCursors = Object.fromEntries(
      Object.entries(parsed.remoteHostCursors ?? {}).filter(
        ([key, value]) => key.trim() && Number.isSafeInteger(value) && value >= 0
      )
    ) as Record<string, number>;
    return {
      version: 1,
      hostId,
      uploadedLocalSequence: parsed.uploadedLocalSequence!,
      remoteHostCursors,
      ...(parsed.lastPushAt ? { lastPushAt: parsed.lastPushAt } : {}),
      ...(parsed.lastPullAt ? { lastPullAt: parsed.lastPullAt } : {}),
      ...(parsed.lastError ? { lastError: parsed.lastError } : {}),
    };
  } catch {
    return defaultTaskReplicationCursor(hostId);
  }
}

export function writeTaskReplicationCursor(
  project: Pick<ProjectManifest, 'rootPath'>,
  cursor: TaskReplicationCursor
): void {
  writeJsonAtomic(taskReplicationCursorPath(project), cursor);
}

function appendLine(file: string, operation: TaskOperation): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const fd = openSync(file, 'a', 0o600);
  try {
    appendFileSync(fd, `${JSON.stringify(operation)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

export function readReplicatedTaskOperations(
  project: Pick<ProjectManifest, 'rootPath'>,
  hostId: string
): TaskOperation[] {
  const file = taskReplicatedOperationsPath(project, hostId);
  if (!existsSync(file)) {
    return [];
  }
  const output: TaskOperation[] = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/u)) {
    if (!line.trim()) {
      continue;
    }
    output.push(validateTaskOperation(JSON.parse(line)));
  }
  return output;
}

export function readAllReplicatedTaskOperations(
  project: Pick<ProjectManifest, 'rootPath'>
): TaskOperation[] {
  const replicatedDirectory = join(directory(project), 'replicated');
  if (!existsSync(replicatedDirectory)) {
    return [];
  }
  const operations: TaskOperation[] = [];
  for (const entry of readdirSync(replicatedDirectory)) {
    if (!entry.endsWith('.jsonl')) {
      continue;
    }
    for (const line of readFileSync(join(replicatedDirectory, entry), 'utf8').split(/\r?\n/u)) {
      if (!line.trim()) {
        continue;
      }
      operations.push(validateTaskOperation(JSON.parse(line)));
    }
  }
  return operations;
}

export function importReplicatedTaskOperation(
  project: Pick<ProjectManifest, 'rootPath'>,
  operation: TaskOperation
): { imported: boolean; collision: boolean } {
  const existing = readReplicatedTaskOperations(project, operation.hostId);
  const found = existing.find(
    (item) => item.operationId === operation.operationId && item.hostId === operation.hostId
  );
  if (found) {
    return {
      imported: false,
      collision: JSON.stringify(found) !== JSON.stringify(operation),
    };
  }
  appendLine(taskReplicatedOperationsPath(project, operation.hostId), operation);
  return { imported: true, collision: false };
}

export function replaceReplicatedTaskOperations(
  project: Pick<ProjectManifest, 'rootPath'>,
  hostId: string,
  operations: TaskOperation[]
): void {
  const file = taskReplicatedOperationsPath(project, hostId);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  const fd = openSync(temporary, 'w', 0o600);
  try {
    writeFileSync(fd, operations.map((operation) => JSON.stringify(operation)).join('\n') + '\n');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, file);
}
