import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { triggerProjectBackgroundRefresh } from '../../src/multi-host/refresh-trigger.js';

describe('Lifecycle projection refresh trigger', () => {
  it('rejects an empty project root', () => {
    expect(triggerProjectBackgroundRefresh('')).toBe(false);
  });

  it('Codex SessionStart triggers detached refresh', () => {
    const text = readFileSync('src/session/codex/context-hook.ts', 'utf8');

    expect(text).toContain('triggerProjectBackgroundRefresh');

    expect(text).toContain('project.rootPath');

    expect(text).toContain("input.hook_event_name !== 'SessionStart'");
  });

  it('Agy refreshes on pre and stop lifecycle phases', () => {
    const text = readFileSync('src/session/agy/hook.ts', 'utf8');

    expect(text).toContain("phase === 'pre'");

    expect(text).toContain("phase === 'stop'");

    expect(text).toContain('triggerProjectBackgroundRefresh');
  });

  it('Kiro startup triggers detached refresh', () => {
    const text = readFileSync('src/session/kiro/hook.ts', 'utf8');

    expect(text).toContain('isKiroStartupEvent');

    expect(text).toContain('triggerProjectBackgroundRefresh');
  });

  it('trigger is detached and fail-open', () => {
    const text = readFileSync('src/multi-host/refresh-trigger.ts', 'utf8');

    expect(text).toContain('detached: true');

    expect(text).toContain('stdio:');

    expect(text).toContain('child.unref()');

    expect(text).toContain("'error'");

    expect(text).toContain("'--quiet'");
  });
});
