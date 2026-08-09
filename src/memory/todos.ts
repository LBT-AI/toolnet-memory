import { MemoryEngine } from '../core/memory-engine.js';

export function getTodos(engine: MemoryEngine, projectId: string) {
  return engine.byType(projectId, 'todo');
}
