import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Extended lifecycle projection refresh', () => {
  it('Claude refreshes at SessionStart and Stop', () => {
    const text = source('src/session/claude/runtime.ts');

    expect(text).toContain("event === 'SessionStart'");

    expect(text).toContain("event === 'Stop'");

    expect(text.match(/triggerProjectBackgroundRefresh/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('Cursor refreshes only after capture at start/stop boundaries', () => {
    const text = source('src/session/cursor/hook.ts');

    expect(text).toContain('const capture =');

    expect(text).toContain("event === 'sessionStart'");

    expect(text).toContain("event === 'stop'");

    expect(text).toContain('capture.projectRoot');

    expect(text.indexOf('await handleCursorHookInput')).toBeLessThan(
      text.lastIndexOf('triggerProjectBackgroundRefresh')
    );
  });

  it('Copilot refreshes after sessionStart and agentStop capture', () => {
    const text = source('src/session/copilot/hook.ts');

    expect(text).toContain("event === 'sessionStart'");

    expect(text).toContain("event === 'agentStop'");

    expect(text).toContain('capture.projectRoot');

    expect(text.indexOf('await handleCopilotHookInput')).toBeLessThan(
      text.lastIndexOf('triggerProjectBackgroundRefresh')
    );
  });

  it('Grok refreshes after SessionStart and Stop capture', () => {
    const text = source('src/session/grok/hook.ts');

    expect(text).toContain("event === 'SessionStart'");

    expect(text).toContain("event === 'Stop'");

    expect(text).toContain('capture.projectRoot');

    expect(text.indexOf('await handleGrokHookInput')).toBeLessThan(
      text.lastIndexOf('triggerProjectBackgroundRefresh')
    );
  });

  it('all four integrations use the shared detached trigger', () => {
    for (const path of [
      'src/session/claude/runtime.ts',
      'src/session/cursor/hook.ts',
      'src/session/copilot/hook.ts',
      'src/session/grok/hook.ts',
    ]) {
      expect(source(path)).toContain('triggerProjectBackgroundRefresh');
    }
  });
});
