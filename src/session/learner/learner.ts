import {
  closeSync,
  existsSync,
  openSync,
  readSync,
  statSync,
} from "node:fs";

import type {
  ProjectManifest,
} from "../../core/types.js";

import type {
  StorageProvider,
} from "../../storage/types.js";

import type {
  NormalizedSessionEvent,
  SessionIdentity,
} from "../types.js";

import type {
  SessionWal,
} from "../wal.js";

import {
  extractLearnedMemories,
} from "./extractor.js";

import {
  SessionMemoryJournal,
} from "./journal.js";

import type {
  SessionLearningResult,
} from "./types.js";

interface EventRead {
  events:
    NormalizedSessionEvent[];

  nextOffset:
    number;
}

function readEvents(
  filePath: string,
  offset: number,
): EventRead {
  if (
    !existsSync(
      filePath,
    )
  ) {
    return {
      events: [],
      nextOffset:
        offset,
    };
  }

  const size =
    statSync(
      filePath,
    ).size;

  let start =
    Number.isFinite(
      offset,
    )
      ? Math.max(
          0,
          offset,
        )
      : 0;

  /*
   * Local WAL was rebuilt.
   */
  if (
    start >
    size
  ) {
    start =
      0;
  }

  if (
    start ===
    size
  ) {
    return {
      events: [],
      nextOffset:
        size,
    };
  }

  const length =
    size -
    start;

  const buffer =
    Buffer.alloc(
      length,
    );

  const fd =
    openSync(
      filePath,
      "r",
    );

  try {
    readSync(
      fd,
      buffer,
      0,
      length,
      start,
    );
  } finally {
    closeSync(
      fd,
    );
  }

  const text =
    buffer.toString(
      "utf8",
    );

  const lastNewline =
    text.lastIndexOf(
      "\n",
    );

  if (
    lastNewline <
    0
  ) {
    return {
      events: [],
      nextOffset:
        start,
    };
  }

  const complete =
    text.slice(
      0,
      lastNewline +
        1,
    );

  const events =
    complete
      .split(
        "\n",
      )
      .filter(
        Boolean,
      )
      .flatMap(
        line => {
          try {
            return [
              JSON.parse(
                line,
              ) as
                NormalizedSessionEvent,
            ];
          } catch {
            return [];
          }
        },
      );

  return {
    events,

    nextOffset:
      start +
      Buffer.byteLength(
        complete,
        "utf8",
      ),
  };
}

export class SessionMemoryLearner {
  private readonly journal:
    SessionMemoryJournal;

  constructor(
    private readonly options: {
      project:
        ProjectManifest;

      storage:
        StorageProvider;

      identity:
        SessionIdentity;

      wal:
        SessionWal;
    },
  ) {
    this.journal =
      new SessionMemoryJournal(
        options.storage,
      );
  }

  async learnNew():
    Promise<
      SessionLearningResult
    > {
    const state =
      this.options
        .wal
        .loadState();

    const rawOffset =
      Number(
        state.sourceCursors[
          "memory.learner.offset"
        ] ??
        0,
      );

    const offset =
      Number.isFinite(
        rawOffset,
      )
        ? rawOffset
        : 0;

    const read =
      readEvents(
        this.options
          .wal
          .eventsFile,

        offset,
      );

    if (
      read.events.length ===
      0
    ) {
      return {
        scannedEvents:
          0,

        candidates:
          0,

        journalWritten:
          false,

        nextOffset:
          read.nextOffset,
      };
    }

    const candidates =
      extractLearnedMemories(
        this.options
          .identity,

        read.events,
      );

    let journalWritten =
      false;

    if (
      candidates.length >
      0
    ) {
      const key =
        await this.journal
          .write(
            this.options
              .identity,

            read.events,

            candidates,
          );

      journalWritten =
        Boolean(
          key,
        );
    }

    /*
     * Advance only after immutable learning journal succeeds.
     * If journal write throws, next flush retries same range.
     */
    this.options
      .wal
      .setSourceCursor(
        "memory.learner.offset",
        read.nextOffset,
      );

    return {
      scannedEvents:
        read.events.length,

      candidates:
        candidates.length,

      journalWritten,

      nextOffset:
        read.nextOffset,
    };
  }
}
