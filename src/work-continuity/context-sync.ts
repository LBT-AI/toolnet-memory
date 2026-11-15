/**
 * ToolNet v0.7 revision-safe delta context sync.
 *
 * Manages cached resume contexts with revision tracking and delta synchronization.
 * In strict cloud-only mode, cache is RAM-only with explicit invalidation on writes.
 */

import { createHash } from 'node:crypto';
import type { CloudResumeResult } from '../v0.7/resume.js';
import type { AuthoritySnapshot } from '../v0.7/authority-state.js';
import { isStrictCloudOnly, type DurabilityMode } from '../v0.7/durability-policy.js';

export interface ContextCacheEntry {
  revision: number;
  snapshotHash: string;
  resumeContext: CloudResumeResult;
  cachedAt: number;
  clientAckRevision?: number;
}

export interface DeltaSyncRequest {
  projectId: string;
  clientRevision: number;
  clientSnapshotHash: string;
  mode: 'tiny' | 'standard' | 'full';
}

export interface DeltaSyncResponse {
  type: 'full' | 'delta' | 'unchanged';
  revision: number;
  snapshotHash: string;
  resumeContext?: CloudResumeResult;
  delta?: {
    addedRules: string[];
    removedRules: string[];
    addedDecisions: string[];
    removedDecisions: string[];
    taskUpdates: Array<{ taskId: string; change: string }>;
  };
  warnings: string[];
}

interface CacheStore {
  get(projectId: string): ContextCacheEntry | undefined;
  set(projectId: string, entry: ContextCacheEntry): void;
  invalidate(projectId: string): void;
}

class InMemoryCacheStore implements CacheStore {
  private cache = new Map<string, ContextCacheEntry>();

  get(projectId: string): ContextCacheEntry | undefined {
    return this.cache.get(projectId);
  }

  set(projectId: string, entry: ContextCacheEntry): void {
    this.cache.set(projectId, entry);
  }

  invalidate(projectId: string): void {
    this.cache.delete(projectId);
  }
}

function computeSnapshotHash(snapshot: AuthoritySnapshot): string {
  const relevant = {
    revision: snapshot.revision,
    rules: snapshot.rules.map((r) => ({
      id: r.id,
      text: r.text,
      mandatory: r.mandatory,
      verified: r.verified,
    })),
    decisions: snapshot.decisions,
    tasks: Object.fromEntries(
      Object.entries(snapshot.tasks).map(([id, task]) => [
        id,
        {
          status: task.status,
          verification: task.verification,
          done: task.done,
          remaining: task.remaining,
          nextAction: task.nextAction,
          blockers: task.blockers,
        },
      ])
    ),
    flows: snapshot.flows.map((f) => ({
      id: f.id,
      description: f.description,
      critical: f.critical,
    })),
  };

  return createHash('sha256').update(JSON.stringify(relevant)).digest('hex').slice(0, 16);
}

export class ContextSyncManager {
  private readonly cache: CacheStore;
  private readonly durabilityMode: DurabilityMode;
  private readonly maxCacheAgeMs = 30 * 60 * 1000; // 30 minutes

  constructor(durabilityMode: DurabilityMode = 'local-first') {
    this.durabilityMode = durabilityMode;
    this.cache = new InMemoryCacheStore();
  }

  isStrictMode(): boolean {
    return isStrictCloudOnly(this.durabilityMode);
  }

  async getOrCompileContext(
    projectId: string,
    compileFn: () => Promise<CloudResumeResult>,
    mode: 'tiny' | 'standard' | 'full' = 'standard'
  ): Promise<ContextCacheEntry> {
    const cached = this.cache.get(projectId);

    if (cached && Date.now() - cached.cachedAt < this.maxCacheAgeMs) {
      return cached;
    }

    const resumeContext = await compileFn();

    if (!resumeContext.available) {
      throw new Error(`RESUME_UNAVAILABLE: ${resumeContext.code} - ${resumeContext.reason}`);
    }

    const snapshotHash = computeSnapshotHash(resumeContext.brain as unknown as AuthoritySnapshot);

    const entry: ContextCacheEntry = {
      revision: resumeContext.revision,
      snapshotHash,
      resumeContext,
      cachedAt: Date.now(),
    };

    this.cache.set(projectId, entry);
    return entry;
  }

  async syncDelta(request: DeltaSyncRequest): Promise<DeltaSyncResponse> {
    const cached = this.cache.get(request.projectId);

    if (!cached) {
      return {
        type: 'full',
        revision: 0,
        snapshotHash: '',
        warnings: ['NO_CACHED_CONTEXT: full sync required'],
      };
    }

    if (
      cached.snapshotHash === request.clientSnapshotHash &&
      cached.revision === request.clientRevision
    ) {
      return {
        type: 'unchanged',
        revision: cached.revision,
        snapshotHash: cached.snapshotHash,
        warnings: [],
      };
    }

    if (
      cached.revision === request.clientRevision &&
      cached.snapshotHash !== request.clientSnapshotHash
    ) {
      return {
        type: 'full',
        revision: cached.revision,
        snapshotHash: cached.snapshotHash,
        resumeContext: cached.resumeContext,
        warnings: ['SNAPSHOT_HASH_MISMATCH: full sync required'],
      };
    }

    const delta = this.computeDelta(cached, request);
    return {
      type: 'delta',
      revision: cached.revision,
      snapshotHash: cached.snapshotHash,
      delta,
      warnings: [],
    };
  }

  private computeDelta(
    cached: ContextCacheEntry,
    request: DeltaSyncRequest
  ): DeltaSyncResponse['delta'] {
    if (!cached.resumeContext.available) {
      throw new Error(
        `RESUME_UNAVAILABLE: ${cached.resumeContext.code} - ${cached.resumeContext.reason}`
      );
    }

    const cachedBrain = cached.resumeContext.brain as unknown as {
      rules: Array<{ id: string; text: string; mandatory: boolean; verified: boolean }>;
      decisions: string[];
      tasks: Record<
        string,
        {
          status: string;
          verification: string;
          done: string[];
          remaining: string[];
          nextAction?: string;
          blockers: string[];
          filesTouched: string[];
        }
      >;
      flows: Array<{ id: string; description: string; critical: boolean }>;
    };

    const cachedRulesSet = new Set(cachedBrain.rules.map((r) => r.id));
    const requestRulesSet = new Set(request.clientSnapshotHash ? request.clientSnapshotHash : '');

    const cachedDecisionsSet = new Set(cachedBrain.decisions);
    const requestDecisionsSet = new Set(
      request.clientSnapshotHash ? request.clientSnapshotHash : ''
    );

    const cachedTaskIds = new Set(Object.keys(cachedBrain.tasks));
    const requestTaskIds = new Set(request.clientSnapshotHash ? request.clientSnapshotHash : '');

    const addedRules = cachedBrain.rules
      .filter((rule) => !requestRulesSet.has(rule.id))
      .map((rule) => rule.text);

    const removedRules = Array.from(requestRulesSet).filter((id) => !cachedRulesSet.has(id));

    const addedDecisions = Array.from(cachedDecisionsSet).filter(
      (decision) => !requestDecisionsSet.has(decision)
    );

    const removedDecisions = Array.from(requestDecisionsSet).filter(
      (decision) => !cachedDecisionsSet.has(decision)
    );

    const taskUpdates: Array<{ taskId: string; change: string }> = [];

    for (const [taskId, cachedTask] of Object.entries(cachedBrain.tasks)) {
      const requestTask = requestTaskIds.has(taskId) ? cachedBrain.tasks[taskId] : null;

      if (!requestTask) {
        taskUpdates.push({
          taskId,
          change: 'ADDED',
        });
      } else {
        const cachedStatus = cachedTask.status;
        const requestStatus = requestTask.status;

        if (cachedStatus !== requestStatus) {
          taskUpdates.push({
            taskId,
            change: `STATUS_CHANGED: ${requestStatus}`,
          });
        }

        const cachedNextAction = cachedTask.nextAction ?? '';
        const requestNextAction = requestTask.nextAction ?? '';

        if (cachedNextAction !== requestNextAction) {
          taskUpdates.push({
            taskId,
            change: `NEXT_ACTION_CHANGED: ${requestNextAction}`,
          });
        }

        const cachedBlockers = cachedTask.blockers.join(', ');
        const requestBlockers = requestTask.blockers.join(', ');

        if (cachedBlockers !== requestBlockers) {
          taskUpdates.push({
            taskId,
            change: `BLOCKERS_CHANGED: ${requestBlockers}`,
          });
        }

        const cachedFiles = cachedTask.filesTouched.join(', ');
        const requestFiles = requestTask.filesTouched.join(', ');

        if (cachedFiles !== requestFiles) {
          taskUpdates.push({
            taskId,
            change: `FILES_TOUCHED_CHANGED: ${requestFiles}`,
          });
        }
      }
    }

    return {
      addedRules,
      removedRules,
      addedDecisions,
      removedDecisions,
      taskUpdates,
    };
  }

  recordClientAck(projectId: string, clientRevision: number): void {
    const cached = this.cache.get(projectId);
    if (cached) {
      cached.clientAckRevision = clientRevision;
    }
  }

  invalidateOnWrite(projectId: string, writeType: 'rule' | 'decision' | 'task' | 'flow'): void {
    this.cache.invalidate(projectId);
  }

  getCacheStats(projectId: string): { cached: boolean; revision?: number; ageMs?: number } | null {
    const cached = this.cache.get(projectId);
    if (!cached) return { cached: false };
    return {
      cached: true,
      revision: cached.revision,
      ageMs: Date.now() - cached.cachedAt,
    };
  }
}

export function createContextSyncManager(durabilityMode: DurabilityMode): ContextSyncManager {
  return new ContextSyncManager(durabilityMode);
}
