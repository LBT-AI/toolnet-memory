import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { mapClaudeHookToSessionEvents } from '../../src/session/claude/event-mapper.js';
import { SessionWal } from '../../src/session/wal.js';

import {
  canonicalizeSessionEventInput,
  stripPrivateReasoning,
} from '../../src/session/unified-event.js';

describe('Unified Session Event', () => {
  it('removes raw model reasoning but keeps useful results', () => {
    const cleaned = stripPrivateReasoning({
      content: 'OAuth callback implemented',

      thinking: 'private hidden reasoning',

      reasoning_content: 'private reasoning content',

      payload: {
        type: 'reasoning',
        content: 'private chain of thought',
      },

      result: {
        status: 'passed',
      },
    }) as Record<string, unknown>;

    expect(cleaned.content).toBe('OAuth callback implemented');

    expect(cleaned.thinking).toBeUndefined();

    expect(cleaned.reasoning_content).toBeUndefined();

    expect(cleaned.payload).toEqual({
      type: 'reasoning',
      omitted: '[private reasoning omitted]',
    });

    expect(cleaned.result).toEqual({
      status: 'passed',
    });
  });

  it('applies source, cwd and turn defaults consistently', () => {
    const event = canonicalizeSessionEventInput(
      {
        type: 'file_write',

        timestamp: '2026-08-18T17:00:00.000Z',

        data: {
          filePath: 'src/auth.ts',
        },

        provenance: {
          source: 'codex-rollout',
        },
      },
      {
        source: 'codex',

        cwd: '/root/project1',

        turnId: 'turn-123',
      }
    );

    expect(event.type).toBe('file_write');

    expect(event.source).toBe('codex');

    expect(event.cwd).toBe('/root/project1');

    expect(event.turnId).toBe('turn-123');

    expect(event.provenance?.source).toBe('codex-rollout');
  });

  it('writes the unified identity contract into WAL events', () => {
    const directory = mkdtempSync(join(tmpdir(), 'toolnet-unified-'));

    try {
      const wal = new SessionWal(
        {
          projectId: 'project-a',

          projectName: 'project1',

          projectRoot: '/root/project1',

          agent: 'opencode',

          nativeSessionId: 'ses-123',

          sessionKey: 'opencode:ses-123',

          remotePrefix: 'projects/project-a/sessions/opencode/ses-123',

          localDirectory: directory,
        },
        {
          source: 'opencode',

          cwd: '/root/project1',
        }
      );

      const [event] = wal.append([
        {
          type: 'file_write',

          sourceEventId: 'write:src/auth.ts',

          data: {
            filePath: 'src/auth.ts',
          },
        },
      ]);

      expect(event).toMatchObject({
        version: 1,

        projectId: 'project-a',

        agent: 'opencode',

        nativeSessionId: 'ses-123',

        sessionId: 'ses-123',

        source: 'opencode',

        cwd: '/root/project1',

        type: 'file_write',

        data: {
          filePath: 'src/auth.ts',
        },
      });
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('maps Claude Edit into the same file_edit contract', () => {
    const project: ProjectManifest = {
      id: 'project-a',

      name: 'project1',

      rootPath: '/root/project1',

      createdAt: '2026-08-18T00:00:00.000Z',

      updatedAt: '2026-08-18T00:00:00.000Z',

      graphVersion: 1,

      memoryVersion: 1,
    };

    const [event] = mapClaudeHookToSessionEvents(
      {
        hook_event_name: 'PostToolUse',

        session_id: 'claude-session',

        cwd: '/root/project1',

        tool_name: 'Edit',

        tool_use_id: 'tool-1',

        tool_input: {
          file_path: 'src/auth.ts',
        },
      },
      project
    );

    expect(event).toMatchObject({
      type: 'file_edit',

      source: 'claude',

      cwd: '/root/project1',

      data: {
        tool: 'Edit',

        filePath: 'src/auth.ts',
      },
    });

    expect(event.provenance?.files).toEqual(['src/auth.ts']);
  });

  it('supports canonical checkpoint events', () => {
    const event = canonicalizeSessionEventInput(
      {
        type: 'checkpoint',

        data: {
          currentTask: 'Implement OAuth callback',

          nextAction: 'Run auth tests',
        },
      },
      {
        source: 'agy',

        cwd: '/root/project1',
      }
    );

    expect(event.type).toBe('checkpoint');

    expect(event.source).toBe('agy');

    expect(event.data).toEqual({
      currentTask: 'Implement OAuth callback',

      nextAction: 'Run auth tests',
    });
  });
});
