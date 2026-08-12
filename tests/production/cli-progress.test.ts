import { describe, expect, it } from 'vitest';

import { CliProgress, withProgress } from '../../src/production/cli-progress.js';

class FakeStream {
  isTTY = false;

  output = '';

  write(chunk: string): boolean {
    this.output += chunk;

    return true;
  }
}

describe('CLI progress', () => {
  it('renders deterministic non-TTY progress', () => {
    const stream = new FakeStream();

    const progress = new CliProgress('Checking registry', {
      stream,

      interactive: false,

      color: false,
    });

    progress.start();

    progress.succeed('Registry ready');

    expect(stream.output).toContain('→ Checking registry');

    expect(stream.output).toContain('✓ Registry ready');
  });

  it('supports live label updates', () => {
    const stream = new FakeStream();

    const progress = new CliProgress('Starting', {
      stream,

      interactive: false,

      color: false,
    });

    progress.start();

    progress.update('Installing');

    progress.succeed();

    expect(stream.output).toContain('✓ Installing');
  });

  it('can be fully disabled for JSON output', () => {
    const stream = new FakeStream();

    const progress = new CliProgress('Hidden', {
      stream,

      enabled: false,
    });

    progress.start();

    progress.succeed();

    expect(stream.output).toBe('');
  });

  it('withProgress returns action result', async () => {
    const stream = new FakeStream();

    const result = await withProgress('Working', async () => 42, {
      stream,

      interactive: false,

      color: false,
    });

    expect(result).toBe(42);

    expect(stream.output).toContain('✓ Working');
  });

  it('withProgress reports failure and rethrows', async () => {
    const stream = new FakeStream();

    await expect(
      withProgress(
        'Failing operation',

        async () => {
          throw new Error('boom');
        },

        {
          stream,

          interactive: false,

          color: false,
        }
      )
    ).rejects.toThrow('boom');

    expect(stream.output).toContain('✗ Failing operation');
  });
});
