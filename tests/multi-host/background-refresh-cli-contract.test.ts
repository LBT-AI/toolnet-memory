import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Background refresh CLI contract', () => {
  it('has a production bundle entry', () => {
    const text = readFileSync('scripts/build-bundle.mjs', 'utf8');

    expect(text).toContain("'background-refresh': 'src/multi-host/background-refresh-cli.ts'");
  });

  it('has a toolnet-memory dispatcher command', () => {
    const text = readFileSync('bin/toolnet-memory', 'utf8');

    expect(text).toContain('background:refresh)');

    expect(text).toContain('bundle/background-refresh.js');
  });

  it('uses one-shot refresh instead of starting a daemon', () => {
    const text = readFileSync('src/multi-host/background-refresh-cli.ts', 'utf8');

    expect(text).toContain('refreshProjectStateOnce');

    expect(text).not.toContain('startProjectBackgroundRefresh');

    expect(text).not.toContain('setInterval');

    expect(text).not.toContain('setTimeout');
  });

  it('supports quiet integration mode', () => {
    const text = readFileSync('src/multi-host/background-refresh-cli.ts', 'utf8');

    expect(text).toContain("'--quiet'");

    expect(text).toContain('args.quiet');
  });
});
