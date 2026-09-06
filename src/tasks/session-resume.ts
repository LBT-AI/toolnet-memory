import type { ProjectManifest } from '../core/types.js';
import {
  TaskOrchestrationEngine,
  type SessionExecutionBootstrapOptions,
  type SessionExecutionResolution,
} from './orchestration-engine.js';
import { TaskStore } from './store.js';

const STARTUP_ASSIGN_ATTEMPTS = 8;

function retryableStartupClaim(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return [
    'TASK_ALREADY_CLAIMED',
    'TASK_REVISION_CONFLICT',
    'TASK_REPLICATION_CONFLICT',
    'TASK_LEASE_',
    'TASK_CLAIM_',
  ].some((prefix) => message.startsWith(prefix));
}

function autoRecoveryEnabled(options: SessionExecutionBootstrapOptions): boolean {
  return process.env.TOOLNET_TASK_AUTO_RECOVER === '1' && options.autoRecover !== false;
}

function autoAssignmentEnabled(options: SessionExecutionBootstrapOptions): boolean {
  return process.env.TOOLNET_TASK_AUTO_ASSIGN === '1' && options.autoAssign !== false;
}

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

/** Resolve existing ownership, optionally recover expired work, or opt-in assign a recommendation. */
export async function resolveTaskSessionExecutionWithAutoRecovery(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  options: SessionExecutionBootstrapOptions
): Promise<SessionExecutionResolution> {
  const orchestration = taskSessionOrchestration(project);
  for (let attempt = 0; attempt < STARTUP_ASSIGN_ATTEMPTS; attempt += 1) {
    const resolution = orchestration.resolveSessionExecution(options);
    const recover = resolution.mode === 'recoverable' && autoRecoveryEnabled(options);
    const assign = resolution.mode === 'recommended' && autoAssignmentEnabled(options);
    if (!recover && !assign) {
      return resolution;
    }
    if (!resolution.task) {
      return resolution;
    }
    try {
      const claimed = await orchestration.claim(resolution.task.id, options.agentId, {
        now: options.now,
        expectedRevision: resolution.task.revision,
      });
      return {
        mode: 'owned',
        task: claimed.task,
        context: orchestration.resumeContext(claimed.task.id),
        reason: recover ? 'expired-lease-recovered' : 'recommended-task-auto-assigned',
        requiresClaim: false,
      };
    } catch (error) {
      if (retryableStartupClaim(error) && attempt + 1 < STARTUP_ASSIGN_ATTEMPTS) {
        continue;
      }
      throw error;
    }
  }
  return orchestration.resolveSessionExecution(options);
}
