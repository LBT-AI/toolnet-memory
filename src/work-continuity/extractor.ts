import type {
  NormalizedSessionEvent,
  SessionIdentity,
} from "../session/types.js";

import {
  sha256,
} from "../session/utils.js";

import type {
  WorkItemStatus,
  WorkObservation,
  WorkObservationKind,
} from "./types.js";

const TEXT_KEYS =
  new Set([
    "content",
    "text",
    "message",
    "prompt",
    "summary",
    "description",
    "title",
    "reason",
    "last_assistant_message",
    "lastAssistantMessage",
  ]);

function normalize(
  value: string,
): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/^[\s>*#•-]+/u, "")
    .trim();
}

function keyOf(
  value: string,
): string {
  return normalize(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectStrings(
  value: unknown,
  output: string[],
  depth = 0,
): void {
  if (depth > 6) {
    return;
  }

  if (typeof value === "string") {
    output.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 50)) {
      collectStrings(
        item,
        output,
        depth + 1,
      );
    }

    return;
  }

  if (
    !value ||
    typeof value !== "object"
  ) {
    return;
  }

  for (
    const [key, child]
    of Object.entries(
      value as Record<string, unknown>,
    )
  ) {
    if (
      TEXT_KEYS.has(key) ||
      [
        "data",
        "payload",
        "parts",
        "messages",
      ].includes(key)
    ) {
      collectStrings(
        child,
        output,
        depth + 1,
      );
    }
  }
}

function statusFrom(
  text: string,
): WorkItemStatus {
  if (
    /\b(cancelled|canceled)\b|đã hủy|bỏ qua/iu
      .test(text)
  ) {
    return "cancelled";
  }

  if (
    /\b(blocked|blocker)\b|đang vướng|bị vướng|đang kẹt|chưa thể/iu
      .test(text)
  ) {
    return "blocked";
  }

  if (
    /\b(completed|complete|done|finished|passed)\b|hoàn thành|hoàn tất|đã xong|đã làm xong|\bxong\b/iu
      .test(text)
  ) {
    return "completed";
  }

  if (
    /\bin[\s_-]*progress\b|working on|đang làm|đang thực hiện|đang xử lý|đang triển khai/iu
      .test(text)
  ) {
    return "in_progress";
  }

  return "pending";
}

function isStatusOnly(
  value: string,
): boolean {
  const text =
    normalize(value);

  return /^(?:đang\s+làm|đang\s+thực\s+hiện|đang\s+xử\s+lý|đang\s+triển\s+khai|hoàn\s+thành|hoàn\s+tất|đã\s+xong|đã\s+làm\s+xong|xong|pending|in[\s_-]*progress|completed|complete|done|finished|blocked|cancelled|canceled)[.!]*$/iu
    .test(text);
}

function makeObservation(
  identity:
    SessionIdentity,

  event:
    NormalizedSessionEvent,

  kind:
    WorkObservationKind,

  text: string,

  options: {
    key?: string;

    status?:
      WorkItemStatus;

    order?:
      number;

    confidence?:
      number;
  } = {},
): WorkObservation {
  const clean =
    normalize(text);

  const key =
    options.key ??
    keyOf(clean);

  /*
   * One agent message can contain both:
   *
   *   Phase 1 - Setup
   *   Phase 1 hoàn thành
   *
   * They share event.id + phase key but represent DIFFERENT
   * observations/state transitions.
   *
   * Include normalized content + status/order so only truly
   * identical observations inside the same event are deduped.
   */
  const id =
    sha256(
      [
        identity.projectId,
        kind,
        key,
        event.id,
        clean,
        options.status ?? "",
        options.order ?? "",
      ].join("|"),
    ).slice(0, 32);

  return {
    version: 1,

    id,

    projectId:
      identity.projectId,

    kind,

    key,

    text:
      clean,

    status:
      options.status,

    order:
      options.order,

    confidence:
      options.confidence ??
      0.85,

    occurredAt:
      event.timestamp,

    sequence:
      event.sequence,

    agent:
      identity.agent,

    nativeSessionId:
      identity.nativeSessionId,

    sessionKey:
      identity.sessionKey,

    eventId:
      event.id,

    sourceEventId:
      event.sourceEventId,
  };
}

function extractFromLine(
  identity:
    SessionIdentity,

  event:
    NormalizedSessionEvent,

  rawLine: string,
): WorkObservation[] {
  const line =
    normalize(rawLine);

  if (
    line.length < 5 ||
    line.length > 1200
  ) {
    return [];
  }

  const result:
    WorkObservation[] =
    [];

  /*
   * A next-action sentence may REFER to phases without
   * changing their current state.
   *
   * Example:
   *   "Bước tiếp theo: hoàn tất Phase 3 rồi chuyển Phase 4"
   *
   * This means:
   *   Phase 3 is still current/in-progress
   *   Phase 4 is upcoming
   *
   * It must NOT be interpreted as "Phase 3 completed".
   */
  const isNextActionLine =
    /^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu
      .test(
        line,
      );

  const goal =
    line.match(
      /^(?:mục tiêu|goal|objective)\s*(?::|-)\s*(.+)$/iu,
    );

  if (goal?.[1]) {
    result.push(
      makeObservation(
        identity,
        event,
        "goal",
        goal[1],
        {
          confidence:
            0.97,
        },
      ),
    );
  }

  const plan =
    line.match(
      /^(?:kế hoạch|plan)\s*(?::|-)\s*(.+)$/iu,
    );

  if (plan?.[1]) {
    result.push(
      makeObservation(
        identity,
        event,
        "plan",
        plan[1],
        {
          confidence:
            0.95,
        },
      ),
    );
  }

  /*
   * Stable Phase identity.
   *
   * Phase 2 - Work Continuity
   * Phase 2 đang làm
   * Phase 2 hoàn thành
   *
   * => all become phase:2
   */
  const phasePattern =
    /\b(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?([^.;\n]{0,220})/giu;

  let phaseMatch:
    RegExpExecArray |
    null;

  /*
   * Only explicit phase declarations/status lines mutate
   * WorkState. References inside "next action" are advisory.
   */
  while (
    !isNextActionLine &&
    (
      phaseMatch =
        phasePattern.exec(line)
    )
  ) {
    const number =
      Number(phaseMatch[1]);

    const suffix =
      normalize(
        phaseMatch[2] ??
        "",
      );

    const title =
      suffix &&
      !isStatusOnly(suffix)
        ? `Phase ${number} - ${suffix}`
        : `Phase ${number}`;

    result.push(
      makeObservation(
        identity,
        event,
        "phase",
        title,
        {
          key:
            `phase:${number}`,

          order:
            number,

          status:
            statusFrom(line),

          confidence:
            0.93,
        },
      ),
    );
  }

  const checkbox =
    rawLine.match(
      /^\s*[-*]\s*\[([ xX])\]\s*(.+)$/u,
    );

  if (checkbox?.[2]) {
    result.push(
      makeObservation(
        identity,
        event,
        "task",
        checkbox[2],
        {
          status:
            checkbox[1].trim()
              ? "completed"
              : statusFrom(
                  checkbox[2],
                ),

          confidence:
            0.96,
        },
      ),
    );
  }

  /*
   * Stable numbered TODO identity.
   *
   * TODO 2: Viết adapter
   * TODO 2 đang làm
   * TODO 2 hoàn thành
   *
   * => all become task:2
   */
  const todo =
    line.match(
      /^(?:todo|task|việc)\s*(\d+)?(?:\s*[:.\-–—]\s*|\s+)(.+)$/iu,
    );

  if (todo?.[2]) {
    const order =
      todo[1]
        ? Number(todo[1])
        : undefined;

    const todoText =
      normalize(todo[2]);

    const statusOnly =
      isStatusOnly(todoText);

    result.push(
      makeObservation(
        identity,
        event,
        "task",
        statusOnly &&
        order !== undefined
          ? `TODO ${order}`
          : todoText,
        {
          key:
            order !== undefined
              ? `task:${order}`
              : keyOf(todoText),

          order,

          status:
            statusFrom(line),

          confidence:
            0.93,
        },
      ),
    );
  }

  if (
    /^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu
      .test(line)
  ) {
    const cleaned =
      line.replace(
        /^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\s*(?::|-)?\s*/iu,
        "",
      );

    if (cleaned) {
      result.push(
        makeObservation(
          identity,
          event,
          "next_action",
          cleaned,
          {
            confidence:
              0.9,
          },
        ),
      );
    }
  }

  if (
    /\b(blocker|blocked)\b|đang vướng|bị vướng|đang kẹt/iu
      .test(line)
  ) {
    result.push(
      makeObservation(
        identity,
        event,
        "blocker",
        line,
        {
          confidence:
            0.9,
        },
      ),
    );
  }

  if (
    /\b(chú ý|lưu ý|warning|attention|cẩn thận)\b/iu
      .test(line)
  ) {
    result.push(
      makeObservation(
        identity,
        event,
        "warning",
        line,
        {
          confidence:
            0.88,
        },
      ),
    );
  }

  if (
    /\b(chốt|quyết định|decided|decision)\b/iu
      .test(line)
  ) {
    result.push(
      makeObservation(
        identity,
        event,
        "decision",
        line,
        {
          confidence:
            0.9,
        },
      ),
    );
  }

  return result;
}

export function extractWorkObservations(
  identity:
    SessionIdentity,

  events:
    NormalizedSessionEvent[],
): WorkObservation[] {
  if (
    events.length === 0
  ) {
    return [];
  }

  const observations:
    WorkObservation[] =
    [];

  const seen =
    new Set<string>();

  function push(
    observation:
      WorkObservation,
  ) {
    if (
      seen.has(
        observation.id,
      )
    ) {
      return;
    }

    seen.add(
      observation.id,
    );

    observations.push(
      observation,
    );
  }

  for (
    const event
    of events
  ) {
    if (
      event.type ===
      "decision"
    ) {
      const raw:
        string[] =
        [];

      collectStrings(
        event.data,
        raw,
      );

      for (
        const value
        of raw
      ) {
        push(
          makeObservation(
            identity,
            event,
            "decision",
            value,
            {
              confidence:
                1,
            },
          ),
        );
      }
    }

    if (
      event.type ===
      "todo"
    ) {
      const raw:
        string[] =
        [];

      collectStrings(
        event.data,
        raw,
      );

      for (
        const value
        of raw
      ) {
        push(
          makeObservation(
            identity,
            event,
            "task",
            value,
            {
              status:
                statusFrom(value),

              confidence:
                1,
            },
          ),
        );
      }
    }

    if (
      [
        "file_write",
        "file_edit",
      ].includes(
        event.type,
      )
    ) {
      for (
        const key
        of [
          "filePath",
          "path",
          "file",
        ]
      ) {
        const value =
          event.data[key];

        if (
          typeof value ===
            "string" &&
          value
        ) {
          push(
            makeObservation(
              identity,
              event,
              "file",
              value,
              {
                confidence:
                  1,
              },
            ),
          );
        }
      }
    }

    if (
      event.type ===
      "test"
    ) {
      const raw:
        string[] =
        [];

      collectStrings(
        event.data,
        raw,
      );

      for (
        const value
        of raw
      ) {
        push(
          makeObservation(
            identity,
            event,
            "test",
            value,
            {
              confidence:
                1,
            },
          ),
        );
      }
    }

    const blocks:
      string[] =
      [];

    collectStrings(
      event.data,
      blocks,
    );

    for (
      const block
      of blocks
    ) {
      for (
        const rawLine
        of block.split(/\n+/u)
      ) {
        for (
          const observation
          of extractFromLine(
            identity,
            event,
            rawLine,
          )
        ) {
          push(
            observation,
          );
        }
      }
    }
  }

  const last =
    events[
      events.length - 1
    ];

  push(
    makeObservation(
      identity,
      last,
      "session",
      `${identity.agent}:${identity.nativeSessionId}`,
      {
        key:
          identity.sessionKey,

        confidence:
          1,
      },
    ),
  );

  return observations;
}
