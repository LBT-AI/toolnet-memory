import { z } from 'zod';
import type { MCPContext } from '../context.js';
import { TaskStore } from '../../tasks/store.js';
import { TaskStateEngine } from '../../tasks/state-engine.js';
import { TaskHandoffEngine } from '../../tasks/handoff-engine.js';
import type { TaskActor, TaskPatch } from '../../tasks/types.js';
const taskKind = z.enum(['goal', 'task', 'subtask']);
const taskStatus = z.enum(['pending', 'active', 'blocked', 'completed', 'cancelled']);
const taskPriority = z.enum(['critical', 'high', 'normal', 'low']);
const evidenceKind = z.enum(['note', 'file', 'test', 'commit', 'artifact', 'review']);
const testOutcome = z.enum(['pass', 'fail', 'skip']);
const expectedRevision = z.number().int().min(1).optional();
const agentId = z.string().min(1).max(200);
const leaseMs = z.number().int().min(30_000).max(86_400_000).optional();
function runtime(ctx: Pick<MCPContext, 'project'>) {
  const store = new TaskStore(ctx.project);
  return {
    store,
    state: new TaskStateEngine(store),
    handoff: new TaskHandoffEngine(store),
  };
}
function mutation(input: { expectedRevision?: number; actorId?: string }) {
  const actor: TaskActor | undefined = input.actorId
    ? {
        kind: 'agent',
        id: input.actorId,
      }
    : undefined;
  return {
    ...(input.expectedRevision !== undefined
      ? {
          expectedRevision: input.expectedRevision,
        }
      : {}),
    ...(actor
      ? {
          actor,
        }
      : {}),
  };
}
export const taskListSchema = {
  parentTaskId: z.string().min(1).optional(),
  rootOnly: z.boolean().optional(),
  status: taskStatus.optional(),
  kind: taskKind.optional(),
  assignedAgentId: z.string().min(1).optional(),
};
export async function taskList(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    parentTaskId?: string;
    rootOnly?: boolean;
    status?: 'pending' | 'active' | 'blocked' | 'completed' | 'cancelled';
    kind?: 'goal' | 'task' | 'subtask';
    assignedAgentId?: string;
  }
) {
  return runtime(ctx).store.listTasks({
    ...(input.parentTaskId
      ? {
          parentTaskId: input.parentTaskId,
        }
      : input.rootOnly
        ? {
            parentTaskId: null,
          }
        : {}),
    ...(input.status
      ? {
          status: input.status,
        }
      : {}),
    ...(input.kind
      ? {
          kind: input.kind,
        }
      : {}),
    ...(input.assignedAgentId
      ? {
          assignedAgentId: input.assignedAgentId,
        }
      : {}),
  });
}
export const taskGetSchema = {
  taskId: z.string().min(1),
};
export async function taskGet(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
  }
) {
  const task = runtime(ctx).store.getTask(input.taskId);
  if (!task) {
    throw new Error(`TASK_NOT_FOUND id=${input.taskId}`);
  }
  return task;
}
export const taskCreateSchema = {
  id: z.string().min(1).optional(),
  kind: taskKind,
  parentTaskId: z.string().min(1).optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(20_000).optional(),
  priority: taskPriority.optional(),
  labels: z.array(z.string().min(1).max(100)).max(50).optional(),
  order: z.number().int().min(0).optional(),
  assignedAgentId: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
};
export async function taskCreate(
  ctx: Pick<MCPContext, 'project'>,
  input: z.infer<z.ZodObject<any>> & {
    id?: string;
    kind: 'goal' | 'task' | 'subtask';
    parentTaskId?: string;
    title: string;
    description?: string;
    priority?: 'critical' | 'high' | 'normal' | 'low';
    labels?: string[];
    order?: number;
    assignedAgentId?: string;
    actorId?: string;
  }
) {
  return runtime(ctx).store.createTask({
    ...input,
    ...(input.actorId
      ? {
          actor: {
            kind: 'agent',
            id: input.actorId,
          },
        }
      : {}),
  });
}
export const taskUpdateSchema = {
  taskId: z.string().min(1),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(20_000).nullable().optional(),
  priority: taskPriority.optional(),
  labels: z.array(z.string()).max(50).optional(),
  order: z.number().int().min(0).optional(),
  assignedAgentId: z.string().min(1).nullable().optional(),
  expectedRevision,
  actorId: z.string().min(1).optional(),
};
export async function taskUpdate(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    title?: string;
    description?: string | null;
    priority?: 'critical' | 'high' | 'normal' | 'low';
    labels?: string[];
    order?: number;
    assignedAgentId?: string | null;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  const patch: TaskPatch = {};
  if (input.title !== undefined) {
    patch.title = input.title;
  }
  if (input.description !== undefined) {
    patch.description = input.description;
  }
  if (input.priority !== undefined) {
    patch.priority = input.priority;
  }
  if (input.labels !== undefined) {
    patch.labels = input.labels;
  }
  if (input.order !== undefined) {
    patch.order = input.order;
  }
  if (input.assignedAgentId !== undefined) {
    patch.assignedAgentId = input.assignedAgentId;
  }
  return runtime(ctx).store.patchTask(input.taskId, patch, mutation(input));
}
export const taskLifecycleSchema = {
  taskId: z.string().min(1),
  expectedRevision,
  actorId: z.string().min(1).optional(),
};
export async function taskStart(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.start(input.taskId, mutation(input));
}
export const taskBlockSchema = {
  ...taskLifecycleSchema,
  reason: z.string().min(1).max(5_000),
  nextAction: z.string().min(1).max(5_000).optional(),
};
export async function taskBlock(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    reason: string;
    nextAction?: string;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.block(input.taskId, input.reason, input.nextAction, mutation(input));
}
export async function taskResume(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.resume(input.taskId, mutation(input));
}
export async function taskComplete(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.complete(input.taskId, mutation(input));
}
export const taskProgressSchema = {
  ...taskLifecycleSchema,
  completed: z.number().int().min(0),
  total: z.number().int().min(0),
};
export async function taskProgress(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    completed: number;
    total: number;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.setProgress(
    input.taskId,
    input.completed,
    input.total,
    mutation(input)
  );
}
export const taskNextActionSchema = {
  ...taskLifecycleSchema,
  nextAction: z.string().min(1).max(5_000).nullable(),
};
export async function taskNextAction(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    nextAction: string | null;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.setNextAction(input.taskId, input.nextAction, mutation(input));
}
export const taskDependencySchema = {
  ...taskLifecycleSchema,
  dependencyTaskId: z.string().min(1),
};
export async function taskDependencyAdd(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    dependencyTaskId: string;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.addDependency(input.taskId, input.dependencyTaskId, mutation(input));
}
export async function taskDependencyRemove(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    dependencyTaskId: string;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.removeDependency(input.taskId, input.dependencyTaskId, mutation(input));
}
export const taskEvidenceSchema = {
  ...taskLifecycleSchema,
  kind: evidenceKind,
  summary: z.string().min(1).max(10_000),
  ref: z.string().min(1).max(5_000).optional(),
};
export async function taskEvidenceAdd(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    kind: 'note' | 'file' | 'test' | 'commit' | 'artifact' | 'review';
    summary: string;
    ref?: string;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.addEvidence(
    input.taskId,
    {
      kind: input.kind,
      summary: input.summary,
      ...(input.ref
        ? {
            ref: input.ref,
          }
        : {}),
    },
    mutation(input)
  );
}
export const taskFileSchema = {
  ...taskLifecycleSchema,
  filePath: z.string().min(1).max(5_000),
};
export async function taskFileTouch(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    filePath: string;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.touchFile(input.taskId, input.filePath, mutation(input));
}
export const taskTestSchema = {
  ...taskLifecycleSchema,
  name: z.string().min(1).max(1_000),
  outcome: testOutcome,
  detail: z.string().max(10_000).optional(),
};
export async function taskTestRecord(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    name: string;
    outcome: 'pass' | 'fail' | 'skip';
    detail?: string;
    expectedRevision?: number;
    actorId?: string;
  }
) {
  return runtime(ctx).state.recordTest(
    input.taskId,
    {
      name: input.name,
      outcome: input.outcome,
      ...(input.detail
        ? {
            detail: input.detail,
          }
        : {}),
    },
    mutation(input)
  );
}
export const taskClaimSchema = {
  taskId: z.string().min(1),
  agentId,
  leaseMs,
  expectedRevision,
};
export async function taskClaim(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    agentId: string;
    leaseMs?: number;
    expectedRevision?: number;
  }
) {
  return runtime(ctx).handoff.claim(input.taskId, input.agentId, {
    ...(input.leaseMs !== undefined
      ? {
          leaseMs: input.leaseMs,
        }
      : {}),
    ...(input.expectedRevision !== undefined
      ? {
          expectedRevision: input.expectedRevision,
        }
      : {}),
  });
}
export const taskReleaseSchema = {
  ...taskClaimSchema,
  reason: z.string().max(5_000).optional(),
};
export async function taskRelease(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    agentId: string;
    reason?: string;
    expectedRevision?: number;
  }
) {
  return runtime(ctx).handoff.release(input.taskId, input.agentId, input.reason, {
    ...(input.expectedRevision !== undefined
      ? {
          expectedRevision: input.expectedRevision,
        }
      : {}),
  });
}
export const taskHandoffSchema = {
  taskId: z.string().min(1),
  fromAgentId: agentId,
  toAgentId: agentId,
  reason: z.string().max(5_000).optional(),
  leaseMs,
  expectedRevision,
};
export async function taskHandoff(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    taskId: string;
    fromAgentId: string;
    toAgentId: string;
    reason?: string;
    leaseMs?: number;
    expectedRevision?: number;
  }
) {
  return runtime(ctx).handoff.handoff(
    input.taskId,
    input.fromAgentId,
    input.toAgentId,
    input.reason,
    {
      ...(input.leaseMs !== undefined
        ? {
            leaseMs: input.leaseMs,
          }
        : {}),
      ...(input.expectedRevision !== undefined
        ? {
            expectedRevision: input.expectedRevision,
          }
        : {}),
    }
  );
}
export const taskNextSchema = {
  rootTaskId: z.string().min(1),
  agentId,
  claim: z.boolean().optional(),
  leaseMs,
};
export async function taskNext(
  ctx: Pick<MCPContext, 'project'>,
  input: {
    rootTaskId: string;
    agentId: string;
    claim?: boolean;
    leaseMs?: number;
  }
) {
  const engines = runtime(ctx);
  if (input.claim) {
    return engines.handoff.claimNext(input.rootTaskId, input.agentId, {
      ...(input.leaseMs !== undefined
        ? {
            leaseMs: input.leaseMs,
          }
        : {}),
    });
  }
  return engines.handoff.continuity(input.rootTaskId, input.agentId);
}
