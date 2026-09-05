import { createHash } from 'node:crypto';
import { sanitizeDurableText } from '../../security/durable-sanitizer.js';
import type { AgentPlanItem, AgentPlanSnapshot } from '../../tasks/mirror-types.js';
import type { NormalizedSessionEvent } from '../types.js';

export interface NativePlanDiagnostic {
  provider: string;
  sourceEventId: string;
  code: string;
  message: string;
}

export interface NativePlanExtraction {
  snapshots: AgentPlanSnapshot[];
  diagnostics: NativePlanDiagnostic[];
}

export function objectValue(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function textValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = sanitizeDurableText(value).normalize('NFKC').replace(/\s+/gu, ' ').trim();
  return normalized || undefined;
}

export function normalizedToolName(value: unknown): string {
  return (textValue(value) ?? '').toLowerCase().replace(/[^a-z0-9]/gu, '');
}

export function parseJsonObject(value: unknown): Record<string, unknown> | undefined {
  const direct = objectValue(value);
  if (direct) {
    return direct;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    return objectValue(JSON.parse(value));
  } catch {
    return undefined;
  }
}

export function parseJsonArray(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function identityText(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Current Codex and OpenCode native plan schemas do not expose stable item IDs.
 * Content identity avoids using array position as identity while remaining
 * deterministic for repeated titles through occurrence numbering.
 */
export function contentSourceKeys(provider: string, titles: string[]): string[] {
  const occurrences = new Map<string, number>();
  return titles.map((title) => {
    const digest = sha256(identityText(title)).slice(0, 24);
    const occurrence = (occurrences.get(digest) ?? 0) + 1;
    occurrences.set(digest, occurrence);
    return [provider, 'content', digest, String(occurrence)].join(':');
  });
}

export function currentSourceKey(items: AgentPlanItem[]): {
  value?: string;
  ambiguous: boolean;
} {
  const active = items.filter((item) => item.status === 'in_progress');
  if (active.length === 1) {
    return {
      value: active[0]!.sourceKey,
      ambiguous: false,
    };
  }
  return {
    ambiguous: active.length > 1,
  };
}

export function diagnostic(
  provider: string,
  event: NormalizedSessionEvent,
  code: string,
  message: string
): NativePlanDiagnostic {
  return {
    provider,
    sourceEventId: event.sourceEventId ?? event.id,
    code,
    message,
  };
}

export function snapshotBase(
  event: NormalizedSessionEvent,
  provider: string,
  planId: string,
  items: AgentPlanItem[],
  current?: string
): AgentPlanSnapshot {
  return {
    version: 1,
    projectId: event.projectId,
    provider,
    agentId: String(event.agent),
    nativeSessionId: event.nativeSessionId,
    planId,
    mode: 'full',
    sourceEventId: event.sourceEventId ?? event.id,
    sourceSequence: event.sourceSequence ?? event.sequence,
    observedAt: event.timestamp,
    items,
    ...(current
      ? {
          currentSourceKey: current,
        }
      : {}),
  };
}
