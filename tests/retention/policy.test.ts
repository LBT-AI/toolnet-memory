import { describe, expect, it } from 'vitest';

import { retentionPolicy } from '../../src/retention/policy.js';

describe('retention policy', () => {
  it('uses conservative defaults', () => {
    expect(retentionPolicy()).toEqual({
      keepSnapshots: 10,
      runtimeDays: 30,
      staleLockMinutes: 10,
    });
  });

  it('rejects unsafe numeric values', () => {
    expect(() =>
      retentionPolicy({
        keepSnapshots: 0,
      })
    ).toThrow();

    expect(() =>
      retentionPolicy({
        runtimeDays: 0,
      })
    ).toThrow();

    expect(() =>
      retentionPolicy({
        staleLockMinutes: 0,
      })
    ).toThrow();
  });
});
