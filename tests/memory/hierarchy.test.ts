import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { buildMemoryHierarchy, type HierarchyCandidate } from '../../src/memory/hierarchy.js';

import type { NormalizedSessionEvent, SessionIdentity } from '../../src/session/types.js';

import {
  listMemoryHierarchyBatches,
  SessionMemoryHierarchyJournal,
} from '../../src/session/learner/hierarchy-journal.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

const identity: SessionIdentity = {
  projectId: 't1-project',

  projectName: 'T1 demo',

  projectRoot: '/tmp/t1-demo',

  agent: 'codex',

  nativeSessionId: 't1-session',

  sessionKey: 'codex:t1-session',

  remotePrefix: 'projects/t1-project/sessions/codex/t1-session',

  localDirectory: '/tmp/t1-demo/.toolnet/session',
};

function event(
  sequence: number,
  input: {
    type: NormalizedSessionEvent['type'];

    text: string;

    sourceEventId: string;

    sourcePath?: string;
  }
): NormalizedSessionEvent {
  return {
    version: 1,

    id: `event-${sequence}`,

    sequence,

    projectId: identity.projectId,

    agent: identity.agent,

    nativeSessionId: identity.nativeSessionId,

    type: input.type,

    timestamp: new Date(Date.UTC(2026, 7, 14, 0, 0, sequence)).toISOString(),

    role: 'user',

    sourceEventId: input.sourceEventId,

    data: {
      text: input.text,
    },

    provenance: {
      source: 'test',

      sourcePath: input.sourcePath,
    },
  };
}

function candidate(input: {
  fingerprint: string;

  eventId: string;

  sourceEventId: string;

  kind: HierarchyCandidate['kind'];

  type: HierarchyCandidate['type'];

  content: string;

  knowledgeClass: HierarchyCandidate['knowledgeClass'];

  importance: HierarchyCandidate['importance'];

  importanceScore: number;

  confidence?: number;

  sourcePath?: string;
}): HierarchyCandidate {
  return {
    version: 1,

    fingerprint: input.fingerprint,

    projectId: identity.projectId,

    agent: identity.agent,

    nativeSessionId: identity.nativeSessionId,

    sessionKey: identity.sessionKey,

    kind: input.kind,

    type: input.type,

    content: input.content,

    confidence: input.confidence ?? 0.95,

    importance: input.importance,

    knowledgeClass: input.knowledgeClass,

    importanceScore: input.importanceScore,

    retrievalTerms: input.content.toLowerCase().split(/\s+/u).filter(Boolean),

    tags: [],

    provenance: {
      agent: identity.agent,

      nativeSessionId: identity.nativeSessionId,

      sessionKey: identity.sessionKey,

      eventIds: [input.eventId],

      sourceEventIds: [input.sourceEventId],

      sourcePaths: input.sourcePath ? [input.sourcePath] : [],

      firstSequence: Number(input.eventId.replace('event-', '')),

      lastSequence: Number(input.eventId.replace('event-', '')),
    },

    createdAt: '2026-08-14T00:00:00.000Z',
  };
}

class MemoryStorage implements StorageProvider {
  readonly name = 'memory';

  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.objects.set(key, typeof data === 'string' ? Buffer.from(data) : data);
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.objects.get(key) ?? null;
  }

  async getText(key: string): Promise<string | null> {
    const value = await this.get(key);

    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,

        size: value.byteLength,
      }));
  }
}

function fixture() {
  const events = [
    event(1, {
      type: 'user_prompt',

      text: 'Rule: never store raw API keys.',

      sourceEventId: 'native-1',
    }),

    event(2, {
      type: 'todo',

      text: 'TODO: implement hierarchy retrieval.',

      sourceEventId: 'native-2',

      sourcePath: 'src/memory/hierarchy.ts',
    }),

    event(3, {
      type: 'message',

      text: 'Repository path is /srv/project.',

      sourceEventId: 'native-3',
    }),
  ];

  const candidates: HierarchyCandidate[] = [
    candidate({
      fingerprint: 'rule-1',

      eventId: 'event-1',

      sourceEventId: 'native-1',

      kind: 'rule',

      type: 'rule',

      content: 'Never store raw API keys.',

      knowledgeClass: 'permanent',

      importance: 'critical',

      importanceScore: 0.98,
    }),

    candidate({
      fingerprint: 'todo-1',

      eventId: 'event-2',

      sourceEventId: 'native-2',

      kind: 'todo',

      type: 'todo',

      content: 'Implement hierarchy retrieval.',

      knowledgeClass: 'task',

      importance: 'high',

      importanceScore: 0.86,

      sourcePath: 'src/memory/hierarchy.ts',
    }),

    candidate({
      fingerprint: 'context-1',

      eventId: 'event-3',

      sourceEventId: 'native-3',

      kind: 'context',

      type: 'summary',

      content: 'Repository path is /srv/project.',

      knowledgeClass: 'session',

      importance: 'normal',

      importanceScore: 0.6,
    }),
  ];

  return {
    events,

    candidates,

    hierarchy: buildMemoryHierarchy(events, candidates),
  };
}

describe('T1 Hierarchical Memory Assets', () => {
  it('builds raw → fact → scene → durable knowledge', () => {
    const { hierarchy } = fixture();

    expect(hierarchy.schema).toBe('toolnet.memory-hierarchy.v1');

    expect(hierarchy.stats.raw).toBe(3);

    expect(hierarchy.stats.facts).toBe(3);

    expect(hierarchy.stats.scenes).toBeGreaterThanOrEqual(3);

    expect(hierarchy.stats.knowledge).toBe(2);

    expect(
      hierarchy.raw.every(
        (asset) =>
          !Object.prototype.hasOwnProperty.call(asset, 'content') &&
          !Object.prototype.hasOwnProperty.call(asset, 'data')
      )
    ).toBe(true);

    expect(hierarchy.links.some((link) => link.type === 'supports')).toBe(true);

    expect(hierarchy.links.some((link) => link.type === 'belongs_to')).toBe(true);

    expect(hierarchy.links.some((link) => link.type === 'promotes_to')).toBe(true);

    expect(hierarchy.knowledge.some((item) => item.knowledgeClass === 'permanent')).toBe(true);

    expect(hierarchy.knowledge.some((item) => item.knowledgeClass === 'task')).toBe(true);

    expect(hierarchy.knowledge.some((item) => item.content.includes('/srv/project'))).toBe(false);
  });

  it('persists immutable hierarchy batches', async () => {
    const { events, hierarchy } = fixture();

    const storage = new MemoryStorage();

    const journal = new SessionMemoryHierarchyJournal(storage);

    const key = await journal.write(identity, events, hierarchy);

    expect(key).toContain('/memory/hierarchy/');

    const project: ProjectManifest = {
      id: identity.projectId,

      name: identity.projectName,

      rootPath: identity.projectRoot,

      remote: identity.projectName,

      createdAt: '2026-08-14T00:00:00.000Z',

      updatedAt: '2026-08-14T00:00:00.000Z',

      graphVersion: 0,

      memoryVersion: 0,
    };

    const batches = await listMemoryHierarchyBatches(project, storage);

    expect(batches).toHaveLength(1);

    expect(batches[0]?.hierarchy.stats.facts).toBe(3);

    expect(batches[0]?.hierarchy.stats.knowledge).toBe(2);
  });
});
