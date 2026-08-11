import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { refreshFastHandoffFromCurrent } from '../../src/work-continuity/handoff-refresh.js';

import { fastHandoffFile, readFastHandoff } from '../../src/work-continuity/fast-handoff.js';

describe('Auto Handoff Writer', () => {
  test('refreshes handoff from current.md and skips unchanged content', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-c3-'));

    try {
      mkdirSync(join(root, '.toolnet'), {
        recursive: true,
      });

      writeFileSync(
        join(root, '.toolnet', 'current.md'),
        `
# Current Work

Task:
- Implement Codex continuity.

Completed:
- C1 fast SessionStart.
- C2 fast handoff cache.

Unfinished:
- Connect automatic writer.

Next:
- Run tests.
`,
        'utf8'
      );

      const project = {
        id: 'c3-test',
        name: 'c3-test',
        rootPath: root,
        remote: null,
      } as any;

      const first = refreshFastHandoffFromCurrent(project);

      expect(first.updated).toBe(true);

      const handoff = readFastHandoff(project);

      expect(handoff?.text).toContain('Connect automatic writer');

      expect(readFileSync(fastHandoffFile(project), 'utf8')).toContain('Continue unfinished work');

      const second = refreshFastHandoffFromCurrent(project);

      expect(second.updated).toBe(false);

      expect(second.reason).toBe('unchanged');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
