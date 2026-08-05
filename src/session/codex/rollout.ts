import {
  closeSync,
  existsSync,
  openSync,
  readSync,
  statSync,
} from "node:fs";

import type {
  SessionEventInput,
} from "../types.js";

export interface CodexRolloutRead {
  events:
    SessionEventInput[];

  nextOffset:
    number;

  reset:
    boolean;
}

function object(
  value: unknown,
): Record<
  string,
  unknown
> {
  return (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  )
    ? value as
        Record<
          string,
          unknown
        >
    : {};
}

function timestamp(
  row:
    Record<
      string,
      unknown
    >,
): string {
  const raw =
    row.timestamp;

  if (
    typeof raw ===
      "string"
  ) {
    const date =
      new Date(
        raw,
      );

    if (
      !Number.isNaN(
        date.getTime(),
      )
    ) {
      return date.toISOString();
    }
  }

  return new Date()
    .toISOString();
}

function classify(
  row:
    Record<
      string,
      unknown
    >,
): {
  type:
    SessionEventInput[
      "type"
    ];

  role?: string;
} {
  const outerType =
    typeof row.type ===
      "string"
      ? row.type
          .toLowerCase()
      : "";

  const payload =
    object(
      row.payload,
    );

  const payloadType =
    typeof payload.type ===
      "string"
      ? payload.type
          .toLowerCase()
      : "";

  const role =
    typeof payload.role ===
      "string"
      ? payload.role
          .toLowerCase()
      : undefined;

  if (
    outerType ===
      "session_meta"
  ) {
    return {
      type:
        "custom",
    };
  }

  if (
    role ===
      "user" ||
    payloadType ===
      "user_message"
  ) {
    return {
      type:
        "user_prompt",

      role:
        "user",
    };
  }

  if (
    role ===
      "assistant" ||
    payloadType ===
      "agent_message" ||
    payloadType ===
      "assistant_message"
  ) {
    return {
      type:
        "assistant_message",

      role:
        "assistant",
    };
  }

  if (
    payloadType.includes(
      "function_call",
    ) ||
    payloadType.includes(
      "tool_call",
    ) ||
    payloadType.includes(
      "exec_command_begin",
    ) ||
    payloadType.includes(
      "exec_command_start",
    )
  ) {
    return {
      type:
        "tool_call",
    };
  }

  if (
    payloadType.includes(
      "function_call_output",
    ) ||
    payloadType.includes(
      "tool_result",
    ) ||
    payloadType.includes(
      "exec_command_end",
    ) ||
    payloadType.includes(
      "exec_command_complete",
    )
  ) {
    return {
      type:
        "tool_result",
    };
  }

  if (
    payloadType.includes(
      "error",
    )
  ) {
    return {
      type:
        "error",
    };
  }

  if (
    outerType.includes(
      "compacted",
    ) ||
    payloadType.includes(
      "compacted",
    )
  ) {
    return {
      type:
        "session_compact",
    };
  }

  return {
    type:
      "custom",

    role,
  };
}

export function readCodexRollout(
  rolloutPath:
    string,

  offset:
    number = 0,
): CodexRolloutRead {
  if (
    !existsSync(
      rolloutPath,
    )
  ) {
    return {
      events: [],
      nextOffset:
        offset,
      reset:
        false,
    };
  }

  const size =
    statSync(
      rolloutPath,
    ).size;

  const reset =
    offset >
    size;

  const start =
    reset
      ? 0
      : offset;

  if (
    start >= size
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
      rolloutPath,
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
   * Codex may still be appending.
   * Never consume half a JSONL line.
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

  let localOffset =
    0;

  const events:
    SessionEventInput[] =
    [];

  for (
    const line
    of complete.split(
      "\n",
    )
  ) {
    if (
      !line
    ) {
      continue;
    }

    const lineBytes =
      Buffer.byteLength(
        line +
        "\n",
        "utf8",
      );

    const absoluteOffset =
      start +
      localOffset;

    localOffset +=
      lineBytes;

    let parsed:
      unknown;

    try {
      parsed =
        JSON.parse(
          line,
        );
    } catch {
      continue;
    }

    const row =
      object(
        parsed,
      );

    const classification =
      classify(
        row,
      );

    events.push({
      type:
        classification.type,

      timestamp:
        timestamp(
          row,
        ),

      role:
        classification.role,

      sourceEventId:
        `rollout:${absoluteOffset}`,

      sourceSequence:
        absoluteOffset,

      data:
        row,

      provenance: {
        source:
          "codex-rollout",

        sourcePath:
          rolloutPath,

        sourceOffset:
          absoluteOffset,
      },
    });
  }

  return {
    events,

    nextOffset:
      start +
      Buffer.byteLength(
        complete,
        "utf8",
      ),

    reset,
  };
}
