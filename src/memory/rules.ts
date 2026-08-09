import { MemoryEngine } from '../core/memory-engine.js';

export function getRules(engine: MemoryEngine, projectId: string) {
  return engine.byType(projectId, 'rule');
}
