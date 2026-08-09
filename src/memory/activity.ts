import { MemoryEngine } from '../core/memory-engine.js';

export function getActivity(engine: MemoryEngine, projectId: string, limit = 20) {
  return engine.byType(projectId, 'activity').slice(0, limit);
}
