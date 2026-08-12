import { describe, expect, test } from 'vitest';

import { buildHandoffStateV2 } from '../../src/work-continuity/handoff-state.js';

import type { WorkItem, WorkState } from '../../src/work-continuity/types.js';

function item(id: string, title: string, status: WorkItem['status']): WorkItem {
  return {
    id,

    title,

    status,

    confidence: 1,

    updatedAt: '2026-08-13T00:00:00.000Z',

    updatedBy: {
      agent: 'codex',

      nativeSessionId: 's1',

      eventId: `event-${id}`,
    },
  };
}

describe('Handoff State Schema v2', () => {
  test('captures exact continuation state for another agent', () => {
    const state: WorkState = {
      version: 1,

      projectId: 'project-1',

      projectName: 'demo',

      goal: 'Build persistent cross-agent memory',

      plan: 'Implement phases sequentially',

      phases: [
        item('m1', 'M1 Memory Pipeline', 'completed'),

        item('m2', 'M2 Handoff Schema', 'in_progress'),
      ],

      tasks: [
        item('t1', 'Create memory pipeline', 'completed'),

        item('t2', 'Create handoff schema', 'in_progress'),

        item('t3', 'Test cross-agent continuation', 'pending'),
      ],

      decisions: ['Keep legacy SmartHandoff fields.'],

      blockers: ['Need real Antigravity validation.'],

      warnings: ['Do not read raw transcripts.'],

      nextActions: ['Run focused tests.', 'Build production bundle.'],

      filesTouched: ['src/memory/pipeline-v2.ts', 'src/work-continuity/handoff-state.ts'],

      tests: ['M1 tests passed ✅', 'M2 focused tests pending'],

      currentPhase: item('m2', 'M2 Handoff Schema', 'in_progress'),

      currentTask: item('t2', 'Create handoff schema', 'in_progress'),

      progress: {
        phasesTotal: 2,

        phasesCompleted: 1,

        tasksTotal: 3,

        tasksCompleted: 1,

        blocked: 0,
      },

      lastSession: {
        agent: 'codex',

        nativeSessionId: 's1',

        sessionKey: 'codex:s1',

        updatedAt: '2026-08-13T00:00:00.000Z',
      },

      updatedAt: '2026-08-13T00:00:00.000Z',
    };

    const handoff = buildHandoffStateV2({
      project: {
        id: 'project-1',

        name: 'demo',

        rootPath: '/tmp/demo',

        createdAt: '2026-08-01T00:00:00.000Z',

        updatedAt: '2026-08-13T00:00:00.000Z',

        graphVersion: 1,

        memoryVersion: 1,
      },

      identity: {
        projectId: 'project-1',

        projectName: 'demo',

        projectRoot: '/tmp/demo',

        agent: 'codex',

        nativeSessionId: 's1',

        sessionKey: 'codex:s1',

        remotePrefix: 'projects/demo/sessions/codex/s1',

        localDirectory: '/tmp/demo/.toolnet/sessions/codex/s1',
      },

      state,

      reason: 'checkpoint',

      sequence: 42,

      attention: ['Do not read raw transcripts.'],

      capturedAt: '2026-08-13T00:00:00.000Z',
    });

    expect(handoff.schema).toBe('toolnet.handoff.v2');

    expect(handoff.version).toBe(2);

    expect(handoff.current.task?.title).toBe('Create handoff schema');

    expect(handoff.current.file).toBe('src/work-continuity/handoff-state.ts');

    expect(handoff.completed.tasks).toContain('Create memory pipeline');

    expect(handoff.remaining.tasks).toContain('Test cross-agent continuation');

    expect(handoff.remaining.todos).toContain('Run focused tests.');

    expect(handoff.nextAction).toBe('Run focused tests.');

    expect(handoff.blockers).toContain('Need real Antigravity validation.');

    expect(handoff.decisions).toContain('Keep legacy SmartHandoff fields.');

    expect(handoff.files.current).toBe('src/work-continuity/handoff-state.ts');

    expect(handoff.tests.status).toBe('passing');

    expect(handoff.source.agent).toBe('codex');

    expect(handoff.source.sequence).toBe(42);

    expect(handoff.stateDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  test('state digest ignores capture timestamp', () => {
    const state = {
      version: 1,

      projectId: 'p',

      projectName: 'demo',

      phases: [],

      tasks: [],

      decisions: [],

      blockers: [],

      warnings: [],

      nextActions: ['Continue task'],

      filesTouched: ['src/a.ts'],

      tests: [],

      progress: {
        phasesTotal: 0,

        phasesCompleted: 0,

        tasksTotal: 0,

        tasksCompleted: 0,

        blocked: 0,
      },

      updatedAt: '2026-08-13T00:00:00.000Z',
    } satisfies WorkState;

    const base = {
      project: {
        id: 'p',

        name: 'demo',

        rootPath: '/tmp/demo',

        createdAt: '2026-08-01T00:00:00.000Z',

        updatedAt: '2026-08-13T00:00:00.000Z',

        graphVersion: 1,

        memoryVersion: 1,
      },

      identity: {
        projectId: 'p',

        projectName: 'demo',

        projectRoot: '/tmp/demo',

        agent: 'agy',

        nativeSessionId: 's1',

        sessionKey: 'agy:s1',

        remotePrefix: 'projects/demo/sessions/agy/s1',

        localDirectory: '/tmp/demo/.toolnet/sessions/agy/s1',
      },

      state,

      reason: 'checkpoint',

      sequence: 10,
    };

    const first = buildHandoffStateV2({
      ...base,

      capturedAt: '2026-08-13T00:00:00.000Z',
    });

    const second = buildHandoffStateV2({
      ...base,

      capturedAt: '2026-08-13T00:30:00.000Z',
    });

    expect(first.stateDigest).toBe(second.stateDigest);
  });
});
