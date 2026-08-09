import type { MemoryEngine } from '../core/memory-engine.js';

export class MemoryMaintenance {
  constructor(private readonly memory: MemoryEngine) {}

  run(projectId: string) {
    const expiredRemoved = this.memory.pruneExpired(projectId);

    const supersededRemoved = this.memory.pruneSuperseded(projectId, 30);

    return {
      expiredRemoved,
      supersededRemoved,

      active: this.memory.list(projectId).length,

      total: this.memory.listAll(projectId).length,
    };
  }
}
