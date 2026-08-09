import { MemoryEngine } from '../core/memory-engine.js';

export function getDecisions(engine: MemoryEngine, projectId: string) {
  return engine.byType(projectId, 'decision');
}
