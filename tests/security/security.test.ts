import { describe, expect, it } from 'vitest';

import { SecretScanner, Sanitizer, isSensitiveFile } from '../../src/security/index.js';

import { MemoryEngine } from '../../src/core/memory-engine.js';

describe('Security Layer', () => {
  it('detects and redacts secrets', () => {
    const scanner = new SecretScanner();

    const sanitizer = new Sanitizer();

    const input = 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456 password=supersecret123';

    expect(scanner.hasSecrets(input)).toBe(true);

    const result = sanitizer.sanitize(input);

    expect(result.text).toContain('[REDACTED');

    expect(result.text).not.toContain('supersecret123');
  });

  it('blocks sensitive files', () => {
    expect(isSensitiveFile('/app/.env')).toBe(true);

    expect(isSensitiveFile('/keys/private.pem')).toBe(true);

    expect(isSensitiveFile('/src/index.ts')).toBe(false);
  });

  it('sanitizes memory before storage', () => {
    const memory = new MemoryEngine();

    const record = memory.remember({
      projectId: 'test',

      type: 'activity',

      content: 'Token hf_abcdefghijklmnopqrstuvwxyz123456',

      metadata: {
        password: 'secret-password',

        normal: 'safe',
      },
    });

    expect(record.content).not.toContain('hf_abcdefghijklmnopqrstuvwxyz123456');

    expect(record.metadata?.password).toBe('[REDACTED]');

    expect(record.metadata?.normal).toBe('safe');
  });
});
