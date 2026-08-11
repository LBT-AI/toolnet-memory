import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  fastHandoffFile,
  fastHandoffMetaFile,
  formatFastHandoffContext,
  readFastHandoff,
  writeFastHandoff,
} from '../../src/work-continuity/fast-handoff.js';

describe('Fast Handoff Cache', () => {
  test('writes and reads local handoff without storage', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-handoff-'));

    try {
      const project = {
        id: 'project-1',
        name: 'test-project',
        rootPath: root,
        remote: null,
      } as any;

      const cache = writeFastHandoff(
        project,
        `
# Current Work

Task:
- Fix authentication redirect.

Done:
- Google callback verified.

Next:
- Test X OAuth.
`
      );

      expect(cache).not.toBeNull();

      expect(existsSync(fastHandoffFile(project))).toBe(true);

      expect(existsSync(fastHandoffMetaFile(project))).toBe(true);

      const loaded = readFastHandoff(project);

      expect(loaded?.text).toContain('Fix authentication redirect');

      expect(loaded?.digest).toBe(cache?.digest);

      const context = formatFastHandoffContext(project);

      expect(context).toContain('[TOOLNET FAST HANDOFF]');

      expect(context).toContain('Test X OAuth');

      const rawMeta = JSON.parse(readFileSync(fastHandoffMetaFile(project), 'utf8'));

      expect(rawMeta.version).toBe(1);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
