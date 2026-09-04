import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, truncateSync } from 'node:fs';
import { hostname } from 'node:os';
import type { ProjectManifest } from '../core/types.js';
import { sanitizeDurableText, sanitizeDurableValue } from '../security/durable-sanitizer.js';
import type { TaskActor, TaskOperation, TaskOperationPayload } from './types.js';
function json(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error('TASK_OPERATION_NOT_JSON_SERIALIZABLE');
  }
  return serialized;
}
function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
export function taskPayloadHash(payload: TaskOperationPayload): string {
  return sha256(json(payload));
}
function required(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${name}_REQUIRED`);
  }
  return normalized;
}
function validTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
export function defaultTaskActor(): TaskActor {
  const agent = process.env.TOOLNET_AGENT_ID?.trim();
  if (agent) {
    return {
      kind: 'agent',
      id: sanitizeDurableText(agent),
    };
  }
  return {
    kind: 'system',
    id: `pid:${process.pid}`,
  };
}
export function currentTaskHostId(): string {
  const configured = process.env.TOOLNET_HOST_ID?.trim();
  return sanitizeDurableText(configured || hostname() || 'unknown-host');
}
export interface CreateTaskOperationInput {
  projectId: string;
  sequence: number;
  payload: TaskOperationPayload;
  actor?: TaskActor;
  hostId?: string;
  operationId?: string;
  occurredAt?: string;
}
export function createTaskOperation(input: CreateTaskOperationInput): TaskOperation {
  if (!Number.isSafeInteger(input.sequence) || input.sequence < 1) {
    throw new Error('TASK_OPERATION_SEQUENCE_INVALID');
  }
  const payload = sanitizeDurableValue(input.payload);
  const actor = sanitizeDurableValue(input.actor ?? defaultTaskActor());
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  if (!validTimestamp(occurredAt)) {
    throw new Error('TASK_OPERATION_TIMESTAMP_INVALID');
  }
  return {
    version: 1,
    operationId: required(input.operationId ?? randomUUID(), 'TASK_OPERATION_ID'),
    sequence: input.sequence,
    projectId: required(input.projectId, 'TASK_PROJECT_ID'),
    hostId: required(sanitizeDurableText(input.hostId ?? currentTaskHostId()), 'TASK_HOST_ID'),
    occurredAt,
    actor,
    payloadSha256: taskPayloadHash(payload),
    payload,
  };
}
export function validateTaskOperation(value: unknown): TaskOperation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('TASK_OPERATION_INVALID');
  }
  const operation = value as Record<string, unknown>;
  if (operation.version !== 1) {
    throw new Error('TASK_OPERATION_VERSION_INVALID');
  }
  if (typeof operation.operationId !== 'string' || !operation.operationId.trim()) {
    throw new Error('TASK_OPERATION_ID_INVALID');
  }
  if (!Number.isSafeInteger(operation.sequence) || Number(operation.sequence) < 1) {
    throw new Error('TASK_OPERATION_SEQUENCE_INVALID');
  }
  if (typeof operation.projectId !== 'string' || !operation.projectId.trim()) {
    throw new Error('TASK_OPERATION_PROJECT_INVALID');
  }
  if (typeof operation.hostId !== 'string' || !operation.hostId.trim()) {
    throw new Error('TASK_OPERATION_HOST_INVALID');
  }
  if (typeof operation.occurredAt !== 'string' || !validTimestamp(operation.occurredAt)) {
    throw new Error('TASK_OPERATION_TIMESTAMP_INVALID');
  }
  if (!operation.actor || typeof operation.actor !== 'object') {
    throw new Error('TASK_OPERATION_ACTOR_INVALID');
  }
  if (!operation.payload || typeof operation.payload !== 'object') {
    throw new Error('TASK_OPERATION_PAYLOAD_INVALID');
  }
  if (typeof operation.payloadSha256 !== 'string') {
    throw new Error('TASK_OPERATION_HASH_INVALID');
  }
  const typed = operation as unknown as TaskOperation;
  if (taskPayloadHash(typed.payload) !== typed.payloadSha256) {
    throw new Error('TASK_OPERATION_HASH_MISMATCH');
  }
  return typed;
}
export interface ReadTaskOperationsOptions {
  repairCorruptTail?: boolean;
}
export function readTaskOperations(
  file: string,
  options: ReadTaskOperationsOptions = {}
): TaskOperation[] {
  if (!existsSync(file)) {
    return [];
  }
  let text = readFileSync(file, 'utf8');
  if (!text) {
    return [];
  }
  /*
   * Crash-tail recovery:
   *
   * A write interrupted before its terminating newline may
   * leave one incomplete JSON fragment.
   *
   * Only an unterminated final fragment may be repaired.
   * Invalid complete lines fail closed.
   */
  if (!text.endsWith('\n')) {
    const lastNewline = text.lastIndexOf('\n');
    const tail = text.slice(lastNewline + 1);
    if (tail.trim()) {
      try {
        validateTaskOperation(JSON.parse(tail));
      } catch (error) {
        if (!options.repairCorruptTail) {
          throw error;
        }
        const safePrefix = lastNewline >= 0 ? text.slice(0, lastNewline + 1) : '';
        truncateSync(file, Buffer.byteLength(safePrefix, 'utf8'));
        text = safePrefix;
      }
    }
  }
  const operations: TaskOperation[] = [];
  const lines = text.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`TASK_OPERATION_LOG_CORRUPT line=${index + 1}`);
    }
    operations.push(validateTaskOperation(parsed));
  }
  return operations;
}
export function taskOperationLogPath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return [project.rootPath, '.toolnet', 'tasks', 'events.jsonl'].join('/');
}
