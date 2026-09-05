import { createHash } from 'node:crypto';
import { sanitizeDurableText } from '../security/durable-sanitizer.js';
import type { AgentPlanItem, AgentPlanSnapshot, TaskMirrorSourceBinding } from './mirror-types.js';
function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
function required(value: string, code: string): string {
  const normalized = sanitizeDurableText(value).trim();
  if (!normalized) {
    throw new Error(code);
  }
  return normalized;
}
function optional(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = sanitizeDurableText(value).trim();
  return normalized || undefined;
}
function validTimestamp(value: string): string {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error('TASK_MIRROR_TIMESTAMP_INVALID');
  }
  return new Date(value).toISOString();
}
function validOrder(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('TASK_MIRROR_ORDER_INVALID');
  }
  return value;
}
function normalizeSequence(value: string | number | undefined): string | number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error('TASK_MIRROR_SOURCE_SEQUENCE_INVALID');
    }
    return value;
  }
  return required(value, 'TASK_MIRROR_SOURCE_SEQUENCE_REQUIRED');
}
function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}
function normalizeItem(item: AgentPlanItem): AgentPlanItem {
  const sourceKey = required(item.sourceKey, 'TASK_MIRROR_SOURCE_KEY_REQUIRED');
  const title = required(item.title, 'TASK_MIRROR_TITLE_REQUIRED');
  return {
    sourceKey,
    ...(optional(item.externalItemId)
      ? {
          externalItemId: optional(item.externalItemId),
        }
      : {}),
    title,
    status: item.status,
    order: validOrder(item.order),
    ...(optional(item.detail)
      ? {
          detail: optional(item.detail),
        }
      : {}),
    ...(optional(item.blockerReason)
      ? {
          blockerReason: optional(item.blockerReason),
        }
      : {}),
    ...(optional(item.nextAction)
      ? {
          nextAction: optional(item.nextAction),
        }
      : {}),
  };
}
export function normalizeTaskMirrorSnapshot(snapshot: AgentPlanSnapshot): AgentPlanSnapshot {
  if (snapshot.version !== 1) {
    throw new Error('TASK_MIRROR_VERSION_INVALID');
  }
  if (snapshot.mode !== 'full' && snapshot.mode !== 'delta') {
    throw new Error('TASK_MIRROR_MODE_INVALID');
  }
  const items = snapshot.items.map(normalizeItem);
  const sourceKeys = new Set<string>();
  for (const item of items) {
    if (sourceKeys.has(item.sourceKey)) {
      throw new Error(`TASK_MIRROR_DUPLICATE_SOURCE_KEY key=${item.sourceKey}`);
    }
    sourceKeys.add(item.sourceKey);
  }
  return {
    version: 1,
    projectId: required(snapshot.projectId, 'TASK_MIRROR_PROJECT_ID_REQUIRED'),
    provider: required(snapshot.provider, 'TASK_MIRROR_PROVIDER_REQUIRED'),
    agentId: required(snapshot.agentId, 'TASK_MIRROR_AGENT_ID_REQUIRED'),
    nativeSessionId: required(snapshot.nativeSessionId, 'TASK_MIRROR_NATIVE_SESSION_ID_REQUIRED'),
    ...(optional(snapshot.planId)
      ? {
          planId: optional(snapshot.planId),
        }
      : {}),
    mode: snapshot.mode,
    sourceEventId: required(snapshot.sourceEventId, 'TASK_MIRROR_SOURCE_EVENT_ID_REQUIRED'),
    ...(normalizeSequence(snapshot.sourceSequence) !== undefined
      ? {
          sourceSequence: normalizeSequence(snapshot.sourceSequence),
        }
      : {}),
    observedAt: validTimestamp(snapshot.observedAt),
    items,
    ...(optional(snapshot.currentSourceKey)
      ? {
          currentSourceKey: optional(snapshot.currentSourceKey),
        }
      : {}),
  };
}
export function taskMirrorTaskId(snapshot: AgentPlanSnapshot, item: AgentPlanItem): string {
  const scope = [
    snapshot.projectId,
    snapshot.provider,
    snapshot.nativeSessionId,
    snapshot.planId ?? '',
    item.sourceKey,
  ].join('\u0000');
  return `mirror-${sha256(scope).slice(0, 40)}`;
}
export function taskMirrorSourceBinding(
  snapshot: AgentPlanSnapshot,
  item: AgentPlanItem
): TaskMirrorSourceBinding {
  return {
    provider: snapshot.provider,
    agentId: snapshot.agentId,
    nativeSessionId: snapshot.nativeSessionId,
    ...(snapshot.planId
      ? {
          planId: snapshot.planId,
        }
      : {}),
    sourceKey: item.sourceKey,
    ...(item.externalItemId
      ? {
          externalItemId: item.externalItemId,
        }
      : {}),
    sourceEventId: snapshot.sourceEventId,
    ...(snapshot.sourceSequence !== undefined
      ? {
          sourceSequence: snapshot.sourceSequence,
        }
      : {}),
    firstSeenAt: snapshot.observedAt,
    lastSeenAt: snapshot.observedAt,
  };
}
export function taskMirrorSnapshotDigest(snapshot: AgentPlanSnapshot): string {
  const content = {
    projectId: snapshot.projectId,
    provider: snapshot.provider,
    agentId: snapshot.agentId,
    nativeSessionId: snapshot.nativeSessionId,
    planId: snapshot.planId ?? null,
    mode: snapshot.mode,
    currentSourceKey: snapshot.currentSourceKey ?? null,
    items: [...snapshot.items]
      .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey))
      .map((item) => ({
        sourceKey: item.sourceKey,
        externalItemId: item.externalItemId ?? null,
        title: item.title,
        status: item.status,
        order: item.order,
        detail: item.detail ?? null,
        blockerReason: item.blockerReason ?? null,
        nextAction: item.nextAction ?? null,
      })),
  };
  return sha256(stableJson(content));
}
