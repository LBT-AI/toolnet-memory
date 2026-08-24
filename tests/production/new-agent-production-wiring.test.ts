import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Phase 05 production wiring', () => {
  it('contains six new bundle entries', () => {
    const source = readFileSync('scripts/build-bundle.mjs', 'utf8');

    for (const token of [
      "cursor: 'src/session/cursor/cli.ts'",
      "'cursor-hook': 'src/session/cursor/hook.ts'",
      "copilot: 'src/session/copilot/cli.ts'",
      "'copilot-hook': 'src/session/copilot/hook.ts'",
      "grok: 'src/session/grok/cli.ts'",
      "'grok-hook': 'src/session/grok/hook.ts'",
    ]) {
      expect(source).toContain(token);
    }
  });

  it('contains integrate and hook routes', () => {
    const source = readFileSync('bin/toolnet-memory', 'utf8');

    for (const route of [
      'integrate:cursor)',
      'integrate:copilot)',
      'integrate:grok)',
      'session:cursor-hook)',
      'session:copilot-hook)',
      'session:grok-hook)',
    ]) {
      expect(source).toContain(route);
    }
  });
});
