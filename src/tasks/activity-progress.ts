import type { TaskActivityProgress, TaskActivitySignals, TaskRecord } from './types.js';

function verificationSignals(task: TaskRecord): {
  passed: number;
  failed: number;
} {
  let passed = 0;
  let failed = 0;
  for (const evidence of task.evidence) {
    if (!evidence.ref?.startsWith('verification:')) {
      continue;
    }
    if (/^Verification\s+PASS:/iu.test(evidence.summary)) {
      passed += 1;
      continue;
    }
    if (/^Verification\s+FAIL:/iu.test(evidence.summary)) {
      failed += 1;
    }
  }
  return { passed, failed };
}

function signals(task: TaskRecord): TaskActivitySignals {
  const verification = verificationSignals(task);
  return {
    filesTouched: task.filesTouched.length,
    testsPassed: task.tests.filter((test) => test.outcome === 'pass').length,
    testsFailed: task.tests.filter((test) => test.outcome === 'fail').length,
    testsSkipped: task.tests.filter((test) => test.outcome === 'skip').length,
    verificationsPassed: verification.passed,
    verificationsFailed: verification.failed,
    commits: task.evidence.filter((evidence) => evidence.kind === 'commit').length,
  };
}

function signalPercent(value: TaskActivitySignals): number {
  if (value.testsFailed > 0 || value.verificationsFailed > 0) {
    return 55;
  }
  if (value.commits > 0) {
    return 90;
  }
  if (value.verificationsPassed > 0) {
    return 85;
  }
  if (value.testsPassed > 0) {
    return 70;
  }
  if (value.filesTouched > 0) {
    return 45;
  }
  return 15;
}

export function deriveTaskActivityProgress(task: TaskRecord): TaskActivityProgress {
  const activitySignals = signals(task);
  if (task.status === 'completed') {
    return {
      stage: 'completed',
      percent: 100,
      signals: activitySignals,
      updatedAt: task.updatedAt,
    };
  }
  if (task.status === 'cancelled') {
    return {
      stage: 'cancelled',
      percent: 100,
      signals: activitySignals,
      updatedAt: task.updatedAt,
    };
  }
  if (task.status === 'pending') {
    return {
      stage: 'queued',
      percent: 0,
      signals: activitySignals,
      updatedAt: task.updatedAt,
    };
  }
  const percent = signalPercent(activitySignals);
  if (task.status === 'blocked') {
    return {
      stage: 'blocked',
      percent,
      signals: activitySignals,
      updatedAt: task.updatedAt,
    };
  }
  if (activitySignals.testsFailed > 0 || activitySignals.verificationsFailed > 0) {
    return {
      stage: 'needs_attention',
      percent,
      suggestedNextAction: 'Fix failing checks and run verification again.',
      signals: activitySignals,
      updatedAt: task.updatedAt,
    };
  }
  if (activitySignals.commits > 0) {
    return {
      stage: 'ready_to_complete',
      percent,
      suggestedNextAction: 'Complete the Task when lifecycle guards pass.',
      signals: activitySignals,
      updatedAt: task.updatedAt,
    };
  }
  if (activitySignals.verificationsPassed > 0) {
    return {
      stage: 'ready_to_complete',
      percent,
      suggestedNextAction: 'Review the verified changes and complete the Task.',
      signals: activitySignals,
      updatedAt: task.updatedAt,
    };
  }
  if (activitySignals.testsPassed > 0) {
    return {
      stage: 'verifying',
      percent,
      suggestedNextAction: 'Run the remaining verification checks.',
      signals: activitySignals,
      updatedAt: task.updatedAt,
    };
  }
  if (activitySignals.filesTouched > 0) {
    return {
      stage: 'implementing',
      percent,
      suggestedNextAction: 'Run relevant tests for the changed files.',
      signals: activitySignals,
      updatedAt: task.updatedAt,
    };
  }
  return {
    stage: 'implementing',
    percent,
    suggestedNextAction: 'Continue implementing the planned Task.',
    signals: activitySignals,
    updatedAt: task.updatedAt,
  };
}
