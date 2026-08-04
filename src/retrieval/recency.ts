import type { MemoryRecord } from "../core/types.js";

export function recencyScore(
  memory: MemoryRecord,
  now = Date.now(),
): number {
  const raw =
    memory.updatedAt ??
    memory.createdAt;

  const timestamp =
    new Date(raw).getTime();

  if (
    !Number.isFinite(timestamp)
  ) {
    return 0;
  }

  const ageDays =
    Math.max(
      0,
      now - timestamp,
    ) /
    86_400_000;

  // ~50% score sau 30 ngày
  return Math.exp(
    (-Math.LN2 * ageDays) / 30,
  );
}
