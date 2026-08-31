import { createHash } from 'node:crypto';

import type { ProjectManifest } from '../../core/types.js';

import type { MemoryHierarchy } from '../../memory/hierarchy.js';

import type { StorageProvider } from '../../storage/types.js';

import type { NormalizedSessionEvent, SessionIdentity } from '../types.js';

export interface MemoryHierarchyJournalBatch {
  schema: 'toolnet.memory-hierarchy-batch.v1';

  version: 1;

  projectId: string;

  agent: string;

  nativeSessionId: string;

  sessionKey: string;

  createdAt: string;

  firstSequence: number;

  lastSequence: number;

  hierarchy: MemoryHierarchy;
}

function pad(value: number): string {
  return String(value).padStart(12, '0');
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hierarchyPrefix(identity: SessionIdentity): string {
  return `projects/${identity.projectId}/memory/hierarchy`;
}

export class SessionMemoryHierarchyJournal {
  constructor(private readonly storage: StorageProvider) {}

  async write(
    identity: SessionIdentity,
    events: NormalizedSessionEvent[],
    hierarchy: MemoryHierarchy
  ): Promise<string | null> {
    if (events.length === 0 || hierarchy.facts.length === 0) {
      return null;
    }

    const firstSequence = Math.min(...events.map((event) => event.sequence));

    const lastSequence = Math.max(...events.map((event) => event.sequence));

    const batch: MemoryHierarchyJournalBatch = {
      schema: 'toolnet.memory-hierarchy-batch.v1',

      version: 1,

      projectId: identity.projectId,

      agent: identity.agent,

      nativeSessionId: identity.nativeSessionId,

      sessionKey: identity.sessionKey,

      createdAt: new Date().toISOString(),

      firstSequence,

      lastSequence,

      hierarchy,
    };

    const fingerprint = digest(
      [...hierarchy.facts.map((fact) => fact.id), ...hierarchy.knowledge.map((item) => item.id)]
        .sort()
        .join('|')
    ).slice(0, 16);

    /*
     * Same shared hierarchy directory for every agent.
     * Source hash prevents same-sequence provenance collision.
     */
    const sourceDigest = digest(identity.sessionKey).slice(0, 12);

    const key = [
      hierarchyPrefix(identity),

      'batches',

      `${pad(firstSequence)}-${pad(lastSequence)}-${sourceDigest}-${fingerprint}.json`,
    ].join('/');

    if (!(await this.storage.exists(key))) {
      await this.storage.put(key, `${JSON.stringify(batch, null, 2)}\n`, 'application/json');
    }

    return key;
  }
}

export async function listMemoryHierarchyBatches(
  project: ProjectManifest,
  storage: StorageProvider
): Promise<MemoryHierarchyJournalBatch[]> {
  const prefix = `projects/${project.id}/memory/hierarchy/`;

  const objects = await storage.list(prefix);

  const output: MemoryHierarchyJournalBatch[] = [];

  for (const object of objects
    .filter((item) => item.key.includes('/batches/') && item.key.endsWith('.json'))
    .sort((left, right) => left.key.localeCompare(right.key))) {
    const text = await storage.getText(object.key);

    if (!text) {
      continue;
    }

    try {
      const parsed = JSON.parse(text) as MemoryHierarchyJournalBatch;

      if (
        parsed.schema !== 'toolnet.memory-hierarchy-batch.v1' ||
        parsed.version !== 1 ||
        parsed.projectId !== project.id ||
        parsed.hierarchy?.schema !== 'toolnet.memory-hierarchy.v1'
      ) {
        continue;
      }

      output.push(parsed);
    } catch {
      /*
       * Hierarchy journal is immutable optional derived state.
       * Corrupt/incomplete objects must not break session recovery.
       */
    }
  }

  return output;
}
