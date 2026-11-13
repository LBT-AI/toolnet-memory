import { mkdtempSync, readdirSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CheckpointEngine } from '../../src/v0.7/checkpoint.js';

import { InMemoryCloudAuthority } from '../../src/v0.7/cloud-authority.js';

const NOW = 1_700_000_000_000;

function setup(options: { capacity?: number } = {}): {
  authority: InMemoryCloudAuthority;
  engine: CheckpointEngine;
  clock: { value: number };
  batch: (text: string) => Parameters<CheckpointEngine['submit']>[0];
} {
  const clock = { value: NOW };
  const authority = new InMemoryCloudAuthority({ now: () => clock.value });

  authority.seed({
    projectId: 'project-a',
    projectName: 'Project A',
    tasks: [{ id: 'T8', title: 'Retry handling', status: 'in_progress' }],
  });

  const engine = new CheckpointEngine({
    authority,
    mode: 'strict-cloud-only',
    now: () => clock.value,
    ...(options.capacity === undefined ? {} : { capacity: options.capacity }),
  });

  return {
    authority,
    engine,
    clock,
    batch: (text: string) => ({
      projectId: 'project-a',
      agentId: 'agy',
      operations: [{ type: 'decision.add', text }],
      expectedRevision: 0,
      now: clock.value,
    }),
  };
}

describe('v0.7 checkpoint engine', () => {
  it('reports acknowledged only when the cloud authority acknowledged', async () => {
    const { engine, batch } = setup();

    const result = await engine.submit(batch('use R2 for history'));

    expect(result.status).toBe('acknowledged');
    expect(result.revision).toBe(1);
    expect(result.durabilityMode).toBe('strict-cloud-only');
    expect(engine.status()).toMatchObject({
      state: 'healthy',
      pendingBatches: 0,
      lastAcknowledgedRevision: 1,
    });
  });

  it('keeps a failed checkpoint in RAM, reports unavailable and never claims persistence', async () => {
    const { authority, engine, batch } = setup();

    authority.setOffline(true);

    const result = await engine.submit(batch('unacknowledged work'));

    expect(result.status).toBe('unacknowledged');
    expect(result.code).toBe('AUTHORITY_UNAVAILABLE');
    expect(result.retryable).toBe(true);

    const status = engine.status();

    expect(status.state).toBe('unavailable');
    expect(status.pendingBatches).toBe(1);
    expect(status.pendingOperations).toBe(1);
    expect(status.lastAcknowledgedRevision).toBeUndefined();
  });

  it('replays buffered batches after the cloud recovers', async () => {
    const { authority, engine, batch } = setup();

    authority.setOffline(true);
    await engine.submit(batch('first'));

    authority.setOffline(false);

    const retry = await engine.retryBuffered();

    expect(retry.acknowledged).toBe(1);
    expect(retry.remaining).toBe(0);

    const snapshot = await authority.fetchSnapshot('project-a');

    expect(snapshot.decisions).toEqual(['first']);
    expect(engine.status().state).toBe('healthy');
  });

  it('rejects a non-retryable conflict without buffering or retrying it forever', async () => {
    const { engine, batch } = setup();

    await engine.submit(batch('first'));

    const conflict = await engine.submit({ ...batch('second'), expectedRevision: 0 });

    expect(conflict.status).toBe('unacknowledged');
    expect(conflict.code).toBe('AUTHORITY_REVISION_CONFLICT');
    expect(conflict.retryable).toBe(false);
    expect(engine.status().pendingBatches).toBe(0);
  });

  it('drops the oldest batch when the RAM buffer is full and reports it', async () => {
    const { authority, engine, batch } = setup({ capacity: 1 });

    authority.setOffline(true);
    await engine.submit(batch('first'));
    const second = await engine.submit(batch('second'));

    expect(second.buffered).toBe(1);
    expect(second.dropped).toBe(1);
    expect(engine.status().pendingBatches).toBe(1);
    expect(engine.status().lastError).toContain('CHECKPOINT_BUFFER_FULL');
  });

  it('does not create any file on the machine when the cloud is unavailable', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'toolnet-v07-checkpoint-'));

    try {
      const { authority, engine, batch } = setup();

      authority.setOffline(true);
      await engine.submit(batch('no disk'));
      await engine.retryBuffered();

      expect(readdirSync(directory)).toEqual([]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
