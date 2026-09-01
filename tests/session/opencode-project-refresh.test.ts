import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

function source(): string {
  return readFileSync('src/session/opencode/plugin-installer.ts', 'utf8');
}

describe('OpenCode persistent project refresh', () => {
  it('runs the one-shot ToolNet refresh command', () => {
    const text = source();

    expect(text).toContain('"background:refresh"');

    expect(text).toContain('"--project"');

    expect(text).toContain('"--quiet"');
  });

  it('prevents overlapping projection refreshes', () => {
    const text = source();

    expect(text).toContain('let refreshInFlight');

    expect(text).toContain('if (\n        refreshInFlight');

    expect(text).toContain('refreshInFlight =\n                null');
  });

  it('refreshes on plugin startup and periodically', () => {
    const text = source();

    expect(text).toContain('"plugin-startup"');

    expect(text).toContain('"periodic-project-refresh"');

    expect(text).toContain('const projectRefreshPeriodic');

    expect(text).toContain('PROJECT_REFRESH_MS');
  });

  it('refreshes after successful remote sync', () => {
    const text = source();

    expect(text).toContain('"after-remote-sync"');

    expect(text).toContain('!localOnly');
  });

  it('stops the refresh timer during dispose', () => {
    const text = source();

    expect(text).toContain('clearInterval(\n          projectRefreshPeriodic');
  });

  it('keeps refresh failures fail-open', () => {
    const text = source();

    expect(text).toContain('"projection-refresh-failed"');

    expect(text).toContain('.catch(');

    expect(text).toContain('return undefined');
  });
});
