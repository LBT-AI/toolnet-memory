import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { updateCurrentFromSession } from '../../src/work-continuity/auto-current.js';

describe('Automatic current work', () => {
  test('preserves manual context and replaces only automatic section', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-current-'));

    try {
      mkdirSync(join(root, '.toolnet'), {
        recursive: true,
      });

      writeFileSync(
        join(root, '.toolnet', 'current.md'),
        `
# Current Work

Manual rule:
- Keep PostgreSQL.
`,
        'utf8'
      );

      const project = {
        id: 'auto-current-test',
        name: 'auto-current-test',
        rootPath: root,
        remote: null,
      } as any;

      const result = updateCurrentFromSession(project, {
        agent: 'codex',

        nativeSessionId: 'thread-1',

        events: [
          {
            type: 'user_prompt',
            role: 'user',
            data: {
              message: 'Continue TODO 3 in src/setup.ts',
            },
          },
          {
            type: 'assistant_message',
            role: 'assistant',
            data: {
              message:
                'TODO 1 and TODO 2 completed. TODO 3 is still unfinished. Next: finish src/setup.ts then run tests.',
            },
          },
        ],
      });

      expect(result.updated).toBe(true);

      const content = readFileSync(join(root, '.toolnet', 'current.md'), 'utf8');

      expect(content).toContain('Keep PostgreSQL');

      expect(content).toContain('TOOLNET:AUTO-CURRENT:BEGIN');

      expect(content).toContain('TODO 3');

      expect(content).toContain('src/setup.ts');

      const second = updateCurrentFromSession(project, {
        agent: 'codex',

        nativeSessionId: 'thread-1',

        events: [
          {
            type: 'assistant_message',
            role: 'assistant',
            data: {
              message: 'TODO 3 completed. Next: run npm test.',
            },
          },
        ],
      });

      expect(second.updated).toBe(true);

      const updated = readFileSync(join(root, '.toolnet', 'current.md'), 'utf8');

      expect((updated.match(/TOOLNET:AUTO-CURRENT:BEGIN/g) ?? []).length).toBe(1);

      expect(updated).toContain('TODO 3 completed');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
