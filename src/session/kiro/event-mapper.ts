import type { ProjectManifest } from '../../core/types.js';

import type { SessionEventInput, SessionEventType } from '../types.js';

import { sha256, stableStringify } from '../utils.js';

type JsonObject = Record<string, unknown>;

const MAX_STRING = 4000;
const MAX_ARRAY = 20;
const MAX_OBJECT_KEYS = 30;
const MAX_DEPTH = 4;
const MAX_FILES = 20;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
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

function normalizeHookEvent(value: unknown): string | undefined {
  const event = text(value);

  if (!event) {
    return undefined;
  }

  switch (event) {
    case 'agentSpawn':
    case 'SessionStart':
      return 'SessionStart';

    case 'userPromptSubmit':
    case 'UserPromptSubmit':
      return 'UserPromptSubmit';

    case 'postToolUse':
    case 'PostToolUse':
      return 'PostToolUse';

    case 'preToolUse':
    case 'PreToolUse':
      return 'PreToolUse';

    case 'stop':
    case 'Stop':
      return 'Stop';

    default:
      return event;
  }
}

function eventDigest(value: unknown): string {
  try {
    return sha256(stableStringify(value)).slice(0, 20);
  } catch {
    return sha256(String(value)).slice(0, 20);
  }
}

function timestamp(input: JsonObject): string {
  const raw = text(input.timestamp);

  if (raw) {
    const date = new Date(raw);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

function classifyTool(toolName: string | undefined, files: string[]): SessionEventType | null {
  const lower = (toolName ?? '').toLowerCase();

  /*
   * Reads are intentionally excluded from the durable Kiro capture lane.
   * They are extremely noisy and do not materially improve work continuity.
   */
  if (
    lower === 'read' ||
    lower === 'fs_read' ||
    lower.includes('read_file') ||
    lower.includes('list_dir') ||
    lower.includes('grep') ||
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
    lower.includes('command') ||
    lower.includes('execute')
  ) {
    return 'command';
  }

  /*
   * MCP calls and unknown non-read tools remain useful as compact tool results.
   */
  return 'tool_result';
}

export function mapKiroHookToSessionEvents(
  input: JsonObject,
  project: ProjectManifest
): SessionEventInput[] {
  const hookEvent = normalizeHookEvent(input.hook_event_name);

  if (!hookEvent) {
    return [];
  }

  const sessionId = text(input.session_id) ?? 'kiro';
  const cwd = text(input.cwd) ?? project.rootPath;
  const now = timestamp(input);

  const common = {
    timestamp: now,

    cwd,

    source: 'kiro',

    provenance: {
      source: 'kiro-hook',
    },
  } satisfies Partial<SessionEventInput>;

  if (hookEvent === 'SessionStart') {
    return [
      {
        ...common,

        type: 'session_start',

        sourceEventId: `kiro:${sessionId}:start`,

        data: {
          sessionId,

          cwd,
        },
      },
    ];
  }

  if (hookEvent === 'UserPromptSubmit') {
    const prompt = text(input.prompt) ?? text(process.env.USER_PROMPT) ?? '';

    if (!prompt) {
      return [];
    }

    return [
      {
        ...common,

        type: 'user_prompt',

        role: 'user',

        sourceEventId: `kiro:${sessionId}:prompt:${eventDigest(prompt)}`,

        data: {
          content: prompt,
        },
      },
    ];
  }

  if (hookEvent === 'PostToolUse') {
    const toolName = text(input.tool_name);

    const toolInput = isObject(input.tool_input) ? input.tool_input : {};

    const toolResponse = isObject(input.tool_response) ? input.tool_response : {};

    const pathSet = new Set<string>();

    extractPaths(toolInput, pathSet);

    const files = [...pathSet];

    const type = classifyTool(toolName, files);

    if (!type) {
      return [];
    }

    const compactInput = compactValue(toolInput);
    const compactResponse = compactValue(toolResponse);

    const sourceEventId = [
      'kiro',
      sessionId,
      'tool',
      eventDigest({
        toolName,
        input: compactInput,
        response: compactResponse,
      }),
    ].join(':');

    return [
      {
        ...common,

        type,

        sourceEventId,

        data: {
          tool: toolName,

          input: compactInput,

          response: compactResponse,

          files,
        },

        provenance: {
          source: 'kiro-hook',

          files: files.length > 0 ? files : undefined,
        },
      },
    ];
  }

  if (hookEvent === 'Stop') {
    const assistantResponse = text(input.assistant_response);

    const digest = eventDigest({
      assistantResponse: assistantResponse ?? '',
      sessionId,
    });

    const events: SessionEventInput[] = [];

    if (assistantResponse) {
      events.push({
        ...common,

        type: 'assistant_message',

        role: 'assistant',

        sourceEventId: `kiro:${sessionId}:assistant:${digest}`,

        data: {
          content: assistantResponse,
        },
      });
    }

    events.push({
      ...common,

      type: 'session_idle',

      sourceEventId: `kiro:${sessionId}:idle:${digest}`,

      data: {
        sessionId,
      },
    });

    return events;
  }

  return [];
}
