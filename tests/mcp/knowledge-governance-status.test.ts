import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { knowledgeGovernanceStatus } from '../../src/mcp/tools/knowledge-governance-status.js';

class FakeStorage {
  private readonly data = new Map<string, string>();

  async getText(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.data.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }
}

describe('knowledge_governance_status', () => {
  it('returns governance and quality status', async () => {
    const project: ProjectManifest = {
      id: 'gov-mcp',
      name: 'gov-mcp',
      remote: 'gov-mcp',
      rootPath: '/tmp/gov-mcp',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      graphVersion: 0,
      memoryVersion: 0,
    };

    const result = await knowledgeGovernanceStatus(
      {
        project,
        storage: new FakeStorage(),
      },
      {
        includePending: true,
      }
    );

    expect(result.schema).toBe('toolnet.knowledge-governance-status.v1');

    expect(result.summary.pending).toBe(0);
  });
});
