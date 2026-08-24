import { createHash } from 'node:crypto';

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import type { ScopedAgent } from './types.js';

type JsonObject = Record<string, unknown>;

export interface HookEventDedupeOptions {
  agent: ScopedAgent;
  event: string;
  input: JsonObject;
  directory?: string;
  ttlMs?: number;
  nowMs?: number;
}

export interface HookEventDedupeResult {
  duplicate: boolean;
  key: string;
  file: string;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (value && typeof value === 'object') {
    const object = value as JsonObject;

    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, stable(object[key])])
    );
  }

  return value;
}

function sessionId(input: JsonObject): string {
  return (
    text(input.sessionId) ??
    text(input.session_id) ??
    text(input.conversation_id) ??
    text(input.conversationId) ??
    'unknown-session'
  );
}

function nativeEventId(input: JsonObject): string | undefined {
  return (
    text(input.toolUseId) ??
    text(input.tool_use_id) ??
    text(input.toolCallId) ??
    text(input.tool_call_id) ??
    text(input.callId) ??
    text(input.call_id) ??
    text(input.generation_id) ??
    text(input.generationId)
  );
}

function promptIdentity(input: JsonObject): string | undefined {
  return (
    text(input.prompt) ??
    text(input.userPrompt) ??
    text(input.user_prompt) ??
    text(input.originalPrompt) ??
    text(input.original_prompt)
  );
}

function eventTimestamp(input: JsonObject): string | undefined {
  const value = input.timestamp;

  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function eventKey(options: HookEventDedupeOptions): string {
  const nativeId = nativeEventId(options.input);
  const prompt = promptIdentity(options.input);
  const timestamp = eventTimestamp(options.input);

  const payload = nativeId
    ? {
        agent: options.agent,
        event: options.event,
        session: sessionId(options.input),
        nativeId,
      }
    : prompt
      ? {
          agent: options.agent,
          event: options.event,
          session: sessionId(options.input),
          prompt,
          timestamp,
        }
      : {
          agent: options.agent,
          event: options.event,
          session: sessionId(options.input),
          input: stable(options.input),
        };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function markerDirectory(options: HookEventDedupeOptions): string {
  return options.directory ?? join(tmpdir(), 'toolnet-memory-hook-dedupe');
}

function markerTimestamp(file: string): number | undefined {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
      createdAt?: unknown;
    };

    return typeof parsed.createdAt === 'number' ? parsed.createdAt : statSync(file).mtimeMs;
  } catch {
    try {
      return statSync(file).mtimeMs;
    } catch {
      return undefined;
    }
  }
}

function expired(file: string, nowMs: number, ttlMs: number): boolean {
  const createdAt = markerTimestamp(file);

  return createdAt === undefined || nowMs - createdAt > ttlMs;
}

/**
 * Cross-process duplicate claim for native hook invocations.
 *
 * Global and project hook definitions can launch separate ToolNet processes.
 * An in-memory Set cannot protect against that. The marker uses O_EXCL ("wx")
 * so only one process can claim an identical native event.
 */
export function claimHookEvent(options: HookEventDedupeOptions): HookEventDedupeResult {
  const ttlMs = options.ttlMs ?? 10_000;
  const nowMs = options.nowMs ?? Date.now();
  const directory = markerDirectory(options);
  const key = eventKey(options);
  const file = join(directory, `${key}.json`);

  mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(file, 'wx', 0o600);

      try {
        writeFileSync(
          fd,
          JSON.stringify({
            createdAt: nowMs,
            agent: options.agent,
            event: options.event,
            sessionId: sessionId(options.input),
          }),
          'utf8'
        );
      } finally {
        closeSync(fd);
      }

      return {
        duplicate: false,
        key,
        file,
      };
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';

      if (code !== 'EEXIST') {
        throw error;
      }

      if (attempt === 0 && existsSync(file) && expired(file, nowMs, ttlMs)) {
        rmSync(file, {
          force: true,
        });

        continue;
      }

      return {
        duplicate: true,
        key,
        file,
      };
    }
  }

  return {
    duplicate: true,
    key,
    file,
  };
}
