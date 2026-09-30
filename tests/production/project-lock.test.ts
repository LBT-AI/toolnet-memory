import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ProjectLock } from '../../src/production/project-lock.js';

describe('Project Lock', () => {
  it('allows same-PID re-acquisition after restart', async () => {
    const id = randomUUID();

    const first = new ProjectLock(id);

    await first.acquire();

    const second = new ProjectLock(id);

    await second.acquire();

    await first.release();

    await second.release();
  });
});
