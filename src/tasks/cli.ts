import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { ProjectTaskService } from './service.js';
import type {
  TaskActor,
  TaskEvidenceKind,
  TaskKind,
  TaskPatch,
  TaskPriority,
  TaskStatus,
  TaskTestOutcome,
} from './types.js';
interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string | true>;
}
const TASK_KINDS = new Set<TaskKind>(['goal', 'task', 'subtask']);
const TASK_STATUSES = new Set<TaskStatus>([
  'pending',
  'active',
  'blocked',
  'completed',
  'cancelled',
]);
const TASK_PRIORITIES = new Set<TaskPriority>(['critical', 'high', 'normal', 'low']);
const EVIDENCE_KINDS = new Set<TaskEvidenceKind>([
  'note',
  'file',
  'test',
  'commit',
  'artifact',
  'review',
]);
const TEST_OUTCOMES = new Set<TaskTestOutcome>(['pass', 'fail', 'skip']);
function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | true>();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value) {
      continue;
    }
    if (!value.startsWith('--')) {
      positionals.push(value);
      continue;
    }
    const name = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      flags.set(name, true);
      continue;
    }
    flags.set(name, next);
    index += 1;
  }
  return {
    positionals,
    flags,
  };
}
function flag(parsed: ParsedArgs, name: string): string | undefined {
  const value = parsed.flags.get(name);
  return typeof value === 'string' ? value : undefined;
}
function booleanFlag(parsed: ParsedArgs, name: string): boolean {
  return parsed.flags.get(name) === true;
}
function requiredFlag(parsed: ParsedArgs, name: string): string {
  const value = flag(parsed, name)?.trim();
  if (!value) {
    throw new Error(`TASK_CLI_FLAG_REQUIRED --${name}`);
  }
  return value;
}
function positional(parsed: ParsedArgs, index: number, label: string): string {
  const value = parsed.positionals[index]?.trim();
  if (!value) {
    throw new Error(`TASK_CLI_ARGUMENT_REQUIRED ${label}`);
  }
  return value;
}
function optionalNumber(parsed: ParsedArgs, name: string): number | undefined {
  const raw = flag(parsed, name);
  if (raw === undefined) {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`TASK_CLI_NUMBER_INVALID --${name}`);
  }
  return value;
}
function requireNumber(parsed: ParsedArgs, name: string): number {
  const value = optionalNumber(parsed, name);
  if (value === undefined) {
    throw new Error(`TASK_CLI_FLAG_REQUIRED --${name}`);
  }
  return value;
}
function taskKind(value: string): TaskKind {
  if (TASK_KINDS.has(value as TaskKind)) {
    return value as TaskKind;
  }
  throw new Error(`TASK_KIND_INVALID value=${value}`);
}
function taskStatus(value: string): TaskStatus {
  if (TASK_STATUSES.has(value as TaskStatus)) {
    return value as TaskStatus;
  }
  throw new Error(`TASK_STATUS_INVALID value=${value}`);
}
function taskPriority(value: string): TaskPriority {
  if (TASK_PRIORITIES.has(value as TaskPriority)) {
    return value as TaskPriority;
  }
  throw new Error(`TASK_PRIORITY_INVALID value=${value}`);
}
function evidenceKind(value: string): TaskEvidenceKind {
  if (EVIDENCE_KINDS.has(value as TaskEvidenceKind)) {
    return value as TaskEvidenceKind;
  }
  throw new Error(`TASK_EVIDENCE_KIND_INVALID value=${value}`);
}
function testOutcome(value: string): TaskTestOutcome {
  if (TEST_OUTCOMES.has(value as TaskTestOutcome)) {
    return value as TaskTestOutcome;
  }
  throw new Error(`TASK_TEST_OUTCOME_INVALID value=${value}`);
}
function actor(parsed: ParsedArgs): TaskActor | undefined {
  const id = flag(parsed, 'actor')?.trim();
  if (!id) {
    return undefined;
  }
  return {
    kind: 'agent',
    id,
  };
}
function mutationOptions(parsed: ParsedArgs) {
  const expectedRevision = optionalNumber(parsed, 'expected-revision');
  const taskActor = actor(parsed);
  return {
    ...(expectedRevision !== undefined
      ? {
          expectedRevision,
        }
      : {}),
    ...(taskActor
      ? {
          actor: taskActor,
        }
      : {}),
  };
}
function agentId(parsed: ParsedArgs, flagName = 'agent'): string {
  const explicit = flag(parsed, flagName)?.trim();
  const environment = process.env.TOOLNET_AGENT_ID?.trim();
  const value = explicit || environment;
  if (!value) {
    throw new Error(`TASK_AGENT_ID_REQUIRED use --${flagName} or TOOLNET_AGENT_ID`);
  }
  return value;
}
function labels(value: string | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
function projectService(parsed: ParsedArgs): ProjectTaskService {
  return new ProjectTaskService(flag(parsed, 'project') ?? process.cwd());
}
export async function executeTaskCli(argv: string[]): Promise<unknown> {
  const command = argv[0] ?? 'list';
  const parsed = parseArgs(argv.slice(1));
  const service = projectService(parsed);
  if (command === 'list') {
    const parent = flag(parsed, 'parent');
    const statusRaw = flag(parsed, 'status');
    const kindRaw = flag(parsed, 'kind');
    return service.list({
      ...(parent !== undefined
        ? {
            parentTaskId: parent,
          }
        : booleanFlag(parsed, 'root')
          ? {
              parentTaskId: null,
            }
          : {}),
      ...(statusRaw
        ? {
            status: taskStatus(statusRaw),
          }
        : {}),
      ...(kindRaw
        ? {
            kind: taskKind(kindRaw),
          }
        : {}),
      ...(flag(parsed, 'assigned-agent')
        ? {
            assignedAgentId: flag(parsed, 'assigned-agent')!,
          }
        : {}),
    });
  }
  if (command === 'show') {
    const id = positional(parsed, 0, 'taskId');
    const task = service.get(id);
    if (!task) {
      throw new Error(`TASK_NOT_FOUND id=${id}`);
    }
    return task;
  }
  if (command === 'create') {
    return service.create({
      kind: taskKind(requiredFlag(parsed, 'kind')),
      title: requiredFlag(parsed, 'title'),
      ...(flag(parsed, 'id')
        ? {
            id: flag(parsed, 'id'),
          }
        : {}),
      ...(flag(parsed, 'parent')
        ? {
            parentTaskId: flag(parsed, 'parent'),
          }
        : {}),
      ...(flag(parsed, 'description')
        ? {
            description: flag(parsed, 'description'),
          }
        : {}),
      ...(flag(parsed, 'priority')
        ? {
            priority: taskPriority(flag(parsed, 'priority')!),
          }
        : {}),
      ...(labels(flag(parsed, 'labels'))
        ? {
            labels: labels(flag(parsed, 'labels')),
          }
        : {}),
      ...(optionalNumber(parsed, 'order') !== undefined
        ? {
            order: optionalNumber(parsed, 'order'),
          }
        : {}),
      ...(flag(parsed, 'assign')
        ? {
            assignedAgentId: flag(parsed, 'assign'),
          }
        : {}),
      ...(actor(parsed)
        ? {
            actor: actor(parsed),
          }
        : {}),
    });
  }
  if (command === 'update') {
    const id = positional(parsed, 0, 'taskId');
    const patch: TaskPatch = {};
    const title = flag(parsed, 'title');
    if (title !== undefined) {
      patch.title = title;
    }
    const description = flag(parsed, 'description');
    if (description !== undefined) {
      patch.description = description;
    }
    if (booleanFlag(parsed, 'clear-description')) {
      patch.description = null;
    }
    const priority = flag(parsed, 'priority');
    if (priority) {
      patch.priority = taskPriority(priority);
    }
    const parsedLabels = labels(flag(parsed, 'labels'));
    if (parsedLabels !== undefined) {
      patch.labels = parsedLabels;
    }
    const order = optionalNumber(parsed, 'order');
    if (order !== undefined) {
      patch.order = order;
    }
    const assign = flag(parsed, 'assign');
    if (assign !== undefined) {
      patch.assignedAgentId = assign;
    }
    if (booleanFlag(parsed, 'unassign')) {
      patch.assignedAgentId = null;
    }
    return service.patch(id, patch, mutationOptions(parsed));
  }
  if (command === 'start') {
    return service.state.start(positional(parsed, 0, 'taskId'), mutationOptions(parsed));
  }
  if (command === 'block') {
    return service.state.block(
      positional(parsed, 0, 'taskId'),
      requiredFlag(parsed, 'reason'),
      flag(parsed, 'next-action'),
      mutationOptions(parsed)
    );
  }
  if (command === 'resume') {
    return service.state.resume(positional(parsed, 0, 'taskId'), mutationOptions(parsed));
  }
  if (command === 'complete') {
    return service.state.complete(positional(parsed, 0, 'taskId'), mutationOptions(parsed));
  }
  if (command === 'progress') {
    return service.state.setProgress(
      positional(parsed, 0, 'taskId'),
      requireNumber(parsed, 'done'),
      requireNumber(parsed, 'total'),
      mutationOptions(parsed)
    );
  }
  if (command === 'next-action') {
    return service.state.setNextAction(
      positional(parsed, 0, 'taskId'),
      booleanFlag(parsed, 'clear') ? null : requiredFlag(parsed, 'value'),
      mutationOptions(parsed)
    );
  }
  if (command === 'dependency:add') {
    return service.state.addDependency(
      positional(parsed, 0, 'taskId'),
      requiredFlag(parsed, 'depends-on'),
      mutationOptions(parsed)
    );
  }
  if (command === 'dependency:remove') {
    return service.state.removeDependency(
      positional(parsed, 0, 'taskId'),
      requiredFlag(parsed, 'depends-on'),
      mutationOptions(parsed)
    );
  }
  if (command === 'evidence') {
    return service.state.addEvidence(
      positional(parsed, 0, 'taskId'),
      {
        kind: evidenceKind(requiredFlag(parsed, 'kind')),
        summary: requiredFlag(parsed, 'summary'),
        ...(flag(parsed, 'ref')
          ? {
              ref: flag(parsed, 'ref'),
            }
          : {}),
      },
      mutationOptions(parsed)
    );
  }
  if (command === 'file') {
    return service.state.touchFile(
      positional(parsed, 0, 'taskId'),
      requiredFlag(parsed, 'path'),
      mutationOptions(parsed)
    );
  }
  if (command === 'test') {
    return service.state.recordTest(
      positional(parsed, 0, 'taskId'),
      {
        name: requiredFlag(parsed, 'name'),
        outcome: testOutcome(requiredFlag(parsed, 'outcome')),
        ...(flag(parsed, 'detail')
          ? {
              detail: flag(parsed, 'detail'),
            }
          : {}),
      },
      mutationOptions(parsed)
    );
  }
  if (command === 'claim') {
    return service.handoff.claim(positional(parsed, 0, 'taskId'), agentId(parsed), {
      ...(optionalNumber(parsed, 'lease-ms') !== undefined
        ? {
            leaseMs: optionalNumber(parsed, 'lease-ms'),
          }
        : {}),
      ...(optionalNumber(parsed, 'expected-revision') !== undefined
        ? {
            expectedRevision: optionalNumber(parsed, 'expected-revision'),
          }
        : {}),
    });
  }
  if (command === 'heartbeat') {
    return service.handoff.heartbeat(positional(parsed, 0, 'taskId'), agentId(parsed), {
      ...(optionalNumber(parsed, 'lease-ms') !== undefined
        ? {
            leaseMs: optionalNumber(parsed, 'lease-ms'),
          }
        : {}),
      ...(optionalNumber(parsed, 'expected-revision') !== undefined
        ? {
            expectedRevision: optionalNumber(parsed, 'expected-revision'),
          }
        : {}),
    });
  }
  if (command === 'release') {
    return service.handoff.release(
      positional(parsed, 0, 'taskId'),
      agentId(parsed),
      flag(parsed, 'reason'),
      {
        ...(optionalNumber(parsed, 'expected-revision') !== undefined
          ? {
              expectedRevision: optionalNumber(parsed, 'expected-revision'),
            }
          : {}),
      }
    );
  }
  if (command === 'handoff') {
    return service.handoff.handoff(
      positional(parsed, 0, 'taskId'),
      agentId(parsed, 'from'),
      agentId(parsed, 'to'),
      flag(parsed, 'reason'),
      {
        ...(optionalNumber(parsed, 'lease-ms') !== undefined
          ? {
              leaseMs: optionalNumber(parsed, 'lease-ms'),
            }
          : {}),
        ...(optionalNumber(parsed, 'expected-revision') !== undefined
          ? {
              expectedRevision: optionalNumber(parsed, 'expected-revision'),
            }
          : {}),
      }
    );
  }
  if (command === 'next') {
    const rootTaskId = positional(parsed, 0, 'rootTaskId');
    const requester = agentId(parsed);
    if (booleanFlag(parsed, 'claim')) {
      return service.handoff.claimNext(rootTaskId, requester, {
        ...(optionalNumber(parsed, 'lease-ms') !== undefined
          ? {
              leaseMs: optionalNumber(parsed, 'lease-ms'),
            }
          : {}),
      });
    }
    return service.handoff.continuity(rootTaskId, requester);
  }
  throw new Error(`TASK_CLI_COMMAND_UNKNOWN ${command}`);
}
function jsonOutput(value: unknown, compact: boolean): string {
  return JSON.stringify(value, null, compact ? 0 : 2);
}
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const compact = args.includes('--json');
  const result = await executeTaskCli(args.filter((value) => value !== '--json'));
  console.log(jsonOutput(result, compact));
}
const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
