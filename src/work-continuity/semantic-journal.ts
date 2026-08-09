import type { StorageProvider } from '../storage/types.js';

import type { SessionIdentity } from '../session/types.js';

import { sha256 } from '../session/utils.js';

import type { SemanticObservation, SemanticObservationBatch } from './semantic-types.js';

function pad(value: number): string {
  return String(value).padStart(12, '0');
}

export class SemanticObservationJournal {
  constructor(private readonly storage: StorageProvider) {}

  async write(
    identity: SessionIdentity,

    observations: SemanticObservation[]
  ): Promise<string | null> {
    if (observations.length === 0) {
      return null;
    }

    const firstSequence = Math.min(...observations.map((item) => item.evidence.sequence));

    const lastSequence = Math.max(...observations.map((item) => item.evidence.sequence));

    const batch: SemanticObservationBatch = {
      version: 1,

      projectId: identity.projectId,

      agent: identity.agent,

      nativeSessionId: identity.nativeSessionId,

      sessionKey: identity.sessionKey,

      firstSequence,

      lastSequence,

      createdAt: new Date().toISOString(),

      observations,
    };

    const digest = sha256(
      observations
        .map((item) => item.id)
        .sort()
        .join('|')
    ).slice(0, 16);

    const key = [
      `projects/${identity.projectId}`,
      'work',
      'semantic',
      'observations',
      identity.agent,
      identity.nativeSessionId,
      `${pad(firstSequence)}-${pad(lastSequence)}-${digest}.json`,
    ].join('/');

    if (!(await this.storage.exists(key))) {
      await this.storage.put(
        key,

        JSON.stringify(batch, null, 2) + '\n',

        'application/json'
      );
    }

    return key;
  }
}
