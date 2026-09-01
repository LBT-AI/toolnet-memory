import { createHash } from 'node:crypto';

import { hostname } from 'node:os';

import type { MemoryRecord } from '../core/types.js';

import { MemoryStore } from '../storage/memory-store.js';

import type { StorageProvider } from '../storage/types.js';

import {
  appendMultiHostOperation,
  collectMultiHostOperations,
  createMultiHostOperation,
  type MultiHostOperation,
} from './operation-log.js';

interface MemoryProjectionPayload {
  kind: 'upsert';

  memory: MemoryRecord;
}

export interface ConvergentMemoryStoreOptions {
  hostId?: string;
}

export interface MemoryProjectionDiagnostics {
  operationCount: number;

  conflicts: number;

  invalidKeys: number;
}

function normalizedHostId(explicit?: string): string {
  const value = explicit ?? process.env.TOOLNET_HOST_ID ?? hostname();

  const normalized = value.trim();

  if (normalized) {
    return normalized;
  }

  return `pid-${process.pid}`;
}

function stableJson(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (input === null || typeof input !== 'object') {
      return input;
    }

    if (Array.isArray(input)) {
      return input.map((item) => normalize(item));
    }

    const record = input as Record<string, unknown>;

    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, normalize(record[key])])
    );
  };

  return JSON.stringify(normalize(value));
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function memoryOperationId(hostId: string, memory: MemoryRecord): string {
  const hostDigest = digest(hostId).slice(0, 12);

  const recordDigest = digest(memory);

  return ['memory', hostDigest, recordDigest].join('-');
}

function compareMemoryRecords(left: MemoryRecord, right: MemoryRecord): number {
  const byUpdated = left.updatedAt.localeCompare(right.updatedAt);

  if (byUpdated !== 0) {
    return byUpdated;
  }

  const byCreated = left.createdAt.localeCompare(right.createdAt);

  if (byCreated !== 0) {
    return byCreated;
  }

  return digest(left).localeCompare(digest(right));
}

function newerRecord(left: MemoryRecord, right: MemoryRecord): MemoryRecord {
  if (compareMemoryRecords(left, right) >= 0) {
    return left;
  }

  return right;
}

function mergeProjection(
  legacy: MemoryRecord[],
  operations: MultiHostOperation<MemoryProjectionPayload>[]
): MemoryRecord[] {
  const byId = new Map<string, MemoryRecord>();

  for (const memory of legacy) {
    byId.set(memory.id, memory);
  }

  for (const operation of operations) {
    if (operation.payload.kind !== 'upsert') {
      continue;
    }

    const memory = operation.payload.memory;

    const current = byId.get(memory.id);

    if (!current) {
      byId.set(memory.id, memory);

      continue;
    }

    byId.set(memory.id, newerRecord(current, memory));
  }

  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export class ConvergentMemoryStore {
  private readonly legacy: MemoryStore;

  private readonly hostId: string;

  private diagnostics: MemoryProjectionDiagnostics = {
    operationCount: 0,

    conflicts: 0,

    invalidKeys: 0,
  };

  constructor(
    private readonly storage: StorageProvider,
    options: ConvergentMemoryStoreOptions = {}
  ) {
    this.legacy = new MemoryStore(storage);

    this.hostId = normalizedHostId(options.hostId);
  }

  getDiagnostics(): MemoryProjectionDiagnostics {
    return {
      ...this.diagnostics,
    };
  }

  private async operations(projectId: string) {
    const result = await collectMultiHostOperations<MemoryProjectionPayload>(
      this.storage,
      projectId,
      'memory'
    );

    this.diagnostics = {
      operationCount: result.operations.length,

      conflicts: result.conflicts.length,

      invalidKeys: result.invalidKeys.length,
    };

    return result.operations;
  }

  async load(projectId: string): Promise<MemoryRecord[]> {
    const legacy = await this.legacy.load(projectId);

    const operations = await this.operations(projectId);

    return mergeProjection(legacy, operations);
  }

  private async appendMemory(projectId: string, memory: MemoryRecord): Promise<void> {
    const operation = createMultiHostOperation<MemoryProjectionPayload>({
      projectId,

      scope: 'memory',

      hostId: this.hostId,

      operationId: memoryOperationId(this.hostId, memory),

      occurredAt: memory.updatedAt,

      payload: {
        kind: 'upsert',

        memory,
      },
    });

    await appendMultiHostOperation(this.storage, operation);
  }

  async refreshProjection(projectId: string): Promise<MemoryRecord[]> {
    const legacy = await this.legacy.load(projectId);

    const operations = await this.operations(projectId);

    const projection = mergeProjection(legacy, operations);

    /*
     * Replay-only cache refresh.
     *
     * Do not append immutable memory operations here.
     * operations/* remains authoritative.
     */
    await this.legacy.save(projectId, projection);

    return projection;
  }

  async save(projectId: string, memories: MemoryRecord[]): Promise<void> {
    const ordered = [...memories].sort((left, right) => left.id.localeCompare(right.id));

    /*
     * Source of truth first.
     *
     * If process dies after this point,
     * immutable operations survive even if
     * current.json was never refreshed.
     */
    for (const memory of ordered) {
      await this.appendMemory(projectId, memory);
    }

    const operations = await this.operations(projectId);

    const projection = mergeProjection(memories, operations);

    /*
     * Compatibility projection/cache only.
     *
     * A concurrent host may overwrite this snapshot.
     * That is acceptable because load() always merges
     * it with immutable operation objects.
     */
    await this.legacy.save(projectId, projection);
  }
}
