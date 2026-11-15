import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { InMemoryCloudAuthority } from '../../src/v0.7/cloud-authority.js';
import { resumeFromCloud } from '../../src/v0.7/resume.js';
import { CheckpointEngine } from '../../src/v0.7/checkpoint.js';

describe('v0.7 strict cloud-only no-disk', () => {
  it('resume + checkpoint never create ToolNet memory files on disk', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-nodisk-'));
    try {
      const authority = new InMemoryCloudAuthority();
      authority.seed({ projectId: 'p', projectName: 'P', tasks: [{ id: 't1', title: 'T1' }] });

      const engine = new CheckpointEngine({ authority, mode: 'strict-cloud-only' });
      await engine.submit({
        projectId: 'p',
        agentId: 'agy',
        expectedRevision: 0,
        operations: [{ type: 'decision.add', text: 'hello' }],
        now: Date.now(),
      });

      await resumeFromCloud({ authority, projectId: 'p' });

      // No .toolnet directory should have been created in the temp root.
      const entries = readdirSync(root);
      expect(entries).not.toContain('.toolnet');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
