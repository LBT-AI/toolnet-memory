import { readFileSync, readdirSync } from 'node:fs';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DurabilityPolicy,
  DurabilityPolicyError,
  resolveDurabilityMode,
} from '../../src/v0.7/durability-policy.js';

import { createDurabilityAwareStorageProvider } from '../../src/v0.7/cloud-storage.js';

describe('v0.7 durability policy', () => {
  it('defaults to local-first and accepts the two documented modes', () => {
    expect(resolveDurabilityMode(undefined)).toBe('local-first');
    expect(resolveDurabilityMode('')).toBe('local-first');
    expect(resolveDurabilityMode('local-first')).toBe('local-first');
    expect(resolveDurabilityMode(' STRICT-CLOUD-ONLY ')).toBe('strict-cloud-only');
  });

  it('fails closed on an unknown mode instead of silently writing to disk', () => {
    expect(() => resolveDurabilityMode('cloud-only')).toThrowError(DurabilityPolicyError);
  });

  it('blocks every ToolNet-owned memory write in strict mode but allows agent config', () => {
    const policy = new DurabilityPolicy('strict-cloud-only');

    for (const writeClass of ['memory-durable', 'memory-transient', 'telemetry'] as const) {
      const decision = policy.decide({
        path: '/root/.toolnet-memory/memory.db',
        writeClass,
        reason: 'test',
      });

      expect(decision.allowed, writeClass).toBe(false);
      expect(decision.code).toBe('STRICT_CLOUD_ONLY_WRITE_BLOCKED');
    }

    expect(
      policy.decide({
        path: '/root/.codex/config.toml',
        writeClass: 'agent-config',
        reason: 'hook',
      }).allowed
    ).toBe(true);

    expect(
      policy.decide({ path: '/repo/src/a.ts', writeClass: 'source', reason: 'edit' }).allowed
    ).toBe(true);

    expect(() =>
      policy.assertAllowed({
        path: '/root/.toolnet-memory/sessions/wal',
        writeClass: 'memory-durable',
        reason: 'wal',
      })
    ).toThrow(/strict cloud-only mode forbids/i);
  });

  it('keeps legacy local-first behaviour untouched', () => {
    const policy = new DurabilityPolicy('local-first');

    expect(
      policy.decide({ path: '/tmp/x', writeClass: 'memory-durable', reason: 'legacy' }).allowed
    ).toBe(true);
  });

  it('never falls back to local storage when strict mode lacks cloud credentials', () => {
    expect(() =>
      createDurabilityAwareStorageProvider(
        { provider: 'r2', r2: { accountId: 'account' } },
        'strict-cloud-only'
      )
    ).toThrowError(/strict cloud-only mode refuses local storage/i);

    expect(() =>
      createDurabilityAwareStorageProvider({ provider: 'local' }, 'strict-cloud-only')
    ).toThrowError(/strict cloud-only mode refuses local storage/i);

    expect(() =>
      createDurabilityAwareStorageProvider(
        { provider: 's3', s3: { bucket: 'bucket' } },
        'strict-cloud-only'
      )
    ).toThrowError(/strict cloud-only mode refuses local storage/i);

    expect(() =>
      createDurabilityAwareStorageProvider({ provider: 'mystery' }, 'strict-cloud-only')
    ).toThrowError(/is not a cloud provider/i);
  });

  it('uses the remote provider in strict mode when credentials are present', () => {
    const r2 = createDurabilityAwareStorageProvider(
      {
        provider: 'r2',
        r2: {
          accountId: 'account',
          bucket: 'bucket',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
        },
      },
      'strict-cloud-only'
    );

    expect(r2.name).toBe('r2');

    const s3 = createDurabilityAwareStorageProvider(
      {
        provider: 's3',
        s3: {
          endpoint: 'https://s3.example.com',
          bucket: 'bucket',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
        },
      },
      'strict-cloud-only'
    );

    expect(s3.name).toBe('s3');
  });

  it('keeps the legacy local fallback for local-first deployments', () => {
    const provider = createDurabilityAwareStorageProvider({ provider: 'r2' }, 'local-first');

    expect(provider.name).toBe('local');
  });

  it('contains no filesystem writes in the v0.7 cloud-only modules', () => {
    const directory = join(process.cwd(), 'src', 'v0.7');

    const offenders = readdirSync(directory)
      .filter((name) => name.endsWith('.ts'))
      .filter((name) => {
        const source = readFileSync(join(directory, name), 'utf8');

        return (
          /from\s+['"]node:fs/u.test(source) ||
          /writeFileSync|appendFileSync|createWriteStream/u.test(source)
        );
      });

    expect(offenders).toEqual([]);
  });
});
