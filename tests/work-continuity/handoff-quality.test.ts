import { describe, expect, test } from 'vitest';

import { evaluateHandoffQuality } from '../../src/work-continuity/handoff-quality.js';

import type { HandoffStateV2 } from '../../src/work-continuity/handoff-state.js';

function completeState(): HandoffStateV2 {
  return {
    schema: 'toolnet.handoff.v2',

    version: 2,

    project: {
      id: 'quality-test',
      name: 'demo',
    },

    source: {
      agent: 'codex',
      nativeSessionId: 'codex-1',
      sessionKey: 'codex:codex-1',
      sequence: 10,
      reason: 'checkpoint',
    },

    capturedAt: '2026-08-26T09:00:00.000Z',

    goal: 'Finish Phase 10',

    request: 'Verify production monitoring',

    activity: 'Testing monitor',

    current: {
      task: {
        id: 'task-10',
        title: 'Verify monitor',
        status: 'in_progress',
      },

      file: 'scripts/monitor.py',
    },

    completed: {
      phases: [],
      tasks: ['Task 10.8'],
    },

    remaining: {
      phases: [],
      tasks: ['Task 10.10'],
      todos: ['Run final monitor verification'],
    },

    nextAction: 'Run final monitor verification',

    blockers: [],

    decisions: [],

    files: {
      current: 'scripts/monitor.py',
      recent: ['scripts/monitor.py'],
      active: ['scripts/monitor.py'],
      modified: [],
      created: [],
      deleted: [],
    },

    tests: {
      status: 'passing',

      recent: ['monitor test passed'],

      checks: [
        {
          kind: 'test',
          status: 'passed',
          command: 'python3 scripts/monitor.py',
        },
      ],
    },

    evidence: {
      commands: ['python3 scripts/monitor.py'],

      references: ['https://example.com/report'],
    },

    attention: [],

    progress: {
      phasesTotal: 1,
      phasesCompleted: 0,
      tasksTotal: 3,
      tasksCompleted: 2,
      blocked: 0,
    },

    stateDigest: 'x'.repeat(64),
  };
}

describe('handoff quality gate', () => {
  test('returns high confidence for complete takeover state', () => {
    const quality = evaluateHandoffQuality(completeState());

    expect(quality.confidence).toBe('high');

    expect(quality.score).toBe(100);

    expect(quality.missingContext).toEqual([]);

    expect(quality.warnings).toEqual([]);
  });

  test('returns low confidence when critical context is missing', () => {
    const state = completeState();

    state.goal = undefined;
    state.request = undefined;
    state.activity = undefined;
    state.current = {};
    state.nextAction = undefined;
    state.remaining.todos = [];
    state.tests = {
      status: 'unknown',
      recent: [],
      checks: [],
    };
    state.evidence = {
      commands: [],
      references: [],
    };
    state.files = {
      recent: [],
      active: [],
      modified: [],
      created: [],
      deleted: [],
    };

    const quality = evaluateHandoffQuality(state);

    expect(quality.confidence).toBe('low');

    expect(quality.missingContext).toContain('goal_or_request');

    expect(quality.missingContext).toContain('current_work');

    expect(quality.missingContext).toContain('next_action');

    expect(quality.missingContext).toContain('evidence');

    expect(quality.missingContext).toContain('files');
  });

  test('reports blockers and failing tests as warnings', () => {
    const state = completeState();

    state.blockers = ['Production endpoint unavailable'];

    state.tests.status = 'failing';

    const quality = evaluateHandoffQuality(state);

    expect(quality.warnings).toContain('tests_failing');

    expect(quality.warnings).toContain('active_blockers');
  });
});
