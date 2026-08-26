import { describe, expect, test } from 'vitest';

import { shouldUseStructuredHandoff } from '../../src/work-continuity/structured-handoff-intent.js';

describe('structured handoff intent', () => {
  test('summary and status always use structured handoff', () => {
    expect(shouldUseStructuredHandoff('what is happening?', 'summary')).toBe(true);

    expect(shouldUseStructuredHandoff('status?', 'status')).toBe(true);
  });

  test('detects Codex benchmark-style takeover question', () => {
    const question =
      'For mercedes-vns Phase 10 Task 10.8/10.9, summarize the current state, evidence/report locations, two ImageKit canary assets/URLs, monitoring scripts or commands used, blockers and next actions.';

    expect(shouldUseStructuredHandoff(question, 'current_task')).toBe(true);
  });

  test('detects explicit continuity request', () => {
    expect(
      shouldUseStructuredHandoff(
        'Continue from previous agent handoff and show current task, files and next action.',
        'current_task'
      )
    ).toBe(true);
  });

  test('keeps simple direct question concise', () => {
    expect(shouldUseStructuredHandoff('blocker là gì?', 'blocker')).toBe(false);

    expect(shouldUseStructuredHandoff('next action?', 'next_action')).toBe(false);
  });

  test('multiple state dimensions imply takeover', () => {
    expect(
      shouldUseStructuredHandoff(
        'current state, files, tests, blockers, next action',
        'current_task'
      )
    ).toBe(true);
  });
});

describe('explicit TODO routing regression', () => {
  test('TODO query remains direct even when classified as summary', () => {
    expect(shouldUseStructuredHandoff('TODO còn lại là gì?', 'summary')).toBe(false);

    expect(shouldUseStructuredHandoff('Các việc chưa làm là gì?', 'summary')).toBe(false);
  });
});
