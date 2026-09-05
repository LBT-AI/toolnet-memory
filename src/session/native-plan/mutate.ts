import type { ProjectManifest } from '../../core/types.js';
import {
  buildTaskCompletionDraft,
  extractNativeVisibleCompletionResults,
  type NativeVisibleCompletionResult,
} from '../../tasks/completion-snapshot.js';
import type { TaskMirrorBindingDiagnostic } from '../../tasks/mirror-binding-types.js';
import { TaskMirrorBindingStore } from '../../tasks/mirror-binding-store.js';
import {
  TaskMirrorMutationExecutor,
  type TaskMirrorMutationExecution,
  type TaskMirrorMutationOptions,
} from '../../tasks/mirror-mutation-executor.js';
import { TaskMirrorEngine } from '../../tasks/mirror-engine.js';
import { TaskStateEngine } from '../../tasks/state-engine.js';
import { TaskStore } from '../../tasks/store.js';
import type { NormalizedSessionEvent } from '../types.js';
import { extractNativePlanSnapshots } from './index.js';
import { taskMirrorTaskId } from '../../tasks/mirror-identity.js';

export interface NativeTaskMirrorSyncResult {
  executions: TaskMirrorMutationExecution[];
  diagnostics: TaskMirrorBindingDiagnostic[];
  replayedSnapshots: number;
  persistedBindings: number;
  ignoredSnapshots: number;
}

/**
 * The first native pipeline allowed to mutate Persistent Tasks.
 * Provider adapters remain normalize-only; all writes go through the executor.
 */
export async function syncNativeTaskMirrors(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  taskStore: TaskStore,
  events: NormalizedSessionEvent[],
  options: TaskMirrorMutationOptions = {}
): Promise<NativeTaskMirrorSyncResult> {
  const extracted = extractNativePlanSnapshots(events);
  const visibleResults = extractNativeVisibleCompletionResults(events);
  const bindings = new TaskMirrorBindingStore(project);
  const mirror = new TaskMirrorEngine(project, taskStore);
  const state = new TaskStateEngine(taskStore);
  const executor = new TaskMirrorMutationExecutor(project, taskStore, options);
  const correlatedResults = new Map<string, NativeVisibleCompletionResult>();
  const correlatedBindings = new Map<
    string,
    import('../../tasks/mirror-binding-types.js').TaskMirrorBindingRecord
  >();
  const pendingVisibleResults = new Map<string, NativeVisibleCompletionResult>();
  const completedSnapshots: Array<{
    snapshot: import('../../tasks/mirror-types.js').AgentPlanSnapshot;
    item: import('../../tasks/mirror-types.js').AgentPlanItem;
  }> = [];
  const executions: TaskMirrorMutationExecution[] = [];
  const diagnostics: TaskMirrorBindingDiagnostic[] = extracted.diagnostics.map((item) => ({
    provider: item.provider,
    sourceEventId: item.sourceEventId,
    code: item.code,
    message: item.message,
  }));
  let replayedSnapshots = 0;
  let persistedBindings = 0;
  let ignoredSnapshots = 0;

  /*
   * Persist visible results before plan snapshots. This makes the
   * completion correlation order-independent across native batches.
   */
  for (const result of visibleResults) {
    const correlated = await bindings.correlateVisibleResult(result);
    diagnostics.push(...correlated.diagnostics);
    if (correlated.result && correlated.canonicalSourceKey) {
      correlatedResults.set(correlated.canonicalSourceKey, correlated.result);
      if (correlated.binding) {
        correlatedBindings.set(correlated.canonicalSourceKey, correlated.binding);
      }
    } else if (correlated.result && result.sourceKey) {
      pendingVisibleResults.set(result.sourceKey, correlated.result);
    }
  }

  for (const raw of extracted.snapshots) {
    /* Binding persistence precedes Task mutation for crash/replay convergence. */
    const correlated = await bindings.correlate(raw);
    diagnostics.push(...correlated.diagnostics);
    if (correlated.replay) {
      replayedSnapshots += 1;
    }
    if (correlated.persisted) {
      persistedBindings += 1;
    }
    if (correlated.ignored || !correlated.snapshot) {
      ignoredSnapshots += 1;
      continue;
    }
    for (const [sourceKey, result] of pendingVisibleResults) {
      const binding = correlated.bindings?.find((item) => item.rawSourceKeys.includes(sourceKey));
      if (binding) {
        correlatedResults.set(binding.canonicalSourceKey, result);
        correlatedBindings.set(binding.canonicalSourceKey, binding);
        pendingVisibleResults.delete(sourceKey);
      }
    }
    for (const binding of correlated.bindings ?? []) {
      if (binding.visibleResult) {
        correlatedResults.set(binding.canonicalSourceKey, binding.visibleResult);
        correlatedBindings.set(binding.canonicalSourceKey, binding);
      }
    }
    const plan = mirror.plan(correlated.snapshot);
    const execution = await executor.execute(correlated.snapshot, plan);
    executions.push(execution);

    /*
     * Completion snapshots are downstream of lifecycle mutation. The
     * executor has already passed TaskStateEngine completion guards; a
     * conflict therefore leaves the Task active/blocked and is skipped.
     */ for (const item of correlated.snapshot.items) {
      if (item.status === 'completed') {
        completedSnapshots.push({ snapshot: correlated.snapshot, item });
      }
    }
  }

  const completionCandidates = new Map<
    string,
    {
      snapshot: import('../../tasks/mirror-types.js').AgentPlanSnapshot;
      item: import('../../tasks/mirror-types.js').AgentPlanItem;
      visible?: NativeVisibleCompletionResult;
    }
  >();
  const finalizeFallback = events.some(
    (event) => event.type === 'session_end' || event.type === 'session_compact'
  );
  for (const candidate of completedSnapshots) {
    completionCandidates.set(candidate.item.sourceKey, {
      ...candidate,
      visible: correlatedResults.get(candidate.item.sourceKey),
    });
  }
  if (finalizeFallback) {
    const bindingProjection = bindings.projection();
    for (const binding of Object.values(bindingProjection.scopes).flatMap(
      (scope) => scope.bindings
    )) {
      if (binding.status !== 'completed' || completionCandidates.has(binding.canonicalSourceKey)) {
        continue;
      }
      const fallbackSnapshot: import('../../tasks/mirror-types.js').AgentPlanSnapshot = {
        version: 1,
        projectId: project.id,
        provider: binding.provider,
        agentId: binding.agentId,
        nativeSessionId: binding.nativeSessionId,
        ...(binding.planId ? { planId: binding.planId } : {}),
        mode: 'full',
        sourceEventId: binding.lastSourceEventId,
        observedAt: binding.lastSeenAt,
        items: [
          {
            sourceKey: binding.canonicalSourceKey,
            title: binding.title,
            status: 'completed',
            order: binding.order,
          },
        ],
      };
      completionCandidates.set(binding.canonicalSourceKey, {
        snapshot: fallbackSnapshot,
        item: fallbackSnapshot.items[0]!,
      });
    }
  }
  for (const result of correlatedResults.values()) {
    if (!result.sourceKey || completionCandidates.has(result.sourceKey)) {
      continue;
    }
    const bindingProjection = bindings.projection();
    const binding =
      correlatedBindings.get(result.sourceKey) ??
      Object.values(bindingProjection.scopes)
        .flatMap((scope) => scope.bindings)
        .find(
          (item) =>
            item.canonicalSourceKey === result.sourceKey ||
            item.rawSourceKeys.includes(result.sourceKey!)
        );
    if (!binding) {
      continue;
    }
    const syntheticSnapshot: import('../../tasks/mirror-types.js').AgentPlanSnapshot = {
      version: 1,
      projectId: project.id,
      provider: binding.provider,
      agentId: binding.agentId,
      nativeSessionId: binding.nativeSessionId,
      ...(binding.planId ? { planId: binding.planId } : {}),
      mode: 'full',
      sourceEventId: result.sourceEventId,
      observedAt: result.observedAt,
      items: [
        {
          sourceKey: binding.canonicalSourceKey,
          title: binding.title,
          status: 'completed',
          order: binding.order,
        },
      ],
      currentSourceKey: binding.canonicalSourceKey,
    };
    completionCandidates.set(binding.canonicalSourceKey, {
      snapshot: syntheticSnapshot,
      item: syntheticSnapshot.items[0]!,
      visible: result,
    });
  }
  for (const candidate of completionCandidates.values()) {
    const taskId = taskMirrorTaskId(candidate.snapshot, candidate.item);
    const task = taskStore.getTask(taskId);
    if (!task || task.status !== 'completed' || task.completion) {
      continue;
    }
    const visible = candidate.visible;
    if (!visible && !finalizeFallback) {
      continue;
    }
    const draft = buildTaskCompletionDraft({
      projectId: project.id,
      task,
      provider: candidate.snapshot.provider,
      nativeSessionId: candidate.snapshot.nativeSessionId,
      sourceEventId: visible?.sourceEventId ?? candidate.snapshot.sourceEventId,
      ...(visible?.turnId ? { turnId: visible.turnId } : {}),
      ...(visible?.summary ? { visibleSummary: visible.summary } : {}),
      ...(visible ? { visibleChanges: visible.changes } : {}),
      ...(visible ? { visibleDecisions: visible.decisions } : {}),
      ...(visible ? { visibleVerification: visible.verification } : {}),
      ...(visible?.commitSha ? { commitSha: visible.commitSha } : {}),
    });
    try {
      await state.recordCompletion(
        task.id,
        { completion: draft },
        {
          expectedRevision: task.revision,
          actor: { kind: 'agent', id: candidate.snapshot.agentId },
        }
      );
    } catch (error) {
      diagnostics.push({
        provider: candidate.snapshot.provider,
        sourceEventId: visible?.sourceEventId ?? candidate.snapshot.sourceEventId,
        code:
          error instanceof Error
            ? error.message.split(/\\s+/u)[0]!
            : 'TASK_COMPLETION_RECORD_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    executions,
    diagnostics,
    replayedSnapshots,
    persistedBindings,
    ignoredSnapshots,
  };
}
