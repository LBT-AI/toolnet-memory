import { existsSync } from 'node:fs';

import { execFileSync } from 'node:child_process';

import { homedir } from 'node:os';

import { isAbsolute, join, relative, resolve } from 'node:path';

import { DatabaseSync } from 'node:sqlite';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import type { SessionEventInput } from '../types.js';

import { SessionCore } from '../core.js';

import { shouldFilterEvent, filterEventData } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';

interface OpenCodeRow {
  [key: string]: unknown;

  id?: unknown;

  session_id?: unknown;

  project_id?: unknown;

  directory?: unknown;

  title?: unknown;

  time_created?: unknown;

  time_updated?: unknown;

  data?: unknown;

  __clock?: unknown;
}

interface CursorValue {
  time: number;
  id: string;
}

export interface OpenCodeSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  nativeSessionId: string;

  dbPath?: string;

  idle?: boolean;
  error?: boolean;
  compacted?: boolean;

  /**
   * Capture native events into the fsync'd local WAL
   * and refresh local work state without waiting for
   * remote storage.
   */
  localOnly?: boolean;
}

export interface OpenCodeSyncResult {
  nativeSessionId: string;

  importedMessages: number;

  importedParts: number;

  recordedEvents: number;

  eventCount: number;

  chunkCount: number;

  status: string;

  durability: 'local' | 'remote';
}

export interface OpenCodeRecoveryOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  dbPath?: string;

  limit?: number;
}

export function defaultOpenCodeDbPath(): string {
  /*
   * Prefer OpenCode's own resolver.
   * This respects OpenCode/XDG configuration
   * instead of hardcoding ToolNet assumptions.
   */
  try {
    const resolved = execFileSync('opencode', ['db', 'path'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();

    if (resolved) {
      return resolved;
    }
  } catch {
    // Continue through supported fallbacks.
  }

  if (process.env.OPENCODE_DB) {
    return process.env.OPENCODE_DB;
  }

  const dataRoot = process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share');

  return join(dataRoot, 'opencode', 'opencode.db');
}

function valueString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function valueNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Non JSON data.
  }

  return {};
}

function toIso(value: unknown): string {
  let time = valueNumber(value);

  if (time <= 0) {
    return new Date().toISOString();
  }

  /*
   * Seconds → milliseconds.
   */
  if (time < 100_000_000_000) {
    time *= 1000;
  }

  const date = new Date(time);

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function isInsideProject(
  projectRoot: string,

  candidate: string
): boolean {
  if (!candidate) {
    return false;
  }

  const root = resolve(projectRoot);

  const target = resolve(candidate);

  if (root === target) {
    return true;
  }

  const rel = relative(root, target);

  return (
    rel !== '' &&
    rel !== '..' &&
    !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
    !isAbsolute(rel)
  );
}

function decodeCursor(value: string | undefined): CursorValue {
  if (!value) {
    return {
      time: -1,
      id: '',
    };
  }

  try {
    const parsed = JSON.parse(value) as Partial<CursorValue>;

    return {
      time: typeof parsed.time === 'number' ? parsed.time : -1,

      id: typeof parsed.id === 'string' ? parsed.id : '',
    };
  } catch {
    return {
      time: -1,
      id: '',
    };
  }
}

function encodeCursor(value: CursorValue): string {
  return JSON.stringify(value);
}

function openDatabase(dbPath: string): DatabaseSync {
  if (!existsSync(dbPath)) {
    throw new Error(`OpenCode database not found: ${dbPath}`);
  }

  const db = new DatabaseSync(dbPath, {
    readOnly: true,
  });

  db.exec('PRAGMA query_only = ON');

  db.exec('PRAGMA busy_timeout = 3000');

  return db;
}

function sessionRow(
  db: DatabaseSync,

  nativeSessionId: string
): OpenCodeRow {
  const row = db
    .prepare(
      `
      SELECT *
      FROM "session"
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(nativeSessionId) as OpenCodeRow | undefined;

  if (!row) {
    throw new Error(`OpenCode session not found: ${nativeSessionId}`);
  }

  return row;
}

function sessionBelongsToProject(
  db: DatabaseSync,

  row: OpenCodeRow,

  project: ProjectManifest
): boolean {
  const directDirectory = valueString(row.directory);

  if (directDirectory && isInsideProject(project.rootPath, directDirectory)) {
    return true;
  }

  const projectId = valueString(row.project_id);

  if (projectId) {
    try {
      const projectRow = db
        .prepare(
          `
          SELECT *
          FROM "project"
          WHERE id = ?
          LIMIT 1
          `
        )
        .get(projectId) as Record<string, unknown> | undefined;

      if (projectRow) {
        for (const field of ['worktree', 'directory', 'path']) {
          const candidate = valueString(projectRow[field]);

          if (candidate && isInsideProject(project.rootPath, candidate)) {
            return true;
          }
        }
      }
    } catch {
      // Older schema.
    }

    try {
      const directories = db
        .prepare(
          `
          SELECT directory
          FROM "project_directory"
          WHERE project_id = ?
          `
        )
        .all(projectId) as Record<string, unknown>[];

      if (
        directories.some((item) => isInsideProject(project.rootPath, valueString(item.directory)))
      ) {
        return true;
      }
    } catch {
      // Older schema.
    }
  }

  /*
   * Last fallback:
   * inspect message metadata path.root/cwd,
   * but not text content.
   */
  try {
    const rows = db
      .prepare(
        `
        SELECT data
        FROM "message"
        WHERE session_id = ?
        ORDER BY time_created DESC
        LIMIT 20
        `
      )
      .all(valueString(row.id)) as OpenCodeRow[];

    for (const message of rows) {
      const data = jsonObject(message.data);

      const path =
        data.path && typeof data.path === 'object' ? (data.path as Record<string, unknown>) : {};

      for (const candidate of [valueString(path.cwd), valueString(path.root)]) {
        if (candidate && isInsideProject(project.rootPath, candidate)) {
          return true;
        }
      }
    }
  } catch {
    // ignore
  }

  return false;
}

function fetchRowsAfter(
  db: DatabaseSync,

  table: 'message' | 'part',

  nativeSessionId: string,

  cursor: CursorValue
): OpenCodeRow[] {
  const sql = `
    SELECT *,
      COALESCE(
        time_updated,
        time_created,
        0
      ) AS __clock
    FROM "${table}"
    WHERE session_id = ?
      AND (
        COALESCE(
          time_updated,
          time_created,
          0
        ) > ?
        OR (
          COALESCE(
            time_updated,
            time_created,
            0
          ) = ?
          AND id > ?
        )
      )
    ORDER BY
      COALESCE(
        time_updated,
        time_created,
        0
      ) ASC,
      id ASC
    `;

  return db.prepare(sql).all(nativeSessionId, cursor.time, cursor.time, cursor.id) as OpenCodeRow[];
}

function cursorFromRows(
  rows: OpenCodeRow[],

  fallback: CursorValue
): CursorValue {
  const last = rows[rows.length - 1];

  if (!last) {
    return fallback;
  }

  return {
    time: valueNumber(last.__clock),

    id: valueString(last.id),
  };
}

interface TimedEvent {
  clock: number;
  order: number;

  event: SessionEventInput;
}

function messageEvent(
  dbPath: string,

  row: OpenCodeRow
): TimedEvent {
  const data = jsonObject(row.data);

  const role = valueString(data.role);

  const clock = valueNumber(row.__clock);

  const id = valueString(row.id);

  let type: SessionEventInput['type'] = 'message';

  if (role === 'user') {
    type = 'user_prompt';
  } else if (role === 'assistant') {
    type = 'assistant_message';
  }

  return {
    clock,
    order: 0,

    event: {
      type,

      timestamp: toIso(clock),

      role: role || undefined,

      sourceEventId: `message:${id}:${clock}`,

      sourceSequence: `${clock}:${id}`,

      data: {
        messageId: id,

        ...data,
      },

      provenance: {
        source: 'opencode',

        sourcePath: dbPath,

        sourceTable: 'message',

        sourceRowId: id,

        sourceOffset: `${clock}:${id}`,
      },
    },
  };
}

function compactToolPartData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...data,
  };

  const state =
    data.state && typeof data.state === 'object' && !Array.isArray(data.state)
      ? {
          ...(data.state as Record<string, unknown>),
        }
      : undefined;

  if (state) {
    const output = state.output;

    /*
     * Raw command/tool output can be massive.
     * Keep only a compact diagnostic preview.
     */
    if (typeof output === 'string') {
      const normalized = output.replace(/\r\n/g, '\n');

      const max = 500;

      state.outputSummary =
        normalized.length <= max
          ? normalized
          : `${normalized.slice(
              0,
              350
            )}\n...[ToolNet truncated ${normalized.length - max} chars]...\n${normalized.slice(
              -150
            )}`;

      delete state.output;
    } else if (output !== undefined) {
      state.outputSummary = '[non-text tool output omitted]';

      delete state.output;
    }

    /*
     * Tool input may also accidentally contain
     * very large payloads. Keep structure but
     * cap large string fields.
     */
    if (state.input && typeof state.input === 'object' && !Array.isArray(state.input)) {
      const input = {
        ...(state.input as Record<string, unknown>),
      };

      for (const [key, value] of Object.entries(input)) {
        if (typeof value === 'string' && value.length > 1000) {
          input[key] = `${value.slice(0, 1000)}...[ToolNet truncated]`;
        }
      }

      state.input = input;
    }

    result.state = state;
  }

  return result;
}

function partMessageRole(db: DatabaseSync, row: OpenCodeRow): string | undefined {
  const messageId = valueString(row.message_id);

  if (!messageId) {
    return undefined;
  }

  try {
    const message = db
      .prepare(
        `
        SELECT data
        FROM "message"
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(messageId) as OpenCodeRow | undefined;

    if (!message) {
      return undefined;
    }

    const data = jsonObject(message.data);

    return valueString(data.role) || undefined;
  } catch {
    return undefined;
  }
}

function partEvent(
  db: DatabaseSync,

  dbPath: string,

  row: OpenCodeRow
): TimedEvent {
  const data = jsonObject(row.data);

  const partType = valueString(data.type);

  const clock = valueNumber(row.__clock);

  const id = valueString(row.id);

  const messageId = valueString(row.message_id);

  const role = partMessageRole(db, row);

  let type: SessionEventInput['type'] = 'message_part';

  if (partType === 'tool') {
    type = 'tool_call';
  } else if (partType === 'snapshot') {
    type = 'artifact';
  }

  return {
    clock,
    order: 1,

    event: {
      type,

      timestamp: toIso(clock),

      role,

      sourceEventId: `part:${id}:${clock}`,

      sourceSequence: `${clock}:${id}`,

      data: {
        partId: id,

        messageId,

        ...(partType === 'tool' ? compactToolPartData(data) : data),
      },

      provenance: {
        source: 'opencode',

        sourcePath: dbPath,

        sourceTable: 'part',

        sourceRowId: id,

        sourceOffset: `${clock}:${id}`,
      },
    },
  };
}

export async function syncOpenCodeSession(
  options: OpenCodeSyncOptions
): Promise<OpenCodeSyncResult> {
  const dbPath = options.dbPath ?? defaultOpenCodeDbPath();

  const db = openDatabase(dbPath);

  try {
    const session = sessionRow(db, options.nativeSessionId);

    if (!sessionBelongsToProject(db, session, options.project)) {
      throw new Error(
        [
          'OpenCode session does not belong to current ToolNet project.',
          `Session: ${options.nativeSessionId}`,
          `Project: ${options.project.rootPath}`,
          `Session directory: ${valueString(session.directory) || 'unknown'}`,
        ].join(' ')
      );
    }

    const core = new SessionCore({
      project: options.project,

      storage: options.storage,

      agent: 'opencode',

      nativeSessionId: options.nativeSessionId,

      title: valueString(session.title) || undefined,

      metadata: {
        source: 'opencode.db',

        openCodeProjectId: valueString(session.project_id) || undefined,

        directory: valueString(session.directory) || undefined,
      },

      eventContext: {
        source: 'opencode',

        cwd: valueString(session.directory) || options.project.rootPath,
      },
    });

    const state = core.status();

    const messageCursor = decodeCursor(state.sourceCursors['opencode.message']);

    const partCursor = decodeCursor(state.sourceCursors['opencode.part']);

    const messages = fetchRowsAfter(db, 'message', options.nativeSessionId, messageCursor);

    const parts = fetchRowsAfter(db, 'part', options.nativeSessionId, partCursor);

    const timed: TimedEvent[] = [];

    if (state.lastSequence === 0) {
      const created = valueNumber(session.time_created);

      timed.push({
        clock: created,

        order: -1,

        event: {
          type: 'session_start',

          timestamp: toIso(created),

          sourceEventId: `session:${options.nativeSessionId}:created:${created}`,

          data: {
            title: valueString(session.title) || undefined,

            directory: valueString(session.directory) || undefined,

            openCodeProjectId: valueString(session.project_id) || undefined,
          },

          provenance: {
            source: 'opencode',

            sourcePath: dbPath,

            sourceTable: 'session',

            sourceRowId: options.nativeSessionId,
          },
        },
      });
    }

    timed.push(...messages.map((row) => messageEvent(dbPath, row)));

    timed.push(...parts.map((row) => partEvent(db, dbPath, row)));

    const updated = valueNumber(session.time_updated) || valueNumber(session.time_created);

    if (options.compacted) {
      timed.push({
        clock: updated,

        order: 98,

        event: {
          type: 'session_compact',

          timestamp: toIso(updated),

          sourceEventId: `session:${options.nativeSessionId}:compact:${updated}`,

          data: {},

          provenance: {
            source: 'opencode',
          },
        },
      });
    }

    if (options.error) {
      timed.push({
        clock: updated,

        order: 99,

        event: {
          type: 'error',

          timestamp: toIso(updated),

          sourceEventId: `session:${options.nativeSessionId}:error:${updated}`,

          data: {
            source: 'session.error',
          },

          provenance: {
            source: 'opencode',
          },
        },
      });
    } else if (options.idle) {
      timed.push({
        clock: updated,

        order: 100,

        event: {
          type: 'session_idle',

          timestamp: toIso(updated),

          sourceEventId: `session:${options.nativeSessionId}:idle:${updated}`,

          data: {},

          provenance: {
            source: 'opencode',
          },
        },
      });
    }

    timed.sort((left, right) => left.clock - right.clock || left.order - right.order);

    // Filter noisy events before recording
    const filteredTimed = timed
      .filter((item) => {
        if (shouldFilterEvent(item.event.data as Record<string, unknown>)) {
          return false;
        }
        return true;
      })
      .map((item) => ({
        ...item,
        event: {
          ...item.event,
          data: filterEventData(item.event.data as Record<string, unknown>),
        },
      }));

    const recorded = core.recordMany(filteredTimed.map((item) => item.event));

    const nextMessageCursor = cursorFromRows(messages, messageCursor);

    const nextPartCursor = cursorFromRows(parts, partCursor);

    core.setSourceCursor('opencode.message', encodeCursor(nextMessageCursor));

    core.setSourceCursor('opencode.part', encodeCursor(nextPartCursor));

    // Extract session memory (summary + durable facts)
    if (filteredTimed.length > 0) {
      try {
        const messages = filteredTimed.map((item) => JSON.stringify(item.event.data));
        const extraction = extractSessionMemory(messages, options.nativeSessionId);

        core.setSourceCursor('opencode.session.summary', extraction.summary);
        core.setSourceCursor('opencode.session.facts_count', extraction.durableFacts.length);

        if (shouldArchiveRawTranscript() && !shouldArchiveRemote()) {
          core.setSourceCursor('opencode.raw_transcript.archived', 'local');
        }
      } catch {
        // Extraction failure should not break session sync
      }
    }

    /*
     * Fast crash-safe path.
     *
     * recordMany() has already:
     * - written events to local WAL
     * - fsync'd the WAL
     * - updated local work/current state
     *
     * Do NOT wait for Hugging Face/S3 here.
     */
    if (options.localOnly) {
      const localState = core.status();

      return {
        nativeSessionId: options.nativeSessionId,

        importedMessages: messages.length,

        importedParts: parts.length,

        recordedEvents: recorded.length,

        eventCount: localState.lastSequence,

        chunkCount: 0,

        status: localState.status,

        durability: 'local',
      };
    }

    const flushed = await core.flush();

    return {
      nativeSessionId: options.nativeSessionId,

      importedMessages: messages.length,

      importedParts: parts.length,

      recordedEvents: recorded.length,

      eventCount: flushed.eventCount,

      chunkCount: flushed.chunkCount,

      status: flushed.status,

      durability: 'remote',
    };
  } finally {
    db.close();
  }
}

export async function recoverOpenCodeProject(
  options: OpenCodeRecoveryOptions
): Promise<OpenCodeSyncResult[]> {
  const dbPath = options.dbPath ?? defaultOpenCodeDbPath();

  const db = openDatabase(dbPath);

  const sessionIds: string[] = [];

  try {
    const rows = db
      .prepare(
        `
        SELECT *
        FROM "session"
        ORDER BY
          COALESCE(
            time_updated,
            time_created,
            0
          ) DESC
        `
      )
      .all() as OpenCodeRow[];

    for (const row of rows) {
      if (!sessionBelongsToProject(db, row, options.project)) {
        continue;
      }

      const id = valueString(row.id);

      if (id) {
        sessionIds.push(id);
      }

      if (sessionIds.length >= (options.limit ?? 100)) {
        break;
      }
    }
  } finally {
    db.close();
  }

  const results: OpenCodeSyncResult[] = [];

  for (const nativeSessionId of sessionIds) {
    results.push(
      await syncOpenCodeSession({
        project: options.project,

        storage: options.storage,

        nativeSessionId,

        dbPath,
      })
    );
  }

  return results;
}
