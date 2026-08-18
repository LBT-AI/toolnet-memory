import { describe, expect, it } from 'vitest';

import { Sanitizer } from '../../src/security/sanitizer.js';

describe('Sanitizer structured secret keys', () => {
  it('redacts common secret key naming variants recursively', () => {
    const sanitizer = new Sanitizer();

    const value = sanitizer.sanitizeValue({
      api_key: 'api-secret-value',

      apiKey: 'camel-secret',

      'api-key': 'dash-secret',

      access_key: 'access-secret',

      client_secret: 'client-secret-value',

      token: 'token-value',

      cookie: 'cookie-value',

      nested: {
        authorization: 'Bearer abc123',

        password: 'password-value',

        safe: 'keep-this',
      },
    }) as Record<string, unknown>;

    const serialized = JSON.stringify(value);

    for (const secret of [
      'api-secret-value',
      'camel-secret',
      'dash-secret',
      'access-secret',
      'client-secret-value',
      'token-value',
      'cookie-value',
      'abc123',
      'password-value',
    ]) {
      expect(serialized).not.toContain(secret);
    }

    expect(serialized).toContain('keep-this');
    expect(serialized).toContain('[REDACTED]');
  });
});
