import { describe, expect, test } from 'vitest';

import { certifyRecoveryResilience } from '../../src/production/recovery-certify.js';

describe('X2 Recovery & Resilience', () => {
  test('survives corrupt, missing and unavailable continuity sources safely', async () => {
    const result = await certifyRecoveryResilience();

    const failed = result.checks.filter((check) => !check.passed);

    expect(
      failed,
      failed.map((check) => `${check.id}: ${check.detail ?? 'failed'}`).join('\n')
    ).toEqual([]);

    expect(result.total).toBe(9);

    expect(result.passedCount).toBe(9);

    expect(result.passed).toBe(true);
  });
});
