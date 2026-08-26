import type { HandoffStateV2 } from './handoff-state.js';

export type HandoffConfidence = 'high' | 'medium' | 'low';

export interface HandoffQuality {
  confidence: HandoffConfidence;

  score: number;

  missingContext: string[];

  warnings: string[];
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function evaluateHandoffQuality(state: HandoffStateV2): HandoffQuality {
  const missingContext: string[] = [];
  const warnings: string[] = [];

  let score = 100;

  /*
   * 1. Goal/request.
   */
  const hasGoalOrRequest = hasText(state.goal) || hasText(state.request);

  if (!hasGoalOrRequest) {
    missingContext.push('goal_or_request');
    score -= 20;
  }

  /*
   * 2. Current work.
   */
  const hasCurrentWork =
    hasText(state.activity) ||
    hasText(state.current.task?.title) ||
    hasText(state.current.phase?.title);

  if (!hasCurrentWork) {
    missingContext.push('current_work');
    score -= 25;
  }

  /*
   * 3. Exact next action.
   */
  const hasNextAction = hasText(state.nextAction) || hasText(state.remaining.todos[0]);

  if (!hasNextAction) {
    missingContext.push('next_action');
    score -= 25;
  }

  /*
   * 4. Real evidence.
   */
  const hasEvidence =
    state.tests.status !== 'unknown' ||
    state.tests.recent.length > 0 ||
    (state.tests.checks?.length ?? 0) > 0 ||
    (state.evidence?.commands.length ?? 0) > 0 ||
    (state.evidence?.references.length ?? 0) > 0;

  if (!hasEvidence) {
    missingContext.push('evidence');
    score -= 20;
  }

  /*
   * 5. File context.
   */
  const hasFiles =
    hasText(state.files.current) ||
    state.files.recent.length > 0 ||
    (state.files.active?.length ?? 0) > 0 ||
    (state.files.modified?.length ?? 0) > 0 ||
    (state.files.created?.length ?? 0) > 0;

  if (!hasFiles) {
    missingContext.push('files');
    score -= 10;
  }

  /*
   * Blockers are not required to be non-empty.
   * [] explicitly means no known blocker.
   */

  if (state.tests.status === 'failing') {
    warnings.push('tests_failing');
  }

  if (state.blockers.length > 0) {
    warnings.push('active_blockers');
  }

  score = Math.max(0, Math.min(100, score));

  const criticalMissing =
    missingContext.includes('current_work') || missingContext.includes('next_action');

  let confidence: HandoffConfidence;

  if (score >= 80 && !criticalMissing) {
    confidence = 'high';
  } else if (score >= 50) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    confidence,
    score,
    missingContext,
    warnings,
  };
}
