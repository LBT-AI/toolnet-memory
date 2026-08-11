import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { memoryAgentGuidance } from '../../src/work-continuity/agent-guidance.js';

import { buildFastProjectContext } from '../../src/work-continuity/fast-context.js';

describe('Memory Agent guidance', () => {
  test('teaches agents when to use memory_agent_ask', () => {
    const guidance = memoryAgentGuidance();

    expect(guidance).toContain('memory_agent_ask');

    expect(guidance).toContain('tiếp tục task lúc nãy');

    expect(guidance).toContain('continue the previous task');

    expect(guidance).toContain('mode="local"');

    expect(guidance).toContain('mode="ai"');
  });

  test('fast project context exposes memory tool guidance', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-guidance-'));

    try {
      mkdirSync(join(root, '.toolnet'), {
        recursive: true,
      });

      writeFileSync(
        join(root, '.toolnet', 'project.json'),
        JSON.stringify(
          {
            id: 'guidance-test',

            name: 'guidance-test',
          },
          null,
          2
        )
      );

      writeFileSync(
        join(root, '.toolnet', 'current.md'),
        ['# Current Work', '', 'Task: TODO 3', 'Next: continue validation'].join('\n')
      );

      const context = buildFastProjectContext({
        projectPath: root,
      });

      expect(context).toContain('memory_agent_ask');

      expect(context).toContain('resume previous work');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
