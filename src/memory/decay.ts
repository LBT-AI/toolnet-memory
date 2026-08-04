import type {
  ImportanceLevel,
  MemoryRecord,
  MemoryType,
} from "../core/types.js";

const BASE_SCORE: Record<ImportanceLevel, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  temporary: 20,
};

const HALF_LIFE_DAYS: Partial<Record<MemoryType, number>> = {
  activity: 14,
  summary: 30,
  todo: 90,
  decision: 365,
  rule: 730,
  code: 180,
};

export function defaultExpiry(
  type: MemoryType,
  importance: ImportanceLevel,
  now = new Date(),
): string | undefined {
  let days: number | undefined;

  if (importance === "temporary") {
    days = 30;
  }

  if (type === "activity") {
    days = Math.min(days ?? 14, 14);
  }

  if (type === "summary") {
    days = Math.min(days ?? 30, 30);
  }

  if (!days) {
    return undefined;
  }

  return new Date(
    now.getTime() +
      days * 86_400_000,
  ).toISOString();
}

export function isExpired(
  memory: MemoryRecord,
  now = Date.now(),
): boolean {
  if (!memory.expiresAt) {
    return false;
  }

  return (
    new Date(memory.expiresAt).getTime() <= now
  );
}

export function isSuperseded(
  memory: MemoryRecord,
): boolean {
  return Boolean(
    memory.metadata?.supersededBy,
  );
}

export function isMemoryActive(
  memory: MemoryRecord,
  now = Date.now(),
): boolean {
  return (
    !isExpired(memory, now) &&
    !isSuperseded(memory)
  );
}

export function effectiveImportanceScore(
  memory: MemoryRecord,
  now = Date.now(),
): number {
  if (!isMemoryActive(memory, now)) {
    return 0;
  }

  const base =
    BASE_SCORE[memory.importance];

  if (
    memory.importance === "critical"
  ) {
    return base;
  }

  const halfLife =
    HALF_LIFE_DAYS[memory.type] ?? 180;

  const ageMs =
    Math.max(
      0,
      now -
        new Date(memory.updatedAt).getTime(),
    );

  const ageDays =
    ageMs / 86_400_000;

  const decay =
    Math.pow(
      0.5,
      ageDays / halfLife,
    );

  return base * decay;
}
