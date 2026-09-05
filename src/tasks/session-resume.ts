import type { ProjectManifest } from '../core/types.js';
import {
  TaskOrchestrationEngine,
  type SessionExecutionBootstrapOptions,
  type SessionExecutionResolution,
} from './orchestration-engine.js';
import { TaskStore } from './store.js';

export function taskSessionOrchestration(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>
): TaskOrchestrationEngine {
  const store = new TaskStore(project);
  return new TaskOrchestrationEngine(store, () => store.replicationConflicts());
}

export function resolveTaskSessionExecution(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  options: SessionExecutionBootstrapOptions
): SessionExecutionResolution {
  return taskSessionOrchestration(project).resolveSessionExecution(options);
}

export function renderTaskSessionBootstrap(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  options: SessionExecutionBootstrapOptions
): string | undefined {
  const orchestration = taskSessionOrchestration(project);
  const resolution = orchestration.resolveSessionExecution(options);
  if (!resolution.task) {
    return undefined;
  }
  return orchestration.renderSessionExecutionBootstrap(options);
}

export async function resolveTaskSessionExecutionWithAutoRecovery(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  options: SessionExecutionBootstrapOptions
): Promise<SessionExecutionResolution> {
  const orchestration = taskSessionOrchestration(project);
  const resolution = orchestration.resolveSessionExecution(options);
  if (
    resolution.mode !== 'recoverable' ||
    process.env.TOOLNET_TASK_AUTO_RECOVER !== '1' ||
    options.autoRecover === false
  ) {
    return resolution;
  }
  if (!resolution.task) {
    return resolution;
  }
  const claimed = await orchestration.claim(resolution.task.id, options.agentId, {
    now: options.now,
    expectedRevision: resolution.task.revision,
  });
  return {
    mode: 'owned',
    task: claimed.task,
    context: orchestration.resumeContext(claimed.task.id),
    reason: 'expired-lease-recovered',
    requiresClaim: false,
  };
}
