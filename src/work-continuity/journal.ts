import type {
  StorageProvider,
} from "../storage/types.js";

import type {
  SessionIdentity,
} from "../session/types.js";

import {
  sha256,
} from "../session/utils.js";

import type {
  WorkObservation,
  WorkObservationBatch,
} from "./types.js";

function pad(
  value: number,
): string {
  return String(
    value,
  ).padStart(
    12,
    "0",
  );
}

export class WorkObservationJournal {
  constructor(
    private readonly storage:
      StorageProvider,
  ) {}

  async write(
    identity:
      SessionIdentity,

    observations:
      WorkObservation[],
  ): Promise<
    string |
    null
  > {
    if (
      observations.length ===
      0
    ) {
      return null;
    }

    const firstSequence =
      Math.min(
        ...observations.map(
          item =>
            item.sequence,
        ),
      );

    const lastSequence =
      Math.max(
        ...observations.map(
          item =>
            item.sequence,
        ),
      );

    const batch:
      WorkObservationBatch =
    {
      version:
        1,

      projectId:
        identity.projectId,

      agent:
        identity.agent,

      nativeSessionId:
        identity.nativeSessionId,

      sessionKey:
        identity.sessionKey,

      createdAt:
        new Date()
          .toISOString(),

      firstSequence,

      lastSequence,

      observations,
    };

    const content =
      JSON.stringify(
        batch,
        null,
        2,
      ) +
      "\n";

    const digest =
      sha256(
        observations
          .map(
            item =>
              item.id,
          )
          .sort()
          .join(
            "|",
          ),
      ).slice(
        0,
        16,
      );

    const key =
      [
        `projects/${identity.projectId}`,
        "work",
        "observations",
        identity.agent,
        identity.nativeSessionId,
        `${pad(firstSequence)}-${pad(lastSequence)}-${digest}.json`,
      ].join(
        "/",
      );

    if (
      !await this.storage
        .exists(
          key,
        )
    ) {
      await this.storage.put(
        key,
        content,
        "application/json",
      );
    }

    return key;
  }
}
