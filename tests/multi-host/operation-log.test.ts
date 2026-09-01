import { describe, expect, it } from 'vitest';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import {
  appendMultiHostOperation,
  collectMultiHostOperations,
  createMultiHostOperation,
  multiHostOperationPrefix,
  reduceMultiHostOperations,
} from '../../src/multi-host/operation-log.js';

class TestStorage implements StorageProvider {
  readonly name = 'phase6b-test';

  readonly objects = new Map<string, Uint8Array>();

  reverseList = false;

  async put(key: string, data: string | Uint8Array, contentType?: string): Promise<void> {
    void contentType;
    const value = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, key.includes('vps-a') ? 5 : 1);
    });

    this.objects.set(key, value);
  }

  async get(key: string): Promise<Uint8Array | null> {
    const value = this.objects.get(key);

    if (!value) {
      return null;
    }

    return new Uint8Array(value);
  }

  async getText(key: string): Promise<string | null> {
    const value = this.objects.get(key);

    if (!value) {
      return null;
    }

    return Buffer.from(value).toString('utf8');
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    const values = [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,

        size: value.length,
      }));

    if (!this.reverseList) {
      return values;
    }

    return values.reverse();
  }
}

interface Payload {
  value: string;
}

function operation(hostId: string, operationId: string, occurredAt: string, value: string) {
  return createMultiHostOperation<Payload>({
    projectId: 'phase6-project',

    scope: 'memory',

    hostId,

    operationId,

    occurredAt,

    payload: {
      value,
    },
  });
}

describe('Append-only multi-host operation log', () => {
  it('keeps concurrent writes from two hosts without lost update', async () => {
    const storage = new TestStorage();

    const first = operation('vps-a', 'operation-a', '2026-09-02T04:00:00.000Z', 'A');

    const second = operation('vps-b', 'operation-b', '2026-09-02T04:00:00.001Z', 'B');

    await Promise.all([
      appendMultiHostOperation(storage, first),

      appendMultiHostOperation(storage, second),
    ]);

    const result = await collectMultiHostOperations<Payload>(storage, 'phase6-project', 'memory');

    expect(result.operations).toHaveLength(2);

    expect(result.conflicts).toHaveLength(0);

    expect(result.operations.map((item) => item.payload.value)).toEqual(['A', 'B']);
  });

  it('makes retry of the exact same operation idempotent', async () => {
    const storage = new TestStorage();

    const item = operation('vps-a', 'retry-operation', '2026-09-02T04:01:00.000Z', 'same');

    await appendMultiHostOperation(storage, item);

    await appendMultiHostOperation(storage, item);

    const prefix = multiHostOperationPrefix('phase6-project', 'memory');

    expect(await storage.list(prefix)).toHaveLength(1);

    const result = await collectMultiHostOperations<Payload>(storage, 'phase6-project', 'memory');

    expect(result.operations).toHaveLength(1);
  });

  it('produces the same merge regardless of remote list order', async () => {
    const storage = new TestStorage();

    await appendMultiHostOperation(
      storage,
      operation('vps-b', 'op-b', '2026-09-02T04:02:00.000Z', 'B')
    );

    await appendMultiHostOperation(
      storage,
      operation('vps-a', 'op-a', '2026-09-02T04:02:00.000Z', 'A')
    );

    const normal = await collectMultiHostOperations<Payload>(storage, 'phase6-project', 'memory');

    storage.reverseList = true;

    const reversed = await collectMultiHostOperations<Payload>(storage, 'phase6-project', 'memory');

    const reduce = (operations: typeof normal.operations) =>
      reduceMultiHostOperations<string[], Payload>([], operations, (state, item) => [
        ...state,
        item.payload.value,
      ]);

    expect(reduce(normal.operations)).toEqual(['A', 'B']);

    expect(reduce(reversed.operations)).toEqual(reduce(normal.operations));
  });

  it('isolates corrupt remote objects instead of breaking convergence', async () => {
    const storage = new TestStorage();

    await appendMultiHostOperation(
      storage,
      operation('vps-a', 'valid-operation', '2026-09-02T04:03:00.000Z', 'valid')
    );

    const prefix = multiHostOperationPrefix('phase6-project', 'memory');

    await storage.put(`${prefix}corrupt.json`, '{"broken":', 'application/json');

    const result = await collectMultiHostOperations<Payload>(storage, 'phase6-project', 'memory');

    expect(result.operations).toHaveLength(1);

    expect(result.invalidKeys).toHaveLength(1);

    expect(result.operations[0]?.payload.value).toBe('valid');
  });

  it('surfaces divergent reuse of one operationId instead of overwriting it', async () => {
    const storage = new TestStorage();

    const first = operation('vps-a', 'shared-id', '2026-09-02T04:04:00.000Z', 'A');

    const second = operation('vps-b', 'shared-id', '2026-09-02T04:04:01.000Z', 'B');

    await appendMultiHostOperation(storage, first);

    await appendMultiHostOperation(storage, second);

    const result = await collectMultiHostOperations<Payload>(storage, 'phase6-project', 'memory');

    expect(result.operations).toHaveLength(0);

    expect(result.conflicts).toHaveLength(1);

    expect(result.conflicts[0]?.operationId).toBe('shared-id');

    expect(result.conflicts[0]?.variants).toHaveLength(2);
  });

  it('never writes a shared current.json projection', async () => {
    const storage = new TestStorage();

    await appendMultiHostOperation(
      storage,
      operation('vps-a', 'projection-test', '2026-09-02T04:05:00.000Z', 'value')
    );

    const keys = [...storage.objects.keys()];

    expect(keys.some((key) => key.endsWith('/current.json'))).toBe(false);

    expect(keys.every((key) => key.includes('/operations/'))).toBe(true);
  });
});
