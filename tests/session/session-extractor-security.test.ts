import { describe, expect, it } from 'vitest';

import { extractSessionMemory } from '../../src/session/session-extractor.js';

describe('Session extractor security', () => {
  it('redacts nested JSON secrets from summary and durable facts', () => {
    const extraction = extractSessionMemory(
      [
        JSON.stringify({
          role: 'user',

          token: 'super-secret-token',

          cookie: 'cookie-value',

          password: 'password-value',

          nested: {
            authorization: 'Bearer abc123',

            api_key: 'api-secret-value',
          },

          content: 'Quyết định: dùng PKCE cho OAuth callback.',
        }),

        'token=plain-secret-value Quyết định: tiếp tục OAuth flow.',
      ],
      'security-test'
    );

    const serialized = JSON.stringify(extraction);

    expect(serialized).not.toContain('super-secret-token');

    expect(serialized).not.toContain('cookie-value');

    expect(serialized).not.toContain('password-value');

    expect(serialized).not.toContain('abc123');

    expect(serialized).not.toContain('api-secret-value');

    expect(serialized).not.toContain('plain-secret-value');

    expect(serialized).toContain('REDACTED');
  });
});
