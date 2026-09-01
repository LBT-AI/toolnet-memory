import { existsSync, readFileSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import type { SessionEventInput } from '../types.js';

import { SessionCore } from '../core.js';

import { sha256, stableStringify } from '../utils.js';

import { bindToolNetCliSession, requireToolNetCliSessionBinding } from './project-binding.js';

interface ToolNetCliMessage {
  role?: unknown;
  content?: unknown;
  tool_calls?: unknown;
  tool_call_id?: unknown;
  name?: unknown;

  [key: string]: unknown;
}

interface ToolNetCliSavedSession {
  sessionId?: unknown;

  messages?: unknown;

  metadata?: unknown;

  updatedAt?: unknown;
}

export interface ToolNetCliSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  nativeSessionId: string;

  sessionsDir?: string;

  localOnly?: boolean;

  idle?: boolean;

  /**
   * First explicit import must bind the native session
   * to this ToolNet project.
   */
  bind?: boolean;

  /**
   * Test/custom registry override.
   */
  bindingFile?: string;
}

export interface ToolNetCliSyncResult {
  nativeSessionId: string;

  sourceFile: string;

  importedMessages: number;

  recordedEvents: number;

  eventCount: number;

  durability: 'local' | 'remote';
}

export function defaultToolNetCliSessionsDir(): string {
  if (process.env.TOOLNETCLI_SESSIONS_DIR) {
    return process.env.TOOLNETCLI_SESSIONS_DIR;
  }

  if (process.env.TOOLNETAPI_SESSIONS_DIR) {
    return process.env.TOOLNETAPI_SESSIONS_DIR;
  }

  if (process.env.DATA_DIR) {
    return join(process.env.DATA_DIR, 'sessions');
  }

  return join(homedir(), '.toolnetcli', 'sessions');
}

function cleanSessionId(value: string): string {
  return value.endsWith('.json') ? value.slice(0, -5) : value;
}

export function toolNetCliSessionFile(
  nativeSessionId: string,
  sessionsDir = defaultToolNetCliSessionsDir()
): string {
  return join(sessionsDir, `${cleanSessionId(nativeSessionId)}.json`);
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asMessageArray(value: unknown): ToolNetCliMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is ToolNetCliMessage =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item)
  );
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function validTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function sourceEventId(nativeSessionId: string, index: number, message: ToolNetCliMessage): string {
  const digest = sha256(
    stableStringify({
      nativeSessionId,
      index,
      message,
    })
  ).slice(0, 20);

  return `toolnet-cli:message:${index}:${digest}`;
}

function toEvent(
  nativeSessionId: string,
  sourceFile: string,
  updatedAt: string | undefined,
  index: number,
  message: ToolNetCliMessage
): SessionEventInput {
  const role = stringValue(message.role);

  let type: SessionEventInput['type'] = 'message';

  if (role === 'user') {
    type = 'user_prompt';
  }

  if (role === 'assistant') {
    type = 'assistant_message';
  }

  const data: Record<string, unknown> = {
    index,
    content: stringValue(message.content) ?? '',
  };

  if (message.tool_calls !== undefined) {
    data.toolCalls = message.tool_calls;
  }

  if (message.tool_call_id !== undefined) {
    data.toolCallId = message.tool_call_id;
  }

  if (message.name !== undefined) {
    data.name = message.name;
  }

  return {
    type,

    timestamp: updatedAt,

    role,

    source: 'toolnet-cli',

    sourceEventId: sourceEventId(nativeSessionId, index, message),

    sourceSequence: index,

    data,

    provenance: {
      source: 'toolnet-cli',

      sourcePath: sourceFile,

      sourceOffset: index,

      metadata: {
        nativeSessionId,
      },
    },
  };
}

function loadSavedSession(file: string): ToolNetCliSavedSession {
  if (!existsSync(file)) {
    throw new Error(`ToolNet CLI session not found: ${file}`);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`Invalid ToolNet CLI session JSON: ${file}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Invalid ToolNet CLI session root: ${file}`);
  }

  return parsed as ToolNetCliSavedSession;
}

/**
 * Import ToolNet CLI's own durable session JSON into ToolNet Memory.
 *
 * The native ToolNet CLI session remains read-only.
 * ToolNet Memory writes only to:
 *
 * .toolnet/runtime/sources/toolnet-cli/<session>/**
 * .toolnet/journal/events.jsonl
 *
 * Per-source cursor prevents replaying the complete native session
 * every time ToolNet Memory syncs it.
 */
export async function syncToolNetCliSession(
  options: ToolNetCliSyncOptions
): Promise<ToolNetCliSyncResult> {
  const nativeSessionId = cleanSessionId(options.nativeSessionId);

  if (!nativeSessionId) {
    throw new Error('ToolNet CLI native session ID is required.');
  }

  if (options.bind) {
    bindToolNetCliSession(options.project, nativeSessionId, {
      bindingFile: options.bindingFile,
    });
  } else {
    requireToolNetCliSessionBinding(options.project, nativeSessionId, {
      bindingFile: options.bindingFile,
    });
  }

  if (options.bind) {
    bindToolNetCliSession(
      options.project,

      options.nativeSessionId,

      {
        bindingFile: options.bindingFile,
      }
    );
  } else {
    requireToolNetCliSessionBinding(
      options.project,

      options.nativeSessionId,

      {
        bindingFile: options.bindingFile,
      }
    );
  }

  const sourceFile = toolNetCliSessionFile(nativeSessionId, options.sessionsDir);

  const saved = loadSavedSession(sourceFile);

  const savedSessionId = stringValue(saved.sessionId);

  if (savedSessionId && savedSessionId !== nativeSessionId) {
    throw new Error(
      `ToolNet CLI session ID mismatch: requested=${nativeSessionId}, file=${savedSessionId}`
    );
  }

  const messages = asMessageArray(saved.messages);

  const metadata = asObject(saved.metadata);

  const updatedAt = validTimestamp(saved.updatedAt);

  const core = new SessionCore({
    project: options.project,

    storage: options.storage,

    agent: 'toolnet-cli',

    nativeSessionId,

    title: stringValue(metadata.name),

    metadata: {
      nativeSource: 'toolnet-cli-session-json',

      sourceFile,

      model: metadata.model,

      agentMode: metadata.agentMode,
    },

    eventContext: {
      source: 'toolnet-cli',

      cwd: options.project.rootPath,
    },
  });

  const initialState = core.status();

  if (initialState.lastSequence === 0) {
    core.start({
      nativeSource: 'toolnet-cli-session-json',

      sourceFile,
    });
  }

  const cursorKey = 'toolnet-cli.message-count';

  const cursorRaw = core.status().sourceCursors[cursorKey];

  const parsedCursor = Number(cursorRaw);

  let startIndex = Number.isInteger(parsedCursor) && parsedCursor >= 0 ? parsedCursor : 0;

  /*
   * Native history was truncated/replaced.
   *
   * Restart scanning from zero. Stable sourceEventId values
   * allow the ToolNet WAL dedupe layer to reject unchanged
   * messages while admitting genuinely changed/new records.
   */
  if (startIndex > messages.length) {
    startIndex = 0;
  }

  const pending = messages
    .slice(startIndex)
    .map((message, offset) =>
      toEvent(nativeSessionId, sourceFile, updatedAt, startIndex + offset, message)
    );

  const recorded = core.recordMany(pending);

  core.setSourceCursor(cursorKey, messages.length);

  if (options.localOnly) {
    const state = core.status();

    return {
      nativeSessionId,

      sourceFile,

      importedMessages: pending.length,

      recordedEvents: recorded.length,

      eventCount: state.lastSequence,

      durability: 'local',
    };
  }

  if (options.idle) {
    await core.idle({
      nativeSource: 'toolnet-cli-session-json',

      sourceFile,
    });
  } else {
    await core.flush();
  }

  const state = core.status();

  return {
    nativeSessionId,

    sourceFile,

    importedMessages: pending.length,

    recordedEvents: recorded.length,

    eventCount: state.lastSequence,

    durability: 'remote',
  };
}
