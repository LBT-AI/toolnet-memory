import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { MemoryHubService, MemoryHubStore } from '../../src/hub/index.js';

class FakeStorage {
  private readonly data = new Map<string, string>();

  async getText(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.data.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }
}

function project(): ProjectManifest {
  return {
    id: 'hub-test-project',
    name: 'hub-test-project',
    remote: 'hub-test-project',
    rootPath: '/tmp/hub-test-project',
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

describe('MemoryHubService', () => {
  it('manages teams, agents, ACL and loadouts', async () => {
    const hub = new MemoryHubService(new MemoryHubStore(new FakeStorage(), project(), 'owner'));

    await hub.initialize();

    const team = await hub.createTeam('owner', {
      id: 'core',
      name: 'Core',
    });

    expect(team.id).toBe('core');

    const agent = await hub.createAgent('owner', {
      id: 'codex',
      name: 'Codex',
      teamIds: ['core'],
    });

    expect(agent.teamIds).toEqual(['core']);

    const loadout = await hub.getLoadout('owner', 'codex');

    expect(loadout.tools).toContain('memory_agent_ask');

    await hub.setLoadout('owner', {
      agentId: 'codex',
      memoryMode: 'ai',
      maxContextChars: 9000,
    });

    expect((await hub.getLoadout('owner', 'codex')).memoryMode).toBe('ai');

    await hub.grantAcl('owner', {
      principal: 'reader',
      role: 'viewer',
    });

    expect(await hub.authorize('reader', 'hub:read')).toBe(true);

    expect(await hub.authorize('reader', 'teams:write')).toBe(false);

    await expect(
      hub.createTeam('reader', {
        name: 'Blocked',
      })
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('tracks request observability', async () => {
    const hub = new MemoryHubService(new MemoryHubStore(new FakeStorage(), project(), 'owner'));

    await hub.initialize();

    await hub.recordRequest({
      method: 'GET',
      path: '/v1/hub',
      principal: 'owner',
      statusCode: 200,
      durationMs: 12,
    });

    await hub.recordRequest({
      method: 'GET',
      path: '/v1/hub',
      principal: 'anonymous',
      statusCode: 403,
      durationMs: 3,
    });

    const observability = await hub.observability('owner');

    expect(observability.requests).toBe(2);
    expect(observability.errors).toBe(1);
    expect(observability.events).toHaveLength(2);
  });
});
