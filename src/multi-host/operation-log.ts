import { createHash, randomUUID } from 'node:crypto';

import type { StorageProvider } from '../storage/types.js';

export interface MultiHostOperation<T = unknown> {
  version: 1;

  operationId: string;

  projectId: string;

  scope: string;

  hostId: string;

  occurredAt: string;

  payloadSha256: string;

  payload: T;
}

export interface CreateMultiHostOperationInput<T> {
  operationId?: string;

  projectId: string;

  scope: string;

  hostId: string;

  occurredAt?: string;

  payload: T;
}

export interface MultiHostOperationConflict<T = unknown> {
  operationId: string;

  variants: MultiHostOperation<T>[];
}

export interface MultiHostOperationCollection<T = unknown> {
  operations: MultiHostOperation<T>[];

  conflicts: MultiHostOperationConflict<T>[];

  invalidKeys: string[];
}

function requiredValue(value: string, name: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${name} is required`);
  }

  return normalized;
}

function segment(value: string, name: string): string {
  return encodeURIComponent(requiredValue(value, name));
}

function payloadJson(value: unknown): string {
  const json = JSON.stringify(value);

  if (json === undefined) {
    throw new Error('Multi-host operation payload must be JSON serializable');
  }

  return json;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function payloadHash(payload: unknown): string {
  return sha256(payloadJson(payload));
}

function validTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function operationFingerprint(operation: MultiHostOperation): string {
  return sha256(
    JSON.stringify({
      version: operation.version,

      operationId: operation.operationId,

      projectId: operation.projectId,

      scope: operation.scope,

      hostId: operation.hostId,

      occurredAt: operation.occurredAt,

      payloadSha256: operation.payloadSha256,

      payload: operation.payload,
    })
  );
}

export function createMultiHostOperation<T>(
  input: CreateMultiHostOperationInput<T>
): MultiHostOperation<T> {
  const projectId = requiredValue(input.projectId, 'projectId');

  const scope = requiredValue(input.scope, 'scope');

  const hostId = requiredValue(input.hostId, 'hostId');

  const operationId = requiredValue(input.operationId ?? randomUUID(), 'operationId');

  const occurredAt = input.occurredAt ?? new Date().toISOString();

  if (!validTimestamp(occurredAt)) {
    throw new Error(`Invalid operation timestamp: ${occurredAt}`);
  }

  return {
    version: 1,

    operationId,

    projectId,

    scope,

    hostId,

    occurredAt,

    payloadSha256: payloadHash(input.payload),

    payload: input.payload,
  };
}

export function multiHostOperationPrefix(projectId: string, scope?: string): string {
  const base = ['projects', segment(projectId, 'projectId'), 'operations'];

  if (!scope) {
    return `${base.join('/')}/`;
  }

  return `${[...base, segment(scope, 'scope')].join('/')}/`;
}

export function multiHostOperationKey(operation: MultiHostOperation): string {
  return [
    multiHostOperationPrefix(operation.projectId, operation.scope).replace(/\/$/, ''),

    segment(operation.hostId, 'hostId'),

    `${segment(operation.operationId, 'operationId')}-${operation.payloadSha256}.json`,
  ].join('/');
}

/**
 * No exists()->put() pseudo-lock.
 *
 * The key contains:
 * operation id + payload hash + host id.
 *
 * Independent operations never share the same key.
 * Retrying the exact same operation rewrites only identical
 * immutable content at the same key.
 */
export async function appendMultiHostOperation<T>(
  storage: StorageProvider,
  operation: MultiHostOperation<T>
): Promise<string> {
  const key = multiHostOperationKey(operation);

  await storage.put(key, `${JSON.stringify(operation, null, 2)}\n`, 'application/json');

  return key;
}

function parseOperation<T>(text: string): MultiHostOperation<T> | null {
  let raw: Record<string, unknown>;

  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (raw.version !== 1) {
    return null;
  }

  if (typeof raw.operationId !== 'string') {
    return null;
  }

  if (typeof raw.projectId !== 'string') {
    return null;
  }

  if (typeof raw.scope !== 'string') {
    return null;
  }

  if (typeof raw.hostId !== 'string') {
    return null;
  }

  if (typeof raw.occurredAt !== 'string') {
    return null;
  }

  if (!validTimestamp(raw.occurredAt)) {
    return null;
  }

  if (typeof raw.payloadSha256 !== 'string') {
    return null;
  }

  const calculated = payloadHash(raw.payload);

  if (calculated !== raw.payloadSha256) {
    return null;
  }

  return raw as unknown as MultiHostOperation<T>;
}

function compareOperations(left: MultiHostOperation, right: MultiHostOperation): number {
  const byTime = left.occurredAt.localeCompare(right.occurredAt);

  if (byTime !== 0) {
    return byTime;
  }

  const byHost = left.hostId.localeCompare(right.hostId);

  if (byHost !== 0) {
    return byHost;
  }

  const byId = left.operationId.localeCompare(right.operationId);

  if (byId !== 0) {
    return byId;
  }

  return left.payloadSha256.localeCompare(right.payloadSha256);
}

export async function collectMultiHostOperations<T>(
  storage: StorageProvider,
  projectId: string,
  scope: string
): Promise<MultiHostOperationCollection<T>> {
  const normalizedProject = requiredValue(projectId, 'projectId');

  const normalizedScope = requiredValue(scope, 'scope');

  const prefix = multiHostOperationPrefix(normalizedProject, normalizedScope);

  const objects = await storage.list(prefix);

  const invalidKeys: string[] = [];

  const parsed: MultiHostOperation<T>[] = [];

  for (const object of objects) {
    const text = await storage.getText(object.key);

    if (!text) {
      invalidKeys.push(object.key);

      continue;
    }

    const operation = parseOperation<T>(text);

    if (!operation) {
      invalidKeys.push(object.key);

      continue;
    }

    if (operation.projectId !== normalizedProject) {
      invalidKeys.push(object.key);

      continue;
    }

    if (operation.scope !== normalizedScope) {
      invalidKeys.push(object.key);

      continue;
    }

    parsed.push(operation);
  }

  const groups = new Map<string, MultiHostOperation<T>[]>();

  for (const operation of parsed) {
    const group = groups.get(operation.operationId);

    if (!group) {
      groups.set(operation.operationId, [operation]);

      continue;
    }

    group.push(operation);
  }

  const operations: MultiHostOperation<T>[] = [];

  const conflicts: MultiHostOperationConflict<T>[] = [];

  for (const [operationId, variants] of groups) {
    const fingerprints = new Set(variants.map((operation) => operationFingerprint(operation)));

    if (fingerprints.size > 1) {
      conflicts.push({
        operationId,

        variants: [...variants].sort(compareOperations),
      });

      continue;
    }

    const first = variants[0];

    if (!first) {
      continue;
    }

    operations.push(first);
  }

  operations.sort(compareOperations);

  conflicts.sort((left, right) => left.operationId.localeCompare(right.operationId));

  invalidKeys.sort();

  return {
    operations,

    conflicts,

    invalidKeys,
  };
}

export function reduceMultiHostOperations<State, Payload>(
  initialState: State,
  operations: MultiHostOperation<Payload>[],
  reducer: (state: State, operation: MultiHostOperation<Payload>) => State
): State {
  let state = initialState;

  const ordered = [...operations].sort(compareOperations);

  for (const operation of ordered) {
    state = reducer(state, operation);
  }

  return state;
}
