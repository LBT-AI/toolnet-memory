import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { isAbsolute, join, relative } from 'node:path';

import { ProjectManager } from '../../core/index.js';

import type { ProjectManifest } from '../../core/types.js';

import { triggerProjectBackgroundRefresh } from '../../multi-host/refresh-trigger.js';

import { buildFastProjectContext, findProjectRoot } from '../../work-continuity/fast-context.js';

import { refreshFastHandoffFromCurrent } from '../../work-continuity/handoff-refresh.js';

import { createSessionIdentity } from '../identity.js';

import type { SessionFlushResult } from '../types.js';

import { SessionWal } from '../wal.js';

import { checkpointLocalSession } from '../local-checkpoint.js';

import { flushHookCaptureSession } from '../hook-capture/runtime.js';

import { mapClaudeHookToSessionEvents } from './event-mapper.js';

type JsonObject = Record<string, unknown>;

type DetectedProject = NonNullable<ReturnType<ProjectManager['detect']>>;

const MAX_CONTEXT_CHARS = 3200;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function limitContext(value: string): string {
  if (value.length <= MAX_CONTEXT_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_CONTEXT_CHARS)}\n\n[ToolNet startup context truncated]`;
}

function findProject(cwd: string): DetectedProject | null {
  const root = findProjectRoot(cwd);

  if (!root) {
    return null;
  }

  return new ProjectManager().detect(root) ?? null;
}

function originFile(project: DetectedProject): string {
  return join(project.rootPath, '.toolnet', 'context', 'session-origin.json');
}

function safeRelativeFile(project: DetectedProject, file: string): string {
  if (!isAbsolute(file)) {
    return file;
  }

  const resolved = relative(project.rootPath, file);

  if (resolved.startsWith('..')) {
    return file;
  }

  return resolved;
}

function resolveClaudeSessionId(input: JsonObject): string {
  return typeof input.session_id === 'string' && input.session_id.trim()
    ? input.session_id.trim()
    : 'claude';
}

function captureClaudeSession(project: DetectedProject, input: JsonObject): void {
  const nativeSessionId = resolveClaudeSessionId(input);

  const events = mapClaudeHookToSessionEvents(input, project);

  if (events.length === 0) {
    return;
  }

  const identity = createSessionIdentity(project, 'claude', nativeSessionId);

  const wal = new SessionWal(identity, {
    source: 'claude',

    cwd: typeof input.cwd === 'string' ? input.cwd : project.rootPath,
  });

  const recorded = wal.append(events);

  checkpointLocalSession(project, identity, recorded);
}

function recordClaudeOrigin(project: DetectedProject, input: JsonObject): void {
  const file = originFile(project);

  let previous: JsonObject = {};

  if (existsSync(file)) {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'));

      if (isObject(parsed) && parsed.projectId === project.id) {
        previous = parsed;
      }
    } catch {
      /*
       * Never fail Claude because local continuity
       * metadata is malformed.
       */
    }
  }

  let lastTouchedFile: string | undefined;

  const toolInput = input.tool_input;

  if (isObject(toolInput) && typeof toolInput.file_path === 'string') {
    lastTouchedFile = safeRelativeFile(project, toolInput.file_path);
  }

  const sessionId =
    typeof input.session_id === 'string'
      ? input.session_id
      : typeof previous.nativeSessionId === 'string'
        ? previous.nativeSessionId
        : 'claude';

  const next: JsonObject = {
    ...previous,

    version: 1,

    projectId: project.id,

    agent: 'claude',

    nativeSessionId: sessionId,

    updatedAt: new Date().toISOString(),
  };

  if (lastTouchedFile) {
    next.lastTouchedFile = lastTouchedFile;
  }

  mkdirSync(join(project.rootPath, '.toolnet', 'context'), {
    recursive: true,

    mode: 0o700,
  });

  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temporary, JSON.stringify(next, null, 2) + '\n', {
      encoding: 'utf8',

      mode: 0o600,
    });

    renameSync(temporary, file);
  } finally {
    rmSync(temporary, {
      force: true,
    });
  }
}

export interface ClaudeHookDependencies {
  flushSession?: (
    project: ProjectManifest,
    sessionId: string,
    cwd: string
  ) => Promise<SessionFlushResult>;

  logDiagnostic?: (message: string) => void;
}

function flushClaudeSession(
  project: ProjectManifest,
  sessionId: string,
  cwd: string
): Promise<SessionFlushResult> {
  /*
   * Canonical materialization is owned by SessionCore.flush().
   * This adapter only attaches a SessionCore to the EXISTING Claude WAL:
   * same project, agent and native session id resolve to the same
   * identity, so no event is appended twice.
   */
  return flushHookCaptureSession(project, 'claude', sessionId, cwd);
}

function writeDiagnostic(message: string): void {
  try {
    process.stderr.write(`${message}\n`);
  } catch {
    // Diagnostics must never break the hook.
  }
}

export async function handleClaudeHookInput(
  input: JsonObject,
  dependencies: ClaudeHookDependencies = {}
): Promise<JsonObject> {
  const event = typeof input.hook_event_name === 'string' ? input.hook_event_name : '';

  const cwd = typeof input.cwd === 'string' ? input.cwd : '';

  if (!cwd) {
    return {};
  }

  const project = findProject(cwd);

  if (!project) {
    return {};
  }

  try {
    /*
     * Local WAL first.
     *
     * If the rest of the hook or remote systems fail,
     * the latest Claude activity is still recoverable.
     */
    try {
      captureClaudeSession(project, input);
    } catch {
      // Fail open.
    }

    if (event === 'SessionStart') {
      triggerProjectBackgroundRefresh(project.rootPath);

      const context = buildFastProjectContext({
        projectPath: cwd,
      });

      if (!context?.trim()) {
        return {};
      }

      return {
        hookSpecificOutput: {
          hookEventName: 'SessionStart',

          additionalContext: limitContext(context),
        },
      };
    }

    if (event === 'PostToolUse') {
      recordClaudeOrigin(project, input);

      try {
        refreshFastHandoffFromCurrent(project);
      } catch {
        // Fail open.
      }

      return {};
    }

    if (event === 'Stop') {
      recordClaudeOrigin(project, input);

      try {
        refreshFastHandoffFromCurrent(project);
      } catch {
        // Fail open.
      }

      triggerProjectBackgroundRefresh(project.rootPath);

      /*
       * Durable boundary. SessionCore.flush() runs the canonical learner +
       * materialization pipeline. The Claude session id only resolves the
       * shared WAL; no event is recorded here, so Stop is not appended twice.
       */
      const sessionId = resolveClaudeSessionId(input);

      const flush = dependencies.flushSession ?? flushClaudeSession;

      const log = dependencies.logDiagnostic ?? writeDiagnostic;

      try {
        const result = await flush(project, sessionId, cwd);

        if (result.materialization?.status === 'failed') {
          log(
            `[toolnet-memory] claude stop materialization failed: ${
              result.materialization.errorCode ?? 'materialize-failed'
            }`
          );
        }
      } catch {
        /*
         * WAL + learned journal remain durable for the next retry.
         * Only a domain-safe code is surfaced; never content or stack traces.
         */
        log('[toolnet-memory] claude stop materialization failed: flush-failed');
      }

      return {};
    }

    return {};
  } catch {
    /*
     * ToolNet must never prevent Claude Code
     * from continuing or shutting down.
     */
    return {};
  }
}
