import type {
  StorageProvider,
} from "../storage/types.js";

import type {
  NormalizedSessionEvent,
  SessionCursor,
  SessionFlushResult,
  SessionIdentity,
  SessionManifest,
  SessionStatus,
} from "./types.js";

import {
  sha256,
} from "./utils.js";

interface ChunkInfo {
  key: string;
  start: number;
  end: number;
}

interface RemoteScan {
  chunks:
    ChunkInfo[];

  maxSequence:
    number;
}

function padSequence(
  value: number,
): string {
  return String(
    value,
  ).padStart(
    12,
    "0",
  );
}

export class RemoteSessionStore {
  constructor(
    private readonly storage:
      StorageProvider,

    private readonly maxEventsPerChunk:
      number = 100,

    private readonly maxChunkBytes:
      number = 512 * 1024,
  ) {
    if (
      maxEventsPerChunk <
      1
    ) {
      throw new Error(
        "maxEventsPerChunk must be positive",
      );
    }

    if (
      maxChunkBytes <
      1_024
    ) {
      throw new Error(
        "maxChunkBytes is too small",
      );
    }
  }

  private async getJson<T>(
    key: string,
  ): Promise<T | null> {
    const text =
      await this.storage
        .getText(
          key,
        );

    if (
      !text
    ) {
      return null;
    }

    return JSON.parse(
      text,
    ) as T;
  }

  private async putJson(
    key: string,
    value: unknown,
  ): Promise<void> {
    await this.storage.put(
      key,
      JSON.stringify(
        value,
        null,
        2,
      ) + "\n",
      "application/json",
    );
  }

  private async scan(
    identity:
      SessionIdentity,
  ): Promise<RemoteScan> {
    const prefix =
      `${identity.remotePrefix}/events/`;

    const objects =
      await this.storage.list(
        prefix,
      );

    const chunks:
      ChunkInfo[] = [];

    let maxSequence =
      0;

    for (
      const object
      of objects
    ) {
      const match =
        object.key.match(
          /\/events\/(\d+)-(\d+)-[a-f0-9]+\.jsonl$/,
        );

      if (
        !match
      ) {
        continue;
      }

      const start =
        Number(
          match[1],
        );

      const end =
        Number(
          match[2],
        );

      if (
        !Number.isFinite(
          start,
        ) ||
        !Number.isFinite(
          end,
        )
      ) {
        continue;
      }

      chunks.push({
        key:
          object.key,

        start,
        end,
      });

      maxSequence =
        Math.max(
          maxSequence,
          end,
        );
    }

    chunks.sort(
      (
        left,
        right,
      ) =>
        left.start -
        right.start,
    );

    return {
      chunks,
      maxSequence,
    };
  }

  private split(
    events:
      NormalizedSessionEvent[],
  ): NormalizedSessionEvent[][] {
    const result:
      NormalizedSessionEvent[][] =
      [];

    let current:
      NormalizedSessionEvent[] =
      [];

    let bytes =
      0;

    for (
      const event
      of events
    ) {
      const lineBytes =
        Buffer.byteLength(
          JSON.stringify(
            event,
          ) + "\n",
          "utf8",
        );

      if (
        current.length >
          0 &&
        (
          current.length >=
            this
              .maxEventsPerChunk ||
          bytes +
            lineBytes >
            this
              .maxChunkBytes
        )
      ) {
        result.push(
          current,
        );

        current =
          [];

        bytes =
          0;
      }

      current.push(
        event,
      );

      bytes +=
        lineBytes;
    }

    if (
      current.length >
      0
    ) {
      result.push(
        current,
      );
    }

    return result;
  }

  async loadManifest(
    identity:
      SessionIdentity,
  ): Promise<
    SessionManifest |
    null
  > {
    return this.getJson<
      SessionManifest
    >(
      `${identity.remotePrefix}/session.json`,
    );
  }

  async loadCursor(
    identity:
      SessionIdentity,
  ): Promise<
    SessionCursor |
    null
  > {
    return this.getJson<
      SessionCursor
    >(
      `${identity.remotePrefix}/cursor.json`,
    );
  }

  async recover(
    identity:
      SessionIdentity,
  ): Promise<{
    maxSequence: number;
    chunkCount: number;
  }> {
    const scan =
      await this.scan(
        identity,
      );

    return {
      maxSequence:
        scan.maxSequence,

      chunkCount:
        scan.chunks.length,
    };
  }

  async append(
    identity:
      SessionIdentity,

    events:
      NormalizedSessionEvent[],

    sourceCursors:
      Record<
        string,
        string
      >,

    options: {
      title?: string;

      metadata?: Record<
        string,
        unknown
      >;
    } = {},
  ): Promise<
    SessionFlushResult
  > {
    const previousManifest =
      await this.loadManifest(
        identity,
      );

    const before =
      await this.scan(
        identity,
      );

    /*
     * Crash recovery:
     * chunks may already exist even when cursor/session.json
     * was not successfully updated.
     */
    const pending =
      events.filter(
        event =>
          event.sequence >
          before.maxSequence,
      );

    let uploadedEvents =
      0;

    for (
      const chunk
      of this.split(
        pending,
      )
    ) {
      const first =
        chunk[0];

      const last =
        chunk[
          chunk.length -
          1
        ];

      const content =
        chunk
          .map(
            event =>
              JSON.stringify(
                event,
              ),
          )
          .join(
            "\n",
          ) +
        "\n";

      const digest =
        sha256(
          content,
        ).slice(
          0,
          16,
        );

      const key =
        [
          identity
            .remotePrefix,

          "events",

          `${
            padSequence(
              first.sequence,
            )
          }-${
            padSequence(
              last.sequence,
            )
          }-${digest}.jsonl`,
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
          "application/x-ndjson",
        );
      }

      uploadedEvents +=
        chunk.length;
    }

    const after =
      await this.scan(
        identity,
      );

    const lastInput =
      events[
        events.length -
        1
      ];

    let status:
      SessionStatus =
      previousManifest
        ?.status ??
      "active";

    if (
      (
        lastInput
          ?.type ===
        "session_end" ||
        lastInput
          ?.type ===
        "session_idle"
      )
    ) {
      status =
        "idle";
    } else if (
      lastInput
        ?.type ===
      "error"
    ) {
      status =
        "error";
    } else if (
      events.length >
      0
    ) {
      status =
        "active";
    }

    const now =
      new Date()
        .toISOString();

    const firstInput =
      events[0];

    const manifest:
      SessionManifest =
    {
      version: 1,

      projectId:
        identity.projectId,

      projectName:
        identity
          .projectName,

      agent:
        identity.agent,

      nativeSessionId:
        identity
          .nativeSessionId,

      sessionKey:
        identity.sessionKey,

      status,

      createdAt:
        previousManifest
          ?.createdAt ??
        firstInput
          ?.timestamp ??
        now,

      updatedAt:
        lastInput
          ?.timestamp ??
        now,

      firstEventAt:
        previousManifest
          ?.firstEventAt ??
        firstInput
          ?.timestamp,

      lastEventAt:
        lastInput
          ?.timestamp ??
        previousManifest
          ?.lastEventAt,

      eventCount:
        after.maxSequence,

      chunkCount:
        after.chunks.length,

      metadata: {
        ...previousManifest
          ?.metadata,

        ...options.metadata,
      },
    };

    if (
      options.title ??
      previousManifest
        ?.title
    ) {
      manifest.title =
        options.title ??
        previousManifest
          ?.title;
    }

    const cursor:
      SessionCursor =
    {
      version: 1,

      projectId:
        identity.projectId,

      agent:
        identity.agent,

      nativeSessionId:
        identity
          .nativeSessionId,

      lastLocalSequence:
        events.length >
        0
          ? events[
              events.length -
              1
            ].sequence
          : after
              .maxSequence,

      lastRemoteSequence:
        after.maxSequence,

      sourceCursors,

      updatedAt:
        now,
    };

    /*
     * Chunk first, then cursor, then manifest.
     * Immutable chunks are the source of truth.
     */
    await this.putJson(
      `${identity.remotePrefix}/cursor.json`,
      cursor,
    );

    await this.putJson(
      `${identity.remotePrefix}/session.json`,
      manifest,
    );

    return {
      uploadedEvents,

      lastRemoteSequence:
        after.maxSequence,

      eventCount:
        manifest.eventCount,

      chunkCount:
        manifest.chunkCount,

      status,
    };
  }
}
