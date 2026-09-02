import { createHash, randomUUID } from 'node:crypto';

import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';

import { tmpdir } from 'node:os';

import { dirname, join, parse, resolve } from 'node:path';

import type { ScopedAgent } from './types.js';

type JsonObject = Record<string, unknown>;

const DEFAULT_TTL_MS = 10_000;

const DEFAULT_CLEANUP_LIMIT = 64;

const MARKER_VERSION = 2;

export interface HookEventDedupeOptions {
  agent: ScopedAgent;
  event: string;
  input: JsonObject;

  /**
   * Explicit directory remains available for tests
   * and advanced integrations.
   *
   * Normal production use should omit this.
   */
  directory?: string;

  /**
   * Explicit ToolNet project root.
   *
   * If omitted, dedupe tries to resolve an existing
   * .toolnet/project.json from input.cwd/process.cwd().
   */
  projectRoot?: string;

  /**
   * Optional expected project identity.
   *
   * If both this value and project.json exist,
   * mismatches fail closed.
   */
  projectId?: string;

  ttlMs?: number;
  nowMs?: number;
  cleanupLimit?: number;
}

export interface HookEventDedupeResult {
  duplicate: boolean;
  key: string;
  file: string;
  directory: string;
  scope: 'project' | 'explicit' | 'temporary';
  projectId?: string;
  payloadFingerprint: string;
}

interface DedupeScope {
  directory: string;
  scope: 'project' | 'explicit' | 'temporary';
  projectRoot?: string;
  projectId?: string;
}

interface ProjectIdentity {
  root: string;
  id: string;
}

interface MarkerMetadata {
  version: typeof MARKER_VERSION;
  token: string;
  createdAt: number;
  projectId?: string;
  agent: ScopedAgent;
  event: string;
  sessionId: string;
  payloadFingerprint: string;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
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
    text(input.generationId) ??
    text(input.sourceEventId) ??
    text(input.source_event_id)
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

/*
 * These fields belong to process/container transport
 * rather than semantic event identity.
 *
 * Different containers may mount the same project at
 * different absolute paths, have different PIDs, or
 * invoke global/project hooks through different wrappers.
 */
const FINGERPRINT_IGNORED_KEYS = new Set([
  'pid',
  'processId',
  'process_id',
  'cwd',
  'projectRoot',
  'project_root',
  'hookSource',
  'hook_source',
  'transformedPrompt',
  'transformed_prompt',
  /*
   * Canonical fields are represented separately
   * in the final event identity.
   */
  'sessionId',
  'session_id',
  'conversation_id',
  'conversationId',
  'toolUseId',
  'tool_use_id',
  'toolCallId',
  'tool_call_id',
  'callId',
  'call_id',
  'generation_id',
  'generationId',
  'sourceEventId',
  'source_event_id',
  'timestamp',
]);

function normalizeProjectPath(value: string, projectRoot: string | undefined): string {
  if (!projectRoot) {
    return value;
  }

  const normalizedValue = value.replaceAll('\\', '/');

  const normalizedRoot = resolve(projectRoot).replaceAll('\\', '/').replace(/\/+$/u, '');

  if (!normalizedRoot || !normalizedValue.includes(normalizedRoot)) {
    return value;
  }

  return normalizedValue.split(normalizedRoot).join('<PROJECT>');
}

function fingerprintValue(value: unknown, projectRoot: string | undefined): unknown {
  if (typeof value === 'string') {
    return normalizeProjectPath(value, projectRoot);
  }

  if (Array.isArray(value)) {
    return value.map((item) => fingerprintValue(item, projectRoot));
  }

  if (value && typeof value === 'object') {
    const object = value as JsonObject;

    const output: JsonObject = {};

    for (const key of Object.keys(object).sort()) {
      if (FINGERPRINT_IGNORED_KEYS.has(key)) {
        continue;
      }

      output[key] = fingerprintValue(object[key], projectRoot);
    }

    return output;
  }

  return value;
}

export function hookEventPayloadFingerprint(input: JsonObject, projectRoot?: string): string {
  const canonical = fingerprintValue(input, projectRoot);

  return sha256(JSON.stringify(stable(canonical)));
}

function projectManifestFile(root: string): string {
  return join(root, '.toolnet', 'project.json');
}

function parseProjectIdentity(root: string): ProjectIdentity | null {
  const resolvedRoot = resolve(root);

  const file = projectManifestFile(resolvedRoot);

  if (!existsSync(file)) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const id = text((parsed as JsonObject).id);

  if (!id) {
    return null;
  }

  return {
    root: resolvedRoot,
    id,
  };
}

function findProjectIdentity(start: string): ProjectIdentity | null {
  let current = resolve(start);

  const filesystemRoot = parse(current).root;

  for (;;) {
    const identity = parseProjectIdentity(current);

    if (identity) {
      return identity;
    }

    if (current === filesystemRoot) {
      return null;
    }

    const parent = dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

function inputWorkingDirectory(input: JsonObject): string | undefined {
  return text(input.cwd) ?? text(input.projectRoot) ?? text(input.project_root);
}

function validPositiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function resolveDedupeScope(options: HookEventDedupeOptions): DedupeScope {
  /*
   * Explicit custom directory wins.
   * Used by tests and specialized hosts.
   */
  if (options.directory) {
    return {
      directory: resolve(options.directory),
      scope: 'explicit',
      ...(options.projectRoot
        ? {
            projectRoot: resolve(options.projectRoot),
          }
        : {}),
      ...(options.projectId
        ? {
            projectId: options.projectId,
          }
        : {}),
    };
  }

  let identity: ProjectIdentity | null = null;

  if (options.projectRoot) {
    identity = parseProjectIdentity(options.projectRoot);
  }

  if (!identity) {
    const cwd = inputWorkingDirectory(options.input) ?? process.cwd();

    /*
     * This resolver is read-only.
     * It never initializes .toolnet.
     */
    identity = findProjectIdentity(cwd);
  }

  if (identity) {
    if (options.projectId && options.projectId !== identity.id) {
      throw new Error(
        [
          'Hook dedupe project mismatch.',
          `Expected: ${options.projectId}.`,
          `Resolved: ${identity.id}.`,
        ].join(' ')
      );
    }

    return {
      directory: join(identity.root, '.toolnet', 'runtime', 'dedupe', 'hooks'),
      scope: 'project',
      projectRoot: identity.root,
      projectId: identity.id,
    };
  }

  /*
   * No initialized ToolNet project:
   *
   * preserve previous behaviour instead of creating
   * project state as a hook side effect.
   *
   * This fallback remains process/container-local.
   */
  return {
    directory: join(tmpdir(), 'toolnet-memory-hook-dedupe'),
    scope: 'temporary',
    ...(options.projectId
      ? {
          projectId: options.projectId,
        }
      : {}),
  };
}

export function resolveHookEventDedupeDirectory(options: HookEventDedupeOptions): DedupeScope {
  return resolveDedupeScope(options);
}

function eventKey(
  options: HookEventDedupeOptions,
  scope: DedupeScope,
  payloadFingerprint: string
): string {
  const nativeId = nativeEventId(options.input);

  const prompt = promptIdentity(options.input);

  const timestamp = eventTimestamp(options.input);

  const common = {
    projectId: scope.projectId ?? options.projectId ?? 'unscoped',
    agent: options.agent,
    event: options.event,
    session: sessionId(options.input),
    payloadFingerprint,
  };

  const payload = nativeId
    ? {
        ...common,
        nativeId,
      }
    : prompt
      ? {
          ...common,
          prompt,
          timestamp,
        }
      : {
          ...common,
          input: stable(fingerprintValue(options.input, scope.projectRoot)),
        };

  return sha256(JSON.stringify(stable(payload)));
}

function readMarker(file: string): MarkerMetadata | null {
  if (!existsSync(file)) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const value = parsed as JsonObject;

  if (
    value.version !== MARKER_VERSION ||
    typeof value.token !== 'string' ||
    !value.token ||
    typeof value.createdAt !== 'number' ||
    !Number.isFinite(value.createdAt) ||
    typeof value.agent !== 'string' ||
    typeof value.event !== 'string' ||
    typeof value.sessionId !== 'string' ||
    typeof value.payloadFingerprint !== 'string'
  ) {
    return null;
  }

  return {
    version: MARKER_VERSION,
    token: value.token,
    createdAt: value.createdAt,
    ...(typeof value.projectId === 'string' && value.projectId
      ? {
          projectId: value.projectId,
        }
      : {}),
    agent: value.agent as ScopedAgent,
    event: value.event,
    sessionId: value.sessionId,
    payloadFingerprint: value.payloadFingerprint,
  };
}

function markerTimestamp(file: string): number | undefined {
  const marker = readMarker(file);

  if (marker) {
    return marker.createdAt;
  }

  /*
   * Corrupt legacy/partial markers are recoverable
   * after TTL using filesystem age.
   */
  try {
    return statSync(file).mtimeMs;
  } catch {
    return undefined;
  }
}

function expired(file: string, nowMs: number, ttlMs: number): boolean {
  const createdAt = markerTimestamp(file);

  if (createdAt === undefined) {
    return true;
  }

  return nowMs - createdAt > ttlMs;
}

function removeExpiredMarker(file: string, nowMs: number, ttlMs: number): boolean {
  if (!existsSync(file)) {
    return true;
  }

  if (!expired(file, nowMs, ttlMs)) {
    return false;
  }

  /*
   * Ownership-aware stale cleanup.
   *
   * Re-read metadata immediately before removal.
   * If another process replaced the marker with a
   * fresh owner token, do not remove it.
   */
  const before = readMarker(file);

  if (before) {
    const confirm = readMarker(file);

    if (!confirm || confirm.token !== before.token || confirm.createdAt !== before.createdAt) {
      return false;
    }

    if (nowMs - confirm.createdAt <= ttlMs) {
      return false;
    }
  } else {
    /*
     * Corrupt marker:
     * only remove when filesystem age still proves
     * it is outside TTL.
     */
    let ageMs = 0;
    try {
      ageMs = nowMs - statSync(file).mtimeMs;
    } catch {
      return true;
    }

    if (ageMs <= ttlMs) {
      return false;
    }
  }

  try {
    rmSync(file, {
      force: true,
    });
    return true;
  } catch {
    return false;
  }
}

function cleanupExpiredMarkers(
  directory: string,
  nowMs: number,
  ttlMs: number,
  limit: number,
  keepFile?: string
): number {
  let entries: string[];

  try {
    entries = readdirSync(directory);
  } catch {
    return 0;
  }

  let checked = 0;
  let removed = 0;

  for (const entry of entries.sort()) {
    if (checked >= limit) {
      break;
    }

    if (!entry.endsWith('.json')) {
      continue;
    }

    const file = join(directory, entry);

    if (keepFile && file === keepFile) {
      continue;
    }

    checked += 1;

    if (removeExpiredMarker(file, nowMs, ttlMs)) {
      removed += 1;
    }
  }

  return removed;
}

/**
 * Cross-process and cross-container duplicate claim
 * for native hook invocations.
 *
 * Cross-container support requires both containers to
 * mount the same initialized ToolNet project directory.
 *
 * The marker lives at:
 *
 *   <project>/.toolnet/runtime/dedupe/hooks/<hash>.json
 *
 * O_EXCL ("wx") is the synchronization primitive.
 *
 * IMPORTANT:
 * This is intentionally NOT a distributed S3/R2/HF lock.
 * Multi-host synchronization continues to use immutable
 * operations + deterministic convergence.
 */
export function claimHookEvent(options: HookEventDedupeOptions): HookEventDedupeResult {
  const ttlMs = validPositiveInteger(options.ttlMs ?? DEFAULT_TTL_MS, 'ttlMs');

  const cleanupLimit = validPositiveInteger(
    options.cleanupLimit ?? DEFAULT_CLEANUP_LIMIT,
    'cleanupLimit'
  );

  const nowMs = options.nowMs ?? Date.now();

  const scope = resolveDedupeScope(options);

  const payloadFingerprint = hookEventPayloadFingerprint(options.input, scope.projectRoot);

  const key = eventKey(options, scope, payloadFingerprint);

  const file = join(scope.directory, `${key}.json`);

  mkdirSync(scope.directory, {
    recursive: true,
    mode: 0o700,
  });

  /*
   * Bounded opportunistic cleanup prevents one marker
   * per unique event from accumulating forever.
   *
   * Never scans unbounded directory contents per hook.
   */
  cleanupExpiredMarkers(scope.directory, nowMs, ttlMs, cleanupLimit, file);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = randomUUID();

    try {
      const fd = openSync(file, 'wx', 0o600);

      const marker: MarkerMetadata = {
        version: MARKER_VERSION,
        token,
        createdAt: nowMs,
        ...(scope.projectId
          ? {
              projectId: scope.projectId,
            }
          : {}),
        agent: options.agent,
        event: options.event,
        sessionId: sessionId(options.input),
        payloadFingerprint,
      };

      try {
        writeFileSync(fd, `${JSON.stringify(marker)}\n`, 'utf8');
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }

      return {
        duplicate: false,
        key,
        file,
        directory: scope.directory,
        scope: scope.scope,
        ...(scope.projectId
          ? {
              projectId: scope.projectId,
            }
          : {}),
        payloadFingerprint,
      };
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String(
              (
                error as {
                  code?: unknown;
                }
              ).code
            )
          : '';

      if (code !== 'EEXIST') {
        throw error;
      }

      if (attempt === 0 && removeExpiredMarker(file, nowMs, ttlMs)) {
        continue;
      }

      return {
        duplicate: true,
        key,
        file,
        directory: scope.directory,
        scope: scope.scope,
        ...(scope.projectId
          ? {
              projectId: scope.projectId,
            }
          : {}),
        payloadFingerprint,
      };
    }
  }

  return {
    duplicate: true,
    key,
    file,
    directory: scope.directory,
    scope: scope.scope,
    ...(scope.projectId
      ? {
          projectId: scope.projectId,
        }
      : {}),
    payloadFingerprint,
  };
}
