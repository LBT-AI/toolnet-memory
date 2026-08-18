import type { SessionEventContext, SessionEventInput } from './types.js';

const PRIVATE_REASONING_KEYS = new Set([
  'thinking',
  'reasoning',
  'reasoningcontent',
  'chainofthought',
  'cot',
  'analysistext',
  'internalreasoning',
  'modelthinking',
]);

const PRIVATE_REASONING_TYPES = new Set([
  'reasoning',
  'thinking',
  'chain_of_thought',
  'chain-of-thought',
  'internal_reasoning',
  'internal-reasoning',
]);

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, '');
}

function reasoningObjectType(value: Record<string, unknown>): string | null {
  for (const key of ['type', 'kind']) {
    const candidate = value[key];

    if (typeof candidate === 'string') {
      const normalized = candidate.toLowerCase();

      if (PRIVATE_REASONING_TYPES.has(normalized)) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * ToolNet stores outcomes, decisions and work state.
 * Raw model thinking / chain-of-thought must never enter
 * the durable session WAL.
 */
export function stripPrivateReasoning(value: unknown, depth = 0): unknown {
  if (depth > 12) {
    return '[ToolNet nested value omitted]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripPrivateReasoning(item, depth + 1));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const object = value as Record<string, unknown>;
  const privateType = reasoningObjectType(object);

  if (privateType) {
    return {
      type: privateType,
      omitted: '[private reasoning omitted]',
    };
  }

  const output: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(object)) {
    if (PRIVATE_REASONING_KEYS.has(normalizedKey(key))) {
      continue;
    }

    output[key] = stripPrivateReasoning(child, depth + 1);
  }

  return output;
}

function canonicalTimestamp(value: string | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function optionalText(value: string | undefined): string | undefined {
  const text = value?.trim();

  return text || undefined;
}

/**
 * Single normalization boundary shared by every coding agent.
 *
 * Detailed native provenance stays in provenance.source.
 * Top-level source is the normalized agent source:
 * opencode / codex / agy / claude.
 */
export function canonicalizeSessionEventInput(
  input: SessionEventInput,
  defaults: SessionEventContext = {}
): SessionEventInput {
  const provenance = {
    ...(input.provenance ?? {}),
  };

  const source =
    optionalText(input.source) ?? optionalText(defaults.source) ?? optionalText(provenance.source);

  return {
    ...input,

    timestamp: canonicalTimestamp(input.timestamp),

    source,

    turnId: optionalText(input.turnId) ?? optionalText(defaults.turnId),

    cwd: optionalText(input.cwd) ?? optionalText(defaults.cwd),

    data: stripPrivateReasoning(input.data ?? {}) as Record<string, unknown>,

    provenance,
  };
}
