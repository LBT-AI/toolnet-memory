import {
  closeSync,
  existsSync,
  openSync,
  readSync,
  statSync,
} from "node:fs";

import type {
  ProjectManifest,
} from "../core/types.js";

import type {
  StorageProvider,
} from "../storage/types.js";

import type {
  NormalizedSessionEvent,
  SessionIdentity,
} from "../session/types.js";

import type {
  SessionWal,
} from "../session/wal.js";

import {
  extractWorkObservations,
} from "./extractor.js";

import {
  WorkObservationJournal,
} from "./journal.js";

import {
  reconcileWorkState,
} from "./reducer.js";

import type {
  WorkContinuityResult,
} from "./types.js";

function readEvents(
  filePath:
    string,

  offset:
    number,
): {
  events:
    NormalizedSessionEvent[];

  nextOffset:
    number;
} {
  if (
    !existsSync(
      filePath,
    )
  ) {
    return {
      events:
        [],

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
      events:
        [],

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
      events:
        [],

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

export class WorkContinuityLearner {
  private readonly journal:
    WorkObservationJournal;

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
      new WorkObservationJournal(
        options.storage,
      );
  }

  async learnNew():
    Promise<
      WorkContinuityResult
    > {
    const state =
      this.options
        .wal
        .loadState();

    const rawOffset =
      Number(
        state.sourceCursors[
          "work.continuity.offset"
        ] ??
        0,
      );

    const read =
      readEvents(
        this.options
          .wal
          .eventsFile,

        Number.isFinite(
          rawOffset,
        )
          ? rawOffset
          : 0,
      );

    if (
      read.events.length ===
      0
    ) {
      return {
        scannedEvents:
          0,

        observations:
          0,

        journalWritten:
          false,

        reconciled:
          false,

        nextOffset:
          read.nextOffset,
      };
    }

    const observations =
      extractWorkObservations(
        this.options
          .identity,

        read.events,
      );

    let journalWritten =
      false;

    let reconciled =
      false;

    if (
      observations.length >
      0
    ) {
      const key =
        await this.journal
          .write(
            this.options
              .identity,

            observations,
          );

      journalWritten =
        Boolean(
          key,
        );

      if (
        journalWritten
      ) {
        await reconcileWorkState(
          this.options
            .project,

          this.options
            .storage,
        );

        reconciled =
          true;
      }
    }

    this.options
      .wal
      .setSourceCursor(
        "work.continuity.offset",
        read.nextOffset,
      );

    return {
      scannedEvents:
        read.events.length,

      observations:
        observations.length,

      journalWritten,

      reconciled,

      nextOffset:
        read.nextOffset,
    };
  }
}
