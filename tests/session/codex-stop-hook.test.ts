import { describe, expect, it } from 'vitest';

describe('Codex Stop Hook', () => {
  it('loads the stop-hook module and exports main', async () => {
    const mod = await import('../../src/session/codex/stop-hook.js');

    expect(typeof mod.main).toBe('function');
  });
});
