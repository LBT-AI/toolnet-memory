import type { AgentPlanItem, AgentPlanItemStatus } from '../../tasks/mirror-types.js';
import type { NormalizedSessionEvent } from '../types.js';
import {
  contentSourceKeys,
  currentSourceKey,
  diagnostic,
  normalizedToolName,
  objectValue,
  parseJsonArray,
  snapshotBase,
  textValue,
} from '../native-plan/common.js';
import type { NativePlanExtraction } from '../native-plan/common.js';

const OPENCODE_STATUSES = new Set<AgentPlanItemStatus>([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

function statusValue(value: unknown): AgentPlanItemStatus | undefined {
  const status = textValue(value)?.toLowerCase().replace(/-/gu, '_').replace(/\s+/gu, '_');
  if (status && OPENCODE_STATUSES.has(status as AgentPlanItemStatus)) {
    return status as AgentPlanItemStatus;
  }
  return undefined;
}

function todoToolData(event: NormalizedSessionEvent): Record<string, unknown> | undefined {
  if (event.agent !== 'opencode' || event.type !== 'tool_call') {
    return undefined;
  }
  const root = objectValue(event.data);
  if (!root) {
    return undefined;
  }
  const name = normalizedToolName(root.tool ?? root.toolName ?? root.tool_name);
  return name === 'todowrite' ? root : undefined;
}

function todoArray(root: Record<string, unknown>): unknown[] | undefined {
  const state = objectValue(root.state);
  const input = objectValue(state?.input);
  if (Array.isArray(input?.todos)) {
    return input.todos;
  }
  const stateMetadata = objectValue(state?.metadata);
  if (Array.isArray(stateMetadata?.todos)) {
    return stateMetadata.todos;
  }
  const rootMetadata = objectValue(root.metadata);
  if (Array.isArray(rootMetadata?.todos)) {
    return rootMetadata.todos;
  }
  return parseJsonArray(state?.outputSummary);
}

export function extractOpenCodePlanSnapshots(
  events: NormalizedSessionEvent[]
): NativePlanExtraction {
  const snapshots: NativePlanExtraction['snapshots'] = [];
  const diagnostics: NativePlanExtraction['diagnostics'] = [];

  for (const event of events) {
    const root = todoToolData(event);
    if (!root) {
      continue;
    }
    const rawTodos = todoArray(root);
    if (!rawTodos) {
      diagnostics.push(
        diagnostic(
          'opencode',
          event,
          'OPENCODE_TODOS_ARRAY_REQUIRED',
          'todowrite does not contain a structured todos array'
        )
      );
      continue;
    }

    const parsed: Array<{ title: string; status: AgentPlanItemStatus }> = [];
    let malformed = false;
    for (const rawTodo of rawTodos) {
      const todo = objectValue(rawTodo);
      const title = textValue(todo?.content);
      const status = statusValue(todo?.status);
      if (!title || !status) {
        malformed = true;
        break;
      }
      parsed.push({ title, status });
    }
    if (malformed) {
      diagnostics.push(
        diagnostic(
          'opencode',
          event,
          'OPENCODE_TODO_ITEM_INVALID',
          'todowrite contains an invalid content or status field'
        )
      );
      continue;
    }

    const keys = contentSourceKeys(
      'opencode',
      parsed.map((item) => item.title)
    );
    const items: AgentPlanItem[] = parsed.map((item, index) => ({
      sourceKey: keys[index]!,
      title: item.title,
      status: item.status,
      order: index,
    }));
    const current = currentSourceKey(items);
    if (current.ambiguous) {
      diagnostics.push(
        diagnostic(
          'opencode',
          event,
          'OPENCODE_MULTIPLE_IN_PROGRESS',
          'todowrite reported more than one in_progress item; no automatic current item selected'
        )
      );
    }
    snapshots.push(snapshotBase(event, 'opencode', 'opencode:todowrite', items, current.value));
  }

  return { snapshots, diagnostics };
}
