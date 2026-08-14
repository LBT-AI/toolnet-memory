import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import {
  KnowledgeGovernanceService,
  KnowledgeGovernanceStore,
  WikiService,
  WikiStore,
} from '../../src/wiki/index.js';

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
    id: 'governance-test',
    name: 'governance-test',
    remote: 'governance-test',
    rootPath: '/tmp/governance-test',
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

describe('KnowledgeGovernanceService', () => {
  it('auto-approves high confidence durable knowledge', async () => {
    const storage = new FakeStorage();

    const governance = new KnowledgeGovernanceService(
      new KnowledgeGovernanceStore(storage, project())
    );

    await governance.initialize();

    const gate = await governance.gate(
      {
        sourceKey: 'memory:architecture',
        sourceType: 'memory',
        slug: 'auto-memory-architecture',
        marker: 'toolnet-auto-test',
        digest: 'digest-1',
        title: 'Project Architecture',
        content:
          'Durable architecture knowledge with enough verified context to be safely promoted into maintained project knowledge.',
        tags: ['permanent', 'toolnet'],
      },
      []
    );

    expect(gate.allowed).toBe(true);
    expect(gate.mode).toBe('auto-approved');
  });

  it('creates review gate for critical lower-confidence scene and applies approval', async () => {
    const storage = new FakeStorage();

    const p = project();

    const governance = new KnowledgeGovernanceService(new KnowledgeGovernanceStore(storage, p));

    const wiki = new WikiService(new WikiStore(storage, p));

    await governance.initialize();
    await wiki.initialize();

    const gate = await governance.gate(
      {
        sourceKey: 'scene:security',
        sourceType: 'scene',
        slug: 'auto-scene-security',
        marker: 'toolnet-auto-security',
        digest: 'digest-security',
        title: 'Security Architecture',
        content: 'Security architecture rules for authentication and authorization.',
        tags: ['scene'],
      },
      []
    );

    expect(gate.allowed).toBe(false);
    expect(gate.mode).toBe('pending-review');

    const review = gate.review;

    expect(review).toBeDefined();

    await governance.decide(
      review!.id,
      {
        action: 'approve',
        principal: 'owner',
        note: 'Reviewed security architecture.',
      },
      wiki
    );

    const page = await wiki.getPage('auto-scene-security');

    expect(page.title).toBe('Security Architecture');

    expect(page.tags).toContain('toolnet-auto-security');
  });

  it('detects conflicting duplicate knowledge', async () => {
    const storage = new FakeStorage();

    const p = project();

    const governance = new KnowledgeGovernanceService(new KnowledgeGovernanceStore(storage, p));

    await governance.initialize();

    const assessment = await governance.assess(
      {
        sourceKey: 'scene:architecture-2',
        sourceType: 'scene',
        slug: 'auto-architecture-2',
        marker: 'toolnet-auto-2',
        digest: 'd2',
        title: 'Architecture',
        content: 'Architecture says database B is canonical.',
        tags: [],
      },
      [
        {
          id: 'manual',
          slug: 'architecture',
          title: 'Architecture',
          content: 'Architecture says database A is canonical.',
          tags: ['manual'],
          links: [],
          revision: 1,
          createdAt: '2026-08-14T00:00:00.000Z',
          updatedAt: '2026-08-14T00:00:00.000Z',
        },
      ]
    );

    expect(assessment.requiresReview).toBe(true);

    expect(assessment.risk).toBe('conflict');

    expect(assessment.conflicts).toEqual(['architecture']);
  });
});
