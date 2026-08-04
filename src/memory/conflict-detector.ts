import type {
  MemoryRecord,
} from "../core/types.js";

const GENERIC_TAGS =
  new Set([
    "decision",
    "rule",
    "todo",
    "summary",
    "activity",
    "user",
    "error",
    "file",
    "write",
    "command",
  ]);

const STOPWORDS =
  new Set([
    "dùng",
    "sử",
    "dụng",
    "use",
    "using",
    "the",
    "a",
    "an",
    "cho",
    "và",
    "là",
    "của",
    "to",
    "for",
    "with",
    "quyết",
    "định",
  ]);

function words(
  text: string,
): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}_-]+/gu, " ")
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          !STOPWORDS.has(word),
      ),
  );
}

function similarity(
  a: string,
  b: string,
): number {
  const aa = words(a);
  const bb = words(b);

  if (
    aa.size === 0 ||
    bb.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (const word of aa) {
    if (bb.has(word)) {
      intersection++;
    }
  }

  const union =
    new Set([
      ...aa,
      ...bb,
    ]).size;

  return intersection / union;
}

function meaningfulTags(
  memory: MemoryRecord,
): Set<string> {
  return new Set(
    memory.tags.filter(
      (tag) =>
        !GENERIC_TAGS.has(
          tag.toLowerCase(),
        ),
    ),
  );
}

export class ConflictDetector {
  findSuperseded(
    next: MemoryRecord,
    existing: MemoryRecord[],
  ): MemoryRecord[] {
    if (
      next.type !== "rule" &&
      next.type !== "decision"
    ) {
      return [];
    }

    const nextTopic =
      typeof next.metadata?.topic === "string"
        ? next.metadata.topic
        : undefined;

    const nextTags =
      meaningfulTags(next);

    return existing.filter(
      (old) => {
        if (
          old.id === next.id ||
          old.projectId !== next.projectId ||
          old.type !== next.type ||
          old.metadata?.supersededBy
        ) {
          return false;
        }

        const oldTopic =
          typeof old.metadata?.topic === "string"
            ? old.metadata.topic
            : undefined;

        if (
          nextTopic &&
          oldTopic &&
          nextTopic === oldTopic
        ) {
          return true;
        }

        const oldTags =
          meaningfulTags(old);

        for (const tag of nextTags) {
          if (oldTags.has(tag)) {
            return true;
          }
        }

        return (
          similarity(
            next.content,
            old.content,
          ) >= 0.6
        );
      },
    );
  }
}
