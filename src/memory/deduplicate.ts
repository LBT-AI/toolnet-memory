import {
  createHash,
} from "node:crypto";

import type {
  MemoryRecord,
} from "../core/types.js";

export function memoryFingerprint(
  memory: Pick<
    MemoryRecord,
    "projectId" | "type" | "content"
  >,
): string {
  return createHash("sha256")
    .update(
      [
        memory.projectId,
        memory.type,
        memory.content
          .trim()
          .toLowerCase(),
      ].join("|"),
    )
    .digest("hex");
}

export function deduplicateMemories(
  memories: MemoryRecord[],
): MemoryRecord[] {
  const seen =
    new Set<string>();

  const result:
    MemoryRecord[] = [];

  for (
    const memory
    of memories
  ) {
    const hash =
      memoryFingerprint(
        memory,
      );

    if (
      seen.has(hash)
    ) {
      continue;
    }

    seen.add(hash);
    result.push(memory);
  }

  return result;
}
