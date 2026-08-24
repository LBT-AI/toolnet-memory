import type { ProjectManifest } from '../../core/types.js';

import type { SessionEventInput, SessionEventType } from '../types.js';

import { sha256, stableStringify } from '../utils.js';

export type HookCaptureAgent = 'cursor' | 'copilot' | 'grok';

export type NormalizedHookEventName =
  'SessionStart' | 'UserPromptSubmit' | 'PostToolUse' | 'AssistantMessage' | 'Stop';

export interface NormalizedHookInput {
  agent: HookCaptureAgent;

  event: NormalizedHookEventName;

  sessionId: string;

  cwd: string;

  timestamp?: string | number;

  prompt?: string;

  toolName?: string;

  toolInput?: unknown;

  toolResponse?: unknown;

  assistantResponse?: string;
}

type JsonObject = Record<string, unknown>;

const MAX_STRING = 4000;
const MAX_ARRAY = 20;
const MAX_OBJECT_KEYS = 30;
const MAX_DEPTH = 4;
const MAX_FILES = 20;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compactValue(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) {
    if (typeof value === 'string') {
      return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
    }

    if (Array.isArray(value)) {
      return `[array:${value.length}]`;
    }

    if (isObject(value)) {
      return `[object:${Object.keys(value).length}]`;
    }

    return value;
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }

  if (Array.isArray(value)) {
    const values = value.slice(0, MAX_ARRAY).map((item) => compactValue(item, depth + 1));

    if (value.length > MAX_ARRAY) {
      values.push(`[+${value.length - MAX_ARRAY} items]`);
    }

    return values;
  }

  if (isObject(value)) {
    const output: JsonObject = {};
    const entries = Object.entries(value);

    for (const [key, item] of entries.slice(0, MAX_OBJECT_KEYS)) {
      output[key] = compactValue(item, depth + 1);
    }

    if (entries.length > MAX_OBJECT_KEYS) {
      output.__truncatedKeys = entries.length - MAX_OBJECT_KEYS;
    }

    return output;
  }

  return value;
}

function extractPaths(value: unknown, output: Set<string>, depth = 0): void {
  if (depth > MAX_DEPTH || output.size >= MAX_FILES) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractPaths(item, output, depth + 1);

      if (output.size >= MAX_FILES) {
        break;
      }
    }

    return;
  }

  if (!isObject(value)) {
    return;
  }

  for (const [key, item] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z]/g, '');

    if (
      (normalized === 'path' || normalized === 'filepath' || normalized === 'filename') &&
      typeof item === 'string' &&
      item.trim()
    ) {
      output.add(item.trim());
    }

    extractPaths(item, output, depth + 1);

    if (output.size >= MAX_FILES) {
      break;
    }
  }
}

function eventDigest(value: unknown): string {
  try {
    return sha256(stableStringify(value)).slice(0, 20);
  } catch {
    return sha256(String(value)).slice(0, 20);
  }
}

function normalizeTimestamp(value: string | number | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

function classifyTool(toolName: string | undefined, files: string[]): SessionEventType | null {
  const lower = (toolName ?? '').toLowerCase();

  /*
   * Avoid durable noise from pure read/search operations.
   */
  if (
    lower === 'read' ||
    lower === 'view' ||
    lower.includes('read_file') ||
    lower.includes('list_dir') ||
    lower.includes('listdir') ||
    lower.includes('grep') ||
    lower.includes('glob') ||
    lower.includes('search')
  ) {
    return null;
  }

  if (
    files.length > 0 &&
    (lower.includes('edit') || lower.includes('patch') || lower.includes('replace'))
  ) {
    return 'file_edit';
  }

  if (
    files.length > 0 &&
    (lower.includes('write') || lower.includes('create') || lower.includes('delete'))
  ) {
    return 'file_write';
  }

  if (
    lower.includes('bash') ||
    lower.includes('shell') ||
    lower.includes('terminal') ||
    lower.includes('command') ||
    lower.includes('execute')
  ) {
    return 'command';
  }

  return 'tool_result';
}

export function mapNormalizedHookToSessionEvents(
  input: NormalizedHookInput,
  project: ProjectManifest
): SessionEventInput[] {
  const now = normalizeTimestamp(input.timestamp);

  const common = {
    timestamp: now,
    cwd: input.cwd,
    source: input.agent,
    provenance: {
      source: `${input.agent}-hook`,
    },
  } satisfies Partial<SessionEventInput>;

  if (input.event === 'SessionStart') {
    return [
      {
        ...common,
        type: 'session_start',
        sourceEventId: `${input.agent}:${input.sessionId}:start`,
        data: {
          sessionId: input.sessionId,
          cwd: input.cwd,
        },
      },
    ];
  }

  if (input.event === 'UserPromptSubmit') {
    const prompt = input.prompt?.trim();

    if (!prompt) {
      return [];
    }

    return [
      {
        ...common,
        type: 'user_prompt',
        role: 'user',
        sourceEventId: `${input.agent}:${input.sessionId}:prompt:` + eventDigest(prompt),
        data: {
          content: prompt,
        },
      },
    ];
  }

  if (input.event === 'PostToolUse') {
    const pathSet = new Set<string>();

    extractPaths(input.toolInput, pathSet);

    const files = [...pathSet];

    const type = classifyTool(input.toolName, files);

    if (!type) {
      return [];
    }

    const compactInput = compactValue(input.toolInput);
    const compactResponse = compactValue(input.toolResponse);

    return [
      {
        ...common,
        type,
        sourceEventId: [
          input.agent,
          input.sessionId,
          'tool',
          eventDigest({
            toolName: input.toolName,
            input: compactInput,
            response: compactResponse,
          }),
        ].join(':'),
        data: {
          tool: input.toolName,
          input: compactInput,
          response: compactResponse,
          files,
        },
        provenance: {
          source: `${input.agent}-hook`,
          files: files.length > 0 ? files : undefined,
        },
      },
    ];
  }

  if (input.event === 'AssistantMessage') {
    const response = input.assistantResponse?.trim();

    if (!response) {
      return [];
    }

    return [
      {
        ...common,
        type: 'assistant_message',
        role: 'assistant',
        sourceEventId: `${input.agent}:${input.sessionId}:assistant:` + eventDigest(response),
        data: {
          content: response,
        },
      },
    ];
  }

  if (input.event === 'Stop') {
    const events: SessionEventInput[] = [];
    const response = input.assistantResponse?.trim();

    if (response) {
      events.push({
        ...common,
        type: 'assistant_message',
        role: 'assistant',
        sourceEventId: `${input.agent}:${input.sessionId}:assistant:` + eventDigest(response),
        data: {
          content: response,
        },
      });
    }

    events.push({
      ...common,
      type: 'session_idle',
      sourceEventId:
        `${input.agent}:${input.sessionId}:idle:` +
        eventDigest({
          sessionId: input.sessionId,
          response: response ?? '',
        }),
      data: {
        sessionId: input.sessionId,
      },
    });

    return events;
  }

  return [];
}
