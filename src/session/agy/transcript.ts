import {
  existsSync,
  openSync,
  closeSync,
  readSync,
  statSync,
} from "node:fs";

import type {
  SessionEventInput,
} from "../types.js";

export interface AgyTranscriptCursor {
  offset: number;
}

export interface AgyTranscriptRead {
  events:
    SessionEventInput[];

  nextOffset:
    number;

  reset:
    boolean;
}

function classify(
  value:
    Record<string, unknown>,
): SessionEventInput["type"] {
  const role =
    typeof value.role ===
      "string"
      ? value.role
      : "";

  const type =
    typeof value.type ===
      "string"
      ? value.type
          .toLowerCase()
      : "";

  if (
    role === "user" ||
    type.includes(
      "user",
    )
  ) {
    return "user_prompt";
  }

  if (
    role ===
      "assistant" ||
    type.includes(
      "assistant",
    ) ||
    type.includes(
      "model",
    )
  ) {
    return "assistant_message";
  }

  if (
    type.includes(
      "tool",
    ) ||
    "toolCall" in
      value ||
    "tool_call" in
      value
  ) {
    return "tool_call";
  }

  if (
    type.includes(
      "error",
    )
  ) {
    return "error";
  }

  return "message";
}

function timestampOf(
  value:
    Record<string, unknown>,
): string {
  const candidates =
    [
      value.timestamp,
      value.createdAt,
      value.time,
      value.created_at,
    ];

  for (
    const candidate
    of candidates
  ) {
    if (
      typeof candidate ===
        "string"
    ) {
      const date =
        new Date(
          candidate,
        );

      if (
        !Number.isNaN(
          date.getTime(),
        )
      ) {
        return date.toISOString();
      }
    }

    if (
      typeof candidate ===
        "number"
    ) {
      let time =
        candidate;

      if (
        time <
        100_000_000_000
      ) {
        time *= 1000;
      }

      const date =
        new Date(
          time,
        );

      if (
        !Number.isNaN(
          date.getTime(),
        )
      ) {
        return date.toISOString();
      }
    }
  }

  return new Date()
    .toISOString();
}

export function readAgyTranscript(
  transcriptPath:
    string,

  cursor:
    AgyTranscriptCursor = {
      offset: 0,
    },
): AgyTranscriptRead {
  if (
    !existsSync(
      transcriptPath,
    )
  ) {
    return {
      events: [],
      nextOffset:
        cursor.offset,
      reset: false,
    };
  }

  const size =
    statSync(
      transcriptPath,
    ).size;

  /*
   * Transcript was truncated/rewritten.
   * Start a new source epoch.
   */
  const reset =
    cursor.offset >
    size;

  const start =
    reset
      ? 0
      : cursor.offset;

  if (
    start === size
  ) {
    return {
      events: [],
      nextOffset:
        size,
      reset,
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
      transcriptPath,
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

  /*
   * Do not consume an incomplete final line while Agy
   * is still appending to transcript.jsonl.
   */
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
      reset,
    };
  }

  const complete =
    text.slice(
      0,
      lastNewline +
        1,
    );

  const consumedBytes =
    Buffer.byteLength(
      complete,
      "utf8",
    );

  const events:
    SessionEventInput[] =
    [];

  let relativeOffset =
    0;

  for (
    const rawLine
    of complete
      .split(
        "\n",
      )
  ) {
    if (
      !rawLine
    ) {
      continue;
    }

    const lineBytes =
      Buffer.byteLength(
        rawLine +
          "\n",
        "utf8",
      );

    const absoluteOffset =
      start +
      relativeOffset;

    relativeOffset +=
      lineBytes;

    let parsed:
      unknown;

    try {
      parsed =
        JSON.parse(
          rawLine,
        );
    } catch {
      /*
       * Preserve malformed but readable trajectory lines.
       */
      events.push({
        type:
          "custom",

        sourceEventId:
          `transcript:${absoluteOffset}`,

        sourceSequence:
          absoluteOffset,

        data: {
          format:
            "raw-line",

          content:
            rawLine,
        },

        provenance: {
          source:
            "agy-transcript",

          sourcePath:
            transcriptPath,

          sourceOffset:
            absoluteOffset,
        },
      });

      continue;
    }

    const data =
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(
        parsed,
      )
        ? parsed as
            Record<
              string,
              unknown
            >
        : {
            value:
              parsed,
          };

    events.push({
      type:
        classify(
          data,
        ),

      timestamp:
        timestampOf(
          data,
        ),

      role:
        typeof data.role ===
          "string"
          ? data.role
          : undefined,

      /*
       * Offset + original payload gives stable provenance.
       */
      sourceEventId:
        `transcript:${absoluteOffset}`,

      sourceSequence:
        absoluteOffset,

      data,

      provenance: {
        source:
          "agy-transcript",

        sourcePath:
          transcriptPath,

        sourceOffset:
          absoluteOffset,
      },
    });
  }

  return {
    events,

    nextOffset:
      start +
      consumedBytes,

    reset,
  };
}
