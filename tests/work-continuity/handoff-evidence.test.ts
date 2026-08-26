import { describe, expect, test } from 'vitest';

import { buildHandoffStateV2 } from '../../src/work-continuity/handoff-state.js';

import type { WorkState } from '../../src/work-continuity/types.js';

describe('handoff evidence', () => {
  test('carries commands and real references into canonical handoff', () => {
    const state: WorkState = {
      version: 1,

      projectId: 'evidence-project',

      projectName: 'demo',

      currentRequest: 'Verify report at https://example.com/report/task-10',

      currentActivity: 'Monitor canary https://ik.imagekit.io/demo/canary.webp',

      goal: 'Preserve deterministic handoff evidence',

      plan: 'Capture command and reference evidence',

      phases: [],

      tasks: [],

      decisions: ['Keep https://example.com/reference as evidence.'],

      blockers: [],

      warnings: [],

      nextActions: ['Recheck https://example.com/health'],

      filesTouched: ['reports/task-10.md'],

      commands: ['curl -fsS https://example.com/health', 'python3 scripts/monitor.py'],

      tests: ['curl https://example.com/health => 200'],

      checks: [
        {
          kind: 'test',

          command: 'curl -fsS https://example.com/health',

          status: 'passed',

          updatedAt: '2026-08-26T09:00:00.000Z',

          agent: 'codex',

          nativeSessionId: 'codex-1',
        },
      ],

      progress: {
        phasesTotal: 0,

        phasesCompleted: 0,

        tasksTotal: 0,

        tasksCompleted: 0,

        blocked: 0,
      },

      updatedAt: '2026-08-26T09:00:00.000Z',
    };

    const handoff = buildHandoffStateV2({
      project: {
        id: 'evidence-project',

        name: 'demo',

        rootPath: '/tmp/demo',

        createdAt: '2026-08-26T08:00:00.000Z',

        updatedAt: '2026-08-26T09:00:00.000Z',

        graphVersion: 1,

        memoryVersion: 1,
      },

      identity: {
        projectId: 'evidence-project',

        projectName: 'demo',

        projectRoot: '/tmp/demo',

        agent: 'codex',

        nativeSessionId: 'codex-1',

        sessionKey: 'codex:codex-1',

        remotePrefix: 'projects/demo/sessions/codex/codex-1',

        localDirectory: '/tmp/demo/.toolnet/sessions/codex/codex-1',
      },

      state,

      reason: 'checkpoint',

      sequence: 10,

      capturedAt: '2026-08-26T09:00:00.000Z',
    });

    expect(handoff.evidence!.commands).toContain('curl -fsS https://example.com/health');

    expect(handoff.evidence!.commands).toContain('python3 scripts/monitor.py');

    expect(handoff.evidence!.references).toContain('https://example.com/report/task-10');

    expect(handoff.evidence!.references).toContain('https://ik.imagekit.io/demo/canary.webp');

    expect(handoff.evidence!.references).toContain('https://example.com/health');

    expect(new Set(handoff.evidence!.references).size).toBe(handoff.evidence!.references.length);
  });

  test('does not invent references when none were captured', () => {
    const state: WorkState = {
      version: 1,

      projectId: 'empty-evidence',

      projectName: 'demo',

      phases: [],

      tasks: [],

      decisions: [],

      blockers: [],

      warnings: [],

      nextActions: ['Run local tests'],

      filesTouched: ['src/index.ts'],

      commands: ['npm test'],

      tests: ['tests passed'],

      progress: {
        phasesTotal: 0,

        phasesCompleted: 0,

        tasksTotal: 0,

        tasksCompleted: 0,

        blocked: 0,
      },

      updatedAt: '2026-08-26T09:00:00.000Z',
    };

    const handoff = buildHandoffStateV2({
      project: {
        id: 'empty-evidence',

        name: 'demo',

        rootPath: '/tmp/demo',

        createdAt: '2026-08-26T08:00:00.000Z',

        updatedAt: '2026-08-26T09:00:00.000Z',

        graphVersion: 1,

        memoryVersion: 1,
      },

      identity: {
        projectId: 'empty-evidence',

        projectName: 'demo',

        projectRoot: '/tmp/demo',

        agent: 'agy',

        nativeSessionId: 'agy-1',

        sessionKey: 'agy:agy-1',

        remotePrefix: 'projects/demo/sessions/agy/agy-1',

        localDirectory: '/tmp/demo/.toolnet/sessions/agy/agy-1',
      },

      state,

      reason: 'checkpoint',

      sequence: 1,
    });

    expect(handoff.evidence!.commands).toEqual(['npm test']);

    expect(handoff.evidence!.references).toEqual([]);
  });
});
