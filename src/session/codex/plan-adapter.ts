import type { AgentPlanItem, AgentPlanItemStatus } from '../../tasks/mirror-types.js';
import type { NormalizedSessionEvent } from '../types.js';
import {
  contentSourceKeys,
  currentSourceKey,
  diagnostic,
  normalizedToolName,
  objectValue,
  parseJsonObject,
  snapshotBase,
  textValue,
} from '../native-plan/common.js';
import type { NativePlanExtraction } from '../native-plan/common.js';

const CODEX_STATUSES = new Set<AgentPlanItemStatus>(['pending', 'in_progress', 'completed']);

function functionCall(event: NormalizedSessionEvent): Record<string, unknown> | undefined {
  const root = objectValue(event.data);
  if (!root) {
    return undefined;
  }
  const payload = objectValue(root.payload) ?? root;
  const name = normalizedToolName(payload.name ?? payload.tool ?? payload.tool_name);
  if (name !== 'updateplan') {
    return undefined;
  }
  const payloadType = textValue(payload.type)?.toLowerCase() ?? '';
  if (
    event.type !== 'tool_call' &&
    !payloadType.includes('function_call') &&
    !payloadType.includes('tool_call')
  ) {
    return undefined;
  }
  return payload;
}

function statusValue(value: unknown): AgentPlanItemStatus | undefined {
  const status = textValue(value)?.toLowerCase().replace(/-/gu, '_').replace(/\s+/gu, '_');
  if (status && CODEX_STATUSES.has(status as AgentPlanItemStatus)) {
    return status as AgentPlanItemStatus;
  }
  return undefined;
}

export function extractCodexPlanSnapshots(events: NormalizedSessionEvent[]): NativePlanExtraction {
  const snapshots: NativePlanExtraction['snapshots'] = [];
  const diagnostics: NativePlanExtraction['diagnostics'] = [];

  for (const event of events) {
    if (event.agent !== 'codex') {
      continue;
    }
    const call = functionCall(event);
    if (!call) {
      continue;
    }
    const args = parseJsonObject(call.arguments ?? call.args ?? call.input);
    if (!args) {
      diagnostics.push(
        diagnostic(
          'codex',
          event,
          'CODEX_PLAN_ARGUMENTS_INVALID',
          'update_plan arguments are not a JSON object'
        )
      );
      continue;
    }
    if (!Array.isArray(args.plan)) {
      diagnostics.push(
        diagnostic(
          'codex',
          event,
          'CODEX_PLAN_ARRAY_REQUIRED',
          'update_plan is missing the plan array'
        )
      );
      continue;
    }

    const parsed: Array<{ title: string; status: AgentPlanItemStatus }> = [];
    let malformed = false;
    for (const rawItem of args.plan) {
      const item = objectValue(rawItem);
      const title = textValue(item?.step);
      const status = statusValue(item?.status);
      if (!title || !status) {
        malformed = true;
        break;
      }
      parsed.push({ title, status });
    }
    if (malformed) {
      diagnostics.push(
        diagnostic(
          'codex',
          event,
          'CODEX_PLAN_ITEM_INVALID',
          'update_plan contains an invalid step or status'
        )
      );
      continue;
    }

    const keys = contentSourceKeys(
      'codex',
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
          'codex',
          event,
          'CODEX_PLAN_MULTIPLE_IN_PROGRESS',
          'update_plan reported more than one in_progress step; no automatic current item selected'
        )
      );
    }
    snapshots.push(snapshotBase(event, 'codex', 'codex:update_plan', items, current.value));
  }

  return { snapshots, diagnostics };
}
