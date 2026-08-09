import { describe, expect, it } from 'vitest';

import { retry } from '../../src/utils/retry.js';

describe('Production Retry', () => {
  it('retries temporary failures', async () => {
    let attempts = 0;

    const value = await retry(
      async () => {
        attempts++;

        if (attempts < 3) {
          throw new Error('temporary');
        }

        return 'ok';
      },
      {
        attempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 2,
      }
    );

    expect(value).toBe('ok');

    expect(attempts).toBe(3);
  });
});
