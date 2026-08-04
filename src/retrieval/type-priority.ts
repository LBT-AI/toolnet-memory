import type {
  MemoryType,
} from "../core/types.js";

const priorities:
  Partial<Record<MemoryType, number>> = {
    rule: 1,
    decision: 0.9,
    todo: 0.8,
    summary: 0.6,
    activity: 0.3,
  };

export function typePriority(
  type: MemoryType,
): number {
  return priorities[type] ?? 0.4;
}
