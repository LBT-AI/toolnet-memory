import type { MemoryRecord, MemoryType, ImportanceLevel } from '../core/types.js';

import { MemoryEngine } from '../core/memory-engine.js';

export interface RememberMemoryInput {
  projectId: string;
  type: MemoryType;
  content: string;

  importance?: ImportanceLevel;
  tags?: string[];
  source?: string;

  metadata?: Record<string, unknown>;
}

export function rememberMemory(engine: MemoryEngine, input: RememberMemoryInput): MemoryRecord {
  return engine.remember(input);
}
