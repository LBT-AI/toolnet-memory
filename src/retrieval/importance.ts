import type {
  ImportanceLevel,
  MemoryRecord,
} from "../core/types.js";

import {
  effectiveImportanceScore,
} from "../memory/decay.js";

const weights:
  Record<ImportanceLevel, number> = {
    critical: 1,
    high: 0.8,
    normal: 0.5,
    temporary: 0.2,
  };

export function importanceScore(
  importance?: ImportanceLevel,
): number {
  if (!importance) {
    return 0.3;
  }

  return weights[importance] ?? 0.3;
}

export function memoryImportanceScore(
  memory: MemoryRecord,
): number {
  return (
    effectiveImportanceScore(
      memory,
    ) / 100
  );
}
